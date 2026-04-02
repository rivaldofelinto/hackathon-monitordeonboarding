'use client'

import { useState, useMemo } from 'react'
import { formatDate } from '@/lib/stitch-utils'

interface Activity {
  id: string
  stage_name: string
  status: string
  created_at: string
  responsavel?: string
  notes?: string
  attachments_count?: number
}

interface Stage {
  id: string
  stage_name: string
  status: string
  activities?: Activity[]
}

interface CalendarioProps {
  properties: Array<{
    id: string
    codigo_imovel: string
    stages?: Stage[]
  }>
}

export function Calendario({ properties }: CalendarioProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>(
    properties[0]?.id || ''
  )

  // Agregar todas as atividades
  const allActivities = useMemo(() => {
    const activities: (Activity & { codigo_imovel: string })[] = []

    properties.forEach(prop => {
      prop.stages?.forEach(stage => {
        stage.activities?.forEach(activity => {
          activities.push({
            ...activity,
            codigo_imovel: prop.codigo_imovel,
          })
        })
      })
    })

    // Ordenar por data decrescente (mais recentes primeiro)
    return activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [properties])

  // Atividades da propriedade selecionada (últimas 10)
  const selectedActivities = useMemo(() => {
    if (!selectedProperty) return []
    return allActivities
      .filter(a => a.codigo_imovel === selectedProperty)
      .slice(0, 10)
  }, [selectedProperty, allActivities])

  const statusColorMap: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    pending: 'bg-slate-100 text-slate-800',
    blocked: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Calendário</h1>
        <p className="text-slate-600">Timeline de atividades e eventos</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Property Selector */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Propriedades</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {properties.map(prop => (
              <button
                key={prop.id}
                onClick={() => setSelectedProperty(prop.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedProperty === prop.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                <p className="font-mono text-sm">{prop.codigo_imovel}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main: Timeline */}
        <div className="lg:col-span-3 space-y-6">
          {selectedActivities.length > 0 ? (
            <div className="space-y-4">
              {selectedActivities.map((activity, idx) => (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {idx !== selectedActivities.length - 1 && (
                    <div className="absolute left-4 top-12 w-0.5 h-12 bg-slate-200" />
                  )}

                  {/* Timeline node + card */}
                  <div className="flex gap-4">
                    <div className="relative z-10">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">
                          check_circle
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 pb-6">
                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {activity.stage_name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(activity.created_at)}
                            </p>
                          </div>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              statusColorMap[activity.status] ||
                              statusColorMap.pending
                            }`}
                          >
                            {activity.status === 'completed'
                              ? 'Completo'
                              : activity.status === 'in_progress'
                                ? 'Em Progresso'
                                : activity.status === 'blocked'
                                  ? 'Bloqueado'
                                  : 'Pendente'}
                          </span>
                        </div>

                        {activity.responsavel && (
                          <p className="text-sm text-slate-600 mb-3">
                            👤 <strong>{activity.responsavel}</strong>
                          </p>
                        )}

                        {activity.notes && (
                          <p className="text-sm text-slate-700 mb-3">
                            {activity.notes}
                          </p>
                        )}

                        {activity.attachments_count && activity.attachments_count > 0 && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded">
                            <span className="material-symbols-outlined text-sm">
                              attach_file
                            </span>
                            {activity.attachments_count} anexo(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <p className="text-slate-600">
                Nenhuma atividade registrada para esta propriedade
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
