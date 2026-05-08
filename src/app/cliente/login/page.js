'use client'

// src/app/cliente/login/page.js
// ============================================================
// Login premium da Área do Cliente NexaWi ADS.
// Fluxo:
// - Cliente entra com e-mail e senha.
// - Supabase Auth valida.
// - API /api/cliente/me confirma se é cliente válido.
// - Redireciona para /cliente/dashboard.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  LogIn,
} from 'lucide-react'

const supabase = createClient()

async function validarClienteLogado() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão não encontrada.')
  }

  const response = await fetch('/api/cliente/me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error || 'Este acesso não pertence a um cliente válido.')
  }

  return data
}

export default function ClientLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState({ type: '', message: '' })

  useEffect(() => {
    async function prepararLogin() {
      try {
        const params = new URLSearchParams(window.location.search)

        const logout = params.get('logout') === '1'
        const expired = params.get('expired') === '1'

        if (logout) {
          await supabase.auth.signOut()
          setAviso({
            type: 'success',
            message: 'Você saiu com segurança. Entre novamente para acessar seu painel.',
          })
          setChecking(false)
          return
        }

        if (expired) {
          await supabase.auth.signOut()
          setAviso({
            type: 'warning',
            message: 'Sua sessão expirou. Faça login novamente para continuar.',
          })
          setChecking(false)
          return
        }

        const { data } = await supabase.auth.getSession()

        if (data?.session?.access_token) {
          try {
            await validarClienteLogado()
            router.replace('/cliente/dashboard')
            return
          } catch {
            await supabase.auth.signOut()
          }
        }

        setChecking(false)
      } catch (err) {
        console.error('Erro ao preparar login do cliente:', err)
        setChecking(false)
      }
    }

    prepararLogin()
  }, [router])

  async function handleLogin(e) {
  e.preventDefault()

  setLoading(true)
  setError('')
  setAviso({ type: '', message: '' })

  const emailLogin = email.trim().toLowerCase()
  const senhaDigitada = password.trim()
  const senhaLimpa = password.replace(/\D/g, '').trim()

  try {
    let loginError = null

    // 1. Primeiro tenta exatamente como o cliente digitou.
    const primeiraTentativa = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: senhaDigitada,
    })

    loginError = primeiraTentativa.error

    // 2. Se falhar e a senha tiver versão numérica diferente,
    // tenta como CPF/CNPJ sem pontos, traços ou barras.
    if (loginError && senhaLimpa && senhaLimpa !== senhaDigitada) {
      const segundaTentativa = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: senhaLimpa,
      })

      loginError = segundaTentativa.error
    }

    if (loginError) {
      if (loginError.message.includes('Email not confirmed')) {
        throw new Error('Acesso bloqueado: este e-mail ainda aguarda confirmação.')
      }

      if (loginError.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos. Verifique suas credenciais.')
      }

      throw loginError
    }

    await validarClienteLogado()

    router.refresh()
    router.replace('/cliente/dashboard')
  } catch (err) {
    console.error('Erro detalhado no login do cliente:', err)

    await supabase.auth.signOut()

    setError(err.message || 'Erro ao conectar. Tente novamente.')
    setLoading(false)
  }
}

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%)]" />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
            <ShieldCheck className="text-[#6be12f] animate-pulse" size={30} />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-white">Validando acesso</p>
            <p className="text-xs text-neutral-500 mt-1">
              Preparando painel do cliente...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden selection:bg-[#6be12f]/30 font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(107,225,47,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center shadow-[0_0_35px_rgba(107,225,47,0.18)]">
            <ShieldCheck size={34} className="text-[#6be12f]" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-5">
            <LogIn size={13} />
            Área do cliente
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
            NexaWi ADS
          </h1>

          <p className="text-neutral-500 mt-2 text-sm font-medium">
            Acompanhe suas campanhas, anúncios e resultados
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

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                E-mail
              </label>

              <div className="relative group/input">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#050505] text-white border border-white/[0.08] focus:border-[#6be12f]/40 focus:ring-1 focus:ring-[#6be12f]/40 transition-all outline-none placeholder-neutral-700 text-sm font-medium shadow-inner"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                Senha
              </label>

              <div className="relative group/input">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#050505] text-white border border-white/[0.08] focus:border-[#6be12f]/40 focus:ring-1 focus:ring-[#6be12f]/40 transition-all outline-none placeholder-neutral-700 text-sm font-medium shadow-inner"
                  placeholder="Senha ou CPF/CNPJ inicial"
                  autoComplete="current-password"
                  required
                />
              </div>

              <p className="text-[11px] text-neutral-600 mt-2">
                No primeiro acesso, normalmente sua senha é o CPF/CNPJ cadastrado.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#6be12f] hover:bg-[#8cf059] text-black font-extrabold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(107,225,47,0.22)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar Painel
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Acesso exclusivo para clientes NexaWi ADS.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </div>
  )
}