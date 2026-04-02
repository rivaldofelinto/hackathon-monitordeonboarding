'use client'

import { useEffect, useState } from 'react'

interface WarningItem {
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  responsible_pipe: string | null
  action: string
  imoveis?: string[]
}

interface WarningsData {
  success: boolean
  warnings: WarningItem[]
  summary: string
  analyzed_at: string
  source: 'gemini' | 'rules'
  raw?: { total_active: number; late: number; overdue: number; standby: number }
}

const SEVERITY_STYLES: Record<string, { card: string; badge: string; dot: string; icon: string }> = {
  high: {
    card: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500 animate-pulse',
    icon: 'warning',
  },
  medium: {
    card: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
    icon: 'info',
  },
  low: {
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    icon: 'help',
  },
}

const SEVERITY_LABEL: Record<string, string> = {
  high: 'Crítico',
  medium: 'Atenção',
  low: 'Info',
}

export function Warnings() {
  const [data, setData] = useState<WarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/warnings')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data?.success || !data.warnings?.length) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-green-600">check_circle</span>
        <div>
          <p className="font-semibold text-green-800">Nenhum alerta detectado</p>
          <p className="text-green-700 text-sm">Todos os imóveis estão dentro dos parâmetros esperados.</p>
        </div>
      </div>
    )
  }

  const high = data.warnings.filter(w => w.severity === 'high').length
  const medium = data.warnings.filter(w => w.severity === 'medium').length
  const analyzedAt = data.analyzed_at
    ? new Date(data.analyzed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Warnings</h2>
          {high > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 border border-red-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {high} crítico{high > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {data.source === 'gemini' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-200 text-violet-600 rounded-full font-medium">
              <span className="material-symbols-outlined text-xs" style={{ fontSize: 14 }}>auto_awesome</span>
              IA
            </span>
          )}
          {analyzedAt && <span>Atualizado {analyzedAt}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-slate-600 text-sm">{data.summary}</p>
      )}

      {/* Warning cards */}
      <div className="space-y-3">
        {data.warnings.map((w, i) => {
          const s = SEVERITY_STYLES[w.severity] ?? SEVERITY_STYLES['low']!
          const isOpen = expanded === i

          return (
            <div
              key={i}
              className={`border rounded-xl overflow-hidden transition-all ${s.card}`}
            >
              <button
                className="w-full text-left p-4 flex items-start gap-4"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>
                      {SEVERITY_LABEL[w.severity]}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-auto shrink-0">
                      {w.count !== 1 ? `${w.count} imóveis` : '1 imóvel'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{w.title}</p>
                  <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{w.description}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-sm shrink-0 mt-1 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', fontSize: 18 }}>
                  expand_more
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 ml-6 space-y-3">
                  <div className="border-t border-black/5 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ação recomendada</p>
                    <p className="text-sm text-slate-700">{w.action}</p>
                  </div>
                  {w.imoveis && w.imoveis.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Imóveis afetados (amostra)</p>
                      <div className="flex flex-wrap gap-1">
                        {w.imoveis.map(cod => (
                          <span key={cod} className="text-xs font-mono px-2 py-0.5 bg-white/80 border border-slate-200 rounded text-slate-700">
                            {cod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
