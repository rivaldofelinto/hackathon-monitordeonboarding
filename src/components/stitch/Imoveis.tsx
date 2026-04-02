'use client'

import { useState, useMemo } from 'react'

interface Property {
  id: string
  codigo_imovel: string
  responsavel?: string
  status: 'pending' | 'in_progress' | 'blocked' | 'completed'
  current_phase?: string
  pipe_name?: string
  sla_color?: string
  late?: boolean
  updated_at?: string
}

interface ImoveisProps {
  initialData: Property[]
}

const SLA_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  green: 'bg-green-500',
  gray: 'bg-slate-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  blocked: 'Bloqueado',
  completed: 'Concluído',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
}

export function Imoveis({ initialData }: ImoveisProps) {
  const [properties] = useState<Property[]>(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPipe, setFilterPipe] = useState<string>('all')
  const [filterFase, setFilterFase] = useState<string>('all')
  const [page, setPage] = useState(1)

  const itemsPerPage = 20

  const pipeOptions = useMemo(
    () => [...new Set(properties.map(p => p.pipe_name || ''))].filter(Boolean).sort(),
    [properties]
  )

  const faseOptions = useMemo(
    () => [...new Set(properties.map(p => p.current_phase || ''))].filter(Boolean).sort(),
    [properties]
  )

  const filtered = useMemo(() => {
    return properties.filter(p => {
      const matchSearch =
        p.codigo_imovel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.current_phase?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      const matchPipe = filterPipe === 'all' || p.pipe_name === filterPipe
      const matchFase = filterFase === 'all' || p.current_phase === filterFase
      return matchSearch && matchStatus && matchPipe && matchFase
    })
  }, [properties, searchTerm, filterStatus, filterPipe, filterFase])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  function formatDate(iso: string | undefined) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Imóveis</h1>
        <p className="text-slate-600">
          {filtered.length.toLocaleString('pt-BR')} de {properties.length.toLocaleString('pt-BR')} imóveis
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por código ou fase..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluído</option>
          <option value="blocked">Bloqueado</option>
          <option value="pending">Pendente</option>
        </select>
        <select
          value={filterPipe}
          onChange={e => { setFilterPipe(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos os pipes</option>
          {pipeOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterFase}
          onChange={e => { setFilterFase(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm max-w-[220px]"
        >
          <option value="all">Todas as fases</option>
          {faseOptions.map(f => <option key={f} value={f}>{f}</option>)}
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
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  Nenhum imóvel encontrado
                </td>
              </tr>
            ) : (
              paginatedItems.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.late ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${SLA_DOT[p.sla_color ?? 'green']}`} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.codigo_imovel}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={p.current_phase}>{p.current_phase || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.pipe_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
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
            {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filtered.length)} de {filtered.length}
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
