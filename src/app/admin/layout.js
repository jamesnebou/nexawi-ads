'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

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

  // Página de login não usa o layout com sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuario) return null

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
      {/* Sidebar admin — completamente isolada do dashboard */}
      <div style={{ width: '240px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Admin</h1>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{usuario.email}</p>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {menuItems.map((item) => {
            const ativo = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  color: ativo ? '#1d4ed8' : '#374151',
                  background: ativo ? '#eff6ff' : 'transparent',
                  borderRight: ativo ? '2px solid #1d4ed8' : '2px solid transparent',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>🚪</span> Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}