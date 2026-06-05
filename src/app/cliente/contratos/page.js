'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente-client'
import { ArrowLeft, CheckCircle2, Eye, FileText, Loader2, Printer, RefreshCw, ShieldCheck } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient()

const statusLabel = {
  rascunho: 'Rascunho',
  gerado: 'Gerado',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
  vencido: 'Vencido',
  renovado: 'Renovado',
  envio_pendente: 'Envio pendente',
}

const statusStyle = {
  rascunho: 'bg-white/[0.05] text-neutral-300 border-white/[0.08]',
  gerado: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  enviado: 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20',
  assinado: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  cancelado: 'bg-red-500/10 text-red-300 border-red-500/20',
  envio_pendente: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
}

async function clienteApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    const error = new Error('Sessão do cliente não encontrada.')
    error.status = 401
    throw error
  }

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error(data?.error || 'Erro ao carregar dados.')
    error.status = response.status
    throw error
  }

  return data
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

export default function ClienteContratosPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)

  const carregarContratos = useCallback(async () => {
    setLoading(true)

    try {
      const data = await clienteApiFetch('/api/cliente/contratos')
      setContratos(data.contratos || [])
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      if (error.status === 401) {
        router.replace('/cliente/login?expired=1')
        return
      }
      toast.error(error.message || 'Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    carregarContratos()
  }, [carregarContratos])

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6be12f]/30">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[#6be12f]/5 rounded-full blur-[130px] pointer-events-none" />

        <main className="relative z-10 max-w-6xl mx-auto px-5 lg:px-8 py-10">
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <Link href="/cliente/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-white mb-5">
                <ArrowLeft size={14} />
                Voltar ao painel
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-5">
                <ShieldCheck size={13} />
                Área do cliente
              </div>

              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
                Meus contratos
              </h1>

              <p className="text-gray-500 font-medium max-w-2xl">
                Consulte contratos enviados pela NexaWi. Para aceitar, abra o contrato e leia o documento completo.
              </p>
            </div>

            <button onClick={carregarContratos} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059]">
              <RefreshCw size={17} />
              Atualizar
            </button>
          </header>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 size={32} className="text-[#6be12f] animate-spin mb-4" />
              <p className="text-sm text-neutral-500">Carregando contratos...</p>
            </div>
          ) : contratos.length === 0 ? (
            <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-12 text-center">
              <FileText size={36} className="mx-auto text-neutral-600 mb-4" />
              <h2 className="text-xl font-black text-white">Nenhum contrato disponível</h2>
              <p className="text-sm text-neutral-500 mt-2">Quando a NexaWi enviar um contrato, ele aparecerá aqui.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {contratos.map((contrato) => (
                <div key={contrato.id} className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
                  <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr_auto] gap-5 items-center">
                    <div>
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest mb-3 ${statusStyle[contrato.status] || statusStyle.rascunho}`}>
                        {statusLabel[contrato.status] || contrato.status}
                      </span>

                      <h2 className="text-lg font-black text-white">
                        {contrato.titulo || 'Contrato NexaWi'}
                      </h2>

                      <p className="text-xs text-neutral-500 mt-1">
                        Enviado para: {contrato.cliente_email || '—'}
                      </p>
                    </div>

                    <div className="grid gap-1 text-xs text-neutral-500">
                      <p>Criado: {formatDate(contrato.created_at)}</p>
                      <p>Enviado: {formatDate(contrato.sent_to_cliente_at)}</p>
                      <p>Aceito: {formatDate(contrato.accepted_at)}</p>
                    </div>

                    <div className="grid gap-2">
                      <Link href={`/cliente/contratos/${contrato.id}`} className="rounded-2xl bg-[#6be12f] px-4 py-3 text-xs font-black text-black hover:bg-[#8cf059] flex items-center justify-center gap-2">
                        <Eye size={15} />
                        Abrir contrato
                      </Link>

                      <button onClick={() => window.print()} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-black text-white hover:bg-white/[0.06] flex items-center justify-center gap-2">
                        <Printer size={15} />
                        Imprimir lista
                      </button>

                      {contrato.status === 'assinado' && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-300 flex items-center justify-center gap-2">
                          <CheckCircle2 size={15} />
                          Aceito
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
