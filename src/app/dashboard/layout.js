'use client'

// src/app/dashboard/layout.js
// ============================================================
// Layout premium da Dashboard NexaWi ADS.
// Protege acesso direto por URL com permissÃµes por mÃ³dulo.
// Sprint 5: rotas multiempresa e dashboard do anunciante.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AccessDenied from '@/components/AccessDenied'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

const rotasProtegidas = [
  {
    path: '/dashboard/empresas',
    module: 'empresas',
    action: 'view',
    label: 'Empresas',
  },
  {
    path: '/dashboard/anunciante',
    module: 'dashboard_anunciante',
    action: 'view',
    label: 'Dashboard do Anunciante',
  },
  {
    path: '/dashboard/clientes',
    module: 'clientes',
    action: 'view',
    label: 'Clientes',
  },
  {
    path: '/dashboard/crm-clientes',
    module: 'clientes',
    action: 'view',
    label: 'CRM Clientes',
  },
  {
    path: '/dashboard/financeiro',
    module: 'financeiro',
    action: 'view',
    label: 'Financeiro',
  },
  {
    path: '/dashboard/hotspots',
    module: 'hotspots',
    action: 'view',
    label: 'Hotspots',
  },
  {
    path: '/dashboard/mikrotiks',
    module: 'hotspots',
    action: 'view',
    label: 'MikroTiks',
  },
  {
    path: '/dashboard/rede',
    module: 'hotspots',
    action: 'view',
    label: 'Controle de Rede',
  },
  {
    path: '/dashboard/anuncios',
    module: 'anuncios',
    action: 'view',
    label: 'AnÃºncios',
  },
  {
    path: '/dashboard/planos',
    module: 'planos',
    action: 'view',
    label: 'Planos',
  },
  {
    path: '/dashboard/leads',
    module: 'leads',
    action: 'view',
    label: 'Leads',
  },
  {
    path: '/dashboard/relatorio-de-acesso',
    module: 'relatorios',
    action: 'view',
    label: 'RelatÃ³rio de Acesso',
  },
  {
    path: '/dashboard/relatorios/acesso',
    module: 'relatorios',
    action: 'view',
    label: 'RelatÃ³rio de Acesso',
  },
  {
    path: '/dashboard/relatorio-comercial',
    module: 'relatorios',
    action: 'view',
    label: 'RelatÃ³rio Comercial',
  },
  {
    path: '/dashboard/relatorios/comercial',
    module: 'relatorios',
    action: 'view',
    label: 'RelatÃ³rio Comercial',
  },
  {
    path: '/dashboard/cidades',
    module: 'configuracoes',
    action: 'view',
    label: 'Cidades',
  },
  {
    path: '/dashboard/auditoria',
    module: 'auditoria',
    action: 'view',
    label: 'Auditoria',
  },
  {
    path: '/dashboard/operacao',
    module: 'auditoria',
    action: 'view',
    label: 'Operacao',
  },
  {
    path: '/dashboard/equipe',
    module: 'usuarios_admin',
    action: 'view',
    label: 'Equipe/Admins',
  },
  {
    path: '/dashboard/configuracoes',
    module: 'configuracoes',
    action: 'view',
    label: 'ConfiguraÃ§Ãµes',
  },
  {
    path: '/dashboard',
    module: 'dashboard',
    action: 'view',
    label: 'VisÃ£o Geral',
    exact: true,
  },
]

async function adminApiFetch(path) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    const error = new Error('SessÃ£o administrativa nÃ£o encontrada.')
    error.status = 401
    throw error
  }

  const response = await fetch(path, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
  })

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    const error = new Error(`A API nÃ£o retornou JSON. Status: ${response.status}`)
    error.status = response.status
    throw error
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Erro ao validar permissÃµes.')
    error.status = response.status
    throw error
  }

  return data
}

function resolverRota(pathname) {
  const rotaEncontrada = rotasProtegidas.find((rota) => {
    if (rota.exact) {
      return pathname === rota.path
    }

    return pathname === rota.path || pathname?.startsWith(`${rota.path}/`)
  })

  if (rotaEncontrada) {
    return rotaEncontrada
  }

  return {
    path: pathname,
    module: 'dashboard',
    action: 'view',
    label: 'Dashboard',
  }
}

function temPermissao({ permissions, moduleName, actionName, isMaster }) {
  if (isMaster) return true

  const modulo = permissions?.[moduleName]

  if (typeof modulo === 'boolean') {
    return modulo
  }

  if (modulo && typeof modulo === 'object') {
    return Boolean(modulo[actionName])
  }

  return false
}

function LoadingDashboard() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
          <ShieldCheck className="text-[#6be12f] animate-pulse" size={30} />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-white">
            Validando permissÃµes
          </p>

          <p className="text-xs text-neutral-500 mt-1">
            Carregando acesso administrativo...
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [accessDenied, setAccessDenied] = useState(null)
  const [adminEmail, setAdminEmail] = useState('')
  const rotaAtual = useMemo(() => resolverRota(pathname), [pathname])

  useEffect(() => {
    let cancelado = false

    async function verificarAcesso() {
      setLoadingAccess(true)
      setAccessDenied(null)

      try {
        const data = await adminApiFetch('/api/admin/me')

        if (cancelado) return

        const novasPermissoes = data?.permissions || {}
        const master = Boolean(data?.isMaster)
        const email =
          data?.adminProfile?.email ||
          data?.user?.email ||
          ''

        setAdminEmail(email)

        const permitido = temPermissao({
          permissions: novasPermissoes,
          moduleName: rotaAtual.module,
          actionName: rotaAtual.action,
          isMaster: master,
        })

        if (!permitido) {
          setAccessDenied({
            moduleLabel: rotaAtual.label,
            moduleName: rotaAtual.module,
            actionName: rotaAtual.action,
          })
        }
      } catch (error) {
        console.error('Erro ao validar acesso da dashboard:', error)

        if (cancelado) return

        if (error.status === 401) {
          router.replace('/login?expired=1')
          return
        }

        setAccessDenied({
          moduleLabel: rotaAtual.label || 'Dashboard',
          moduleName: rotaAtual.module || 'dashboard',
          actionName: rotaAtual.action || 'view',
          message: error.message || 'NÃ£o foi possÃ­vel validar seu acesso.',
        })
      } finally {
        if (!cancelado) {
          setLoadingAccess(false)
        }
      }
    }

    verificarAcesso()

    return () => {
      cancelado = true
    }
  }, [pathname, rotaAtual, router])

  return (
    <div className="dashboard-root flex min-h-screen max-w-full overflow-x-hidden bg-[#050505] text-white selection:bg-[#6be12f]/30">
      <button
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-[#0a0a0a] border border-white/[0.05] text-neutral-400 hover:text-white md:hidden transition-colors shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0a0a] border-r border-white/[0.05] flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
          md:translate-x-0 md:flex`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </aside>

      <main className="dashboard-shell relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-8 md:ml-64">
        {loadingAccess ? (
          <LoadingDashboard />
        ) : accessDenied ? (
          <AccessDenied
            moduleLabel={accessDenied.moduleLabel}
            adminEmail={adminEmail}
            message={
              accessDenied.message ||
              'VocÃª nÃ£o tem permissÃ£o para acessar esta Ã¡rea do sistema.'
            }
          />
        ) : (
          children
        )}
      </main>
    </div>
  )
}
