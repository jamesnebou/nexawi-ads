'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { logAdminAction } from '@/lib/admin-audit-log'
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  Receipt,
  Users,
  FileDown,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

// Cliente Supabase usado apenas para pegar a sessão do admin logado.
// As operações sensíveis agora passam por /api/admin/financeiro.
const supabase = createBrowserSupabaseClient()

const statusOpcoes = [
  'Pendente',
  'Pago',
  'Vencido',
  'Cancelado',
  'Em negociação',
  'Isento',
  'Estornado',
]

const metodos = [
  'PIX',
  'Cartão de Crédito',
  'Boleto',
  'Dinheiro',
  'Transferência',
  'Outro',
]

const periodos = [
  { value: 'todos', label: 'Todos os períodos' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'proximos_30', label: 'Próximos 30 dias' },
]

// ============================================================
// Chamada padrão para APIs administrativas.
// Essa função pega o token do usuário logado e envia para a API.
// A API valida se o usuário é admin antes de consultar o banco.
// ============================================================

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
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
    throw new Error(data.error || 'Erro na API administrativa')
  }

  return data
}

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [metricas, setMetricas] = useState({
    recebidoMes: 0,
    previstoMes: 0,
    pendenteMes: 0,
    vencidoTotal: 0,
    recebidoHoje: 0,
    mrr: 0,
    ticketMedio: 0,
    clientesInadimplentes: 0,
    totalPagamentos: 0,
  })

  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes_atual')
  const [modalAberto, setModalAberto] = useState(false)
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    plano_id: '',
    valor: '',
    data_vencimento: '',
    data_pagamento: '',
    metodo_pagamento: '',
    status: 'Pendente',
    observacao: '',
  })

  useEffect(() => {
    buscarDados()
  }, [busca, filtroStatus, filtroPeriodo])

  async function buscarDados() {
    setCarregando(true)

    try {
      // A aba Financeiro agora não consulta pagamentos/clientes/planos direto no Supabase.
      // Ela chama a API protegida, que valida admin e usa service_role no servidor.
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroPeriodo) params.set('periodo', filtroPeriodo)

      const data = await adminApiFetch(`/api/admin/financeiro?${params.toString()}`)

      setPagamentos(data.pagamentos || [])
      setClientes(data.clientes || [])
      setPlanos(data.planos || [])
      setMetricas(data.metricas || {})
    } catch (error) {
      console.error('Erro ao buscar financeiro:', error)
      toast.error(error.message || 'Erro ao carregar financeiro.')
    } finally {
      setCarregando(false)
    }
  }

  function abrirModal(pagamento = null) {
    if (pagamento) {
      setPagamentoSelecionado(pagamento)
      setForm({
        cliente_id: pagamento.cliente_id || '',
        plano_id: pagamento.plano_id || '',
        valor: pagamento.valor || '',
        data_vencimento: pagamento.data_vencimento || '',
        data_pagamento: pagamento.data_pagamento || '',
        metodo_pagamento: pagamento.metodo_pagamento || '',
        status: pagamento.status || 'Pendente',
        observacao: pagamento.observacao || '',
      })
    } else {
      setPagamentoSelecionado(null)
      setForm({
        cliente_id: '',
        plano_id: '',
        valor: '',
        data_vencimento: '',
        data_pagamento: '',
        metodo_pagamento: '',
        status: 'Pendente',
        observacao: '',
      })
    }

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setPagamentoSelecionado(null)
  }

  function preencherPlano(planoId) {
    const plano = planos.find((p) => p.id === planoId)

    setForm({
      ...form,
      plano_id: planoId,
      valor: plano ? plano.preco : form.valor,
    })
  }

  async function salvarPagamento() {
    if (!form.cliente_id || !form.valor || !form.data_vencimento) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setSalvando(true)

    try {
      const payload = {
        cliente_id: form.cliente_id,
        plano_id: form.plano_id || null,
        valor: form.valor,
        data_vencimento: form.data_vencimento,
        data_pagamento: form.data_pagamento || null,
        metodo_pagamento: form.metodo_pagamento || null,
        status: form.status,
        observacao: form.observacao || null,
      }

      if (pagamentoSelecionado) {
        await adminApiFetch('/api/admin/financeiro', {
          method: 'POST',
          body: {
            action: 'update',
            id: pagamentoSelecionado.id,
            pagamento: payload,
          },
        })

        toast.success('Pagamento atualizado!')
      } else {
        await adminApiFetch('/api/admin/financeiro', {
          method: 'POST',
          body: {
            action: 'create',
            pagamento: payload,
          },
        })

        toast.success('Pagamento registrado!')
      }

      fecharModal()
      buscarDados()
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error)
      toast.error(error.message || 'Erro ao salvar pagamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirPagamento(id) {
    try {
      await adminApiFetch('/api/admin/financeiro', {
        method: 'POST',
        body: {
          action: 'delete',
          id,
        },
      })

      toast.success('Pagamento excluído!')
      setConfirmDelete(null)
      buscarDados()
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error)
      toast.error(error.message || 'Erro ao excluir pagamento.')
    }
  }

  async function marcarComoPago(id) {
    try {
      await adminApiFetch('/api/admin/financeiro', {
        method: 'POST',
        body: {
          action: 'mark_paid',
          id,
          metodo_pagamento: 'PIX',
        },
      })

      toast.success('Pagamento marcado como pago!')
      buscarDados()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      toast.error(error.message || 'Erro ao marcar como pago.')
    }
  }

  function exportarCSV() {
    // Exportação CSV melhorada para Excel:
    // - Usa ponto e vírgula, que costuma abrir melhor no Excel PT-BR.
    // - Usa BOM UTF-8 para manter acentos.
    // - Escapa aspas para não quebrar células.
    function csvCell(value) {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const linhas = [
      [
        'Cliente',
        'Plano',
        'Valor',
        'Vencimento',
        'Data de Pagamento',
        'Método',
        'Status',
        'Observação',
      ],
      ...pagamentos.map((p) => [
        p.clientes?.nome || '',
        p.planos?.nome || '',
        fmt(p.valor),
        formatarData(p.data_vencimento),
        formatarData(p.data_pagamento),
        p.metodo_pagamento || '',
        p.status_calculado || p.status || '',
        p.observacao || '',
      ]),
    ]

    const csvContent = '\uFEFF' + linhas
      .map((linha) => linha.map(csvCell).join(';'))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `financeiro_${new Date().toISOString().slice(0, 10)}.csv`)

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const fmt = (v) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(v || 0))

  function formatarData(data) {
    if (!data) return '—'
    return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR')
  }

  const corStatus = (status) => {
    switch (status) {
      case 'Pago':
        return 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
      case 'Pendente':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      case 'Vencido':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      case 'Em negociação':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'Cancelado':
        return 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'
      case 'Isento':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
      case 'Estornado':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
      default:
        return 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'
    }
  }

  const iconStatus = (status) => {
    switch (status) {
      case 'Pago':
        return <CheckCircle2 size={14} />
      case 'Pendente':
        return <Clock size={14} />
      case 'Vencido':
        return <AlertCircle size={14} />
      case 'Em negociação':
        return <ShieldAlert size={14} />
      default:
        return null
    }
  }

  const cards = [
    {
      label: 'Recebido no mês',
      valor: fmt(metricas.recebidoMes),
      sub: `Hoje: ${fmt(metricas.recebidoHoje)}`,
      icon: Wallet,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
    },
    {
      label: 'Previsto no mês',
      valor: fmt(metricas.previstoMes),
      sub: 'Baseado nos vencimentos',
      icon: CalendarDays,
      text: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'Pendente no mês',
      valor: fmt(metricas.pendenteMes),
      sub: 'Ainda não recebido',
      icon: Clock,
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
    },
    {
      label: 'Vencido',
      valor: fmt(metricas.vencidoTotal),
      sub: `${metricas.clientesInadimplentes || 0} cliente(s) em atraso`,
      icon: AlertCircle,
      text: 'text-red-400',
      bg: 'bg-red-500/20',
    },
    {
      label: 'MRR estimado',
      valor: fmt(metricas.mrr),
      sub: 'Clientes ativos com plano',
      icon: TrendingUp,
      text: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
    {
      label: 'Ticket médio',
      valor: fmt(metricas.ticketMedio),
      sub: 'Média dos planos ativos',
      icon: Users,
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
    },
  ]

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#0a0a0a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0a0a0a',
            },
          },
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        {/* Header e Controles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <DollarSign className="text-[#6be12f]" size={24} />
              </div>
              Financeiro
            </h1>
            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Controle premium de receita, mensalidades, inadimplência e MRR
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={exportarCSV}
              disabled={pagamentos.length === 0}
              className="w-full sm:w-auto bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 border border-white/[0.05] hover:border-white/[0.1]"
            >
              <FileDown size={18} />
              Exportar
            </button>

            <button
              onClick={() => abrirModal()}
              className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
            >
              <Plus size={18} strokeWidth={2.5} />
              Novo Pagamento
            </button>
          </div>
        </div>

        {/* Cards executivos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-10">
          {cards.map((card, index) => (
            <div
              key={card.label}
              className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 ${card.bg}`}></div>

              <div className="relative z-10 flex items-center justify-between mb-6">
                <h3 className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  {card.label}
                </h3>
                <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <card.icon size={18} className={card.text} />
                </div>
              </div>

              <div className="relative z-10">
                <p className="text-2xl xl:text-3xl font-light text-white tracking-tight">
                  {card.valor}
                </p>
                <p className="text-xs text-neutral-500 mt-2 font-medium">
                  {card.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros premium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative group/input">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
            <input
              type="text"
              placeholder="Buscar por cliente, plano, valor, método..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
            />
          </div>

          <div className="relative group/select">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer shadow-inner"
            >
              <option value="Todos" className="bg-[#0a0a0a]">Todos os Status</option>
              {statusOpcoes.map((s) => (
                <option key={s} value={s} className="bg-[#0a0a0a]">
                  {s}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          <div className="relative group/select">
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer shadow-inner"
            >
              {periodos.map((periodo) => (
                <option key={periodo.value} value={periodo.value} className="bg-[#0a0a0a]">
                  {periodo.label}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
              <DollarSign className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : pagamentos.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <Receipt size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum pagamento encontrado
            </h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md">
              Ajuste os filtros ou registre uma nova cobrança para começar.
            </p>
            <button
              onClick={() => abrirModal()}
              className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2"
            >
              <Plus size={18} />
              Registrar pagamento
            </button>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Cliente</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Plano</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Valor</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Vencimento</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Pagamento</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Método</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">Status</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.02]">
                  {pagamentos.map((p) => {
                    const statusFinal = p.status_calculado || p.status

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center text-neutral-400 font-bold text-sm shadow-inner flex-shrink-0 group-hover:text-white group-hover:border-white/[0.1] transition-colors">
                              {p.clientes?.nome?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors truncate">
                              {p.clientes?.nome || '—'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-neutral-400 whitespace-nowrap truncate">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-white/[0.05] text-xs font-medium shadow-inner">
                            {p.planos?.nome || 'Sem plano'}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm font-bold text-white whitespace-nowrap">
                          {fmt(p.valor)}
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`text-sm font-medium ${statusFinal === 'Vencido' ? 'text-red-400' : 'text-neutral-400'}`}>
                            {formatarData(p.data_vencimento)}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm text-neutral-400 font-medium whitespace-nowrap">
                          {formatarData(p.data_pagamento)}
                        </td>

                        <td className="px-6 py-5 text-sm text-neutral-400 font-medium whitespace-nowrap">
                          {p.metodo_pagamento || '—'}
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest w-fit flex-shrink-0 ${corStatus(statusFinal)}`}>
                            {iconStatus(statusFinal)}
                            {statusFinal}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                            {statusFinal !== 'Pago' && (
                              <button
                                onClick={() => marcarComoPago(p.id)}
                                className="p-2.5 text-neutral-500 hover:text-[#8cf059] hover:bg-[#6be12f]/10 rounded-xl transition-all duration-300 border border-transparent hover:border-[#6be12f]/20"
                                title="Marcar como pago"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => abrirModal(p)}
                              className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => setConfirmDelete(p.id)}
                              className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pagamento Premium */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {pagamentoSelecionado ? 'Editar Pagamento' : 'Novo Pagamento'}
                </h2>
                <p className="text-sm text-neutral-500 mt-1.5 font-medium">
                  Preencha os dados da cobrança ou transação financeira
                </p>
              </div>

              <button
                onClick={fecharModal}
                className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Cliente *
                  </label>

                  <div className="relative group/select">
                    <select
                      value={form.cliente_id}
                      onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">
                        Selecionar cliente
                      </option>

                      {clientes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#050505]">
                          {c.nome}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Plano
                  </label>

                  <div className="relative group/select">
                    <select
                      value={form.plano_id}
                      onChange={(e) => preencherPlano(e.target.value)}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">
                        Sem plano
                      </option>

                      {planos.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#050505]">
                          {p.nome}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Valor (R$) *
                  </label>

                  <input
                    type="number"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Data de Vencimento *
                  </label>

                  <input
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Data de Pagamento
                  </label>

                  <input
                    type="date"
                    value={form.data_pagamento}
                    onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Método de Pagamento
                  </label>

                  <div className="relative group/select">
                    <select
                      value={form.metodo_pagamento}
                      onChange={(e) => setForm({ ...form, metodo_pagamento: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">
                        Selecionar
                      </option>

                      {metodos.map((m) => (
                        <option key={m} value={m} className="bg-[#050505]">
                          {m}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Status
                  </label>

                  <div className="relative group/select">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      {statusOpcoes.map((s) => (
                        <option key={s} value={s} className="bg-[#050505]">
                          {s}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Observação interna
                  </label>

                  <textarea
                    placeholder="Anotações sobre cobrança, negociação, atraso, desconto ou condição especial..."
                    value={form.observacao}
                    onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                    rows={3}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-8 border-t border-white/[0.05] bg-white/[0.01] rounded-b-[2.5rem] flex-shrink-0">
              <button
                onClick={fecharModal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>

              <button
                onClick={salvarPagamento}
                disabled={salvando || !form.cliente_id || !form.valor || !form.data_vencimento}
                className="flex-1 bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    {pagamentoSelecionado ? 'Salvar Alterações' : 'Registrar Pagamento'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Premium */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <Trash2 size={32} className="text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Excluir pagamento?
            </h2>

            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
              Esta ação não pode ser desfeita e o registro financeiro será apagado permanentemente.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>

              <button
                onClick={() => excluirPagamento(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:-translate-y-1"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilo para a barra de rolagem do modal e inputs de data */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.6;
          cursor: pointer;
        }

        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </>
  )
}