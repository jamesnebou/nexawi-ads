'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#050505] text-white selection:bg-green-500/30">
      {/* Botão de Hambúrguer para Mobile */}
      <button
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-[#0a0a0a] border border-white/[0.05] text-neutral-400 hover:text-white md:hidden transition-colors shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay para Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Premium */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0a0a] border-r border-white/[0.05] flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
          md:translate-x-0 md:flex`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 md:ml-64 relative z-10">
        {children}
      </main>
    </div>
  )
}