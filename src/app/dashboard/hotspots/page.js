'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Wifi, Plus, Search, Pencil, Trash2, X, Check, MapPin } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const statusOpcoes = ['Ativo', 'Inativo', 'Manutenção']

export default function Hotspots() {
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [hotspotSelecionado, setHotspotSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '', cidade: '', endereco: '', parceiro: '', status: 'Ativo'
  })

  useEffect(() => { buscarDados() }, [])

  async function buscarDados() {
    setLoading(true)
    const { data } = await supabase
      .from('hotspots')
      .select('*')
      .order('created_at', { ascending: false })
    setHotspots(data || [])
    setLoading(false)
  }

  function abrirModal(hotspot = null) {
    if (hotspot) {
      setHotspotSelecionado(hotspot)
      setForm({
        nome: hotspot.nome || '',
        cidade: hotspot.cidade || '',
        endereco: hotspot.endereco || '',
        parceiro: hotspot.parceiro || '',
        status: hotspot.status || 'Ativo'
      })
    } else {
      setHotspotSelecionado(null)
      setForm({ nome: '', cidade: '', endereco: '', parceiro: '', status: 'Ativo' })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setHotspotSelecionado(null)
    setForm({ nome: '', cidade: '', endereco: '', parceiro: '', status: 'Ativo' })
  }

  async function salvarHotspot() {
    if (!form.nome.trim()) return
    setSalvando(true)
    if (hotspotSelecionado) {
      await supabase.from('hotspots').update(form).eq('id', hotspotSelecionado.id)
    } else {
      await supabase.from('hotspots').insert([form])
    }
    await buscarDados()
    setSalvando(false)
    fecharModal()
  }

  async function excluirHotspot(id) {
    await supabase.from('hotspots').delete().eq('id', id)
    setConfirmDelete(null)
    await buscarDados()
  }

  const hotspotsFiltrados = hotspots.filter((h) => {
    const buscaOk = h.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      h.cidade?.toLowerCase().includes(busca.toLowerCase()) ||
      h.parceiro?.toLowerCase().includes(busca.toLowerCase())
    const statusOk = filtroStatus === 'Todos' || (h.status || 'Ativo').toLowerCase() === filtroStatus.toLowerCase()
    return buscaOk && statusOk
  })

  const corStatus = (status) => {
    if (!status || status.toLowerCase() === 'ativo') return 'bg-green-400/10 text-green-400'
    if (status.toLowerCase() === 'inativo') return 'bg-red-400/10 text-red-400'
    return 'bg-yellow-400/10 text-yellow-400'
  }

  return (
    <>
      <main className="flex-1 overflow-auto"> {/* REMOVIDO px-8 py-8 - o padding agora é do layout pai */}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Hotspots</h1>
            <p className="text-gray-400 text-sm mt-1">
              {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''} cadastrado{hotspots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Plus size={16} />
            Novo Hotspot
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou parceiro..."
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

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto pb-2"> {/* ADICIONADO overflow-x-auto e pb-2, REMOVIDO overflow-hidden */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hotspotsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Wifi size={36} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum hotspot encontrado.</p>
              <button onClick={() => abrirModal()} className="mt-3 text-xs text-green-400 hover:underline">
                Cadastrar primeiro hotspot
              </button>
            </div>
          ) : (
            <table className="min-w-full"> {/* ALTERADO de w-full para min-w-full */}
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4 whitespace-nowrap">Hotspot</th> {/* ADICIONADO whitespace-nowrap */}
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4 whitespace-nowrap">Cidade</th> {/* ADICIONADO whitespace-nowrap */}
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4 whitespace-nowrap">Parceiro</th> {/* ADICIONADO whitespace-nowrap */}
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4 whitespace-nowrap">Status</th> {/* ADICIONADO whitespace-nowrap */}
                  <th className="text-left text-xs text-gray-500 font-medium px-6 py-4 whitespace-nowrap">Cadastrado em</th> {/* ADICIONADO whitespace-nowrap */}
                  <th className="text-right text-xs text-gray-500 font-medium px-6 py-4 whitespace-nowrap">Ações</th> {/* ADICIONADO whitespace-nowrap */}
                </tr>
              </thead>
              <tbody>
                {hotspotsFiltrados.map((hotspot) => (
                  <tr key={hotspot.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap"> {/* ADICIONADO whitespace-nowrap */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-400/10 flex items-center justify-center flex-shrink-0"> {/* ADICIONADO flex-shrink-0 */}
                          <Wifi size={16} className="text-blue-400" />
                        </div>
                        <div className="min-w-0"> {/* ADICIONADO min-w-0 */}
                          <p className="text-sm font-medium text-white truncate">{hotspot.nome}</p> {/* ADICIONADO truncate */}
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate"> {/* ADICIONADO truncate */}
                            <MapPin size={10} className="flex-shrink-0" /> {/* ADICIONADO flex-shrink-0 */}
                            {hotspot.endereco || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{hotspot.cidade || '—'}</td> {/* ADICIONADO whitespace-nowrap */}
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{hotspot.parceiro || '—'}</td> {/* ADICIONADO whitespace-nowrap */}
                    <td className="px-6 py-4 whitespace-nowrap"> {/* ADICIONADO whitespace-nowrap */}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${corStatus(hotspot.status)} w-fit`}> {/* ADICIONADO w-fit */}
                        {hotspot.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap"> {/* ADICIONADO whitespace-nowrap */}
                      {new Date(hotspot.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"> {/* ADICIONADO whitespace-nowrap */}
                      <div className="flex items-center justify-end gap-2 flex-shrink-0"> {/* ADICIONADO flex-shrink-0 */}
                        <button
                          onClick={() => abrirModal(hotspot)}
                          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Pencil size={14} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(hotspot.id)}
                          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} className="text-gray-400" />
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-base font-semibold text-white">
                {hotspotSelecionado ? 'Editar Hotspot' : 'Novo Hotspot'}
              </h2>
              <button onClick={fecharModal} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3"> {/* Alterado para grid-cols-1 para melhor responsividade no modal */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Nome do Hotspot *</label>
                  <input
                    type="text"
                    placeholder="Ex: Hotspot Centro"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
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
                  <label className="text-xs text-gray-400 mb-1.5 block">Endereço</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores, 123"
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Parceiro</label>
                  <input
                    type="text"
                    placeholder="Ex: Restaurante XYZ"
                    value={form.parceiro}
                    onChange={(e) => setForm({ ...form, parceiro: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
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
                onClick={salvarHotspot}
                disabled={salvando || !form.nome.trim()}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={15} />{hotspotSelecionado ? 'Salvar alterações' : 'Cadastrar'}</>
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
            <h2 className="text-base font-semibold text-white mb-2">Excluir hotspot?</h2>
            <p className="text-sm text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirHotspot(confirmDelete)}
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