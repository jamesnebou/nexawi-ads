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
  Megaphone,
  BarChart2
} from 'lucide-react'

const menu = [
  { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', path: '/dashboard/clientes', icon: Users },
  { label: 'Financeiro', path: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Hotspots', path: '/dashboard/hotspots', icon: Wifi },
  { label: 'Anúncios', path: '/dashboard/anuncios', icon: Megaphone },
  { label: 'Planos', path: '/dashboard/planos', icon: Package },
  { label: 'Leads', path: '/dashboard/leads', icon: UserPlus },
  { label: 'Relatório de Acesso', path: '/dashboard/relatorios/acesso', icon: BarChart2 },
  { label: 'Configurações', path: '/dashboard/configuracoes', icon: Settings },
]

export default function Sidebar({ onClose }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    if (onClose) onClose()
  }

  return (
    <div className="min-h-screen bg-[#050505] border-r border-white/[0.05] flex flex-col relative overflow-hidden font-sans">

      {/* Efeito de luz difusa (Glow) atrás da logo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-40 bg-green-500/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Header da Logo com Efeito Premium */}
      <div className="px-6 py-10 flex items-center justify-center relative z-10 group cursor-pointer">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
          <Image
            src="/Nexa-logo.png"
            alt="Nexa Logo"
            width={140}
            height={40}
            priority
            className="object-contain relative z-10 transition-all duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
        {menu.map((item) => {
          const Icon = item.icon
          // Verifica se a rota atual começa com o path do item (útil para sub-rotas)
          const active = pathname === item.path || pathname?.startsWith(`${item.path}/`)

          return (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path)
                if (onClose) onClose()
              }}
              className={`group relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 border ${
                active
                  ? 'text-white bg-white/[0.05] border-white/[0.05] shadow-inner'
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.02] border-transparent hover:border-white/[0.02]'
              }`}
            >
              {/* Indicador lateral verde neon para o item ativo */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-green-500 rounded-r-full shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
              )}

              <Icon 
                size={20} 
                className={`transition-all duration-300 ${
                  active 
                    ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                    : 'group-hover:scale-110 group-hover:text-gray-300'
                }`} 
              />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Rodapé com botão de Sair */}
      <div className="p-6 border-t border-white/[0.05] relative z-10 bg-[#050505]">
        <button
          onClick={handleSignOut}
          className="group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold tracking-wide text-gray-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all duration-300"
        >
          <LogOut 
            size={20} 
            className="group-hover:-translate-x-1 transition-transform duration-300" 
          />
          Sair do Sistema
        </button>
      </div>

      {/* Estilo da barra de rolagem do menu corrigido */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  )
}