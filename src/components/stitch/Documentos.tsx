'use client'

import { useState, useMemo } from 'react'

interface Activity {
  id: string
  attachments_count?: number
}

interface Stage {
  id: string
  stage_name: string
  activities?: Activity[]
}

interface DocumentosProps {
  properties: Array<{
    id: string
    codigo_imovel: string
    responsavel?: string
    stages?: Stage[]
  }>
}

interface DocumentoItem {
  id: string
  codigo_imovel: string
  stage_name: string
  count: number
  responsavel?: string
}

export function Documentos({ properties }: DocumentosProps) {
  const [filterProp, setFilterProp] = useState<string>('all')

  // Agregar documentos por stage
  const documentos = useMemo(() => {
    const docs: DocumentoItem[] = []

    properties.forEach(prop => {
      prop.stages?.forEach(stage => {
        const attachCount = stage.activities?.reduce(
          (sum, act) => sum + (act.attachments_count || 0),
          0
        )

        if ((attachCount || 0) > 0) {
          docs.push({
            id: `${prop.id}-${stage.id}`,
            codigo_imovel: prop.codigo_imovel,
            stage_name: stage.stage_name,
            count: attachCount || 0,
            responsavel: prop.responsavel,
          })
        }
      })
    })

    return docs
  }, [properties])

  // Filtrar
  const filtered = useMemo(() => {
    if (filterProp === 'all') return documentos
    return documentos.filter(d => d.codigo_imovel === filterProp)
  }, [documentos, filterProp])

  const propOptions = useMemo(
    () => [...new Set(properties.map(p => p.codigo_imovel))],
    [properties]
  )

  const totalAttachments = useMemo(
    () => filtered.reduce((sum, d) => sum + d.count, 0),
    [filtered]
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Documentos</h1>
        <p className="text-slate-600">Visualize todos os anexos agregados por propriedade</p>
      </header>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={filterProp}
          onChange={e => setFilterProp(e.target.value)}
        >
          <option value="all">Todas as Propriedades</option>
          {propOptions.map(prop => (
            <option key={prop} value={prop}>
              {prop}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm text-slate-600">
          <strong>{totalAttachments}</strong> anexo(s) encontrado(s)
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-xl">
          <p className="text-blue-700 font-semibold uppercase tracking-widest text-xs mb-2">
            Total de Anexos
          </p>
          <p className="text-4xl font-extrabold text-blue-900">{totalAttachments}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 rounded-xl">
          <p className="text-purple-700 font-semibold uppercase tracking-widest text-xs mb-2">
            Fases com Documentos
          </p>
          <p className="text-4xl font-extrabold text-purple-900">{filtered.length}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-6 rounded-xl">
          <p className="text-emerald-700 font-semibold uppercase tracking-widest text-xs mb-2">
            Propriedades Ativas
          </p>
          <p className="text-4xl font-extrabold text-emerald-900">
            {filterProp === 'all' ? propOptions.length : 1}
          </p>
        </div>
      </div>

      {/* Documents Table */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Lista de Documentos</h2>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Propriedade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Fase / Estágio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-primary font-semibold">
                      {doc.codigo_imovel}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {doc.stage_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {doc.responsavel || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                        {doc.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                        <span className="material-symbols-outlined text-sm">
                          download
                        </span>
                        Baixar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
            <span className="material-symbols-outlined text-slate-400 text-4xl mx-auto block mb-3">
              folder_open
            </span>
            <p className="text-slate-600">Nenhum documento encontrado</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          💡 Sobre Documentos e Anexos
        </h3>
        <p className="text-blue-700 text-sm">
          Esta visão agrega todos os anexos (fotos, pdfs, contratos, vistorias) associados
          a cada fase do onboarding. Para visualizar ou baixar documentos específicos, clique
          em "Baixar" ou acesse a tela de Propriedades para detalhes granulares.
        </p>
      </div>
    </div>
  )
}
