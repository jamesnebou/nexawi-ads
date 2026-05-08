'use client'

// src/components/AccessDenied.js
// ============================================================
// Tela premium de acesso negado.
// Usada quando o admin tenta acessar uma rota sem permissão.
// ============================================================

import { useRouter } from 'next/navigation'
import {
  ShieldAlert,
  ArrowLeft,
  Home,
  Lock,
  Mail,
} from 'lucide-react'

export default function AccessDenied({
  title = 'Acesso não permitido',
  moduleLabel = 'esta área',
  message = 'Você não tem permissão para acessar esta área do sistema.',
  adminEmail = '',
}) {
  const router = useRouter()

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-[#0a0a0a] p-8 sm:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-red-500/10 blur-[90px]" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#6be12f]/10 blur-[90px]" />

        <div className="relative z-10 text-center">
          <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-red-500/20 bg-red-500/10 shadow-[0_0_45px_rgba(239,68,68,0.12)]">
            <ShieldAlert size={42} className="text-red-400" />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400">
            <Lock size={13} />
            Permissão insuficiente
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-neutral-500">
            {message}
          </p>

          <div className="mt-7 rounded-[1.5rem] border border-white/[0.06] bg-[#050505] p-5 text-left shadow-inner">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-600 mb-2">
              Área solicitada
            </p>

            <p className="text-base font-bold text-white">
              {moduleLabel}
            </p>

            {adminEmail ? (
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
                <Mail size={14} className="text-[#6be12f]" />
                Admin logado: {adminEmail}
              </div>
            ) : null}
          </div>

          <p className="mt-6 text-sm text-neutral-500">
            Solicite acesso ao administrador master da NexaWi ADS.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-bold text-white transition-all hover:bg-white/[0.06]"
            >
              <ArrowLeft size={17} />
              Voltar
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black transition-all hover:bg-[#8cf059] shadow-[0_0_25px_rgba(107,225,47,0.18)]"
            >
              <Home size={17} />
              Ir para visão geral
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}