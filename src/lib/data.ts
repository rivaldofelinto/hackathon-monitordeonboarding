/**
 * Server-side data fetching — queries Neon directly via Drizzle
 * Use this in server components instead of fetch('/api/properties')
 */
import { db } from '@/db/client'
import { properties, stages } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export interface PropertyWithStages {
  id: number
  codigo_imovel: string
  title: string
  status: string
  pipe: string
  pipe_name: string
  phase: string
  late: boolean
  done: boolean
  sla_color: string
  created_at: string
  updated_at: string
  stage_name: string
  stage_status: string
  // Rich fields from Nekt (pipe 3 - Vistoria)
  franquia: string
  analista: string
  data_vistoria: string
  tipo_vistoria: string
  link_fotos: string
  link_pipefy: string
  // Rich fields from Nekt (pipe 4 - Fotografia)
  horario_fotos: string
  turno: string
}

// Generic: fetch up to `limit` properties, optionally filtered by pipe (via metadata->>'pipe')
export async function fetchProperties(limit = 100, pipeFilter?: string[]): Promise<PropertyWithStages[]> {
  const baseQuery = db
    .select({
      id: properties.id,
      codigo_imovel: properties.codigo_imovel,
      status: properties.status,
      metadata: properties.metadata,
      created_at: properties.created_at,
      updated_at: properties.updated_at,
      stage_name: stages.stage_name,
      stage_status: stages.status,
      sla_color: stages.sla_color,
    })
    .from(properties)
    .leftJoin(stages, eq(stages.property_id, properties.id))
    .orderBy(desc(properties.updated_at))

  const rows = await (pipeFilter && pipeFilter.length > 0
    ? baseQuery
        .where(sql`${properties.metadata}->>'pipe' = ANY(ARRAY[${sql.join(pipeFilter.map(p => sql`${p}`), sql`, `)}])`)
        .limit(limit)
    : baseQuery.limit(limit))

  return rows.map(r => {
    const meta = (r.metadata as Record<string, unknown>) ?? {}
    return {
      id: r.id,
      codigo_imovel: r.codigo_imovel,
      title: String((meta.title as string) || r.codigo_imovel || ''),
      status: String(r.status ?? 'active'),
      pipe: String((meta.pipe as string) ?? ''),
      pipe_name: String((meta.pipe_name as string) ?? ''),
      phase: String((meta.phase as string) ?? ''),
      late: Boolean(meta.late),
      done: Boolean(meta.done),
      sla_color: String(r.sla_color ?? 'green'),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
      updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at ?? ''),
      stage_name: String(r.stage_name ?? ''),
      stage_status: String(r.stage_status ?? ''),
      franquia: String((meta.franquia as string) ?? ''),
      analista: String((meta.analista as string) ?? ''),
      data_vistoria: String((meta.data_vistoria as string) ?? ''),
      tipo_vistoria: String((meta.tipo_vistoria as string) ?? ''),
      link_fotos: String((meta.link_fotos as string) ?? ''),
      link_pipefy: String((meta.link_pipefy as string) ?? ''),
      horario_fotos: String((meta.horario_fotos as string) ?? ''),
      turno: String((meta.turno as string) ?? ''),
    }
  })
}
