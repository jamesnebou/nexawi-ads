'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { LogOut } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const menuItems = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/hotspots', icon: '📡', label: 'Hotspots' },
  { href: '/admin/anuncios', icon: '📢', label: 'Anúncios' },
  { href: '/admin/leads', icon: '👥', label: 'Leads' },
]

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    verificarAuth()
  }, [pathname])

  async function verificarAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      if (pathname !== '/admin/login') {
        router.push('/admin/login')
      }
      setCarregando(false)
      return
    }

    setUsuario(session.user)
    setCarregando(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuario) return null

  return (
    <div className="flex min-h-screen bg-[#050505] text-white selection:bg-green-500/30">
      {/* Sidebar Admin Premium */}
      <div className="w-64 bg-[#0a0a0a] border-r border-white/[0.05] flex flex-col flex-shrink-0 z-20">
        <div className="p-6 border-b border-white/[0.05]">
          <h1 className="text-xl font-extrabold text-white tracking-tight">Admin</h1>
          <p className="text-xs text-neutral-500 mt-1 font-medium truncate">{usuario.email}</p>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-1">
          {menuItems.map((item) => {
            const ativo = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3.5 text-sm font-bold transition-all duration-300 border-r-2 ${
                  ativo 
                    ? 'text-green-400 bg-green-500/10 border-green-500 shadow-inner' 
                    : 'text-neutral-500 border-transparent hover:bg-white/[0.02] hover:text-neutral-300'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-white/[0.05]">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {children}
      </div>
    </div>
  )
}