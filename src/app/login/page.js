'use client'

// src/app/login/page.js
// ============================================================
// Login principal da NexaWi ADS.
// Fluxo:
// /login → autentica no Supabase → redireciona para /dashboard
//
// Agora:
// - Mostra aviso premium para sessão expirada.
// - Mostra aviso premium após logout.
// - Não redireciona automaticamente quando vem de logout/expired.
// - Permite trocar de administrador com segurança.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogIn,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

export default function Login() {
  const router = useRouter()

  const [form, setForm] = useState({
    email: '',
    senha: '',
  })

  const [carregando, setCarregando] = useState(false)
  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState({
    type: '',
    message: '',
  })

  useEffect(() => {
    async function prepararLogin() {
      try {
        const params = new URLSearchParams(window.location.search)

        const veioDoLogout = params.get('logout') === '1'
        const sessaoExpirada = params.get('expired') === '1'
        const acessoNegado = params.get('denied') === '1'

        if (veioDoLogout) {
          await supabase.auth.signOut()

          setAviso({
            type: 'success',
            message: 'Você saiu com segurança. Entre novamente para acessar a dashboard.',
          })

          setVerificandoSessao(false)
          return
        }

        if (sessaoExpirada) {
          await supabase.auth.signOut()

          setAviso({
            type: 'warning',
            message: 'Sua sessão expirou. Faça login novamente para continuar.',
          })

          setVerificandoSessao(false)
          return
        }

        if (acessoNegado) {
          setAviso({
            type: 'warning',
            message: 'Acesso administrativo não autorizado. Entre com uma conta permitida.',
          })

          setVerificandoSessao(false)
          return
        }

        const { data } = await supabase.auth.getSession()

        if (data?.session?.access_token) {
          router.replace('/dashboard')
          return
        }

        setVerificandoSessao(false)
      } catch (error) {
        console.error('Erro ao preparar login:', error)
        setVerificandoSessao(false)
      }
    }

    prepararLogin()
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()

    setCarregando(true)
    setErro('')
    setAviso({ type: '', message: '' })

    try {
      const email = form.email.trim().toLowerCase()

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: form.senha,
      })

      if (error) {
        setErro('E-mail ou senha incorretos.')
        setCarregando(false)
        return
      }

      router.refresh()
      router.replace('/dashboard')
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      setErro('Erro inesperado ao fazer login. Tente novamente.')
      setCarregando(false)
    }
  }

  if (verificandoSessao) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%)]" />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
            <ShieldCheck className="text-[#6be12f] animate-pulse" size={30} />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-white">
              Validando sessão
            </p>

            <p className="text-xs text-neutral-500 mt-1">
              Preparando acesso administrativo...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(107,225,47,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#6be12f]/10 blur-[100px]" />
      <div className="absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-[#6be12f]/8 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center shadow-[0_0_35px_rgba(107,225,47,0.18)]">
            <ShieldCheck size={34} className="text-[#6be12f]" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-5">
            <LogIn size={13} />
            Acesso administrativo
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
            NexaWi ADS
          </h1>

          <p className="text-neutral-500 mt-2 text-sm font-medium">
            Entre para acessar sua dashboard premium
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2rem] p-7 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {aviso.message && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm border flex items-start gap-3 ${
                  aviso.type === 'success'
                    ? 'bg-[#6be12f]/10 border-[#6be12f]/20 text-[#9cf76b]'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                }`}
              >
                {aviso.type === 'success' ? (
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                )}

                <span>{aviso.message}</span>
              </div>
            )}

            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-300 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{erro}</span>
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
                  autoComplete="email"
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
                  autoComplete="current-password"
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