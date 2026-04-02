'use client'

import { useEffect, useState } from 'react'
import { calcularKPIs, getStatusStyle, slaColor, progressPercent, normalizeStatus } from '@/lib/stitch-utils'

interface Property {
  id: string
  codigo_imovel: string
  responsavel?: string
  status: 'pending' | 'in_progress' | 'blocked' | 'completed'
  data_prazo?: string
  current_phase?: string
  sla_color?: 'green' | 'yellow' | 'red'
}

export function Dashboard({ initialData }: { initialData: Property[] }) {
  const [properties, setProperties] = useState<Property[]>(initialData)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Opcionalmente, atualizar dados a cada 30s
    const interval = setInterval(() => {
      fetch('/api/properties')
        .then(res => res.json())
        .then(data => setProperties(data.data || []))
        .catch(console.error)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const kpis = calcularKPIs(
    properties.map(p => ({
      id: p.id,
      codigo_imovel: p.codigo_imovel,
      status: p.status,
      data_ativacao: undefined,
      data_prazo: p.data_prazo,
      responsavel: p.responsavel,
    }))
  )

  // Contadores por status
  const statusCounts = {
    total: properties.length,
    em_andamento: properties.filter(p => p.status === 'in_progress').length,
    completados: properties.filter(p => p.status === 'completed').length,
    bloqueados: properties.filter(p => p.status === 'blocked').length,
    pendentes: properties.filter(p => p.status === 'pending').length,
  }

  // Mapa de 23 estágios (do handoff)
  const stages = [
    'Onboarding',
    'Vistoria',
    'Adequações',
    'Pronto p/ Ativar',
    'Ativado',
  ]

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 font-headline">
          Visão Geral da Implantação
        </h1>
        <p className="text-slate-600">Status atual da sua carteira de ativos em ativação.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total em Progresso */}
        <div className="md:col-span-2 bg-gradient-to-br from-primary to-blue-900 p-8 rounded-xl text-white flex flex-col justify-between overflow-hidden">
          <div className="z-10">
            <p className="text-white/70 font-semibold uppercase tracking-widest text-xs mb-2">
              Total em Progresso
            </p>
            <h3 className="text-5xl font-extrabold">
              <span>{statusCounts.em_andamento}</span>{' '}
              <span className="text-lg font-medium text-white/80">imóveis</span>
            </h3>
          </div>
          <p className="text-white/60 text-sm mt-6">
            {statusCounts.em_andamento} de {statusCounts.total} propriedades em ativação
          </p>
        </div>

        {/* Completados */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <p className="text-green-700 font-semibold uppercase tracking-widest text-xs mb-3">
            Completados
          </p>
          <p className="text-3xl font-extrabold text-green-900">{statusCounts.completados}</p>
          <p className="text-green-600 text-xs mt-2">Prontos para produção</p>
        </div>

        {/* Bloqueados */}
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
          <p className="text-red-700 font-semibold uppercase tracking-widest text-xs mb-3">
            Bloqueados
          </p>
          <p className="text-3xl font-extrabold text-red-900">{statusCounts.bloqueados}</p>
          <p className="text-red-600 text-xs mt-2">Precisam de ação</p>
        </div>

        {/* Atrasados */}
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
          <p className="text-amber-700 font-semibold uppercase tracking-widest text-xs mb-3">
            Atrasados
          </p>
          <p className="text-3xl font-extrabold text-amber-900">{kpis.atrasados}</p>
          <p className="text-amber-600 text-xs mt-2">Fora do prazo</p>
        </div>
      </div>

      {/* Estágios Grid (23 stages com badges) */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Status das Fases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map(stage => {
            const count = properties.filter(
              p => p.current_phase?.includes(stage)
            ).length
            const color = count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'

            return (
              <div key={stage} className={`border rounded-lg p-4 ${color}`}>
                <h3 className="font-semibold text-slate-900 mb-2">{stage}</h3>
                <p className="text-2xl font-bold text-primary">{count}</p>
                <p className="text-xs text-slate-500 mt-1">propriedades nesta fase</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Próximos Passos</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-amber-900 font-semibold">
              🚀 {kpis.ativar_hoje} propriedades agendadas para hoje
            </p>
            <p className="text-amber-700 text-sm mt-1">Verifique o calendário para detalhes</p>
          </div>

          {kpis.atrasados > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-900 font-semibold">
                ⚠️ {kpis.atrasados} propriedades atrasadas
              </p>
              <p className="text-red-700 text-sm mt-1">
                Priorize ações para recuperar cronograma
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
