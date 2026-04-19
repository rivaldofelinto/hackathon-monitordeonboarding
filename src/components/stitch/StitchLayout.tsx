'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { DateFilter } from './DateFilter'
import { DateFilterProvider } from '@/lib/date-filter-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/calendario', label: 'Calendário' },
  { href: '/imoveis', label: 'Imóveis' },
]

export function StitchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  const isActive = (href: string) => pathname === href

  return (
    <DateFilterProvider>
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`h-screen fixed left-0 top-0 bg-white flex flex-col py-6 z-50 border-r border-slate-200/50 shadow-sm transition-all duration-300 overflow-hidden ${
          open ? 'w-52' : 'w-0'
        }`}
      >
        <div className="px-6 mb-10 whitespace-nowrap">
          <img src="/seazone-logo.png" alt="Seazone" className="h-10 w-auto" />
        </div>

        <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}

          <DateFilter />
        </nav>
      </aside>

      {/* Main Content */}
      <div
        className={`flex flex-col transition-all duration-300 flex-1 ${open ? 'ml-52' : 'ml-0'}`}
      >
        {/* Hamburger */}
        <div className="px-4 pt-4">
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-600" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="5" x2="18" y2="5"/>
              <line x1="2" y1="10" x2="18" y2="10"/>
              <line x1="2" y1="15" x2="18" y2="15"/>
            </svg>
          </button>
        </div>

        <main className="px-8 pb-12 overflow-auto flex-1">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
    </DateFilterProvider>
  )
}
