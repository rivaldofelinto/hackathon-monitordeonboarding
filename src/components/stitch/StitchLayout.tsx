'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export function StitchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/imoveis', label: 'Imóveis', icon: 'domain' },
    { href: '/calendario', label: 'Calendário', icon: 'calendar_today' },
    { href: '/documentos', label: 'description', icon: 'description' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-white flex flex-col py-6 z-50 border-r border-slate-200/50 shadow-sm">
        <div className="px-6 mb-10">
          <h1 className="text-xl font-bold text-[#000e24] tracking-tight font-headline">Monitor</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Onboarding</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-6 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <UserButton />
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">Seu Nome</p>
              <p className="text-xs text-slate-500 truncate">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 w-[calc(100%-16rem)] flex flex-col">
        {/* Header */}
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm flex justify-between items-center px-8 h-16">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Buscar imóveis ou responsáveis..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="hover:bg-slate-50 rounded-full p-2 transition-all duration-200">
              <span className="material-symbols-outlined text-slate-600">notifications</span>
            </button>
            <button className="hover:bg-slate-50 rounded-full p-2 transition-all duration-200">
              <span className="material-symbols-outlined text-slate-600">help</span>
            </button>
            <button className="bg-primary text-white px-6 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-all">
              Novo Imóvel
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="pt-20 px-8 pb-12 overflow-auto flex-1">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
