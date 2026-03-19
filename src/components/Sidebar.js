'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  Wifi,
  Package,
  UserPlus,
  DollarSign,
  Settings,
  LogOut,
  Megaphone
  } from 'lucide-react'

const menu = [
  { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', path: '/dashboard/clientes', icon: Users },
  { label: 'Financeiro', path: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Hotspots', path: '/dashboard/hotspots', icon: Wifi },
  { label: 'Anúncios', path: '/dashboard/anuncios', icon: Megaphone },
  { label: 'Planos', path: '/dashboard/planos', icon: Package },
  { label: 'Leads', path: '/dashboard/leads', icon: UserPlus },
  { label: 'Configurações', path: '/dashboard/configuracoes', icon: Settings },
]

// Adicione 'onClose' como uma prop
export default function Sidebar({ onClose }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    onClose() // Fecha o sidebar após sair
  }

  return (
    // Removida a classe 'w-60' daqui, pois o layout pai já define a largura e a posição
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="px-6 py-6 border-b border-gray-800 flex items-center justify-center">
        <Image
          src="/Nexa-logo.png"
          alt="Sua Logo"
          width={140}
          height={40}
          priority
          className="object-contain"
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path)
                onClose() // Fecha o sidebar após navegar para um item
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </div>
  )
}