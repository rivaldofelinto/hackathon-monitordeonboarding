'use client'

import { useEffect, useState } from 'react'
import { getStatusStyle, normalizeStatus } from '@/lib/stitch-utils'

interface StageRecord {
  id: number
  stage_name: string
  status: string
  sla_color: string
}

interface PropertyRecord {
  id: number
  codigo_imovel: string
  endereco: string
  status: string
  metadata: {
    pipe: string
    pipe_name: string
    title: string
    phase: string
    late: boolean
    overdue: boolean
    done: boolean
  }
  stages: StageRecord[]
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  active: number
  done: number
  blocked: number
  sla_red: number
  sla_ok: number
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

const SLA_BADGE: Record<string, string> = {
  red:    'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-amber-100 text-amber-700 border-amber-200',
  green:  'bg-green-100 text-green-700 border-green-200',
}

const SLA_DOT: Record<string, string> = {
  red:    'bg-red-500',
  yellow: 'bg-amber-400',
  green:  'bg-green-500',
}

export function Dashboard({ initialData }: { initialData: PropertyRecord[] }) {
  const [properties, setProperties] = useState<PropertyRecord[]>(initialData)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load global stats
    fetch('/api/properties/stats')
      .then(res => res.json())
      .then(data => { if (data.success) setStats(data) })
      .catch(console.error)

    // Refresh properties every 30s
    const interval = setInterval(() => {
      fetch('/api/properties')
        .then(res => res.json())
        .then(data => setProperties(data.data || []))
        .catch(console.error)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Phase breakdown from local 100-property sample
  const phaseCounts: Record<string, { count: number; late: number }> = {}
  for (const p of properties) {
    const phase = p.metadata?.phase || 'Desconhecido'
    if (!phaseCounts[phase]) phaseCounts[phase] = { count: 0, late: 0 }
    phaseCounts[phase].count++
    if (p.metadata?.late) phaseCounts[phase].late++
  }
  const topPhases = Object.entries(phaseCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)

  // SLA breakdown from local sample
  const localSlaRed = properties.filter(p => getSlaColor(p) === 'red').length
  const localSlaYellow = properties.filter(p => getSlaColor(p) === 'yellow').length

  const totalToShow = stats?.total ?? properties.length
  const activeToShow = stats?.active ?? properties.filter(p => p.status === 'active').length
  const doneToShow = stats?.done ?? properties.filter(p => p.status === 'done').length
  const slaRedToShow = stats?.sla_red ?? localSlaRed

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 font-headline">
          Visão Geral da Implantação
        </h1>
        <p className="text-slate-500 text-sm">
          {totalToShow.toLocaleString('pt-BR')} registros monitorados em 7 pipes Pipefy
        </p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            {activeToShow.toLocaleString('pt-BR')} ativos · {doneToShow.toLocaleString('pt-BR')} concluídos
          </p>
        </div>

        {/* Concluídos */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-green-700 font-semibold uppercase tracking-widest text-xs">
              Concluídos
            </p>
          </div>
          <p className="text-3xl font-extrabold text-green-900">
            {doneToShow.toLocaleString('pt-BR')}
          </p>
          <p className="text-green-600 text-xs mt-2">Onboarding finalizado</p>
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

      {/* Phases breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Distribuição por Fase</h2>
          <span className="text-xs text-slate-400">amostra de {properties.length} registros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topPhases.map(([phase, data]) => {
            const hasAlert = data.late > 0
            return (
              <div
                key={phase}
                className={`border rounded-lg p-4 ${hasAlert ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight">{phase}</h3>
                  {hasAlert && (
                    <span className="ml-2 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {data.late} late
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">{data.count}</p>
                <p className="text-xs text-slate-500 mt-1">imóveis nesta fase</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* SLA Badge List — top at-risk properties */}
      {localSlaRed > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Alertas SLA</h2>
          <div className="grid grid-cols-1 gap-3">
            {properties
              .filter(p => getSlaColor(p) === 'red')
              .slice(0, 10)
              .map(p => (
                <div key={p.id} className="bg-white border border-red-200 rounded-lg p-4 flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {p.metadata?.title || p.codigo_imovel}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{p.metadata?.phase}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${SLA_BADGE.red}`}>
                      SLA Crítico
                    </span>
                    <span className="text-xs text-slate-400">{p.metadata?.pipe_name}</span>
                  </div>
                </div>
              ))}
            {localSlaRed > 10 && (
              <p className="text-center text-sm text-slate-500 py-2">
                + {localSlaRed - 10} imóveis com SLA crítico adicionais
              </p>
            )}
          </div>
        </div>
      )}

      {/* SLA Summary banner */}
      <div className="grid grid-cols-3 gap-4">
        {(['red', 'yellow', 'green'] as const).map(color => {
          const count = color === 'red' ? localSlaRed : color === 'yellow' ? localSlaYellow : properties.length - localSlaRed - localSlaYellow
          const labels = { red: 'SLA Crítico', yellow: 'SLA Atenção', green: 'SLA OK' }
          return (
            <div key={color} className={`border rounded-lg p-4 flex items-center gap-3 ${SLA_BADGE[color]}`}>
              <span className={`w-3 h-3 rounded-full shrink-0 ${SLA_DOT[color]}`} />
              <div>
                <p className="font-bold text-lg">{count}</p>
                <p className="text-xs font-semibold">{labels[color]}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
