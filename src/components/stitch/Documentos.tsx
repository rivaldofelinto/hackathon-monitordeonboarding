'use client'

import { useState, useMemo } from 'react'

interface PropertyItem {
  id: number
  title: string
  phase: string
  pipe_name: string
  status: string
  sla_color: string
  late: boolean
  done: boolean
  updated_at: string
  created_at: string
  stage_name: string
  franquia?: string
  link_fotos?: string
  link_pipefy?: string
}

interface DocumentosProps {
  properties: PropertyItem[]
}

const SLA_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  green: 'bg-green-500',
  gray: 'bg-slate-400',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-700',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Em andamento',
  done: 'Concluído',
  blocked: 'Bloqueado',
  pending: 'Pendente',
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function Documentos({ properties }: DocumentosProps) {
  const [search, setSearch] = useState('')
  const [filterPipe, setFilterPipe] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)

  const itemsPerPage = 20

  const pipeOptions = useMemo(
    () => [...new Set(properties.map(p => p.pipe_name).filter(Boolean))].sort(),
    [properties]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return properties.filter(p => {
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.phase.toLowerCase().includes(q) ||
        p.stage_name.toLowerCase().includes(q)
      const matchPipe = filterPipe === 'all' || p.pipe_name === filterPipe
      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      return matchSearch && matchPipe && matchStatus
    })
  }, [properties, search, filterPipe, filterStatus])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const lateCount = filtered.filter(p => p.late).length
  const doneCount = filtered.filter(p => p.done || p.status === 'done').length

  const pipeGroups = useMemo(() => {
    const groups: Record<string, number> = {}
    for (const p of properties) {
      groups[p.pipe_name || 'Sem pipe'] = (groups[p.pipe_name || 'Sem pipe'] || 0) + 1
    }
    return Object.entries(groups).sort((a, b) => b[1] - a[1])
  }, [properties])

  function handleFilter(key: 'pipe' | 'status', value: string) {
    if (key === 'pipe') setFilterPipe(value)
    else setFilterStatus(value)
    setPage(1)
  }

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Descrições</h1>
        <p className="text-slate-600">Fichas detalhadas dos imóveis por pipe e fase</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Total</p>
          <p className="text-2xl font-bold text-blue-900">{properties.length.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Concluídos</p>
          <p className="text-2xl font-bold text-green-900">{doneCount.toLocaleString('pt-BR')}</p>
        </div>
        <div className={`rounded-lg p-4 border ${lateCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${lateCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            Atrasados
          </p>
          <p className={`text-2xl font-bold ${lateCount > 0 ? 'text-red-900' : 'text-slate-700'}`}>{lateCount}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Filtrados</p>
          <p className="text-2xl font-bold text-slate-700">{filtered.length.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Pipe breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Imóveis por Pipe</p>
        <div className="flex flex-wrap gap-2">
          {pipeGroups.map(([name, cnt]) => (
            <button
              key={name}
              onClick={() => handleFilter('pipe', filterPipe === name ? 'all' : name)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterPipe === name
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {name} <span className="opacity-70">({cnt.toLocaleString('pt-BR')})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por imóvel, fase ou estágio..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filterPipe}
          onChange={e => handleFilter('pipe', e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos os pipes</option>
          {pipeOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => handleFilter('status', e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="active">Em andamento</option>
          <option value="done">Concluído</option>
          <option value="blocked">Bloqueado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-10">SLA</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Imóvel</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Fase Atual</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Pipe</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Links</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Nenhum imóvel encontrado
                </td>
              </tr>
            ) : (
              paginated.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.late ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${SLA_DOT[p.sla_color] ?? 'bg-slate-400'}`} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {p.title}
                    {p.late && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                        Atrasado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={p.phase}>
                    {p.phase || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.pipe_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col gap-1">
                      {p.link_fotos && (
                        <a href={p.link_fotos} target="_blank" rel="noopener noreferrer"
                           className="text-indigo-600 hover:underline whitespace-nowrap">
                          📁 Fotos
                        </a>
                      )}
                      {p.link_pipefy && (
                        <a href={p.link_pipefy} target="_blank" rel="noopener noreferrer"
                           className="text-slate-400 hover:text-slate-600 whitespace-nowrap">
                          🔗 Pipefy
                        </a>
                      )}
                      {!p.link_fotos && !p.link_pipefy && (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(p.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filtered.length)} de {filtered.length.toLocaleString('pt-BR')}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-sm">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
