'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Plus, Pencil, Trash2, X, Check, Search, Phone, Mail, MapPin, CreditCard } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const statusOpcoes = ['Ativo', 'Inativo', 'Inadimplente']
const statusCores = {
  Ativo: 'bg-green-400/10 text-green-400',
  Inativo: 'bg-gray-400/10 text-gray-400',
  Inadimplente: 'bg-red-400/10 text-red-400'
}

const estadosBR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cpf_cnpj: '',
    endereco: '', cidade: '', estado: '', plano_id: '', status: 'Ativo'
  })

  useEffect(() => { buscarDados() }, [])

  async function buscarDados() {
    setLoading(true)
    const [{ data: clientesData }, { data: planosData }] = await Promise.all([
      supabase.from('clientes').select('*, planos(nome)').order('created_at', { ascending: false }),
      supabase.from('planos').select('id, nome, preco')
    ])
    setClientes(clientesData || [])
    setPlanos(planosData || [])
    setLoading(false)
  }

  function abrirModal(cliente = null) {
    if (cliente) {
      setClienteSelecionado(cliente)
      setForm({
        nome: cliente.nome || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        plano_id: cliente.plano_id || '',
        status: cliente.status || 'Ativo'
      })
    } else {
      setClienteSelecionado(null)
      setForm({ nome: '', email: '', telefone: '', cpf_cnpj: '', endereco: '', cidade: '', estado: '', plano_id: '', status: 'Ativo' })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setClienteSelecionado(null)
  }

  async function salvarCliente() {
    if (!form.nome.trim()) return
    setSalvando(true)
    const payload = { ...form, plano_id: form.plano_id || null }
    if (clienteSelecionado) {
      await supabase.from('clientes').update(payload).eq('id', clienteSelecionado.id)
    } else {
      await supabase.from('clientes').insert([payload])
    }
    await buscarDados()
    setSalvando(false)
    fecharModal()
  }

  async function excluirCliente(id) {
    await supabase.from('clientes').delete().eq('id', id)
    setConfirmDelete(null)
    await buscarDados()
  }

  const clientesFiltrados = clientes.filter((c) => {
    const buscaOk =
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.email?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) ||
      c.cpf_cnpj?.includes(busca) ||
      c.cidade?.toLowerCase().includes(busca.toLowerCase())
    const statusOk = filtroStatus === 'Todos' || c.status === filtroStatus
    return buscaOk && statusOk
  })

  const totalAtivos = clientes.filter(c => c.status === 'Ativo').length
  const totalInadimplentes = clientes.filter(c => c.status === 'Inadimplente').length
  const totalInativos = clientes.filter(c => c.status === 'Inativo').length

  return (
    <>
      <main className="flex-1 px-8 py-8 overflow-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-gray-400 text-sm mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Plus size={16} />
            Novo Cliente
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ativos</p>
            <p className="text-2xl font-bold text-green-400">{totalAtivos}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Inadimplentes</p>
            <p className="text-2xl font-bold text-red-400">{totalInadimplentes}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Inativos</p>
            <p className="text-2xl font-bold text-gray-400">{totalInativos}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone, CPF/CNPJ ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
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
          ) : clientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users size={36} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum cliente encontrado.</p>
              <button onClick={() => abrirModal()} className="mt-3 text-xs text-green-400 hover:underline">
                Cadastrar primeiro cliente
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Cliente</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Contato</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Localização</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Plano</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Status</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Cadastro</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 font-semibold text-sm flex-shrink-0">
                          {cliente.nome?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{cliente.nome}</p>
                          <p className="text-xs text-gray-500">{cliente.cpf_cnpj || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {cliente.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Mail size={11} />{cliente.email}
                          </div>
                        )}
                        {cliente.telefone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Phone size={11} />{cliente.telefone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(cliente.cidade || cliente.estado) ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin size={11} />
                          {[cliente.cidade, cliente.estado].filter(Boolean).join(' / ')}
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {cliente.planos ? (
                        <div className="flex items-center gap-1.5 text-xs text-purple-400">
                          <CreditCard size={11} />{cliente.planos.nome}
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCores[cliente.status] || 'bg-gray-400/10 text-gray-400'}`}>
                        {cliente.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirModal(cliente)}
                          className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                        >
                          <Pencil size={12} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(cliente.id)}
                          className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={12} className="text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {clienteSelecionado ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={fecharModal} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1.5 block">Nome completo *</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">CPF / CNPJ</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={form.cpf_cnpj}
                    onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1.5 block">E-mail</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1.5 block">Endereço</label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro"
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Selecione</option>
                    {estadosBR.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Plano</label>
                  <select
                    value={form.plano_id}
                    onChange={(e) => setForm({ ...form, plano_id: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Sem plano</option>
                    {planos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} — R$ {Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    {statusOpcoes.map((s) => <option key={s}>{s}</option>)}
                  </select>
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
                onClick={salvarCliente}
                disabled={salvando || !form.nome.trim()}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={15} />{clienteSelecionado ? 'Salvar alterações' : 'Cadastrar'}</>
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
            <h2 className="text-base font-semibold text-white mb-2">Excluir cliente?</h2>
            <p className="text-sm text-gray-400 mb-6">Todos os pagamentos vinculados também serão excluídos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={() => excluirCliente(confirmDelete)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}