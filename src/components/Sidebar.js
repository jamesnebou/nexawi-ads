'use client'

// Sidebar principal da dashboard premium NexaWi ADS.
// Correções:
// - O botão sair agora manda para /logout, que encerra a sessão corretamente.
// - Mostra o e-mail do administrador logado em uma caixinha verde com blur.
// - Corrige o destaque do menu "Visão Geral" para não ficar ativo em todas as páginas.

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
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
  BarChart2,
  MapPin,
  Mail,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

const menu = [
  { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', path: '/dashboard/clientes', icon: Users },
  { label: 'Financeiro', path: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Hotspots', path: '/dashboard/hotspots', icon: Wifi },
  { label: 'Anúncios', path: '/dashboard/anuncios', icon: Megaphone },
  { label: 'Planos', path: '/dashboard/planos', icon: Package },
  { label: 'Leads', path: '/dashboard/leads', icon: UserPlus },
  { label: 'Relatório de Acesso', path: '/dashboard/relatorios/acesso', icon: BarChart2 },
  { label: 'Auditoria', path: '/dashboard/auditoria', icon: ClipboardList },
  { label: 'Cidades', path: '/dashboard/cidades', icon: MapPin },
  { label: 'Configurações', path: '/dashboard/configuracoes', icon: Settings },
]

export default function Sidebar({ onClose }) {
  const pathname = usePathname()
  const router = useRouter()

  const [userEmail, setUserEmail] = useState('Carregando...')

  useEffect(() => {
    async function carregarUsuarioLogado() {
      const { data, error } = await supabase.auth.getUser()

      if (error || !data?.user?.email) {
        setUserEmail('Sessão não identificada')
        return
      }

      setUserEmail(data.user.email)
    }

    carregarUsuarioLogado()

    // Mantém o e-mail atualizado caso a sessão mude.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || 'Sessão não identificada')
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  function handleSignOut() {
    if (onClose) onClose()

    // Logout oficial.
    // A página /logout faz supabase.auth.signOut(),
    // limpa tokens locais e manda para /login?logout=1.
    router.push('/logout')
  }

  return (
    <div className="min-h-screen bg-[#050505] border-r border-white/[0.05] flex flex-col relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#6be12f]/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="px-6 py-10 flex items-center justify-center relative z-10 group cursor-pointer">
        <div className="relative">
          <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700" />
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

      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
        {menu.map((item) => {
          const Icon = item.icon

          // Corrige destaque:
          // /dashboard só fica ativo na visão geral.
          // As outras rotas ficam ativas também em subpáginas.
          const active =
            item.path === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.path || pathname?.startsWith(`${item.path}/`)

          return (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path)
                if (onClose) onClose()
              }}
              className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-300 border ${
                active
                  ? 'text-white bg-white/[0.05] border-white/[0.05] shadow-inner'
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.02] border-transparent hover:border-white/[0.02]'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#6be12f] rounded-r-full shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
              )}

              <Icon
                size={18}
                className={`transition-all duration-300 ${
                  active
                    ? 'text-[#8cf059] drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                    : 'group-hover:scale-110 group-hover:text-gray-300'
                }`}
              />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-6 border-t border-white/[0.05] relative z-10 bg-[#050505] space-y-4">
        {/* Caixa do usuário logado */}
        <div className="relative overflow-hidden rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 backdrop-blur-xl shadow-[0_0_24px_rgba(107,225,47,0.06)]">
  <div className="absolute -right-8 -top-8 w-20 h-20 rounded-full bg-[#6be12f]/15 blur-2xl pointer-events-none" />

  <div className="relative z-10 min-w-0">
    <div className="flex items-center gap-2 mb-1.5">
      <ShieldCheck size={13} className="text-[#8cf059] flex-shrink-0" />

      <p className="text-[10px] uppercase tracking-widest font-extrabold text-[#8cf059]">
        Admin logado
      </p>
    </div>

    <div className="flex items-center gap-2 min-w-0">
      <Mail size={12} className="text-[#8cf059] flex-shrink-0" />

      <p
        className="text-[11px] leading-snug font-bold text-white truncate"
        title={userEmail}
      >
        {userEmail}
      </p>
    </div>
  </div>
</div>

        <button
          onClick={handleSignOut}
          className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold tracking-wide text-gray-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all duration-300"
        >
          <LogOut
            size={20}
            className="group-hover:-translate-x-1 transition-transform duration-300"
          />
          Sair do Sistema
        </button>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          `,
        }}
      />
    </div>
  )
}