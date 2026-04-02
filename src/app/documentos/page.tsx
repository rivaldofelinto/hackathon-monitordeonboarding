import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Documentos } from '@/components/stitch/Documentos'
import { fetchProperties } from '@/lib/data'

export default async function DocumentosPage() {
  const raw = await fetchProperties(200)

  const properties = raw.map(p => ({
    id: p.id,
    title: p.title,
    phase: p.phase,
    pipe_name: p.pipe_name,
    status: p.status,
    sla_color: p.sla_color,
    late: p.late,
    done: p.done,
    updated_at: p.updated_at,
    created_at: p.created_at,
    stage_name: p.stage_name,
    franquia: p.franquia,
    link_fotos: p.link_fotos,
    link_pipefy: p.link_pipefy,
  }))

  return (
    <StitchLayout>
      <Documentos properties={properties} />
    </StitchLayout>
  )
}
