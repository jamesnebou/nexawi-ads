'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapPin, Clock, ExternalLink } from 'lucide-react'

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
  const [selectedFile, setSelectedFile] = useState(null) // Novo estado para o arquivo selecionado
  const [uploading, setUploading] = useState(false) // Novo estado para o status de upload

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
    setSelectedFile(null) // Resetar arquivo selecionado ao abrir o modal
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setAnuncioEditando(null)
    setSelectedFile(null) // Resetar arquivo selecionado ao fechar o modal
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.hotspot_id) return

    setSalvando(true)
    setUploading(true) // Iniciar indicador de upload

    let imageUrlToSave = form.imagem_url // Começa com a URL existente

    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()
      const filePath = `anuncios/${Date.now()}.${fileExtension}` // Caminho único para o arquivo

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('anuncios') // Nome do bucket no Supabase Storage
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false, // Define se deve sobrescrever um arquivo com o mesmo nome
        })

      if (uploadError) {
        console.error('Erro ao fazer upload da imagem:', uploadError)
        alert('Erro ao fazer upload da imagem. Por favor, tente novamente.')
        setSalvando(false)
        setUploading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('anuncios')
        .getPublicUrl(filePath)

      imageUrlToSave = publicUrlData.publicUrl
    }

    setUploading(false) // Finalizar indicador de upload

    // Agora salva no banco de dados com a URL da imagem (potencialmente nova)
    const dataToSave = { ...form, imagem_url: imageUrlToSave }

    if (anuncioEditando) {
      const { error: updateError } = await supabase.from('anuncios').update(dataToSave).eq('id', anuncioEditando.id)
      if (updateError) {
        console.error('Erro ao atualizar anúncio:', updateError)
        alert('Erro ao atualizar anúncio. Por favor, tente novamente.')
      }
    } else {
      const { error: insertError } = await supabase.from('anuncios').insert([dataToSave])
      if (insertError) {
        console.error('Erro ao criar anúncio:', insertError)
        alert('Erro ao criar anúncio. Por favor, tente novamente.')
      }
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
    // Opcional: Adicionar lógica para excluir a imagem do storage também
    await supabase.from('anuncios').delete().eq('id', id)
    buscarDados()
  }

  return (
    <>
      {/* Ajuste para o cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pl-4 sm:pl-6 md:pl-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-white">Anúncios</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie os anúncios exibidos no portal de captação</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors flex-shrink-0"
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
            <div key={anuncio.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
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
  className="w-20 h-14 bg-gray-800 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
  style={{ display: anuncio.imagem_url ? 'none' : 'flex' }}
>
  📢
</div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-white font-semibold text-sm">{anuncio.titulo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${anuncio.ativo ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {anuncio.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {anuncio.descricao && (
                  <p className="text-gray-500 text-xs mb-1">{anuncio.descricao}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <MapPin size={11} className="flex-shrink-0" />
                    <span>{anuncio.hotspots?.nome || '—'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock size={11} className="flex-shrink-0" />
                    <span>{anuncio.duracao_segundos}s</span>
                  </span>
                  {anuncio.url_destino && (
                    <a href={anuncio.url_destino} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:underline flex-shrink-0">
                      <ExternalLink size={11} className="flex-shrink-0" />
                      <span>CTA</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Botões de ação lado a lado em todas as telas */}
              <div className="flex flex-row flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-auto flex-shrink-0">
                <button
                  onClick={() => toggleAtivo(anuncio)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${anuncio.ativo ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'}`}
                >
                  {anuncio.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => abrirModal(anuncio)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex-shrink-0"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(anuncio.id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-400/10 hover:bg-red-400/20 text-red-400 transition-colors flex-shrink-0"
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

              {/* NOVO CAMPO DE UPLOAD DE ARQUIVO */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Imagem do anúncio</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-black hover:file:bg-green-400"
                />
                {(selectedFile || form.imagem_url) && (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-xs text-gray-400">Pré-visualização:</p>
                    <img
                      src={selectedFile ? URL.createObjectURL(selectedFile) : form.imagem_url}
                      alt="Pré-visualização"
                      className="w-24 h-16 object-cover rounded-lg border border-gray-700"
                    />
                    {selectedFile && (
                      <p className="text-xs text-gray-500 truncate flex-1">{selectedFile.name}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1">Selecione uma imagem para o anúncio. Tamanho recomendado: 1200x675px.</p>
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
                  onChange={(e) => setForm({ ...form, duracao_duracao_segundos: parseInt(e.target.value) })}
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
                disabled={salvando || uploading || !form.titulo.trim() || !form.hotspot_id}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-black bg-green-500 hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(salvando || uploading) ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  anuncioEditando ? 'Salvar alterações' : 'Criar anúncio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}