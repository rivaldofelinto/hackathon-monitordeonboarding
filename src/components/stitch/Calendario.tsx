'use client'

import { useState, useMemo } from 'react'
import { useDateFilter } from '@/lib/date-filter-context'

interface PropertyItem {
  id: number
  title: string
  phase: string
  pipe_name: string
  status: string
  sla_color: string
  late: boolean
  updated_at: string
  created_at: string
  franquia: string
  analista: string
  data_vistoria: string
  tipo_vistoria: string
  turno: string
  link_fotos: string
  link_pipefy: string
}

interface CalendarioProps {
  vistoria: PropertyItem[]
  fotografia: PropertyItem[]
}

const SLA_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  green: 'bg-green-500',
  gray: 'bg-slate-400',
}

const PIPE_BADGE: Record<string, string> = {
  vistoria: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  fotografia: 'bg-purple-100 text-purple-700 border-purple-200',
}

// "DD/MM/YYYY" → "YYYY-MM-DD" for sorting/grouping
function parseBRDate(br: string): string {
  if (!br || br.length < 10) return ''
  const parts = br.split('/')
  if (parts.length !== 3) return ''
  return `${parts[2] ?? ''}-${(parts[1] ?? '').padStart(2, '0')}-${(parts[0] ?? '').padStart(2, '0')}`
}

function formatDateBR(iso: string) {
  if (!iso || iso.length < 10) return '—'
  try {
    // iso can be "YYYY-MM-DD" or full ISO
    const d = new Date(iso.slice(0, 10) + 'T12:00:00')
    if (isNaN(d.getTime())) return iso.slice(0, 10)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 10) || '—'
  }
}

function groupByDate(items: PropertyItem[], tab: 'vistoria' | 'fotografia') {
  const map: Record<string, PropertyItem[]> = {}
  for (const item of items) {
    if (!item) continue
    let dateKey: string
    if (tab === 'vistoria') {
      dateKey = parseBRDate(item.data_vistoria) || 'sem-data'
    } else {
      // Pipe 4: data_vistoria é 'Fase 3 - Agendadas' quando agendada (proxy de campo)
      dateKey = item.data_vistoria ? 'com-data' : 'sem-data'
    }
    if (!map[dateKey]) map[dateKey] = []
    map[dateKey]!.push(item)
  }
  return Object.entries(map).sort((a, b) => {
    if (a[0] === 'sem-data') return 1
    if (b[0] === 'sem-data') return -1
    return a[0].localeCompare(b[0])
  })
}

function CalendarioInner({ vistoria = [], fotografia = [] }: CalendarioProps) {
  const { dateFrom, dateTo } = useDateFilter()

  const [activeTab, setActiveTab] = useState<'vistoria' | 'fotografia'>('vistoria')
  const [search, setSearch] = useState('')

  // Filter by date range when set — uses data_vistoria for pipe 3, updated_at for pipe 4
  const filterByDate = useMemo(() => {
    if (!dateFrom || !dateTo) return null
    return { from: dateFrom, to: dateTo }
  }, [dateFrom, dateTo])

  const applyDateFilter = (list: PropertyItem[]) => {
    if (!filterByDate) return list
    return list.filter(p => {
      const isoDate = parseBRDate(p.data_vistoria) || p.updated_at?.slice(0, 10)
      if (!isoDate) return false
      return isoDate >= filterByDate.from && isoDate <= filterByDate.to
    })
  }

  const filteredVistoria = useMemo(() => applyDateFilter(vistoria), [vistoria, filterByDate])
  const filteredFotografia = useMemo(() => applyDateFilter(fotografia), [fotografia, filterByDate])

  const items = activeTab === 'vistoria' ? filteredVistoria : filteredFotografia

  const filtered = useMemo(() =>
    items.filter(p =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.phase.toLowerCase().includes(search.toLowerCase()) ||
      p.franquia.toLowerCase().includes(search.toLowerCase()) ||
      p.analista.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  )

  const grouped = useMemo(() => groupByDate(filtered, activeTab), [filtered, activeTab])

  const agendadoCount = items.filter(p => Boolean(p.data_vistoria)).length
  const semDataCount = items.length - agendadoCount

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Calendário</h1>
        <p className="text-slate-600">Agendamentos de vistorias e fotografias por imóvel</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('vistoria'); setSearch('') }}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'vistoria'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🏠 Pipe 3 — Vistoria
          <span className="ml-2 text-xs font-normal text-slate-400">({filteredVistoria.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('fotografia'); setSearch('') }}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'fotografia'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📷 Pipe 4 — Fotografia
          <span className="ml-2 text-xs font-normal text-slate-400">({filteredFotografia.length})</span>
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Com data agendada</p>
          <p className="text-2xl font-bold text-green-900">{agendadoCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Sem data agendada</p>
          <p className="text-2xl font-bold text-amber-900">{semDataCount}</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={activeTab === 'vistoria'
          ? 'Buscar por imóvel, fase, franquia ou analista...'
          : 'Buscar por imóvel ou fase...'
        }
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {/* Fotografia — two-column layout: agendadas | sem data */}
      {activeTab === 'fotografia' && (
        <div className="grid grid-cols-2 gap-6">
          {(['com-data', 'sem-data'] as const).map(key => {
            const col = grouped.find(([d]) => d === key)
            const colItems = col ? col[1] : []
            const colLabel = key === 'com-data' ? 'Com data agendada' : 'Sem data agendada'
            const colColor = key === 'com-data' ? 'bg-green-500' : 'bg-amber-400'
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`text-xs font-bold px-3 py-1 rounded-full text-white ${colColor}`}>
                    {colLabel}
                  </div>
                  <span className="text-xs text-slate-400">{colItems.length} imóveis</span>
                </div>
                <div className="space-y-2">
                  {colItems.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Nenhum imóvel</p>
                  ) : colItems.map(item => (
                    <div
                      key={item.id}
                      className={`bg-white border rounded-lg p-3 ${item.late ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SLA_DOT[item.sla_color] ?? 'bg-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{item.title}</p>
                          <p className="text-xs text-slate-500 truncate">{item.phase}</p>
                          {item.turno && <p className="text-xs text-slate-400">Turno: {item.turno}</p>}
                          {item.link_pipefy && (
                            <a href={item.link_pipefy} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600">🔗 Pipefy</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vistoria — timeline grouped by date */}
      {activeTab === 'vistoria' && <div className="space-y-8">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg">
              {filterByDate ? 'Nenhum agendamento no período selecionado' : 'Nenhum agendamento encontrado'}
            </p>
          </div>
        ) : (
          grouped.map(([date, dayItems]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-xs font-bold px-3 py-1 rounded-full text-white bg-indigo-500">
                  {date === 'sem-data' ? 'Sem data agendada' : formatDateBR(date)}
                </div>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">{dayItems.length} imóveis</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dayItems.map(item => (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-lg p-4 ${item.late ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${SLA_DOT[item.sla_color] ?? 'bg-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            activeTab === 'vistoria' ? PIPE_BADGE.vistoria : PIPE_BADGE.fotografia
                          }`}>
                            {activeTab === 'vistoria' ? 'Vistoria' : 'Foto'}
                          </span>
                          {item.late && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{item.phase || 'Fase não definida'}</p>
                      </div>
                    </div>

                    {/* Rich fields — Vistoria */}
                    {activeTab === 'vistoria' && (
                      <div className="space-y-1.5 pl-5 text-xs">
                        {item.data_vistoria && (
                          <div className="flex gap-1.5">
                            <span className="text-slate-400 w-16 shrink-0">Data:</span>
                            <span className="font-medium text-slate-700">{item.data_vistoria}</span>
                          </div>
                        )}
                        {item.tipo_vistoria && (
                          <div className="flex gap-1.5">
                            <span className="text-slate-400 w-16 shrink-0">Tipo:</span>
                            <span className="text-slate-600">{item.tipo_vistoria}</span>
                          </div>
                        )}
                        {item.franquia && (
                          <div className="flex gap-1.5">
                            <span className="text-slate-400 w-16 shrink-0">Franquia:</span>
                            <span className="text-slate-700 font-medium truncate">{item.franquia.trim()}</span>
                          </div>
                        )}
                        {item.analista && (
                          <div className="flex gap-1.5">
                            <span className="text-slate-400 w-16 shrink-0">Analista:</span>
                            <span className="text-slate-600 truncate">{item.analista}</span>
                          </div>
                        )}
                        {item.link_fotos && (
                          <div className="flex gap-1.5 mt-1">
                            <a
                              href={item.link_fotos}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline text-xs font-medium"
                            >
                              📁 Pasta de fotos
                            </a>
                          </div>
                        )}
                        {item.link_pipefy && (
                          <div className="flex gap-1.5">
                            <a
                              href={item.link_pipefy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-600 text-xs"
                            >
                              🔗 Abrir no Pipefy
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>}

    </div>
  )
}

export function Calendario(props: CalendarioProps) {
  return <CalendarioInner {...props} />
}
