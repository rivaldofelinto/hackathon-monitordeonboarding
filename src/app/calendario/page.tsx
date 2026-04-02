import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Calendario } from '@/components/stitch/Calendario'
import { fetchProperties } from '@/lib/data'

export default async function CalendarioPage() {
  const [rawVistoria, rawFotografia] = await Promise.all([
    fetchProperties(300, ['3']),
    fetchProperties(300, ['4']),
  ])

  const toItem = (p: (typeof rawVistoria)[number]) => ({
    id: p.id,
    title: String(p.title ?? p.codigo_imovel ?? ''),
    phase: String(p.phase ?? ''),
    pipe_name: String(p.pipe_name ?? ''),
    status: String(p.status ?? 'active'),
    sla_color: String(p.sla_color ?? 'green'),
    late: Boolean(p.late),
    updated_at: String(p.updated_at ?? ''),
    created_at: String(p.created_at ?? ''),
    franquia: String(p.franquia ?? ''),
    analista: String(p.analista ?? ''),
    data_vistoria: String(p.data_vistoria ?? ''),
    tipo_vistoria: String(p.tipo_vistoria ?? ''),
    turno: String(p.turno ?? ''),
    link_fotos: String(p.link_fotos ?? ''),
    link_pipefy: String(p.link_pipefy ?? ''),
  })

  return (
    <StitchLayout>
      <Calendario
        vistoria={rawVistoria.map(toItem)}
        fotografia={rawFotografia.map(toItem)}
      />
    </StitchLayout>
  )
}
