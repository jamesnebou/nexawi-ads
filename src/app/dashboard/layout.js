'use client'

import { useState } from 'react'
// REMOVIDO: import Sidebar from '@/components/Sidebar' // Temporariamente removido
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Botão de Hambúrguer para Mobile (mantido fixo no topo) */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-full bg-gray-800 text-gray-400 md:hidden hover:bg-gray-700 transition-colors"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para Mobile quando o Sidebar está aberto */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Fixo para Desktop e Mobile Drawer) - AGORA COM UM PLACEHOLDER */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800 flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
          md:translate-x-0 md:flex`}
      >
        {/* PLACEHOLDER TEMPORÁRIO NO LUGAR DO SIDEBAR */}
        <div className="p-4 text-white text-center">
          Conteúdo do Sidebar (Placeholder)
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 md:ml-60">
        {children}
      </main>
    </div>
  )
}