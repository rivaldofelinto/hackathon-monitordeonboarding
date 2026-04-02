import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { properties } from '@/db/schema'
import { sql } from 'drizzle-orm'
import { analyzeWarningsWithGemini, type RawWarningData } from '@/lib/gemini-warnings'

// Simple in-memory cache (30 min)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 30 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const [fotosRes, vistoriasAgendar, vistoriasAtrasadasRes] = await Promise.all([

      // Warning 1: Fotos não agendadas — Pipe 4, fases iniciais
      db.execute(sql`
        SELECT
          count(*)::int as cnt,
          array_agg(metadata->>'title' ORDER BY updated_at DESC)
            FILTER (WHERE metadata->>'title' IS NOT NULL) as titles,
          json_agg(json_build_object('phase', metadata->>'phase', 'cnt', 1)) as by_phase
        FROM properties
        WHERE metadata->>'pipe' = '4'
          AND codigo_imovel !~ '^[0-9]+$'
          AND metadata->>'phase' IN (
            'Fase 0 - Início',
            'Fase 1 - Contato Franquia',
            'Fase 1.2 - Imóveis Ativos',
            'Fase 2 - Contato Fotógrafo'
          )
      `),

      // Warning 2: Vistorias a agendar — Pipe 3, fases iniciais
      db.execute(sql`
        SELECT
          metadata->>'phase' as phase,
          count(*)::int as cnt,
          array_agg(metadata->>'title' ORDER BY updated_at DESC)
            FILTER (WHERE metadata->>'title' IS NOT NULL) as titles
        FROM properties
        WHERE metadata->>'pipe' = '3'
          AND codigo_imovel !~ '^[0-9]+$'
          AND metadata->>'phase' IN ('Fase 0 - Início', 'Fase 1 - Agendamento')
        GROUP BY phase
        ORDER BY cnt DESC
      `),

      // Warning 3: Vistorias agendadas presas há mais de 2 dias — Pipe 3, Fase 2
      db.execute(sql`
        SELECT
          count(*)::int as cnt,
          array_agg(metadata->>'title' ORDER BY updated_at ASC)
            FILTER (WHERE metadata->>'title' IS NOT NULL) as titles,
          MAX(EXTRACT(EPOCH FROM NOW() - updated_at) / 86400)::int as max_days
        FROM properties
        WHERE metadata->>'pipe' = '3'
          AND codigo_imovel !~ '^[0-9]+$'
          AND metadata->>'phase' = 'Fase 2 - Agendada'
          AND updated_at < NOW() - INTERVAL '2 days'
      `),

    ])

    type FotosRow = { cnt: number; titles: string[] }
    type VistoriaPhaseRow = { phase: string; cnt: number; titles: string[] }
    type VistoriaAtrasadaRow = { cnt: number; titles: string[]; max_days: number }

    const fotosRow = (fotosRes as unknown as FotosRow[])[0]
    const vistoriasPhases = vistoriasAgendar as unknown as VistoriaPhaseRow[]
    const vistoriasAtrasadasRow = (vistoriasAtrasadasRes as unknown as VistoriaAtrasadaRow[])[0]

    const rawData: RawWarningData = {
      fotos_nao_agendadas: {
        count: Number(fotosRow?.cnt ?? 0),
        titles: (fotosRow?.titles ?? []).slice(0, 5),
      },
      vistorias_a_agendar: {
        count: vistoriasPhases.reduce((s, r) => s + Number(r.cnt), 0),
        by_phase: vistoriasPhases.map(r => ({ phase: r.phase, count: Number(r.cnt) })),
      },
      vistorias_agendadas_atrasadas: {
        count: Number(vistoriasAtrasadasRow?.cnt ?? 0),
        titles: (vistoriasAtrasadasRow?.titles ?? []).slice(0, 5),
        max_days: Number(vistoriasAtrasadasRow?.max_days ?? 0),
      },
    }

    const result = await analyzeWarningsWithGemini(rawData)

    const response = {
      success: true,
      ...result,
      raw: rawData,
    }

    cache = { data: response as never, ts: Date.now() }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
