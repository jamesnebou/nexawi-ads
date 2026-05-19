'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { ArrowLeft, FileText, Printer, RefreshCw, Send, XCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'gerado', label: 'Gerado' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'renovado', label: 'Renovado' },
]

const statusLabel = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]))

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada.')
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
    throw new Error(data?.error || 'Erro na API administrativa.')
  }

  return data
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

export default function ContratoDetalhePage() {
  const params = useParams()
  const id = params?.id

  const [contrato, setContrato] = useState(null)
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    carregarContrato()
  }, [id])

  async function carregarContrato() {
    setLoading(true)

    try {
      const data = await adminApiFetch(`/api/admin/contratos/${id}`)
      setContrato(data.contrato)
      setEventos(data.eventos || [])
    } catch (error) {
      console.error('Erro ao carregar contrato:', error)
      toast.error(error.message || 'Erro ao carregar contrato.')
    } finally {
      setLoading(false)
    }
  }

  async function reenviar() {
    if (!contrato) return
    if (!window.confirm(`Reenviar contrato para ${contrato.cliente_email || 'cliente'} e contato@nexawi.com.br?`)) return

    setSending(true)

    try {
      const data = await adminApiFetch('/api/admin/contratos/enviar', {
        method: 'POST',
        body: { id: contrato.id },
      })

      if (data.contrato) setContrato((current) => ({ ...current, ...data.contrato }))
      toast.success(data.message || 'Contrato reenviado.')
      await carregarContrato()
    } catch (error) {
      console.error('Erro ao reenviar contrato:', error)
      toast.error(error.message || 'Erro ao reenviar contrato.')
    } finally {
      setSending(false)
    }
  }

  async function alterarStatus(status) {
    setStatusSaving(true)

    try {
      const data = await adminApiFetch(`/api/admin/contratos/${id}`, {
        method: 'PATCH',
        body: { status },
      })

      setContrato(data.contrato)
      toast.success('Status atualizado.')
      await carregarContrato()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error(error.message || 'Erro ao alterar status.')
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up print:p-0">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 print:hidden">
          <div>
            <Link href="/dashboard/contratos" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-white mb-4">
              <ArrowLeft size={14} />
              Voltar para contratos
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <FileText size={13} />
              Gerador de Contratos
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {contrato?.titulo || 'Contrato NexaWi'}
            </h1>
            <p className="text-sm text-neutral-500 mt-2">Status: {statusLabel[contrato?.status] || contrato?.status || '—'} · Cliente: {contrato?.cliente_email || '—'}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={carregarContrato} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/[0.06]">
              <RefreshCw size={17} />
              Atualizar
            </button>
            <button onClick={reenviar} disabled={sending || !contrato} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm font-extrabold text-blue-300 hover:bg-blue-500/15 disabled:opacity-60">
              <Send size={17} />
              {sending ? 'Enviando...' : 'Reenviar'}
            </button>
            <button onClick={() => window.print()} disabled={!contrato?.html_rendered} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059] disabled:opacity-60">
              <Printer size={17} />
              Imprimir/PDF
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-24 flex items-center justify-center print:hidden"><div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" /></div>
        ) : !contrato ? (
          <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center print:hidden">
            <XCircle size={34} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-white">Contrato não encontrado</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-6 print:block">
            <aside className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 h-fit print:hidden">
              <h2 className="text-lg font-black text-white mb-4">Controle do contrato</h2>

              <label className="block mb-5">
                <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">Status</span>
                <select value={contrato.status || 'rascunho'} disabled={statusSaving} onChange={(event) => alterarStatus(event.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none">
                  {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>

              <div className="grid gap-3 text-xs text-neutral-500">
                <Info label="Criado" value={formatDate(contrato.created_at)} />
                <Info label="Atualizado" value={formatDate(contrato.updated_at)} />
                <Info label="Enviado cliente" value={formatDate(contrato.sent_to_cliente_at)} />
                <Info label="Enviado NexaWi" value={formatDate(contrato.sent_to_nexawi_at)} />
                <Info label="Assinado" value={formatDate(contrato.accepted_at)} />
              </div>

              <h3 className="text-sm font-black text-white mt-8 mb-3">Eventos</h3>
              <div className="grid gap-2 max-h-[320px] overflow-auto pr-1">
                {eventos.length === 0 ? <p className="text-xs text-neutral-600">Nenhum evento registrado.</p> : eventos.map((evento) => (
                  <div key={evento.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                    <p className="text-xs font-black text-white">{evento.event_type}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">{formatDate(evento.created_at)}</p>
                  </div>
                ))}
              </div>
            </aside>

            <main className="rounded-[2rem] border border-white/[0.05] bg-white p-5 sm:p-8 text-black print:border-0 print:rounded-none print:p-0">
              <div className="contract-preview" dangerouslySetInnerHTML={{ __html: contrato.html_rendered || '<p>Contrato sem prévia renderizada.</p>' }} />
            </main>
          </div>
        )}
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
        @media print { body { background: white !important; } .contract-preview .contract-document { max-width: none; font-size: 11.5px; } }
      `}</style>
    </>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600">{label}</p>
      <p className="text-xs font-bold text-white mt-1">{value}</p>
    </div>
  )
}
