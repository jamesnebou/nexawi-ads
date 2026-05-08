'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  LifeBuoy,
  Search,
  Send,
  Loader2,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  Lock,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const statusLabels = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
}

const prioridadeLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

const permissoesIniciais = {
  view: false,
  reply: false,
  update: false,
  close: false,
  assign: false,
  export: false,
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

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

function formatarData(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardSuportePage() {
  const [tickets, setTickets] = useState([])
  const [resumo, setResumo] = useState({})
  const [permissions, setPermissions] = useState(permissoesIniciais)

  const [ticketAtual, setTicketAtual] = useState(null)
  const [messages, setMessages] = useState([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPriority, setFiltroPriority] = useState('todos')
  const [resposta, setResposta] = useState('')
  const [internalNote, setInternalNote] = useState(false)

  const canReply = Boolean(permissions.reply)
  const canUpdate = Boolean(permissions.update)
  const canAssign = Boolean(permissions.assign)
  const canClose = Boolean(permissions.close)

  useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const ticketId = params.get('ticketId')

  if (ticketId) {
    abrirTicket(ticketId)
  }
}, [])

  useEffect(() => {
    buscarTickets()
  }, [filtroStatus, filtroPriority])

  async function buscarTickets() {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      params.set('status', filtroStatus)
      params.set('priority', filtroPriority)

      const data = await adminApiFetch(`/api/admin/suporte?${params.toString()}`)

      setTickets(data.tickets || [])
      setResumo(data.resumo || {})
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      toast.error(error.message || 'Erro ao buscar chamados')
    } finally {
      setLoading(false)
    }
  }

  async function abrirTicket(ticketId) {
    try {
      const data = await adminApiFetch(`/api/admin/suporte?ticketId=${ticketId}`)
      setTicketAtual(data.ticket)
      setMessages(data.messages || [])
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      toast.error(error.message || 'Erro ao abrir chamado')
    }
  }

  async function responderTicket(e) {
    e.preventDefault()

    if (!ticketAtual?.id || !resposta.trim()) return

    setSalvando(true)

    try {
      await adminApiFetch('/api/admin/suporte', {
        method: 'POST',
        body: {
          action: 'reply_ticket',
          ticketId: ticketAtual.id,
          message: resposta,
          internal_note: internalNote,
        },
      })

      toast.success(internalNote ? 'Nota interna salva!' : 'Resposta enviada!')
      setResposta('')
      setInternalNote(false)
      await abrirTicket(ticketAtual.id)
      await buscarTickets()
    } catch (error) {
      toast.error(error.message || 'Erro ao responder')
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarTicket(changes) {
    if (!ticketAtual?.id) return

    setSalvando(true)

    try {
      await adminApiFetch('/api/admin/suporte', {
        method: 'POST',
        body: {
          action: 'update_ticket',
          ticketId: ticketAtual.id,
          status: changes.status || ticketAtual.status,
          priority: changes.priority || ticketAtual.priority,
          assigned_admin_email:
            changes.assigned_admin_email !== undefined
              ? changes.assigned_admin_email
              : ticketAtual.assigned_admin_email,
        },
      })

      toast.success('Chamado atualizado!')
      await abrirTicket(ticketAtual.id)
      await buscarTickets()
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar chamado')
    } finally {
      setSalvando(false)
    }
  }

  const cards = [
    { label: 'Total', value: resumo.total || 0 },
    { label: 'Abertos', value: resumo.abertos || 0 },
    { label: 'Em andamento', value: resumo.andamento || 0 },
    { label: 'Aguardando cliente', value: resumo.aguardandoCliente || 0 },
    { label: 'Urgentes', value: resumo.urgentes || 0 },
  ]

  return (
    <>
      <Toaster position="top-right" />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <LifeBuoy className="text-[#6be12f]" size={24} />
              </div>
              Suporte
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Central de chamados dos clientes NexaWi ADS
            </p>

            {!canReply && !canUpdate && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} />
                Modo leitura: você pode visualizar chamados, mas não responder.
              </div>
            )}
          </div>

          <button
            onClick={buscarTickets}
            className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-white font-bold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw size={17} />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6">
              <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">{card.label}</p>
              <p className="text-4xl font-light text-white tracking-tight mt-4">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarTickets()}
              placeholder="Buscar chamado..."
              className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white outline-none"
            />
          </div>

          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white">
            <option value="todos">Todos os status</option>
            {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>

          <select value={filtroPriority} onChange={(e) => setFiltroPriority(e.target.value)} className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white">
            <option value="todos">Todas prioridades</option>
            {Object.entries(prioridadeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>

          <button onClick={buscarTickets} className="bg-[#6be12f] text-black font-extrabold rounded-2xl">
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5">
            <h2 className="text-lg font-bold mb-5">Chamados</h2>

            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-[#6be12f]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                Nenhum chamado encontrado.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => abrirTicket(ticket.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      ticketAtual?.id === ticket.id
                        ? 'bg-[#6be12f]/10 border-[#6be12f]/20'
                        : 'bg-[#0a0a0a] border-white/[0.05] hover:border-white/[0.12]'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{ticket.subject}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {ticket.clientes?.nome_empresa || ticket.clientes?.nome || ticket.created_by_email}
                    </p>
                    <p className="text-[11px] text-neutral-600 mt-2">
                      {statusLabels[ticket.status]} · {prioridadeLabels[ticket.priority]} · {formatarData(ticket.last_message_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 min-h-[620px]">
            {!ticketAtual ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-24">
                <MessageCircle size={42} className="mb-4 text-neutral-700" />
                <p className="font-bold text-white">Selecione um chamado</p>
                <p className="text-sm mt-1">As mensagens e controles aparecerão aqui.</p>
              </div>
            ) : (
              <>
                <div className="border-b border-white/[0.05] pb-5 mb-5">
                  <h2 className="text-xl font-bold text-white">{ticketAtual.subject}</h2>
                  <p className="text-xs text-neutral-500 mt-2">
                    {ticketAtual.clientes?.nome_empresa || ticketAtual.created_by_email}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                    <select
                      disabled={!canUpdate || salvando}
                      value={ticketAtual.status}
                      onChange={(e) => atualizarTicket({ status: e.target.value })}
                      className="bg-[#050505] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm"
                    >
                      {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>

                    <select
                      disabled={!canUpdate || salvando}
                      value={ticketAtual.priority}
                      onChange={(e) => atualizarTicket({ priority: e.target.value })}
                      className="bg-[#050505] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm"
                    >
                      {Object.entries(prioridadeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>

                    <input
                      disabled={!canAssign || salvando}
                      value={ticketAtual.assigned_admin_email || ''}
                      onChange={(e) => setTicketAtual({ ...ticketAtual, assigned_admin_email: e.target.value })}
                      onBlur={(e) => atualizarTicket({ assigned_admin_email: e.target.value })}
                      placeholder="Responsável"
                      className="bg-[#050505] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar mb-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-4 border ${
                        msg.internal_note
                          ? 'bg-yellow-500/10 border-yellow-500/20'
                          : msg.author_type === 'admin'
                            ? 'bg-[#6be12f]/10 border-[#6be12f]/20 ml-8'
                            : 'bg-white/[0.04] border-white/[0.08] mr-8'
                      }`}
                    >
                      <p className="text-xs text-neutral-500 mb-2">
                        {msg.internal_note ? 'Nota interna' : msg.author_name || msg.author_email} · {formatarData(msg.created_at)}
                      </p>
                      <p className="text-sm text-white whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {canReply && (
                  <form onSubmit={responderTicket} className="space-y-3">
                    <textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder={internalNote ? 'Digite uma nota interna...' : 'Digite sua resposta ao cliente...'}
                      rows={3}
                      className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm outline-none resize-none"
                    />

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setInternalNote(!internalNote)}
                        className={`px-4 py-3 rounded-2xl text-sm font-bold border ${
                          internalNote
                            ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                            : 'bg-white/[0.02] text-neutral-400 border-white/[0.05]'
                        }`}
                      >
                        Nota interna
                      </button>

                      <button
                        disabled={salvando}
                        className="bg-[#6be12f] text-black font-extrabold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {salvando ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                        Enviar
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        `}} />
      </div>
    </>
  )
}
