'use client'

// src/app/logout/page.js
// ============================================================
// Logout oficial da NexaWi ADS.
// Esta página encerra a sessão do Supabase antes de mandar
// o usuário de volta para /login.
//
// Motivo:
// Se apenas redirecionar para /login sem signOut,
// o login detecta a sessão ativa e manda de volta para /dashboard.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const supabase = createBrowserSupabaseClient()

export default function LogoutPage() {
  const [mensagem, setMensagem] = useState('Encerrando sessão...')

  useEffect(() => {
    async function fazerLogout() {
      try {
        setMensagem('Encerrando sessão administrativa...')

        // Encerra a sessão no Supabase.
        await supabase.auth.signOut()

        // Limpeza extra de segurança no navegador.
        // Remove tokens antigos que possam estar presos no localStorage.
        if (typeof window !== 'undefined') {
          Object.keys(window.localStorage || {}).forEach((key) => {
            if (
              key.startsWith('sb-') ||
              key.toLowerCase().includes('supabase') ||
              key.toLowerCase().includes('nexawi')
            ) {
              window.localStorage.removeItem(key)
            }
          })

          Object.keys(window.sessionStorage || {}).forEach((key) => {
            if (
              key.startsWith('sb-') ||
              key.toLowerCase().includes('supabase') ||
              key.toLowerCase().includes('nexawi')
            ) {
              window.sessionStorage.removeItem(key)
            }
          })
        }

        setMensagem('Sessão encerrada. Redirecionando...')

        // Hard redirect para evitar cache de rota/sessão antiga.
        window.location.replace('/login?logout=1')
      } catch (error) {
        console.error('Erro ao sair:', error)

        // Mesmo se der erro, força ida para o login.
        window.location.replace('/login?logout=1')
      }
    }

    fazerLogout()
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2rem] p-8 w-full max-w-md text-center shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <Loader2 size={28} className="text-[#6be12f] animate-spin" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight mb-2">
          Saindo da NexaWi ADS
        </h1>

        <p className="text-sm text-neutral-500">
          {mensagem}
        </p>
      </div>
    </div>
  )
}