'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente-client'
import {
  ArrowLeft,
  LifeBuoy,
  Plus,
  Send,
  Loader2,
  MessageCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient()

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

async function clienteApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão do cliente não encontrada.')
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
    throw new Error(data?.error || 'Erro na API do cliente')
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

export default function ClienteSuportePage() {
  const router = useRouter()

  const [tickets, setTickets] = useState([])
  const [ticketAtual, setTicketAtual] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modalNovo, setModalNovo] = useState(false)

  const [form, setForm] = useState({
    subject: '',
    category: 'geral',
    priority: 'media',
    message: '',
  })

  const [resposta, setResposta] = useState('')

  useEffect(() => {
    buscarTickets()
  }, [])

  async function buscarTickets() {
    setLoading(true)

    try {
      const data = await clienteApiFetch('/api/cliente/suporte')
      setTickets(data.tickets || [])
    } catch (error) {
      console.error(error)
      toast.error(error.message || 'Erro ao buscar chamados')
    } finally {
      setLoading(false)
    }
  }

  async function abrirTicket(ticketId) {
    try {
      const data = await clienteApiFetch(`/api/cliente/suporte?ticketId=${ticketId}`)
      setTicketAtual(data.ticket)
      setMessages(data.messages || [])
    } catch (error) {
      toast.error(error.message || 'Erro ao abrir chamado')
    }
  }

  async function criarTicket(e) {
    e.preventDefault()

    setSalvando(true)

    try {
      await clienteApiFetch('/api/cliente/suporte', {
        method: 'POST',
        body: {
          action: 'create_ticket',
          ...form,
        },
      })

      toast.success('Chamado aberto com sucesso!')
      setModalNovo(false)
      setForm({ subject: '', category: 'geral', priority: 'media', message: '' })
      await buscarTickets()
    } catch (error) {
      toast.error(error.message || 'Erro ao abrir chamado')
    } finally {
      setSalvando(false)
    }
  }

  async function responderTicket(e) {
    e.preventDefault()

    if (!ticketAtual?.id || !resposta.trim()) return

    setSalvando(true)

    try {
      await clienteApiFetch('/api/cliente/suporte', {
        method: 'POST',
        body: {
          action: 'reply_ticket',
          ticketId: ticketAtual.id,
          message: resposta,
        },
      })

      setResposta('')
      toast.success('Mensagem enviada!')
      await abrirTicket(ticketAtual.id)
      await buscarTickets()
    } catch (error) {
      toast.error(error.message || 'Erro ao responder chamado')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-5 sm:p-8">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <button
              onClick={() => router.push('/cliente/dashboard')}
              className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-white mb-5"
            >
              <ArrowLeft size={17} />
              Voltar ao painel
            </button>

            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <LifeBuoy className="text-[#6be12f]" />
              Suporte
            </h1>

            <p className="text-sm text-neutral-500 mt-2">
              Abra chamados e acompanhe as respostas da equipe NexaWi.
            </p>
          </div>

          <button
            onClick={() => setModalNovo(true)}
            className="bg-[#6be12f] text-black font-extrabold px-5 py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Novo chamado/Abertos
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5">
            <h2 className="text-lg font-bold mb-5">Meus chamados</h2>

            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-[#6be12f]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                Nenhum chamado aberto ainda.
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{ticket.subject}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {statusLabels[ticket.status]} · {prioridadeLabels[ticket.priority]}
                        </p>
                      </div>

                      <p className="text-[11px] text-neutral-600">
                        {formatarData(ticket.last_message_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 min-h-[520px]">
            {!ticketAtual ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-24">
                <MessageCircle size={42} className="mb-4 text-neutral-700" />
                <p className="font-bold text-white">Selecione um chamado</p>
                <p className="text-sm mt-1">As mensagens aparecerão aqui.</p>
              </div>
            ) : (
              <>
                <div className="border-b border-white/[0.05] pb-5 mb-5">
                  <h2 className="text-xl font-bold text-white">{ticketAtual.subject}</h2>
                  <p className="text-xs text-neutral-500 mt-2">
                    {statusLabels[ticketAtual.status]} · {prioridadeLabels[ticketAtual.priority]}
                  </p>
                </div>

                <div className="space-y-4 max-h-[430px] overflow-y-auto pr-2 custom-scrollbar mb-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-4 border ${
                        msg.author_type === 'cliente'
                          ? 'bg-[#6be12f]/10 border-[#6be12f]/20 ml-8'
                          : 'bg-white/[0.04] border-white/[0.08] mr-8'
                      }`}
                    >
                      <p className="text-xs text-neutral-500 mb-2">
                        {msg.author_type === 'cliente' ? 'Você' : 'Equipe NexaWi'} · {formatarData(msg.created_at)}
                      </p>

                      <p className="text-sm text-white whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={responderTicket} className="flex gap-3">
                  <input
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder="Digite sua resposta..."
                    className="flex-1 bg-[#050505] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#6be12f]/40"
                  />

                  <button
                    disabled={salvando}
                    className="bg-[#6be12f] text-black font-extrabold px-5 rounded-2xl disabled:opacity-50"
                  >
                    {salvando ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {modalNovo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <form onSubmit={criarTicket} className="w-full max-w-lg bg-[#0a0a0a] border border-white/[0.08] rounded-[2rem] p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novo chamado</h2>
              <button type="button" onClick={() => setModalNovo(false)} className="text-neutral-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Assunto"
                className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-widest">
      Categoria
    </label>

    <select
      value={form.category}
      onChange={(e) => setForm({ ...form, category: e.target.value })}
      className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#6be12f]/40"
    >
      <option value="geral">Geral</option>
      <option value="financeiro">Financeiro</option>
      <option value="campanha">Campanha</option>
      <option value="tecnico">Técnico</option>
      <option value="hotspot">Hotspot / Wi-Fi</option>
      <option value="acesso">Acesso ao portal</option>
    </select>
  </div>

  <div>
    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-widest">
      Prioridade
    </label>

    <select
      value={form.priority}
      onChange={(e) => setForm({ ...form, priority: e.target.value })}
      className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#6be12f]/40"
    >
      <option value="baixa">Baixa</option>
      <option value="media">Média</option>
      <option value="alta">Alta</option>
      <option value="urgente">Urgente</option>
    </select>
  </div>
</div>

              <div>
  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-widest">
    Descrição
  </label>

  <textarea
    value={form.message}
    onChange={(e) => setForm({ ...form, message: e.target.value })}
    placeholder="Explique o que aconteceu, onde percebeu o problema e o que precisa que a equipe NexaWi verifique."
    rows={5}
    className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#6be12f]/40 resize-none"
  />
</div>

              <button
                disabled={salvando}
                className="w-full bg-[#6be12f] text-black font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                Abrir chamado
              </button>
            </div>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  )
}
