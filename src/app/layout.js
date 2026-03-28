// src/app/layout.js
'use client'

import { useState } from 'react'
import { X, Menu, ChevronsLeft, ChevronsRight } from 'lucide-react'
// CORREÇÃO AQUI: O caminho do import foi ajustado para refletir a localização real do seu Sidebar.js
import Sidebar from '../components/Sidebar' // Importa o seu componente Sidebar do caminho correto
import './globals.css'

export default function RootLayout({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)

  const sidebarWidthClass = isDesktopSidebarCollapsed ? 'w-20' : 'w-60'
  const mainMarginClass = isDesktopSidebarCollapsed ? 'md:ml-20' : 'md:ml-60'

  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen bg-gray-950">
          {/* Botão para abrir/fechar sidebar no MOBILE (canto superior direito) */}
          <button
            className="fixed top-4 right-4 z-50 p-2 rounded-full bg-gray-800 text-gray-400 md:hidden hover:bg-gray-700 transition-colors"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            {isMobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Botão para encolher/expandir sidebar no DESKTOP (canto superior esquerdo) */}
          <button
            className="fixed top-4 left-4 z-50 p-2 rounded-full bg-gray-800 text-gray-400 hidden md:block hover:bg-gray-700 transition-colors"
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          >
            {isDesktopSidebarCollapsed ? <ChevronsRight size={24} /> : <ChevronsLeft size={24} />}
          </button>

          {/* Overlay para mobile quando sidebar está aberto */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 bg-gray-900 border-r border-gray-800 flex-col transition-all duration-300 ease-in-out
              ${isMobileSidebarOpen ? "translate-x-0 flex" : "-translate-x-full hidden"}
              md:translate-x-0 md:flex ${sidebarWidthClass}`}
          >
            <Sidebar
              onClose={() => setIsMobileSidebarOpen(false)}
              isCollapsed={isDesktopSidebarCollapsed}
            />
          </aside>

          {/* Conteúdo Principal */}
          <main className={`flex-1 overflow-auto p-4 sm:p-6 md:p-8 ${mainMarginClass}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}