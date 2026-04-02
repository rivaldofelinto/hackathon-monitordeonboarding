'use client'

import { createContext, useContext, useState } from 'react'

type Preset = 'semana' | 'mes' | 'intervalo' | null

interface DateFilterCtx {
  preset: Preset
  dateFrom: string
  dateTo: string
  setFilter: (preset: Preset, from: string, to: string) => void
  clear: () => void
}

const Ctx = createContext<DateFilterCtx | null>(null)

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<Preset>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function setFilter(p: Preset, from: string, to: string) {
    setPreset(p)
    setDateFrom(from)
    setDateTo(to)
  }

  function clear() {
    setPreset(null)
    setDateFrom('')
    setDateTo('')
  }

  return (
    <Ctx.Provider value={{ preset, dateFrom, dateTo, setFilter, clear }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDateFilter() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDateFilter must be inside DateFilterProvider')
  return ctx
}
