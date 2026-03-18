'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Package, Plus, Pencil, Trash2, X, Check, Users, Star, RefreshCw } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const intervalos = ['mensal', 'quinzenal', 'semanal']

export default function Planos() {
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '', preco: '', max_criativos: '', max_pontos: '', intervalo_relatorio: 'mensal'
  })

  useEffect(() => { buscarPlanos() }, [])

  async function buscarPlanos() {
    setLoading(true)
    const { data } = await supabase.from('planos').select('*').order('preco', { ascending: true })
    setPlanos(data || [])
    setLoading(false)
  }

  function abrirModal(plano = null) {
    if (plano) {
      setPlanoSelecionado(plano)
      setForm({
        nome: plano.nome || '',
        preco: plano.preco || '',
        max_criativos: plano.max_criativos || '',
        max_pontos: plano.max_pontos || '',
        intervalo_relatorio: plano.intervalo_relatorio || 'mensal'
      })
    } else {
      setPlanoSelecionado(null)
      setForm({ nome: '', preco: '', max_criativos: '', max_pontos: '', intervalo_relatorio: 'mensal' })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setPlanoSelecionado(null)
    setForm({ nome: '', preco: '', max_criativos: '', max_pontos: '', intervalo_relatorio: 'mensal' })
  }

  async function salvarPlano() {
    if (!form.nome.trim()) return
    setSalvando(true)
    const payload = {
      nome: form.nome,
      preco: parseFloat(form.preco) || 0,
      max_criativos: parseInt(form.max_criativos) || 0,
      max_pontos: parseInt(form.max_pontos) || 0,
      intervalo_relatorio: form.intervalo_relatorio
    }
    if (planoSelecionado) {
      await supabase.from('planos').update(payload).eq('id', planoSelecionado.id)
    } else {
      await supabase.from('planos').insert([payload])
    }
    await buscarPlanos()
    setSalvando(false)
    fecharModal()
  }

  async function excluirPlano(id) {
    await supabase.from('planos').delete().eq('id', id)
    setConfirmDelete(null)
    await buscarPlanos()
  }

  const corIntervalo = (intervalo) => {
    if (intervalo === 'semanal') return 'bg-blue-400/10 text-blue-400'
    if (intervalo === 'quinzenal') return 'bg-purple-400/10 text-purple-400'
    return 'bg-green-400/10 text-green-400'
  }

  return (
    <>
      <main className="flex-1 px-8 py-8 overflow-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Planos</h1>
            <p className="text-gray-400 text-sm mt-1">{planos.length} plano{planos.length !== 1 ? 's' : ''} disponíve{planos.length !== 1 ? 'is' : ''}</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Plus size={16} />
            Novo Plano
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : planos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-900 border border-gray-800 rounded-2xl">
            <Package size={36} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">Nenhum plano cadastrado ainda.</p>
            <button onClick={() => abrirModal()} className="mt-3 text-xs text-green-400 hover:underline">
              Criar primeiro plano
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {planos.map((plano) => (
              <div key={plano.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-all group">

                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
                      <Package size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{plano.nome}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corIntervalo(plano.intervalo_relatorio)}`}>
                        Relatório {plano.intervalo_relatorio}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => abrirModal(plano)}
                      className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                    >
                      <Pencil size={12} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(plano.id)}
                      className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={12} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-3xl font-bold text-white">
                    R$ {Number(plano.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">por mês</p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Star size={13} />
                      <span className="text-xs">Máx. criativos</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{plano.max_criativos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users size={13} />
                      <span className="text-xs">Máx. pontos</span>
                    </div>
                    <span className="text-xs font-semibold text-white">
                      {plano.max_pontos >= 999 ? 'Ilimitado' : plano.max_pontos}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <RefreshCw size={13} />
                      <span className="text-xs">Relatório</span>
                    </div>
                    <span className="text-xs font-semibold text-white capitalize">{plano.intervalo_relatorio}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">
                {planoSelecionado ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <button onClick={fecharModal} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Nome do Plano *</label>
                <input
                  type="text"
                  placeholder="Ex: Dominância"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Preço (R$) *</label>
                <input
                  type="number"
                  placeholder="Ex: 1100"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Máx. Criativos</label>
                  <input
                    type="number"
                    placeholder="Ex: 3"
                    value={form.max_criativos}
                    onChange={(e) => setForm({ ...form, max_criativos: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Máx. Pontos</label>
                  <input
                    type="number"
                    placeholder="Ex: 999"
                    value={form.max_pontos}
                    onChange={(e) => setForm({ ...form, max_pontos: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Intervalo do Relatório</label>
                <select
                  value={form.intervalo_relatorio}
                  onChange={(e) => setForm({ ...form, intervalo_relatorio: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                >
                  {intervalos.map((i) => <option key={i}>{i}</option>)}
                </select>
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
                onClick={salvarPlano}
                disabled={salvando || !form.nome.trim()}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={15} />{planoSelecionado ? 'Salvar alterações' : 'Cadastrar'}</>
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
            <h2 className="text-base font-semibold text-white mb-2">Excluir plano?</h2>
            <p className="text-sm text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirPlano(confirmDelete)}
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