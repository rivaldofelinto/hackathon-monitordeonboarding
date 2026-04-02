'use client'

import { useState } from 'react'
import { useDateFilter } from '@/lib/date-filter-context'

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function weekRange() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  return { from: isoDate(monday), to: isoDate(today) }
}

function monthRange() {
  const today = new Date()
  return {
    from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: isoDate(today),
  }
}

export function DateFilter() {
  const { preset, dateFrom, setFilter, clear } = useDateFilter()
  const [localFrom, setLocalFrom] = useState('')
  const [localTo, setLocalTo] = useState('')
  const [showInterval, setShowInterval] = useState(false)

  function handlePreset(p: 'semana' | 'mes') {
    const range = p === 'semana' ? weekRange() : monthRange()
    setShowInterval(false)
    setFilter(p, range.from, range.to)
  }

  function toggleIntervalo() {
    if (preset === 'intervalo') {
      setShowInterval(false)
      clear()
    } else {
      setShowInterval(true)
      setLocalFrom('')
      setLocalTo('')
    }
  }

  function applyCustom() {
    if (localFrom && localTo && localFrom <= localTo) {
      setFilter('intervalo', localFrom, localTo)
      setShowInterval(false)
    }
  }

  const active = Boolean(dateFrom)

  return (
    <div className="px-3 mt-8 space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3 whitespace-nowrap">
        Período
      </p>

      <div className="flex gap-1.5">
        {(['semana', 'mes'] as const).map(p => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              preset === p
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      <button
        onClick={toggleIntervalo}
        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
          preset === 'intervalo'
            ? 'bg-primary text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        Intervalo de datas
      </button>

      {showInterval && (
        <div className="space-y-1.5 pt-1">
          <input
            type="date"
            value={localFrom}
            onChange={e => setLocalFrom(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <input
            type="date"
            value={localTo}
            onChange={e => setLocalTo(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={applyCustom}
            disabled={!localFrom || !localTo || localFrom > localTo}
            className="w-full py-1.5 text-xs font-semibold bg-primary text-white rounded-lg disabled:opacity-40 transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}

      {active && (
        <button
          onClick={() => { clear(); setShowInterval(false) }}
          className="w-full pt-1 text-xs text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap"
        >
          Limpar filtro
        </button>
      )}
    </div>
  )
}
