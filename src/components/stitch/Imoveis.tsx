'use client'

import { useState, useMemo } from 'react'
import { getStatusStyle, normalizeStatus } from '@/lib/stitch-utils'

interface Property {
  id: string
  codigo_imovel: string
  responsavel?: string
  status: 'pending' | 'in_progress' | 'blocked' | 'completed'
  current_phase?: string
  updated_at?: string
}

interface ImoveisProps {
  initialData: Property[]
}

export function Imoveis({ initialData }: ImoveisProps) {
  const [properties, setProperties] = useState<Property[]>(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all')
  const [filterFase, setFilterFase] = useState<string>('all')
  const [page, setPage] = useState(1)

  const itemsPerPage = 20

  // Extrair filtros únicos
  const responsavelOptions = useMemo(
    () => [...new Set(properties.map(p => p.responsavel || 'Sem atribuição'))],
    [properties]
  )

  const faseOptions = useMemo(
    () => [...new Set(properties.map(p => p.current_phase || 'Não definida'))],
    [properties]
  )

  // Filtrar properties
  const filtered = useMemo(() => {
    return properties.filter(p => {
      const matchSearch =
        p.codigo_imovel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      const matchResponsavel =
        filterResponsavel === 'all' || p.responsavel === filterResponsavel
      const matchFase = filterFase === 'all' || p.current_phase === filterFase

      return matchSearch && matchStatus && matchResponsavel && matchFase
    })
  }, [properties, searchTerm, filterStatus, filterResponsavel, filterFase])

  // Paginação
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em Progresso',
    blocked: 'Bloqueado',
    completed: 'Completo',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Imóveis</h1>
        <p className="text-slate-600">Gerenciar todas as propriedades em ativação</p>
      </header>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            className="w-full bg-white border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar por código ou responsável..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            type="text"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <select
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Progresso</option>
            <option value="blocked">Bloqueado</option>
            <option value="completed">Completo</option>
          </select>

          {/* Responsável Filter */}
          <select
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterResponsavel}
            onChange={e => {
              setFilterResponsavel(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">Todos os Responsáveis</option>
            {responsavelOptions.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Fase Filter */}
          <select
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterFase}
            onChange={e => {
              setFilterFase(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">Todas as Fases</option>
            {faseOptions.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-slate-500">
          Mostrando {paginatedItems.length} de {filtered.length} propriedades
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Responsável
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Fase Atual
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Atualizado
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map(p => (
              <tr
                key={p.id}
                className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-mono text-primary">
                  {p.codigo_imovel}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {p.responsavel || '—'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                      p.status
                    )}`}
                  >
                    {statusLabels[p.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {p.current_phase || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {p.updated_at
                    ? new Date(p.updated_at).toLocaleDateString('pt-BR')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Anterior
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === i + 1
                    ? 'bg-primary text-white'
                    : 'border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
