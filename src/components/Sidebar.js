'use client'

// src/components/Sidebar.js
// Sidebar principal da dashboard premium NexaWi ADS.

import { useEffect, useMemo, useState } from 'react'
import { Poppins } from 'next/font/google'
import { usePathname, useRouter } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
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
  Crown,
  LifeBuoy,
  Bell,
  ServerCog,
  Network,
  Router as RouterIcon,
  Building2,
  FileText,
  ClipboardCheck,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

const SESSION_CHECK_TIMEOUT_MS = 8000
const ADMIN_API_TIMEOUT_MS = 12000

function withTimeout(promise, timeoutMs, message) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const menu = [
  {
    label: 'Visão Geral',
    path: '/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
  },
  {
    label: 'Empresas',
    path: '/dashboard/empresas',
    icon: Building2,
    module: 'empresas',
  },
  {
    label: 'Dashboard Anunciante',
    path: '/dashboard/anunciante',
    icon: BarChart2,
    module: 'dashboard_anunciante',
  },
  {
    label: 'Anúncios',
    path: '/dashboard/anuncios',
    icon: Megaphone,
    module: 'anuncios',
  },
  {
    label: 'Clientes',
    path: '/dashboard/clientes',
    icon: Users,
    module: 'clientes',
  },
  {
    label: 'CRM Clientes',
    path: '/dashboard/crm-clientes',
    icon: Users,
    module: 'clientes',
  },
  {
    label: 'Contratos',
    path: '/dashboard/contratos',
    icon: FileText,
    module: 'empresas',
  },
  {
    label: 'Hotspots',
    path: '/dashboard/hotspots',
    icon: Wifi,
    module: 'hotspots',
  },
  {
    label: 'MikroTiks',
    path: '/dashboard/mikrotiks',
    icon: RouterIcon,
    module: 'hotspots',
  },
  {
    label: 'Controle de Rede',
    path: '/dashboard/rede',
    icon: Network,
    module: 'hotspots',
  },
  {
    label: 'Wi-Fi no Pix',
    path: '/dashboard/wifi-pix',
    icon: DollarSign,
    module: 'hotspots',
  },
  {
    label: 'Financeiro',
    path: '/dashboard/financeiro',
    icon: DollarSign,
    module: 'financeiro',
  },
  {
    label: 'Leads',
    path: '/dashboard/leads',
    icon: UserPlus,
    module: 'leads',
  },
  {
    label: 'Cidades',
    path: '/dashboard/cidades',
    icon: MapPin,
    module: 'configuracoes',
  },
  {
    label: 'Checklist Cidade',
    path: '/dashboard/cidades/checklist',
    icon: ClipboardCheck,
    module: 'configuracoes',
  },
  {
    label: 'Planos',
    path: '/dashboard/planos',
    icon: Package,
    module: 'planos',
  },
  {
    label: 'Relatório de Acesso',
    path: '/dashboard/relatorios/acesso',
    icon: BarChart2,
    module: 'relatorios',
  },
  {
    label: 'Relatório Comercial',
    path: '/dashboard/relatorios/comercial',
    icon: BarChart2,
    module: 'relatorios',
  },
  {
    label: 'Notificações',
    path: '/dashboard/notificacoes',
    icon: Bell,
    module: 'dashboard',
  },
  {
    label: 'Suporte',
    path: '/dashboard/suporte',
    icon: LifeBuoy,
    module: 'suporte',
  },
  {
    label: 'Auditoria',
    path: '/dashboard/auditoria',
    icon: ClipboardList,
    module: 'auditoria',
  },
  {
    label: 'Operacao',
    path: '/dashboard/operacao',
    icon: ServerCog,
    module: 'auditoria',
  },
  {
    label: 'Equipe',
    path: '/dashboard/equipe',
    icon: Crown,
    module: 'usuarios_admin',
  },
  {
    label: 'Configurações',
    path: '/dashboard/configuracoes',
    icon: Settings,
    module: 'configuracoes',
  },
]

async function adminApiFetch(path) {
  const { data: sessionData, error: sessionError } = await withTimeout(
    supabase.auth.getSession(),
    SESSION_CHECK_TIMEOUT_MS,
    'Tempo excedido ao validar sessão administrativa.'
  )

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada.')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_API_TIMEOUT_MS)

  let response

  try {
    response = await fetch(path, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo excedido ao buscar permissões administrativas.')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`A API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao buscar permissões.')
  }

  return data
}

function temAlgumaPermissaoNoModulo(permissions, moduleName, isMaster = false) {
  if (isMaster) return true
  if (!moduleName) return true

  const modulo = permissions?.[moduleName]

  if (typeof modulo === 'boolean') {
    return modulo
  }

  if (modulo && typeof modulo === 'object') {
    return Object.values(modulo).some(Boolean)
  }

  return false
}

export default function Sidebar({ onClose }) {
  const pathname = usePathname()
  const router = useRouter()

  const [userEmail, setUserEmail] = useState('Carregando...')
  const [empresaNome, setEmpresaNome] = useState('')
  const [permissions, setPermissions] = useState({})
  const [isMaster, setIsMaster] = useState(false)
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  async function buscarNotificacoesNaoLidas() {
    try {
      const data = await adminApiFetch('/api/admin/notificacoes?limit=30')
      setUnreadNotifications(Number(data.unreadCount || 0))
    } catch (error) {
      console.error('Erro ao buscar notificações não lidas:', error)
    }
  }

  useEffect(() => {
    buscarNotificacoesNaoLidas()

    const interval = setInterval(() => {
      buscarNotificacoesNaoLidas()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function carregarAdminLogado() {
      setCarregandoPermissoes(true)
      buscarNotificacoesNaoLidas()

      try {
        const data = await adminApiFetch('/api/admin/me')

        setUserEmail(
          data?.adminProfile?.email ||
          data?.user?.email ||
          'Admin não identificado'
        )

        const activeEmpresaId = data?.adminProfile?.empresa_scope?.activeEmpresaId
        const empresaAtiva = (data?.adminProfile?.empresas || [])
          .find((item) => item.empresa_id === activeEmpresaId)

        setEmpresaNome(empresaAtiva?.empresa?.nome_empresa || '')
        setPermissions(data?.permissions || {})
        setIsMaster(Boolean(data?.isMaster))
      } catch (error) {
        console.error('Erro ao carregar admin logado:', error)

        setUserEmail('Sessão não identificada')
        setEmpresaNome('')
        setPermissions({})
        setIsMaster(false)
      } finally {
        setCarregandoPermissoes(false)
      }
    }

    carregarAdminLogado()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.email) {
        setUserEmail('Sessão não identificada')
        setEmpresaNome('')
        setPermissions({})
        setIsMaster(false)
        return
      }

      carregarAdminLogado()
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const menuPermitido = useMemo(() => {
    return menu.filter((item) =>
      temAlgumaPermissaoNoModulo(permissions, item.module, isMaster)
    )
  }, [permissions, isMaster])

  function handleSignOut() {
    if (onClose) onClose()
    router.push('/logout')
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-[#050505] border-r border-white/[0.05] flex flex-col relative overflow-hidden`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#6be12f]/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="px-6 py-8 flex items-center justify-center relative z-10 group cursor-pointer">
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
        {carregandoPermissoes ? (
          <div className="px-4 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-neutral-600">
            Carregando permissões...
          </div>
        ) : (
          menuPermitido.map((item) => {
            const Icon = item.icon
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

                <span className="flex-1 text-left truncate">
                  {item.label}
                </span>

                {item.path === '/dashboard/notificacoes' && unreadNotifications > 0 && (
                  <span className="relative flex h-3 w-3 flex-shrink-0 ml-auto">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                  </span>
                )}
              </button>
            )
          })
        )}
      </nav>

      <div className="p-5 border-t border-white/[0.05] relative z-10 bg-[#050505] space-y-4">
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

              <p className="text-[11px] leading-snug font-bold text-white truncate" title={userEmail}>
                {userEmail}
              </p>
            </div>

            {empresaNome && (
              <p className="text-[10px] leading-snug font-bold text-[#8cf059] truncate mt-2" title={empresaNome}>
                Empresa: {empresaNome}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold tracking-wide text-gray-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all duration-300"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
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
