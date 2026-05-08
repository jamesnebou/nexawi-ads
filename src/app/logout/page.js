'use client'

// src/app/logout/page.js
// ============================================================
// Logout oficial da NexaWi ADS.
// Encerra a sessão do Supabase, limpa tokens locais e redireciona
// para /login?logout=1.
//
// Isso evita o problema de sair e voltar automaticamente para a dashboard.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  Loader2,
  LogOut,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

function limparStorageSeguro() {
  if (typeof window === 'undefined') return

  Object.keys(window.localStorage || {}).forEach((key) => {
    const lower = key.toLowerCase()

    if (
      key.startsWith('sb-') ||
      lower.includes('supabase') ||
      lower.includes('nexawi')
    ) {
      window.localStorage.removeItem(key)
    }
  })

  Object.keys(window.sessionStorage || {}).forEach((key) => {
    const lower = key.toLowerCase()

    if (
      key.startsWith('sb-') ||
      lower.includes('supabase') ||
      lower.includes('nexawi')
    ) {
      window.sessionStorage.removeItem(key)
    }
  })
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function LogoutPage() {
  const [mensagem, setMensagem] = useState('Encerrando sessão administrativa...')
  const [finalizado, setFinalizado] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function fazerLogout() {
      try {
        setMensagem('Encerrando sessão administrativa...')

        await supabase.auth.signOut()

        if (cancelado) return

        setMensagem('Limpando credenciais locais...')

        limparStorageSeguro()

        await esperar(500)

        if (cancelado) return

        setFinalizado(true)
        setMensagem('Sessão encerrada com segurança.')

        await esperar(700)

        if (cancelado) return

        window.location.replace('/login?logout=1')
      } catch (error) {
        console.error('Erro ao sair:', error)

        limparStorageSeguro()

        window.location.replace('/login?logout=1')
      }
    }

    fazerLogout()

    return () => {
      cancelado = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(107,225,47,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#6be12f]/10 blur-[100px]" />
      <div className="absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-[#6be12f]/8 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2.5rem] p-8 sm:p-10 text-center shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl overflow-hidden relative">
          <div className="absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-[#6be12f]/10 blur-[70px]" />

          <div className="relative z-10">
            <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center shadow-[0_0_35px_rgba(107,225,47,0.18)]">
              {finalizado ? (
                <CheckCircle2 size={34} className="text-[#6be12f]" />
              ) : (
                <Loader2 size={34} className="text-[#6be12f] animate-spin" />
              )}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-5">
              {finalizado ? (
                <ShieldCheck size={13} />
              ) : (
                <LogOut size={13} />
              )}

              NexaWi ADS
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
              {finalizado ? 'Sessão encerrada' : 'Saindo do sistema'}
            </h1>

            <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
              {mensagem}
            </p>

            <div className="mt-7 rounded-2xl border border-white/[0.06] bg-[#050505] px-5 py-4 shadow-inner">
              <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-600 mb-1">
                Segurança
              </p>

              <p className="text-sm font-medium text-neutral-400">
                Limpando acesso administrativo antes de voltar ao login.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Você será redirecionado automaticamente.
        </p>
      </div>
    </div>
  )
}