'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DollarSign, Plus, Pencil, Trash2, X, Check, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const statusOpcoes = ['Pendente', 'Pago', 'Vencido']
const metodos = ['PIX', 'Cartão de Crédito', 'Boleto', 'Dinheiro', 'Transferência']

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '', plano_id: '', valor: '', data_vencimento: '',
    data_pagamento: '', metodo_pagamento: '', status: 'Pendente', observacao: ''
  })

  useEffect(() => {
    buscarDados()
  }, [busca, filtroStatus])

  async function buscarDados() {
    setCarregando(true)

    const [{ data: clientesData }, { data: planosData }] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('planos').select('id, nome, preco').order('nome')
    ])
    if (clientesData) setClientes(clientesData)
    if (planosData) setPlanos(planosData)

    let query = supabase.from('pagamentos').select('*, clientes(nome), planos(nome)').order('data_vencimento', { ascending: false })

    if (filtroStatus !== 'Todos') query = query.eq('status', filtroStatus)

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar pagamentos:', error)
      toast.error('Erro ao carregar pagamentos.')
    } else {
      let filtrados = data || []
      if (busca) {
        const termo = busca.toLowerCase()
        filtrados = filtrados.filter(p => 
          p.clientes?.nome?.toLowerCase().includes(termo) ||
          p.planos?.nome?.toLowerCase().includes(termo) ||
          p.valor?.toString().includes(termo)
        )
      }
      setPagamentos(filtrados)
    }
    setCarregando(false)
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
        observacao: pagamento.observacao || ''
      })
    } else {
      setPagamentoSelecionado(null)
      setForm({
        cliente_id: '', plano_id: '', valor: '', data_vencimento: '',
        data_pagamento: '', metodo_pagamento: '', status: 'Pendente', observacao: ''
      })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setPagamentoSelecionado(null)
  }

  function preencherPlano(planoId) {
    const plano = planos.find(p => p.id === planoId)
    setForm({
      ...form,
      plano_id: planoId,
      valor: plano ? plano.preco : form.valor
    })
  }

  async function salvarPagamento() {
    if (!form.cliente_id || !form.valor || !form.data_vencimento) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setSalvando(true)
    const dados = {
      cliente_id: form.cliente_id,
      plano_id: form.plano_id || null,
      valor: parseFloat(form.valor),
      data_vencimento: form.data_vencimento,
      data_pagamento: form.data_pagamento || null,
      metodo_pagamento: form.metodo_pagamento || null,
      status: form.status,
      observacao: form.observacao || null
    }

    if (pagamentoSelecionado) {
      const { error } = await supabase.from('pagamentos').update(dados).eq('id', pagamentoSelecionado.id)
      if (error) toast.error('Erro ao atualizar pagamento.')
      else { toast.success('Pagamento atualizado!'); fecharModal(); buscarDados() }
    } else {
      const { error } = await supabase.from('pagamentos').insert([dados])
      if (error) toast.error('Erro ao registrar pagamento.')
      else { toast.success('Pagamento registrado!'); fecharModal(); buscarDados() }
    }
    setSalvando(false)
  }

  async function excluirPagamento(id) {
    const { error } = await supabase.from('pagamentos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir pagamento.')
    else { toast.success('Pagamento excluído!'); buscarDados() }
    setConfirmDelete(null)
  }

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  const corStatus = (status) => {
    switch (status) {
      case 'Pago': return 'bg-green-500/10 text-green-400 border border-green-500/20'
      case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      case 'Vencido': return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default: return 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'
    }
  }

  const iconStatus = (status) => {
    switch (status) {
      case 'Pago': return <CheckCircle2 size={14} />
      case 'Pendente': return <Clock size={14} />
      case 'Vencido': return <AlertCircle size={14} />
      default: return null
    }
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { background: '#0a0a0a', color: '#fff', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0a0a0a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' } }
        }} 
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">

        {/* Header e Controles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-2xl border border-green-500/20">
                <DollarSign className="text-green-500" size={24} />
              </div>
              Financeiro
            </h1>
            <p className="text-sm text-neutral-500 mt-2 font-medium">Controle de mensalidades e pagamentos</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-72 group/input">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
              <input
                type="text"
                placeholder="Buscar por cliente, plano..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
              />
            </div>

            <div className="relative w-full sm:w-48 group/select">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all cursor-pointer shadow-inner"
              >
                <option value="Todos" className="bg-[#0a0a0a]">Todos os Status</option>
                {statusOpcoes.map(s => <option key={s} value={s} className="bg-[#0a0a0a]">{s}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <button
              onClick={() => abrirModal()}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
            >
              <Plus size={18} strokeWidth={2.5} />
              Novo Pagamento
            </button>
          </div>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-green-500/50 rounded-full animate-spin"></div>
              <DollarSign className="text-green-500 animate-pulse" size={24} />
            </div>
          </div>
        ) : pagamentos.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <DollarSign size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Nenhum pagamento encontrado</h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md">Você ainda não tem registros financeiros ou nenhum resultado corresponde à sua busca.</p>
            <button onClick={() => abrirModal()} className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2">
              <Plus size={18} /> Registrar primeiro pagamento
            </button>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
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
                    const vencida = p.status === 'Pendente' && new Date(p.data_vencimento) < new Date()
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center text-neutral-400 font-bold text-sm shadow-inner flex-shrink-0 group-hover:text-white group-hover:border-white/[0.1] transition-colors">
                              {p.clientes?.nome?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors truncate">{p.clientes?.nome || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm text-neutral-400 whitespace-nowrap truncate">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-white/[0.05] text-xs font-medium shadow-inner">
                            {p.planos?.nome || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-white whitespace-nowrap">{fmt(p.valor)}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`text-sm font-medium ${vencida ? 'text-red-400' : 'text-neutral-400'}`}>
                            {p.data_vencimento ? new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-neutral-400 font-medium whitespace-nowrap">
                          {p.data_pagamento ? new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-6 py-5 text-sm text-neutral-400 font-medium whitespace-nowrap">{p.metodo_pagamento || '—'}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest w-fit flex-shrink-0 ${corStatus(p.status)}`}>
                            {iconStatus(p.status)}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
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
                <h2 className="text-2xl font-bold text-white tracking-tight">{pagamentoSelecionado ? 'Editar Pagamento' : 'Novo Pagamento'}</h2>
                <p className="text-sm text-neutral-500 mt-1.5 font-medium">Preencha os dados da transação financeira</p>
              </div>
              <button onClick={fecharModal} className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Cliente *</label>
                  <div className="relative group/select">
                    <select
                      value={form.cliente_id}
                      onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">Selecionar cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id} className="bg-[#050505]">{c.nome}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Plano</label>
                  <div className="relative group/select">
                    <select
                      value={form.plano_id}
                      onChange={(e) => preencherPlano(e.target.value)}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">Sem plano</option>
                      {planos.map(p => <option key={p.id} value={p.id} className="bg-[#050505]">{p.nome}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Valor (R$) *</label>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Data de Pagamento</label>
                  <input
                    type="date"
                    value={form.data_pagamento}
                    onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Método de Pagamento</label>
                  <div className="relative group/select">
                    <select
                      value={form.metodo_pagamento}
                      onChange={(e) => setForm({ ...form, metodo_pagamento: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">Selecionar</option>
                      {metodos.map(m => <option key={m} className="bg-[#050505]">{m}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Status</label>
                  <div className="relative group/select">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      {statusOpcoes.map(s => <option key={s} className="bg-[#050505]">{s}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Observação</label>
                  <textarea
                    placeholder="Anotações sobre este pagamento..."
                    value={form.observacao}
                    onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                    rows={3}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner resize-none"
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
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={18} strokeWidth={2.5} /> {pagamentoSelecionado ? 'Salvar Alterações' : 'Registrar Pagamento'}</>
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
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Excluir pagamento?</h2>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">Esta ação não pode ser desfeita e o registro financeiro será apagado permanentemente.</p>
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
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        /* Ajuste para o ícone de calendário nos inputs de data no Chrome/Edge */
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