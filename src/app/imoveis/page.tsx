import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Imoveis } from '@/components/stitch/Imoveis'
import { fetchProperties } from '@/lib/data'

export default async function ImoveisPage() {
  const raw = await fetchProperties(200)

  // Map to shape expected by Imoveis component
  const properties = raw.map(p => ({
    id: String(p.id),
    codigo_imovel: p.title,
    responsavel: p.franquia || undefined,
    status: (p.status === 'active' ? 'in_progress'
           : p.status === 'done'   ? 'completed'
           : p.status === 'blocked' ? 'blocked'
           : 'pending') as 'pending' | 'in_progress' | 'blocked' | 'completed',
    current_phase: p.phase,
    pipe_name: p.pipe_name,
    sla_color: p.sla_color,
    late: p.late,
    updated_at: p.updated_at,
  }))

  return (
    <StitchLayout>
      <Imoveis initialData={properties} />
    </StitchLayout>
  )
}
