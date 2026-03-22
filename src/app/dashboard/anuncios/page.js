'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapPin, Clock, ExternalLink, Image as ImageIcon, Video as VideoIcon, User, Eye, MousePointerClick, Search } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Anuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [anuncioEditando, setAnuncioEditando] = useState(null)
  const [form, setForm] = useState({
    hotspot_id: '',
    titulo: '',
    descricao: '',
    media_url: '',
    tipo_media: 'imagem',
    url_destino: '',
    duracao_segundos: 15,
    ativo: true,
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterHotspotId, setFilterHotspotId] = useState('')
  const [filterClientId, setFilterClientId] = useState('')
  const [filterMediaType, setFilterMediaType] = useState('todos')

  // NOVO: Estado para gerenciar o cliente selecionado no modal (para filtrar hotspots)
  const [selectedClientInModal, setSelectedClientInModal] = useState('')

  useEffect(() => {
    buscarDados()
  }, [searchTerm, filterStatus, filterHotspotId, filterClientId, filterMediaType])

  async function buscarDados() {
    setCarregando(true)

    // Busca todos os clientes para o filtro de clientes e para o modal
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome')
      .order('nome', { ascending: true })
    if (clientesError) console.error('Erro ao buscar clientes:', clientesError)
    setClientes(clientesData || [])

    // Busca todos os hotspots para o filtro de hotspots e para o modal (com info do cliente)
    const { data: hotspotsData, error: hotspotsError } = await supabase
      .from('hotspots')
      .select('id, nome, clientes(id, nome)') // Garante que o ID e nome do cliente do hotspot sejam selecionados
      .eq('status', 'Ativo') // Apenas hotspots ativos
      .order('nome', { ascending: true })
    if (hotspotsError) console.error('Erro ao buscar hotspots:', hotspotsError)
    setHotspots(hotspotsData || [])


    let query = supabase
      .from('anuncios')
      .select('*, hotspots(id, nome, clientes(id, nome))')
      .order('created_at', { ascending: false })

    if (filterStatus === 'ativo') {
      query = query.eq('ativo', true)
    } else if (filterStatus === 'inativo') {
      query = query.eq('ativo', false)
    }

    if (filterHotspotId) {
      query = query.eq('hotspot_id', filterHotspotId)
    }

    if (filterClientId) {
      query = query.eq('hotspots.clientes.id', filterClientId)
    }

    if (filterMediaType === 'imagem') {
      query = query.eq('tipo_media', 'imagem')
    } else if (filterMediaType === 'video') {
      query = query.eq('tipo_media', 'video')
    }

    if (searchTerm) {
      query = query.or(`titulo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`)
    }

    const { data: anunciosData, error: anunciosError } = await query
    if (anunciosError) {
      console.error('Erro ao buscar anúncios:', anunciosError)
      alert('Erro ao carregar anúncios. Por favor, tente novamente.')
      setCarregando(false)
      return
    }

    const anunciosComMetricas = await Promise.all(anunciosData.map(async (anuncio) => {
      const { count: viewsCount, error: viewsError } = await supabase
        .from('anuncio_views')
        .select('*', { count: 'exact', head: true })
        .eq('anuncio_id', anuncio.id)

      const { count: clicksCount, error: clicksError } = await supabase
        .from('anuncio_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('anuncio_id', anuncio.id)

      if (viewsError) console.error('Erro ao buscar views:', viewsError)
      if (clicksError) console.error('Erro ao buscar clicks:', clicksError)

      return {
        ...anuncio,
        views: viewsCount || 0,
        clicks: clicksCount || 0,
      }
    }))

    setAnuncios(anunciosComMetricas || [])
    setCarregando(false)
  }

  function abrirModal(anuncio = null) {
    if (anuncio) {
      setAnuncioEditando(anuncio)
      setForm({
        hotspot_id: anuncio.hotspot_id || '',
        titulo: anuncio.titulo || '',
        descricao: anuncio.descricao || '',
        media_url: anuncio.media_url || '',
        tipo_media: anuncio.tipo_media || 'imagem',
        url_destino: anuncio.url_destino || '',
        duracao_segundos: anuncio.duracao_segundos || 15,
        ativo: anuncio.ativo ?? true,
      })
      // NOVO: Define o cliente selecionado no modal ao abrir para edição
      setSelectedClientInModal(anuncio.hotspots?.clientes?.id || '')
    } else {
      setAnuncioEditando(null)
      setForm({
        hotspot_id: '', // Reseta hotspot_id para novo anúncio
        titulo: '',
        descricao: '',
        media_url: '',
        tipo_media: 'imagem',
        url_destino: '',
        duracao_segundos: 15,
        ativo: true,
      })
      // NOVO: Define o primeiro cliente como padrão ou vazio para novo anúncio
      setSelectedClientInModal(clientes[0]?.id || '')
    }
    setSelectedFile(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setAnuncioEditando(null)
    setSelectedFile(null)
    setSelectedClientInModal('') // Reseta a seleção de cliente no modal ao fechar
  }

  // NOVO: Hotspots filtrados para o modal, baseados no cliente selecionado no modal
  const filteredHotspotsForModal = hotspots.filter(h =>
    !selectedClientInModal || h.clientes?.id === selectedClientInModal
  );

  // Efeito para resetar o hotspot_id se o cliente selecionado no modal mudar e o hotspot atual não for mais válido
  useEffect(() => {
    if (modalAberto && form.hotspot_id) {
      const currentHotspotValid = filteredHotspotsForModal.some(h => h.id === form.hotspot_id);
      if (!currentHotspotValid) {
        setForm(prevForm => ({ ...prevForm, hotspot_id: '' }));
      }
    }
  }, [selectedClientInModal, filteredHotspotsForModal, modalAberto, form.hotspot_id]);


  async function salvar() {
    if (!form.titulo.trim() || !form.hotspot_id) return

    setSalvando(true)
    setUploading(true)

    let mediaUrlToSave = form.media_url
    let mediaTypeToSave = form.tipo_media

    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()
      const isVideo = selectedFile.type.startsWith('video/')
      const filePath = `anuncios/${Date.now()}.${fileExtension}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('anuncios')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Erro ao fazer upload da mídia:', uploadError)
        alert('Erro ao fazer upload da mídia. Por favor, tente novamente.')
        setSalvando(false)
        setUploading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('anuncios')
        .getPublicUrl(filePath)

      mediaUrlToSave = publicUrlData.publicUrl
      mediaTypeToSave = isVideo ? 'video' : 'imagem'
    }

    setUploading(false)

    const dataToSave = { ...form, media_url: mediaUrlToSave, tipo_media: mediaTypeToSave }

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
    await supabase.from('anuncios').delete().eq('id', id)
    buscarDados()
  }

  return (
    <>
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

      {/* Seção de Busca e Filtros */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 mx-4 sm:mx-6 md:mx-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Input de Busca */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Filtro por Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="todos">Status: Todos</option>
            <option value="ativo">Status: Ativos</option>
            <option value="inativo">Status: Inativos</option>
          </select>

          {/* Filtro por Hotspot */}
          <select
            value={filterHotspotId}
            onChange={(e) => setFilterHotspotId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="">Hotspot: Todos</option>
            {hotspots.map((h) => (
              <option key={h.id} value={h.id}>{h.nome}</option>
            ))}
          </select>

          {/* Filtro por Cliente */}
          <select
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="">Cliente: Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* Filtro por Tipo de Mídia */}
          <select
            value={filterMediaType}
            onChange={(e) => setFilterMediaType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="todos">Mídia: Todas</option>
            <option value="imagem">Mídia: Imagem</option>
            <option value="video">Mídia: Vídeo</option>
          </select>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : anuncios.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center mx-4 sm:mx-6 md:mx-8">
          <div className="text-4xl mb-3">📢</div>
          <h3 className="text-white font-semibold mb-1">Nenhum anúncio encontrado</h3>
          <p className="text-gray-500 text-sm mb-4">Ajuste seus filtros ou crie um novo anúncio.</p>
          <button
            onClick={() => abrirModal()}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Criar primeiro anúncio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mx-4 sm:mx-6 md:mx-8">
          {anuncios.map((anuncio) => (
            // ALTERADO: Layout do card para flex-row em desktop
            <div key={anuncio.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-row items-center gap-4 w-full">
             {/* Mídia na lateral esquerda */}
             <div className="flex-shrink-0 flex items-center justify-center relative">
                {anuncio.media_url ? (
                    anuncio.tipo_media === 'video' ? (
                    <video
                        src={anuncio.media_url}
                        className="w-[108px] h-48 object-cover rounded-xl" // Revertido para w-[108px]
                        controls={false}
                        muted
                        loop
                        playsInline
                        autoplay
                        type="video/mp4"
                        onError={(e) => {
                            e.target.classList.add('hidden');
                            e.target.nextSibling.classList.remove('hidden');
                        }}
                    />
                    ) : (
                    <img
                        src={anuncio.media_url}
                        alt={anuncio.titulo}
                        className="w-[108px] h-48 object-cover rounded-xl" // Revertido para w-[108px]
                        onError={(e) => {
                            e.target.classList.add('hidden');
                            e.target.nextSibling.classList.remove('hidden');
                        }}
                    />
                    )
                ) : null}
                <div
                    className={`w-[108px] h-48 bg-gray-800 rounded-xl flex items-center justify-center text-4xl ${anuncio.media_url ? 'hidden' : ''}`} // Revertido para w-[108px]
                >
                    {anuncio.tipo_media === 'video' ? <VideoIcon size={40} className="text-gray-400" /> : <ImageIcon size={40} className="text-gray-400" />}
                </div>
             </div>

              {/* Informações e botões centralizados à direita da mídia */}
              <div className="flex-1 min-w-0 flex flex-col gap-1 items-start w-full"> {/* Alterado para items-start */}
                <div className="flex flex-wrap items-center gap-2 justify-start">
                  <h3 className="text-white font-semibold text-sm">{anuncio.titulo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${anuncio.ativo ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {anuncio.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {anuncio.descricao && (
                  <p className="text-gray-500 text-xs mb-1">{anuncio.descricao}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 justify-start">
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <MapPin size={11} className="flex-shrink-0" />
                    <span>{anuncio.hotspots?.nome || '—'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock size={11} className="flex-shrink-0" />
                    <span>{anuncio.duracao_segundos}s</span>
                  </span>
                  {anuncio.url_destino && (
                    <a
                      href={(() => {
                        let rawUrl = anuncio.url_destino;
                        let formattedUrl = rawUrl;

                        if (rawUrl.startsWith('wa.me/')) {
                            formattedUrl = 'https://' + rawUrl.replace('wa.me//', 'wa.me/');
                        } else if (!(rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
                            formattedUrl = `https://${rawUrl}`;
                        }
                        return formattedUrl;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-400 hover:underline flex-shrink-0"
                    >
                      <ExternalLink size={11} className="flex-shrink-0" />
                      <span>CTA</span>
                    </a>
                  )}
                </div>

                {/* Métricas do Anúncio */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2 justify-start">
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <User size={11} className="flex-shrink-0" />
                    <span>Cliente: {anuncio.hotspots?.clientes?.nome || 'N/A'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Eye size={11} className="flex-shrink-0" />
                    <span>Visualizações: {anuncio.views}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <MousePointerClick size={11} className="flex-shrink-0" />
                    <span>Cliques: {anuncio.clicks}</span>
                  </span>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-row flex-wrap gap-2 mt-3 flex-shrink-0 justify-start">
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
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-white font-bold text-lg">
                {anuncioEditando ? 'Editar Anúncio' : 'Novo Anúncio'}
              </h2>
              <button onClick={fecharModal} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* NOVO: Seleção de Cliente no Modal */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Cliente</label>
                <select
                  value={selectedClientInModal}
                  onChange={(e) => {
                    setSelectedClientInModal(e.target.value);
                    setForm(prevForm => ({ ...prevForm, hotspot_id: '' })); // Reseta hotspot ao mudar cliente
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Hotspot</label>
                <select
                  value={form.hotspot_id}
                  onChange={(e) => setForm({ ...form, hotspot_id: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um hotspot</option>
                  {filteredHotspotsForModal.map((h) => ( // Usa hotspots filtrados
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
                <label className="text-xs text-gray-400 mb-1.5 block">Mídia do anúncio (Imagem ou Vídeo)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-black hover:file:bg-green-400"
                />
                {(selectedFile || form.media_url) && (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-xs text-gray-400">Pré-visualização:</p>
                    {selectedFile && selectedFile.type.startsWith('video/') ? (
                      <video
                        src={URL.createObjectURL(selectedFile)}
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                        controls={false}
                        muted
                        loop
                        playsInline
                        autoplay
                        type={selectedFile.type}
                      />
                    ) : selectedFile && selectedFile.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Pré-visualização"
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                      />
                    ) : form.media_url && form.tipo_media === 'video' ? (
                      <video
                        src={form.media_url}
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                        controls={false}
                        muted
                        loop
                        playsInline
                        autoplay
                        type="video/mp4"
                      />
                    ) : form.media_url && form.tipo_media === 'imagem' ? (
                      <img
                        src={form.media_url}
                        alt="Pré-visualização"
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                      />
                    ) : null}
                    {selectedFile && (
                      <p className="text-xs text-gray-500 truncate flex-1">{selectedFile.name}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1">Selecione uma imagem ou vídeo para o anúncio. Imagem: 1080x1920px. Vídeo: MP4, WebM.</p>
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
                <select
                  value={form.duracao_segundos}
                  onChange={(e) => setForm({ ...form, duracao_segundos: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value={10}>10 segundos</option>
                  <option value={15}>15 segundos</option>
                  <option value={20}>20 segundos</option>
                  <option value={30}>30 segundos</option>
                  <option value={40}>40 segundos</option>
                </select>
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

            <div className="flex gap-3 p-6 border-t border-gray-800 flex-shrink-0">
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