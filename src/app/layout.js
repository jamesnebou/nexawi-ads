// src/app/layout.js
'use client'

import { useState } from 'react'
import { X, Menu } from 'lucide-react' // Removido ChevronsLeft, ChevronsRight daqui
import Sidebar from '../components/Sidebar'
import './globals.css'

export default function RootLayout({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)

  const sidebarWidthClass = isDesktopSidebarCollapsed ? 'w-20' : 'w-60'
  const mainMarginClass = isDesktopSidebarCollapsed ? 'md:ml-20' : 'md:ml-60'

  return (
    <html lang="pt-BR">
      <head>
        {/* Se você tiver um favicon.ico na pasta src/app/, o Next.js o detectará automaticamente. */}
        {/* Se não, e você quiser usar um link, adicione aqui: <link rel="icon" href="/minha-logo-icon.png" /> */}
        {/* Outras tags meta, title, etc. podem ir aqui se você tiver */}
      </head>
      <body>
        <div className="flex min-h-screen bg-gray-950">
          {/* Botão para abrir/fechar sidebar no mobile (canto superior direito) */}
          <button
            className="fixed top-4 right-4 z-50 p-2 rounded-full bg-gray-800 text-gray-400 md:hidden hover:bg-gray-700 transition-colors"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            {isMobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* O botão de toggle do desktop será movido para dentro do Sidebar.js */}

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
              onToggleCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)} // Nova prop para o toggle
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