import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { count, and, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

// Pipe Mãe = pipe '1' (Pipe 1 - Implantação/Mãe, Pipefy ID 303781436)
const PIPE_MAE = sql`${properties.metadata}->>'pipe' = '1' AND ${properties.codigo_imovel} !~ '^[0-9]+$'`

// Phase group labels (must match order of phaseGroupQueries below)
const PHASE_GROUP_LABELS = [
  'Iniciando Onboarding',
  'Vistorias',
  'Adequação',
  'Em Ativação',
  'Fotos Profissionais e Pendências',
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  // Optional date filter on updated_at
  const dateCond: SQL | undefined = dateFrom && dateTo
    ? sql`${properties.updated_at} >= ${dateFrom}::date AND ${properties.updated_at} < (${dateTo}::date + INTERVAL '1 day')`
    : undefined

  // Compose conditions — always includes PIPE_MAE; adds dateCond when present
  const w = (...extra: (SQL | undefined)[]) =>
    and(PIPE_MAE, ...extra.filter((c): c is SQL => c !== undefined))

  try {
    // Use LIKE 'Fase N -%' to be resilient to spacing inconsistencies in DB values
    const phaseGroupQueries = [
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`(${properties.metadata}->>'phase' LIKE '%Backlog%' OR ${properties.metadata}->>'phase' LIKE 'Fase 1 -%' OR ${properties.metadata}->>'phase' LIKE 'Fase 2 -%')`)
      ),
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`${properties.metadata}->>'phase' LIKE 'Fase 3 -%'`)
      ),
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`(${properties.metadata}->>'phase' LIKE 'Fase 4 -%' OR ${properties.metadata}->>'phase' LIKE 'Fase 5 -%')`)
      ),
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`(${properties.metadata}->>'phase' LIKE 'Fase 6 -%' OR ${properties.metadata}->>'phase' LIKE 'Fase 7 -%' OR ${properties.metadata}->>'phase' LIKE 'Fase 8 -%')`)
      ),
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`(${properties.metadata}->>'phase' LIKE 'Fase 9 -%' OR ${properties.metadata}->>'phase' LIKE 'Fase 10 -%')`)
      ),
    ]

    const [totalRes, activeRes, doneRes, slaRedRes, ...phaseResults] = await Promise.all([
      db.select({ count: count() }).from(properties).where(w(dateCond)),
      db.select({ count: count() }).from(properties).where(w(dateCond, sql`${properties.metadata}->>'phase' NOT LIKE 'Fase 0%' AND ${properties.metadata}->>'phase' NOT LIKE '%Fase 11%' AND ${properties.metadata}->>'phase' NOT LIKE '%Churn%' AND ${properties.metadata}->>'phase' NOT LIKE '%Exclu%'`)),
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`${properties.metadata}->>'phase' LIKE '%Fase 11%'`)
      ),
      db.select({ count: count() }).from(properties).where(
        w(dateCond, sql`(${properties.metadata}->>'late')::boolean = true`)
      ),
      ...phaseGroupQueries,
    ])

    const total = Number(totalRes[0]?.count ?? 0)
    const active = Number(activeRes[0]?.count ?? 0)
    const done = Number(doneRes[0]?.count ?? 0)
    const slaRed = Number(slaRedRes[0]?.count ?? 0)
    const phaseGroups = PHASE_GROUP_LABELS.map((label, i) => ({
      label,
      count: Number(phaseResults[i]?.[0]?.count ?? 0),
    }))

    return NextResponse.json({
      success: true,
      total,
      active,
      done,
      blocked: 0,
      sla_red: slaRed,
      sla_ok: total - slaRed,
      phaseGroups,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
