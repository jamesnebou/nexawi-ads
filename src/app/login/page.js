'use client'

// src/app/login/page.js
// ============================================================
// Login principal da NexaWi ADS.
// Este é o login correto para acessar a dashboard premium.
//
// Fluxo correto:
// /login → autentica no Supabase → redireciona para /dashboard
//
// Importante:
// Não redirecionar mais para /admin, pois /admin é painel antigo.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, ShieldCheck } from 'lucide-react'

const supabase = createBrowserSupabaseClient()

export default function Login() {
  const router = useRouter()

  const [form, setForm] = useState({
    email: '',
    senha: '',
  })

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Se já existir sessão válida, manda direto para a dashboard premium.
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession()

      if (data?.session?.access_token) {
        router.replace('/dashboard')
      }
    }

    verificarSessao()
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()

    setCarregando(true)
    setErro('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.senha,
      })

      if (error) {
        setErro('E-mail ou senha incorretos.')
        setCarregando(false)
        return
      }

      // Atualiza a sessão no navegador e manda para a dashboard premium.
      router.refresh()
      router.replace('/dashboard')
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      setErro('Erro inesperado ao fazer login. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(107,225,47,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center shadow-[0_0_35px_rgba(107,225,47,0.18)]">
            <ShieldCheck size={34} className="text-[#6be12f]" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">
            NexaWi ADS
          </h1>

          <p className="text-neutral-500 mt-2 text-sm font-medium">
            Acesse sua dashboard administrativa
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2rem] p-7 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-300 text-sm">
                {erro}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                E-mail
              </label>

              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />

                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/40 focus:border-[#6be12f]/40 transition-all"
                  placeholder="contato@nexawi.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                Senha
              </label>

              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />

                <input
                  type="password"
                  required
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/40 focus:border-[#6be12f]/40 transition-all"
                  placeholder="Digite sua senha"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold py-4 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(107,225,47,0.25)] hover:-translate-y-0.5"
            >
              {carregando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na Dashboard'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Acesso restrito aos administradores da NexaWi ADS.
        </p>
      </div>
    </div>
  )
}