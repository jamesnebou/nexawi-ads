// src/components/Sidebar.js
'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Users, Wifi, UserPlus, DollarSign, Package, Settings, LogOut, LayoutDashboard, BarChart2
} from 'lucide-react'

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Clientes", path: "/dashboard/clientes", icon: Users },
  { label: "Hotspots", path: "/dashboard/hotspots", icon: Wifi },
  { label: "Planos", path: "/dashboard/planos", icon: Package },
  { label: "Leads", path: "/dashboard/leads", icon: UserPlus },
  { label: "Relatório de Acesso", path: "/dashboard/relatorios/acesso", icon: BarChart2 },
  { label: "Configurações", path: "/dashboard/configuracoes", icon: Settings },
];

export default function Sidebar({ onClose, isCollapsed }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    onClose()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Área do Logo */}
      <div className={`px-6 py-6 border-b border-gray-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center'}`}>
        {/* Mostra logo completo ou ícone dependendo do estado de colapso */}
        {!isCollapsed && (
          <Image
            src="/Nexa-logo.png" // Mantenha este se for o logo completo
            alt="Sua Logo"
            width={140}
            height={40}
            priority={true}
            className="object-contain"
          />
        )}
       {isCollapsed && (
  <Image
    src="/minha-logo-icon.png" // Caminho atualizado para a sua nova imagem
    alt="Logo Icon"
    width={32}
    height={32}
    priority={true}
    className="object-contain"
  />
)}
      </div>

      {/* Itens de Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path)
                onClose()
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${isActive ? "bg-green-500/10 text-green-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}
                ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon size={17} />
              {!isCollapsed && item.label}
            </button>
          )
        })}
      </nav>

      {/* Botão Sair */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors
            ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={17} />
          {!isCollapsed && "Sair"}
        </button>
      </div>
    </div>
  )
}