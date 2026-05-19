'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente-client'
import { ArrowLeft, CheckCircle2, FileText, Loader2, Printer, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
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

export default function ClienteContratoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const [contrato, setContrato] = useState(null)
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [aceitando, setAceitando] = useState(false)

  useEffect(() => {
    carregarContrato()
  }, [id])

  async function carregarContrato() {
    setLoading(true)

    try {
      const data = await clienteApiFetch(`/api/cliente/contratos/${id}`)
      setContrato(data.contrato)
      setEventos(data.eventos || [])
    } catch (error) {
      console.error('Erro ao carregar contrato:', error)
      if (error.status === 401) {
        router.replace('/cliente/login?expired=1')
        return
      }
      toast.error(error.message || 'Erro ao carregar contrato.')
    } finally {
      setLoading(false)
    }
  }

  async function aceitarContrato() {
    if (!contrato) return

    const confirmado = window.confirm('Confirma que você leu o contrato completo e aceita os termos?')
    if (!confirmado) return

    setAceitando(true)

    try {
      const data = await clienteApiFetch(`/api/cliente/contratos/${contrato.id}`, {
        method: 'POST',
      })

      setContrato(data.contrato)
      toast.success(data.message || 'Contrato aceito com sucesso.')
      await carregarContrato()
    } catch (error) {
      console.error('Erro ao aceitar contrato:', error)
      toast.error(error.message || 'Erro ao aceitar contrato.')
    } finally {
      setAceitando(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6be12f]/30">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[#6be12f]/5 rounded-full blur-[130px] pointer-events-none no-print" />

        <main className="relative z-10 max-w-6xl mx-auto px-5 lg:px-8 py-10 print:p-0 print:max-w-none">
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 no-print">
            <div>
              <Link href="/cliente/contratos" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-white mb-5">
                <ArrowLeft size={14} />
                Voltar para contratos
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-5">
                <ShieldCheck size={13} />
                Área do cliente
              </div>

              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
                {contrato?.titulo || 'Contrato NexaWi'}
              </h1>

              <p className="text-gray-500 font-medium max-w-2xl">
                Leia o contrato completo antes de registrar o aceite digital.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={carregarContrato} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/[0.06]">
                <RefreshCw size={17} />
                Atualizar
              </button>

              <button onClick={() => window.print()} disabled={!contrato?.html_rendered} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/[0.06] disabled:opacity-60">
                <Printer size={17} />
                Imprimir/PDF
              </button>

              {contrato && contrato.status !== 'assinado' && contrato.status !== 'cancelado' && (
                <button onClick={aceitarContrato} disabled={aceitando} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059] disabled:opacity-60">
                  <CheckCircle2 size={17} />
                  {aceitando ? 'Aceitando...' : 'Li e aceito'}
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center no-print">
              <Loader2 size={32} className="text-[#6be12f] animate-spin mb-4" />
              <p className="text-sm text-neutral-500">Carregando contrato...</p>
            </div>
          ) : !contrato ? (
            <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-12 text-center no-print">
              <XCircle size={36} className="mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-black text-white">Contrato não encontrado</h2>
              <p className="text-sm text-neutral-500 mt-2">Este contrato não está disponível para este cliente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 print:block">
              <aside className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 h-fit no-print">
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest mb-5 ${statusStyle[contrato.status] || statusStyle.rascunho}`}>
                  {statusLabel[contrato.status] || contrato.status}
                </span>

                <div className="grid gap-3 text-xs text-neutral-500">
                  <Info label="E-mail" value={contrato.cliente_email || '—'} />
                  <Info label="Criado" value={formatDate(contrato.created_at)} />
                  <Info label="Enviado" value={formatDate(contrato.sent_to_cliente_at)} />
                  <Info label="Aceito" value={formatDate(contrato.accepted_at)} />
                  <Info label="Aceito por" value={contrato.accepted_by_email || '—'} />
                </div>

                <h3 className="text-sm font-black text-white mt-8 mb-3">Histórico</h3>
                <div className="grid gap-2 max-h-[300px] overflow-auto pr-1">
                  {eventos.length === 0 ? <p className="text-xs text-neutral-600">Nenhum evento registrado.</p> : eventos.map((evento) => (
                    <div key={evento.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                      <p className="text-xs font-black text-white">{evento.event_type}</p>
                      <p className="text-[11px] text-neutral-500 mt-1">{formatDate(evento.created_at)}</p>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="rounded-[2rem] border border-white/[0.05] bg-white p-5 sm:p-8 text-black print:border-0 print:rounded-none print:p-0">
                <div className="contract-preview" dangerouslySetInnerHTML={{ __html: contrato.html_rendered || '<p>Contrato sem conteúdo renderizado.</p>' }} />
              </section>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .contract-preview .contract-document { font-family: Arial, sans-serif; color: #111; line-height: 1.55; font-size: 13px; max-width: 900px; margin: 0 auto; }
        .contract-preview h1 { font-size: 22px; text-align: center; margin: 0 0 18px; }
        .contract-preview h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .contract-preview p { margin: 8px 0; }
        .contract-preview table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .contract-preview th, .contract-preview td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        .contract-preview th { width: 32%; background: #f5f5f5; }
        .contract-preview .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; }
          .contract-preview .contract-document { max-width: none; font-size: 11.5px; }
          .contract-preview h1 { font-size: 18px; }
          .contract-preview h2 { font-size: 13px; break-after: avoid; }
          .contract-preview table, .contract-preview p { break-inside: avoid; }
          @page { margin: 14mm; }
        }
      `}</style>
    </>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600">{label}</p>
      <p className="text-xs font-bold text-white mt-1 break-words">{value}</p>
    </div>
  )
}
