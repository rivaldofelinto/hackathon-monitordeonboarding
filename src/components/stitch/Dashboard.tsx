'use client'

import { useEffect, useState } from 'react'
import { Warnings } from './Warnings'
import { useDateFilter } from '@/lib/date-filter-context'

interface StageRecord {
  id: number
  stage_name: string
  status: string
  sla_color: string | null
}

interface PropertyRecord {
  id: number
  codigo_imovel: string
  endereco: string
  status: string | null
  metadata: {
    pipe?: string
    pipe_name?: string
    title?: string
    phase?: string
    late?: boolean
    overdue?: boolean
    done?: boolean
    anfitriao?: string
    phase_started_at?: string
    tipo_de_adequacao?: string
  } | null
  stages: StageRecord[]
  created_at: string
  updated_at: string
}

interface PhaseGroup {
  label: string
  count: number
}

interface Stats {
  total: number
  active: number
  standby: number
  blocked: number
  sla_red: number
  sla_ok: number
  phaseGroups?: PhaseGroup[]
}

interface TopPhaseData {
  fase3: PropertyRecord[]
  fase5: PropertyRecord[]
}

// SLA detection from real Nekt data
function getSlaColor(property: PropertyRecord): 'red' | 'yellow' | 'green' {
  if (property.metadata?.late) return 'red'
  const redStage = property.stages?.find(s => s.sla_color === 'red')
  if (redStage) return 'red'
  const yellowStage = property.stages?.find(s => s.sla_color === 'yellow')
  if (yellowStage) return 'yellow'
  return 'green'
}


const PHASE_GROUPS = [
  {
    label: 'Iniciando Onboarding',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    bar: 'bg-slate-400',
    phases: ['Backlog', 'Fase 1 - Contato Franquia', 'Fase 2 - Setup Interno'],
  },
  {
    label: 'Vistorias',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    bar: 'bg-blue-500',
    phases: ['Fase 3 - Vistoria Inicial'],
  },
  {
    label: 'Adequação',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    bar: 'bg-amber-400',
    phases: ['Fase 4 - Configuração do imóvel/Taxa de limpeza', 'Fase 5 - Adequação/ Enxoval'],
  },
  {
    label: 'INDO PARA ATIVAÇÃO',
    subtitle: 'contém imóveis em revisão',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    bar: 'bg-violet-500',
    phases: ['Fase 6 - Handover', 'Fase 7 - Revisão/Limpeza/Fotos amadoras', 'Fase 8 - Ativação de Anúncio'],
  },
  {
    label: 'Fotos Profissionais e Pendências',
    color: 'bg-green-50 text-green-700 border-green-200',
    bar: 'bg-green-500',
    phases: ['Fase 9 - Fotografia', 'Fase 10 - Pendências + Registro vistoria no SAPRON'],
  },
]

function DashboardInner({ initialData }: { initialData: PropertyRecord[] }) {
  const { dateFrom, dateTo, preset } = useDateFilter()

  const [properties, setProperties] = useState<PropertyRecord[]>(initialData)
  const [stats, setStats] = useState<Stats | null>(null)
  const [topPhase, setTopPhase] = useState<TopPhaseData | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/properties/top-phase')
      .then(res => res.json())
      .then(data => { if (data.success) setTopPhase(data) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const qs = dateFrom && dateTo ? `?dateFrom=${dateFrom}&dateTo=${dateTo}` : ''

    fetch(`/api/properties/stats${qs}`)
      .then(res => res.json())
      .then(data => { if (data.success) setStats(data) })
      .catch(console.error)

    const interval = setInterval(() => {
      fetch(`/api/properties${qs}`)
        .then(res => res.json())
        .then(data => setProperties(data.data || []))
        .catch(console.error)
    }, 30000)

    return () => clearInterval(interval)
  }, [dateFrom, dateTo])

  const dateLabel = preset === 'semana' ? 'esta semana'
    : preset === 'mes' ? 'este mês'
    : dateFrom && dateTo ? `${dateFrom.split('-').reverse().join('/')} – ${dateTo.split('-').reverse().join('/')}`
    : null

  // Phase breakdown — use DB-level counts from stats (full dataset) when available,
  // fall back to local sample filter only as a loading placeholder
  const pipe1 = properties.filter(p => p.metadata?.pipe === '1')
  const pipe1Total = stats?.total ?? pipe1.length
  const phaseGroupCounts = PHASE_GROUPS.map((group, i) => ({
    ...group,
    count: stats?.phaseGroups?.[i]?.count ??
      pipe1.filter(p =>
        group.phases.some(ph => p.metadata?.phase === ph || p.metadata?.phase?.includes(ph))
      ).length,
  }))

  // SLA breakdown from local sample
  const localSlaRed = properties.filter(p => getSlaColor(p) === 'red').length

  const totalToShow = stats?.total ?? properties.length
  const activeToShow = stats?.active ?? properties.filter(p => p.status === 'active').length
  const standbyToShow = stats?.standby ?? 0
  const slaRedToShow = stats?.sla_red ?? localSlaRed

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 font-headline">
          Visão Geral da Implantação
        </h1>
        <p className="text-slate-500 text-sm">
          {totalToShow.toLocaleString('pt-BR')} registros monitorados em 7 pipes
          {dateLabel && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {dateLabel}
            </span>
          )}
        </p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total */}
        <div className="md:col-span-2 bg-gradient-to-br from-primary to-blue-900 p-8 rounded-xl text-white flex flex-col justify-between">
          <div>
            <p className="text-white/70 font-semibold uppercase tracking-widest text-xs mb-2">
              Total Monitorado
            </p>
            <h3 className="text-5xl font-extrabold">
              {totalToShow.toLocaleString('pt-BR')}
              <span className="text-lg font-medium text-white/80 ml-2">imóveis</span>
            </h3>
          </div>
          <p className="text-white/60 text-sm mt-6">
            {activeToShow.toLocaleString('pt-BR')} aptos a implantar
          </p>
        </div>

        {/* SLA Alerta */}
        <div className={`p-6 rounded-xl border ${slaRedToShow > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${slaRedToShow > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <p className={`font-semibold uppercase tracking-widest text-xs ${slaRedToShow > 0 ? 'text-red-700' : 'text-slate-600'}`}>
              SLA Crítico
            </p>
          </div>
          <p className={`text-3xl font-extrabold ${slaRedToShow > 0 ? 'text-red-900' : 'text-slate-700'}`}>
            {slaRedToShow.toLocaleString('pt-BR')}
          </p>
          <p className={`text-xs mt-2 ${slaRedToShow > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {slaRedToShow > 0 ? 'Fora do prazo — ação necessária' : 'Todos no prazo'}
          </p>
        </div>
      </div>

      {/* Ativos em andamento */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-amber-900 font-semibold">
            {activeToShow.toLocaleString('pt-BR')} imóveis ativamente em onboarding
          </p>
          <p className="text-amber-700 text-sm">
            Aguardando próximas ações nas fases de implantação
          </p>
        </div>
        {slaRedToShow > 0 && (
          <div className="ml-auto flex items-center gap-2 bg-red-100 border border-red-200 px-3 py-2 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-700 font-semibold text-sm">
              {slaRedToShow} com SLA vermelho
            </span>
          </div>
        )}
      </div>

      {/* Phase Distribution — Pipe Mãe only */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Distribuição por Fase</h2>
          <span className="text-xs text-slate-400">Pipe Mãe (303781436) · {pipe1Total.toLocaleString('pt-BR')} imóveis</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {phaseGroupCounts.map(group => (
            <div key={group.label} className={`border rounded-xl p-4 ${group.color}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70 leading-tight">{group.label}</p>
              {'subtitle' in group && group.subtitle && (
                <p className="text-[10px] opacity-50 mb-1 leading-tight">{group.subtitle as string}</p>
              )}
              <p className="text-3xl font-extrabold mt-1">{group.count.toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 por Fase — maior tempo parado */}
      {topPhase && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Alertas SLA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fase 3 */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">
                Fase 3 — Vistoria Inicial
              </h3>
              <div className="space-y-2">
                {topPhase.fase3.map(p => {
                  const cardId = `${p.id}`
                  const isOpen = expandedCard === cardId
                  const days = p.metadata?.phase_started_at
                    ? Math.floor((Date.now() - new Date(p.metadata.phase_started_at).getTime()) / 86400000)
                    : null
                  return (
                    <button
                      key={p.id}
                      onClick={() => setExpandedCard(isOpen ? null : cardId)}
                      className="w-full text-left bg-white border border-blue-100 hover:border-blue-300 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {p.metadata?.title || p.codigo_imovel}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {days !== null ? `${days} dias na fase` : '—'}
                          </p>
                        </div>
                        <span className="text-slate-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && (
                        <p className="text-xs text-blue-600 font-medium mt-2 pt-2 border-t border-blue-100">
                          Anfitrião: {p.metadata?.anfitriao || 'Não definido'}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fase 5 */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700 mb-3">
                Fase 5 — Adequação/Enxoval
              </h3>
              <div className="space-y-2">
                {topPhase.fase5.map(p => {
                  const cardId = `${p.id}`
                  const isOpen = expandedCard === cardId
                  const days = p.metadata?.phase_started_at
                    ? Math.floor((Date.now() - new Date(p.metadata.phase_started_at).getTime()) / 86400000)
                    : null
                  return (
                    <button
                      key={p.id}
                      onClick={() => setExpandedCard(isOpen ? null : cardId)}
                      className="w-full text-left bg-white border border-amber-100 hover:border-amber-300 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {p.metadata?.title || p.codigo_imovel}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {days !== null ? `${days} dias na fase` : '—'}
                          </p>
                        </div>
                        <span className="text-slate-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && (
                        <p className="text-xs text-amber-700 font-medium mt-2 pt-2 border-t border-amber-100">
                          {p.metadata?.tipo_de_adequacao || 'Tipo não definido'}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings & Gargalos — AI-powered */}
      <Warnings />

    </div>
  )
}

export function Dashboard({ initialData }: { initialData: PropertyRecord[] }) {
  return <DashboardInner initialData={initialData} />
}
