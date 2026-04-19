'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ChevronRightIcon as ChevronRight,
  MapPinIcon as MapPin,
  BuildingIcon as Building2,
  UserIcon as User,
  HashIcon as Hash,
  CalendarIcon as Calendar,
  AlertIcon as AlertCircle,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle2,
} from '@/lib/icons'
import { StitchLayout } from '@/components/stitch/StitchLayout'
import { StageTimeline } from '@/components/stitch/StageTimeline'
import { StageCard } from '@/components/stitch/StageCard'

interface Stage {
  id: number
  stage_number: number
  stage_name: string
  status: string
  sla_color: string | null
  started_at: string | null
  completed_at: string | null
  blocked_reason: string | null
}

interface Activity {
  id: number
  activity_type: string
  actor: string | null
  description: string | null
  created_at: string
}

interface PropertyDetail {
  id: number
  codigo_imovel: string
  endereco: string
  cidade: string
  uf: string
  responsavel: string | null
  status: string | null
  metadata: Record<string, unknown> | null
  stages: Stage[]
  activities: Activity[]
  completed_count: number
  blocked_count: number
  in_progress_count: number
  sla_counts: { red: number; yellow: number; green: number }
  updated_at: string
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icons: Record<string, React.ReactNode> = {
    comment: <span className="text-slate-400 text-xs">💬</span>,
    transition: <CheckCircle2 size={12} className="text-emerald-500" />,
    upload: <span className="text-slate-400 text-xs">📎</span>,
    assignment: <User size={12} className="text-blue-500" />,
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 flex-shrink-0">
        {icons[activity.activity_type] ?? <Clock size={12} className="text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {activity.actor && (
            <span className="text-xs font-semibold text-slate-700">{activity.actor}</span>
          )}
          <span className="text-xs text-slate-400">
            {new Date(activity.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        {activity.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{activity.description}</p>
        )}
      </div>
    </div>
  )
}

function SLAStatus({ slaCounts }: { slaCounts: { red: number; yellow: number; green: number } }) {
  return (
    <div className="flex items-center gap-3">
      {slaCounts.red > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
          <AlertCircle size={10} />
          {slaCounts.red} atraso(s)
        </span>
      )}
      {slaCounts.yellow > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
          <Clock size={10} />
          {slaCounts.yellow} atenção
        </span>
      )}
      {slaCounts.red === 0 && slaCounts.yellow === 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          <CheckCircle2 size={10} />
          No prazo
        </span>
      )}
    </div>
  )
}

export default function ImovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) setNotFound(true)
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((json) => setData(json.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <StitchLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Carregando imóvel...</p>
          </div>
        </div>
      </StitchLayout>
    )
  }

  if (notFound || !data) {
    return (
      <StitchLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Building2 size={48} className="text-slate-200 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-700 mb-2">Imóvel não encontrado</h1>
            <p className="text-sm text-slate-400 mb-6">
              O imóvel com ID <strong>{id}</strong> não foi encontrado.
            </p>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              ← Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </StitchLayout>
    )
  }

  const activeStage = data.stages.find((s) => s.status !== 'completed')
  const currentPhaseName = activeStage?.stage_name ?? data.stages[0]?.stage_name ?? '—'
  const blockedCount = data.blocked_count

  return (
    <StitchLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight size={12} />
          <span className="text-slate-600 font-medium">Imóvel</span>
        </nav>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
                  <Building2 size={24} className="text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-800">{data.endereco}</h1>
                    {blockedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                        <AlertCircle size={10} />
                        {blockedCount} bloqueado(s)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hash size={11} />
                      {data.codigo_imovel}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {data.cidade} · {data.uf}
                    </span>
                    {data.responsavel && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {data.responsavel}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Atualizado{' '}
                      {new Date(data.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current phase info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 min-w-[200px]">
                <div className="text-xs text-slate-400 mb-1">Etapa Atual</div>
                <div className="text-sm font-semibold text-slate-700 leading-tight">
                  {currentPhaseName}
                </div>
                <div className="mt-2">
                  <SLAStatus slaCounts={data.sla_counts} />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>{data.completed_count} concluídas</span>
                  {data.in_progress_count > 0 && (
                    <span>{data.in_progress_count} em progresso</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-6 pb-6 border-t border-slate-100 pt-5">
            <StageTimeline stages={data.stages} />
          </div>
        </div>

        {/* Stage Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <StageCard stages={data.stages} />
        </div>

        {/* Activities */}
        {data.activities.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                Atividades Recentes
              </h2>
              <span className="text-xs text-slate-400">{data.activities.length} registros</span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}
      </div>
    </StitchLayout>
  )
}
