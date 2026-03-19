'use client'

import { useState } from 'react' // Importe useState
import Sidebar from '@/components/Sidebar'
import { Menu, X } from 'lucide-react' // Importe os ícones de hambúrguer e fechar
import './globals.css' // Mantenha a importação dos estilos globais

export const metadata = {
  title: 'NexaWi ADS',
  description: 'Painel Administrativo NexaWi ADS',
}

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Estado para controlar a abertura do sidebar

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Botão de Hambúrguer para Mobile */}
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

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex`} {/* Visível e estático em telas maiores */}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} /> {/* Passa a função onClose para o Sidebar */}
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto md:ml-60"> {/* Adiciona margem em telas maiores */}
        {children}
      </main>
    </div>
  )
}