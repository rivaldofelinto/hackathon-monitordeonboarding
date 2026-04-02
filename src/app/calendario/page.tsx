import { StitchLayout } from '@/components/stitch/StitchLayout'
import { Calendario } from '@/components/stitch/Calendario'
import { fetchProperties } from '@/lib/data'

export default async function CalendarioPage() {
  const VISTORIA_PHASES = ['Fase 0 - Início', 'Fase 1 - Agendamento', 'Fase 2 - Agendada']
  const FOTOGRAFIA_PHASES = [
    'Fase 1 - Contato Franquia',
    'Fase 1.2 - Imóveis Ativos',
    'Fase 2 - Contato Fotógrafo',
    'Fase 3 - Agendadas',
  ]

  const [rawVistoria, rawFotografia] = await Promise.all([
    fetchProperties(500, ['3'], VISTORIA_PHASES),
    fetchProperties(500, ['4'], FOTOGRAFIA_PHASES),
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

  // Pipe 4: usa fase como proxy para "data confirmada" pois
  // [LT] Data confirmação de agendamento das fotos não está no metadata do Neon.
  // Fase 3 - Agendadas = foto agendada; demais fases = sem data.
  const toFotoItem = (p: (typeof rawFotografia)[number]) => ({
    ...toItem(p),
    data_vistoria: p.phase === 'Fase 3 - Agendadas' ? p.phase : '',
  })

  return (
    <StitchLayout>
      <Calendario
        vistoria={rawVistoria.map(toItem)}
        fotografia={rawFotografia.map(toFotoItem)}
      />
    </StitchLayout>
  )
}
