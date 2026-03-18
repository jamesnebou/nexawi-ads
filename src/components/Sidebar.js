'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import Image from 'next/image' // Importe o componente Image do Next.js
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

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-6 py-6 border-b border-gray-800 flex items-center justify-center"> {/* Adicionado flex para centralizar */}
        {/* Aqui você vai colocar sua logo */}
        <Image
          src="/Nexa-logo.png" // <--- SUBSTITUA ESTE CAMINHO PELA URL DA SUA LOGO
          alt="Sua Logo"
          width={140} // Ajuste a largura conforme o tamanho da sua logo
          height={40} // Ajuste a altura conforme o tamanho da sua logo
          priority // Opcional: para carregar a logo mais rápido
          className="object-contain" // Garante que a imagem se ajuste sem cortar
        />
        {/* Se quiser manter um subtítulo, pode adicionar aqui, ou remover */}
        {/* <p className="text-gray-500 text-xs mt-1">Painel de Controle</p> */}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
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
    </aside>
  )
}