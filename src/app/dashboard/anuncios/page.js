'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Anuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [anuncioEditando, setAnuncioEditando] = useState(null)
  const [form, setForm] = useState({
    hotspot_id: '',
    titulo: '',
    descricao: '',
    imagem_url: '',
    url_destino: '',
    duracao_segundos: 15,
    ativo: true,
  })

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)
    const [{ data: anunciosData }, { data: hotspotsData }] = await Promise.all([
      supabase.from('anuncios').select('*, hotspots(nome)').order('created_at', { ascending: false }),
      supabase.from('hotspots').select('id, nome').eq('status', 'Ativo'),
    ])
    setAnuncios(anunciosData || [])
    setHotspots(hotspotsData || [])
    setCarregando(false)
  }

  function abrirModal(anuncio = null) {
    if (anuncio) {
      setAnuncioEditando(anuncio)
      setForm({
        hotspot_id: anuncio.hotspot_id || '',
        titulo: anuncio.titulo || '',
        descricao: anuncio.descricao || '',
        imagem_url: anuncio.imagem_url || '',
        url_destino: anuncio.url_destino || '',
        duracao_segundos: anuncio.duracao_segundos || 15,
        ativo: anuncio.ativo ?? true,
      })
    } else {
      setAnuncioEditando(null)
      setForm({
        hotspot_id: hotspots[0]?.id || '',
        titulo: '',
        descricao: '',
        imagem_url: '',
        url_destino: '',
        duracao_segundos: 15,
        ativo: true,
      })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setAnuncioEditando(null)
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.hotspot_id) return
    setSalvando(true)

    if (anuncioEditando) {
      await supabase.from('anuncios').update(form).eq('id', anuncioEditando.id)
    } else {
      await supabase.from('anuncios').insert([form])
    }

    setSalvando(false)
    fecharModal()
    buscarDados()
  }

  async function toggleAtivo(anuncio) {
    await supabase.from('anuncios').update({ ativo: !anuncio.ativo }).eq('id', anuncio.id)
    buscarDados()
  }

  async function excluir(id) {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return
    await supabase.from('anuncios').delete().eq('id', id)
    buscarDados()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Anúncios</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie os anúncios exibidos no portal de captação</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Novo Anúncio
        </button>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : anuncios.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📢</div>
          <h3 className="text-white font-semibold mb-1">Nenhum anúncio cadastrado</h3>
          <p className="text-gray-500 text-sm mb-4">Crie anúncios para exibir no portal de captação de leads</p>
          <button
            onClick={() => abrirModal()}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Criar primeiro anúncio
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {anuncios.map((anuncio) => (
            <div key={anuncio.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
             {anuncio.imagem_url ? (
  <img
    src={anuncio.imagem_url}
    alt={anuncio.titulo}
    className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
    onError={(e) => {
      e.target.style.display = 'none'
      e.target.nextSibling.style.display = 'flex'
    }}
  />
) : null}
<div
  className="w-20 h-14 bg-gray-800 rounded-xl flex-shrink-0 items-center justify-center text-2xl"
  style={{ display: anuncio.imagem_url ? 'none' : 'flex' }}
>
  📢
</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm truncate">{anuncio.titulo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${anuncio.ativo ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {anuncio.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {anuncio.descricao && (
                  <p className="text-gray-500 text-xs truncate mb-1">{anuncio.descricao}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>📡 {anuncio.hotspots?.nome || '—'}</span>
                  <span>⏱ {anuncio.duracao_segundos}s</span>
                  {anuncio.url_destino && <span>🔗 Com CTA</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleAtivo(anuncio)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${anuncio.ativo ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'}`}
                >
                  {anuncio.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => abrirModal(anuncio)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(anuncio.id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-400/10 hover:bg-red-400/20 text-red-400 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">
                {anuncioEditando ? 'Editar Anúncio' : 'Novo Anúncio'}
              </h2>
              <button onClick={fecharModal} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Hotspot</label>
                <select
                  value={form.hotspot_id}
                  onChange={(e) => setForm({ ...form, hotspot_id: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um hotspot</option>
                  {hotspots.map((h) => (
                    <option key={h.id} value={h.id}>{h.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Título do anúncio</label>
                <input
                  type="text"
                  placeholder="Ex: 20% de desconto na sua próxima compra"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Descrição</label>
                <textarea
                  placeholder="Detalhes da oferta ou mensagem..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">URL da imagem</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.imagem_url}
                  onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">URL de destino (CTA)</label>
                <input
                  type="url"
                  placeholder="https://seusite.com.br"
                  value={form.url_destino}
                  onChange={(e) => setForm({ ...form, url_destino: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Duração obrigatória (segundos)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={form.duracao_segundos}
                  onChange={(e) => setForm({ ...form, duracao_segundos: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-600 mt-1">O usuário precisa aguardar esse tempo antes de continuar</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-800 rounded-xl border border-gray-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="accent-green-500"
                />
                <span className="text-sm text-gray-300">Anúncio ativo</span>
              </label>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-800">
              <button
                onClick={fecharModal}
                className="flex-1 py-3 rounded-xl font-medium text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.titulo.trim() || !form.hotspot_id}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-black bg-green-500 hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  anuncioEditando ? 'Salvar alterações' : 'Criar anúncio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}