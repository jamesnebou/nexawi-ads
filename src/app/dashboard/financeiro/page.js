'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  DollarSign, Plus, Search, Pencil, Trash2, X, Check,
  AlertTriangle, Clock, CheckCircle2, Download
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const statusOpcoes = ['Pendente', 'Pago', 'Vencido', 'Cancelado']
const metodos = ['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro']

const corStatus = (status) => {
  if (status === 'Pago') return 'bg-green-400/10 text-green-400'
  if (status === 'Vencido') return 'bg-red-400/10 text-red-400'
  if (status === 'Cancelado') return 'bg-gray-400/10 text-gray-400'
  return 'bg-yellow-400/10 text-yellow-400'
}

const iconStatus = (status) => {
  if (status === 'Pago') return <CheckCircle2 size={13} />
  if (status === 'Vencido') return <AlertTriangle size={13} />
  return <Clock size={13} />
}

export default function Financeiro() {
  const [pagamentos, setPagamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    cliente_id: '', plano_id: '', valor: '', status: 'Pendente',
    data_vencimento: '', data_pagamento: '', metodo_pagamento: '', observacao: ''
  })

  useEffect(() => { buscarDados() }, [])

  async function buscarDados() {
    setLoading(true)
    const [{ data: pagamentosData }, { data: clientesData }, { data: planosData }] = await Promise.all([
      supabase.from('pagamentos').select('*, clientes(nome), planos(nome)').order('data_vencimento', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('planos').select('id, nome, preco')
    ])
    setPagamentos(pagamentosData || [])
    setClientes(clientesData || [])
    setPlanos(planosData || [])
    setLoading(false)
  }

  function abrirModal(pagamento = null) {
    if (pagamento) {
      setPagamentoSelecionado(pagamento)
      setForm({
        cliente_id: pagamento.cliente_id || '',
        plano_id: pagamento.plano_id || '',
        valor: pagamento.valor || '',
        status: pagamento.status || 'Pendente',
        data_vencimento: pagamento.data_vencimento || '',
        data_pagamento: pagamento.data_pagamento || '',
        metodo_pagamento: pagamento.metodo_pagamento || '',
        observacao: pagamento.observacao || ''
      })
    } else {
      setPagamentoSelecionado(null)
      setForm({
        cliente_id: '', plano_id: '', valor: '', status: 'Pendente',
        data_vencimento: '', data_pagamento: '', metodo_pagamento: '', observacao: ''
      })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setPagamentoSelecionado(null)
  }

  async function salvarPagamento() {
    if (!form.cliente_id || !form.valor || !form.data_vencimento) return
    setSalvando(true)
    const payload = {
      ...form,
      valor: parseFloat(form.valor),
      plano_id: form.plano_id || null,
      data_pagamento: form.data_pagamento || null
    }
    if (pagamentoSelecionado) {
      await supabase.from('pagamentos').update(payload).eq('id', pagamentoSelecionado.id)
    } else {
      await supabase.from('pagamentos').insert([payload])
    }
    await buscarDados()
    setSalvando(false)
    fecharModal()
  }

  async function excluirPagamento(id) {
    await supabase.from('pagamentos').delete().eq('id', id)
    setConfirmDelete(null)
    await buscarDados()
  }

  function preencherPlano(planoId) {
    const plano = planos.find(p => p.id === planoId)
    setForm({ ...form, plano_id: planoId, valor: plano ? plano.preco : form.valor })
  }

  function exportarCSV() {
    const linhas = [
      ['Cliente', 'Plano', 'Valor', 'Status', 'Vencimento', 'Pagamento', 'Método', 'Observação'],
      ...pagamentosFiltrados.map(p => [
        p.clientes?.nome || '',
        p.planos?.nome || '',
        p.valor,
        p.status,
        p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString('pt-BR') : '',
        p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '',
        p.metodo_pagamento || '',
        p.observacao || ''
      ])
    ]
    const csv = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const pagamentosFiltrados = pagamentos.filter(p => {
    const buscaOk =
      p.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.planos?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.status?.toLowerCase().includes(busca.toLowerCase())
    const statusOk = filtroStatus === 'Todos' || p.status === filtroStatus
    return buscaOk && statusOk
  })

  const totalRecebido = pagamentos.filter(p => p.status === 'Pago').reduce((acc, p) => acc + Number(p.valor), 0)
  const totalPendente = pagamentos.filter(p => p.status === 'Pendente').reduce((acc, p) => acc + Number(p.valor), 0)
  const totalVencido = pagamentos.filter(p => p.status === 'Vencido').reduce((acc, p) => acc + Number(p.valor), 0)

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <main className="flex-1 px-8 py-8 overflow-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Financeiro</h1>
            <p className="text-gray-400 text-sm mt-1">{pagamentos.length} registro{pagamentos.length !== 1 ? 's' : ''} de pagamento</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportarCSV}
              disabled={pagamentosFiltrados.length === 0}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition-all text-sm border border-gray-700"
            >
              <Download size={16} />
              Exportar CSV
            </button>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
            >
              <Plus size={16} />
              Novo Pagamento
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-green-400/5 border border-green-400/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Total Recebido</p>
              <CheckCircle2 size={16} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{fmt(totalRecebido)}</p>
            <p className="text-xs text-gray-600 mt-1">{pagamentos.filter(p => p.status === 'Pago').length} pagamento(s)</p>
          </div>
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">A Receber</p>
              <Clock size={16} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{fmt(totalPendente)}</p>
            <p className="text-xs text-gray-600 mt-1">{pagamentos.filter(p => p.status === 'Pendente').length} pendente(s)</p>
          </div>
          <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Em Atraso</p>
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{fmt(totalVencido)}</p>
            <p className="text-xs text-gray-600 mt-1">{pagamentos.filter(p => p.status === 'Vencido').length} vencido(s)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, plano ou status..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Todos', ...statusOpcoes].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  filtroStatus === s
                    ? 'bg-green-500 text-black'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pagamentosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <DollarSign size={36} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum pagamento encontrado.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Cliente</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Plano</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Valor</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Vencimento</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Pagamento</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Método</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Status</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {pagamentosFiltrados.map((p) => {
                  const vencida = p.status === 'Pendente' && new Date(p.data_vencimento) < new Date()
                  return (
                    <tr key={p.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 font-semibold text-xs flex-shrink-0">
                            {p.clientes?.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-sm text-white">{p.clientes?.nome || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{p.planos?.nome || '—'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">{fmt(p.valor)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${vencida ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                          {p.data_vencimento ? new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {p.data_pagamento ? new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{p.metodo_pagamento || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium w-fit ${corStatus(p.status)}`}>
                          {iconStatus(p.status)}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirModal(p)}
                            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                          >
                            <Pencil size={12} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} className="text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-base font-semibold text-white">
                {pagamentoSelecionado ? 'Editar Pagamento' : 'Novo Pagamento'}
              </h2>
              <button onClick={fecharModal} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1.5 block">Cliente *</label>
                  <select
                    value={form.cliente_id}
                    onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Selecionar cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Plano</label>
                  <select
                    value={form.plano_id}
                    onChange={(e) => preencherPlano(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Sem plano</option>
                    {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Valor (R$) *</label>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Data de Pagamento</label>
                  <input
                    type="date"
                    value={form.data_pagamento}
                    onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Método de Pagamento</label>
                  <select
                    value={form.metodo_pagamento}
                    onChange={(e) => setForm({ ...form, metodo_pagamento: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Selecionar</option>
                    {metodos.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    {statusOpcoes.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1.5 block">Observação</label>
                  <textarea
                    placeholder="Anotações sobre este pagamento..."
                    value={form.observacao}
                    onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-800">
              <button
                onClick={fecharModal}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPagamento}
                disabled={salvando || !form.cliente_id || !form.valor || !form.data_vencimento}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={15} />{pagamentoSelecionado ? 'Salvar alterações' : 'Registrar'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-white mb-2">Excluir pagamento?</h2>
            <p className="text-sm text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirPagamento(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}