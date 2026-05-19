'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { CalendarDays, CheckCircle2, FileText, Mail, Printer, RefreshCw, Search, Send, XCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'gerado', label: 'Gerado' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'envio_pendente', label: 'Envio pendente' },
]

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

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [resumo, setResumo] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [status, setStatus] = useState('')
  const [reenviandoId, setReenviandoId] = useState('')

  const cards = useMemo(() => [
    { label: 'Total', value: resumo.total || 0, icon: FileText },
    { label: 'Rascunhos', value: resumo.rascunho || 0, icon: CalendarDays },
    { label: 'Enviados', value: resumo.enviado || 0, icon: Send },
    { label: 'Assinados', value: resumo.assinado || 0, icon: CheckCircle2 },
    { label: 'Pendentes', value: resumo.envio_pendente || 0, icon: Mail },
  ], [resumo])

  useEffect(() => {
    carregarContratos()
  }, [status, buscaAplicada])

  async function carregarContratos() {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (buscaAplicada) params.set('busca', buscaAplicada)
      params.set('limit', '100')

      const data = await adminApiFetch(`/api/admin/contratos?${params.toString()}`)
      setContratos(data.contratos || [])
      setResumo(data.resumo || { total: 0 })
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      toast.error(error.message || 'Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }

  function aplicarBusca(event) {
    event.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  async function reenviarContrato(contrato) {
    if (!window.confirm(`Reenviar contrato para ${contrato.cliente_email || 'cliente'} e contato@nexawi.com.br?`)) return

    setReenviandoId(contrato.id)

    try {
      const response = await adminApiFetch('/api/admin/contratos/enviar', {
        method: 'POST',
        body: { id: contrato.id },
      })

      if (response.ok) toast.success('Contrato reenviado.')
      else toast.error(response.message || 'Contrato salvo, mas o envio não foi concluído.')

      await carregarContratos()
    } catch (error) {
      console.error('Erro ao reenviar contrato:', error)
      toast.error(error.message || 'Erro ao reenviar contrato.')
    } finally {
      setReenviandoId('')
    }
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <FileText size={13} />
              Gerador de Contratos
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Central de contratos
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Veja rascunhos, enviados, assinados, cancelados e reenvie contratos da NexaWi.
            </p>
          </div>

          <button onClick={carregarContratos} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059]">
            <RefreshCw size={17} />
            Atualizar
          </button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500">{card.label}</p>
                <card.icon size={18} className="text-[#8cf059]" />
              </div>
              <p className="text-4xl font-light text-white">{formatNumber(card.value)}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_auto] gap-4 items-end">
            <form onSubmit={aplicarBusca}>
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
                <Search size={13} className="text-[#6be12f]" />
                Buscar contrato
              </span>
              <div className="flex gap-2">
                <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Título, e-mail, número..." className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none" />
                <button type="submit" className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 text-sm font-bold text-white hover:bg-white/[0.06]">Buscar</button>
              </div>
            </form>

            <label>
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none">
                {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            {(status || buscaAplicada) && (
              <button onClick={() => { setStatus(''); setBusca(''); setBuscaAplicada('') }} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] flex items-center justify-center gap-2">
                <XCircle size={16} />
                Limpar
              </button>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
          {loading ? (
            <div className="py-24 flex items-center justify-center"><div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" /></div>
          ) : contratos.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
              <FileText size={34} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhum contrato encontrado</h3>
              <p className="text-sm text-neutral-500 mt-2">Gere um contrato pela aba Clientes ou Empresas.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {contratos.map((contrato) => (
                <div key={contrato.id} className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5">
                  <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr_1fr_auto] gap-5 items-center">
                    <div>
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest mb-3 ${statusStyle[contrato.status] || statusStyle.rascunho}`}>
                        {statusLabel[contrato.status] || contrato.status}
                      </span>
                      <h3 className="text-base font-black text-white">{contrato.titulo}</h3>
                      <p className="text-xs text-neutral-500 mt-1">{contrato.cliente_email || 'Sem e-mail do cliente'}</p>
                    </div>

                    <div className="text-xs text-neutral-500 grid gap-1">
                      <p>Criado: {formatDate(contrato.created_at)}</p>
                      <p>Atualizado: {formatDate(contrato.updated_at)}</p>
                      <p>Enviado: {formatDate(contrato.sent_to_cliente_at)}</p>
                    </div>

                    <div className="text-xs text-neutral-500 grid gap-1">
                      <p>Empresa ID: {contrato.empresa_id?.slice(0, 8) || '—'}</p>
                      <p>Cliente ID: {contrato.cliente_id?.slice(0, 8) || '—'}</p>
                      <p>NexaWi: {contrato.nexawi_email || 'contato@nexawi.com.br'}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
                      <Link href={`/dashboard/contratos/${contrato.id}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-black text-white hover:bg-white/[0.06] flex items-center justify-center gap-2">
                        <FileText size={15} />
                        Abrir
                      </Link>
                      <button onClick={() => reenviarContrato(contrato)} disabled={reenviandoId === contrato.id} className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-black text-blue-300 hover:bg-blue-500/15 disabled:opacity-60 flex items-center justify-center gap-2">
                        <Send size={15} />
                        {reenviandoId === contrato.id ? 'Enviando...' : 'Reenviar'}
                      </button>
                      <Link href={`/dashboard/contratos/${contrato.id}?print=1`} className="rounded-2xl bg-[#6be12f] px-4 py-3 text-xs font-black text-black hover:bg-[#8cf059] flex items-center justify-center gap-2">
                        <Printer size={15} />
                        PDF
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
