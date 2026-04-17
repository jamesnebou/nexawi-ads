'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapPin, Clock, ExternalLink, Image as ImageIcon, Video as VideoIcon, User, Eye, MousePointerClick, Plus, Search, X } from 'lucide-react'
import dynamic from 'next/dynamic';

const SearchIcon = dynamic(() => import('lucide-react').then((mod) => mod.Search), { ssr: false });

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
    titulo: '',
    descricao: '',
    media_url: '',
    tipo_media: 'imagem',
    url_destino: '',
    duracao_segundos: 15,
    ativo: true,
    estado: '',
    cidade: ''
  })
  const [selectedHotspotIds, setSelectedHotspotIds] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterHotspotId, setFilterHotspotId] = useState('')
  const [filterClientId, setFilterClientId] = useState('')
  const [filterMediaType, setFilterMediaType] = useState('todos')

  const [filterEstado, setFilterEstado] = useState('')
  const [filterCidade, setFilterCidade] = useState('')
  const [estadosIBGE, setEstadosIBGE] = useState([])
  const [cidadesIBGE, setCidadesIBGE] = useState([])

  const [selectedClientInModal, setSelectedClientInModal] = useState('')

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((dados) => setEstadosIBGE(dados))
      .catch(err => console.error("Erro ao buscar estados:", err));
  }, []);

  useEffect(() => {
    if (!filterEstado) {
      setCidadesIBGE([]);
      setFilterCidade('');
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${filterEstado}/municipios`)
      .then((res) => res.json())
      .then((dados) => setCidadesIBGE(dados))
      .catch(err => console.error("Erro ao buscar cidades:", err));
  }, [filterEstado]);

  useEffect(() => {
    buscarDados()
  }, [searchTerm, filterStatus, filterHotspotId, filterClientId, filterMediaType, filterEstado, filterCidade])

  async function buscarDados() {
    setCarregando(true)

    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome, estado, cidade')
      .order('nome', { ascending: true })
    if (clientesError) console.error('Erro ao buscar clientes:', clientesError)
    if (JSON.stringify(clientesData) !== JSON.stringify(clientes)) {
      setClientes(clientesData || [])
    }

    const { data: hotspotsData, error: hotspotsError } = await supabase
      .from('hotspots')
      .select('id, nome, status, cliente_id, estado, cidade')
      .eq('status', 'Ativo')
      .order('nome', { ascending: true })
    if (hotspotsError) console.error('Erro ao buscar hotspots:', hotspotsError)

    const hotspotsComClientes = hotspotsData ? hotspotsData.map(hotspot => {
      const cliente = clientesData?.find(c => c.id === hotspot.cliente_id);
      return {
        ...hotspot,
        clientes: cliente ? { id: cliente.id, nome: cliente.nome } : null
      };
    }) : [];

    setHotspots(hotspotsComClientes || [])

    let selectString = 'id, titulo, descricao, media_url, tipo_media, url_destino, duracao_segundos, ativo, created_at, cliente_id, estado, cidade, clientes(id, nome), anuncio_hotspots(hotspots(id, nome))';
    if (filterClientId) {
      selectString = 'id, titulo, descricao, media_url, tipo_media, url_destino, duracao_segundos, ativo, created_at, cliente_id, estado, cidade, clientes!inner(id, nome), anuncio_hotspots(hotspots(id, nome))';
    }

    let query = supabase
      .from('anuncios')
      .select(selectString)
      .order('created_at', { ascending: false })

    if (filterStatus === 'ativo') {
      query = query.eq('ativo', true)
    } else if (filterStatus === 'inativo') {
      query = query.eq('ativo', false)
    }

    if (filterHotspotId) {
      query = query.filter('anuncio_hotspots.hotspot_id', 'eq', filterHotspotId);
    }

    if (filterClientId) {
      query = query.filter('clientes.id', 'eq', filterClientId);
    }

    if (filterMediaType === 'imagem') {
      query = query.eq('tipo_media', 'imagem')
    } else if (filterMediaType === 'video') {
      query = query.eq('tipo_media', 'video')
    }

    if (filterEstado) {
      query = query.eq('estado', filterEstado)
    }
    if (filterCidade) {
      query = query.eq('cidade', filterCidade)
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

    const anunciosComHotspotsEClientes = anunciosData.map(anuncio => {
      const clienteDoAnuncio = clientesData?.find(c => c.id === anuncio.cliente_id);
      const hotspotNomes = anuncio.anuncio_hotspots
        .map(ah => ah.hotspots?.nome)
        .filter(Boolean);

      return {
        ...anuncio,
        hotspot_nomes: hotspotNomes,
        cliente: clienteDoAnuncio || anuncio.clientes
      };
    });

    const anunciosComMetricas = await Promise.all(anunciosComHotspotsEClientes.map(async (anuncio) => {
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
        titulo: anuncio.titulo || '',
        descricao: anuncio.descricao || '',
        media_url: anuncio.media_url || '',
        tipo_media: anuncio.tipo_media || 'imagem',
        url_destino: anuncio.url_destino || '',
        duracao_segundos: anuncio.duracao_segundos || 15,
        ativo: anuncio.ativo ?? true,
        estado: anuncio.estado || '',
        cidade: anuncio.cidade || ''
      })
      setSelectedClientInModal(anuncio.cliente_id || '');
      setSelectedHotspotIds(anuncio.anuncio_hotspots ? anuncio.anuncio_hotspots.map(ah => ah.hotspots?.id).filter(Boolean) : []);
    } else {
      setAnuncioEditando(null)
      setForm({
        titulo: '',
        descricao: '',
        media_url: '',
        tipo_media: 'imagem',
        url_destino: '',
        duracao_segundos: 15,
        ativo: true,
        estado: '',
        cidade: ''
      })
      setSelectedClientInModal('')
      setSelectedHotspotIds([]);
    }
    setSelectedFile(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setAnuncioEditando(null)
    setSelectedFile(null)
    setSelectedClientInModal('')
    setSelectedHotspotIds([]);
  }

  const allActiveHotspotsForModal = hotspots.filter(h => {
    if (!form.estado) return true; 
    return h.estado === form.estado;
  });

  const handleHotspotSelection = (hotspotId) => {
    setSelectedHotspotIds(prevSelected =>
      prevSelected.includes(hotspotId)
        ? prevSelected.filter(id => id !== hotspotId)
        : [...prevSelected, hotspotId]
    );
  };

  async function salvar() {
    if (!form.titulo.trim() || !selectedClientInModal || selectedHotspotIds.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios: Título, Cliente e selecione pelo menos um Hotspot.');
      return;
    }

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

    const dataToSave = {
      ...form,
      media_url: mediaUrlToSave,
      tipo_media: mediaTypeToSave,
      cliente_id: selectedClientInModal,
    }

    let anuncioId;

    if (anuncioEditando) {
      const { data, error: updateError } = await supabase.from('anuncios').update(dataToSave).eq('id', anuncioEditando.id).select('id').single();
      if (updateError) {
        console.error('Erro ao atualizar anúncio:', updateError)
        alert('Erro ao atualizar anúncio. Por favor, tente novamente.')
        setSalvando(false);
        return;
      }
      anuncioId = data.id;

      const { error: deleteOldLinksError } = await supabase
        .from('anuncio_hotspots')
        .delete()
        .eq('anuncio_id', anuncioId);

      if (deleteOldLinksError) {
        console.error('Erro ao remover vínculos antigos de hotspot:', deleteOldLinksError);
        alert('Erro ao atualizar vínculos de hotspot. Por favor, tente novamente.');
        setSalvando(false);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase.from('anuncios').insert([dataToSave]).select('id').single();
      if (insertError) {
        console.error('Erro ao criar anúncio:', insertError)
        alert('Erro ao criar anúncio. Por favor, tente novamente.')
        setSalvando(false);
        return;
      }
      anuncioId = data.id;
    }

    const hotspotLinks = selectedHotspotIds.map(hotspot_id => ({
      anuncio_id: anuncioId,
      hotspot_id: hotspot_id,
    }));

    if (hotspotLinks.length > 0) {
      const { error: insertLinksError } = await supabase
        .from('anuncio_hotspots')
        .insert(hotspotLinks);

      if (insertLinksError) {
        console.error('Erro ao vincular hotspots ao anúncio:', insertLinksError);
        alert('Erro ao vincular hotspots ao anúncio. Por favor, tente novamente.');
        setSalvando(false);
        return;
      }
    }

    setSalvando(false)
    fecharModal()
    buscarDados()
  }

  async function toggleAtivo(anuncio) {
    const novoStatus = !anuncio.ativo;
    const { error } = await supabase
      .from('anuncios')
      .update({ ativo: novoStatus })
      .eq('id', anuncio.id);

    if (error) {
      console.error('Erro ao alternar status do anúncio:', error);
      alert('Erro ao alternar status do anúncio. Por favor, tente novamente.');
    } else {
      buscarDados();
    }
  }

  async function excluir(id) {
    if (!window.confirm('Tem certeza que deseja excluir este anúncio?')) {
      return;
    }
    const { error } = await supabase
      .from('anuncios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir anúncio:', error);
      alert('Erro ao excluir anúncio. Por favor, tente novamente.');
    } else {
      buscarDados();
    }
  }

  return (
    <>
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tight">Anúncios</h1>
            <p className="text-gray-500 text-sm mt-1.5 font-medium">Gerencie as campanhas exibidas no portal de captação</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            Novo Anúncio
          </button>
        </div>

        {/* Filtros Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-10">
          <div className="relative group/input">
            <input
              type="text"
              placeholder="Buscar anúncio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner pl-11"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" size={16} />
          </div>

          {[
            { value: filterStatus, setter: setFilterStatus, options: [{ val: 'todos', label: 'Status: Todos' }, { val: 'ativo', label: 'Ativos' }, { val: 'inativo', label: 'Inativos' }] },
            { value: filterHotspotId, setter: setFilterHotspotId, options: [{ val: '', label: 'Hotspot: Todos' }, ...hotspots.map(h => ({ val: h.id, label: h.nome }))] },
            { value: filterClientId, setter: setFilterClientId, options: [{ val: '', label: 'Cliente: Todos' }, ...clientes.map(c => ({ val: c.id, label: c.nome }))] },
            { value: filterMediaType, setter: setFilterMediaType, options: [{ val: 'todos', label: 'Mídia: Todas' }, { val: 'imagem', label: 'Imagens' }, { val: 'video', label: 'Vídeos' }] }
          ].map((filter, idx) => (
            <div key={idx} className="relative group/select">
              <select
                value={filter.value}
                onChange={(e) => filter.setter(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none cursor-pointer"
              >
                {filter.options.map(opt => (
                  <option key={opt.val} value={opt.val} className="bg-[#0a0a0a] text-white">{opt.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          ))}

          {/* Filtro de Estado */}
          <div className="relative group/select">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0a0a0a] text-white">Estado: Todos</option>
              {estadosIBGE.map(estado => (
                <option key={estado.id} value={estado.sigla} className="bg-[#0a0a0a] text-white">{estado.sigla}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Filtro de Cidade */}
          <div className="relative group/select">
            <select
              value={filterCidade}
              onChange={(e) => setFilterCidade(e.target.value)}
              disabled={!filterEstado}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="" className="bg-[#0a0a0a] text-white">Cidade: Todas</option>
              {cidadesIBGE.map(cidade => (
                <option key={cidade.id} value={cidade.nome} className="bg-[#0a0a0a] text-white">{cidade.nome}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Lista de Anúncios */}
        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
              <ImageIcon className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : anuncios.length === 0 ? (
          <div className="text-center bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
              <ImageIcon size={32} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Nenhum anúncio encontrado</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Tente ajustar os filtros de busca ou crie uma nova campanha para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {anuncios.map((anuncio, index) => (
              <div key={anuncio.id} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden flex flex-row hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] h-[280px] animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>

                {/* Esquerda: Mídia (Proporção 9:16) */}
                <div className="relative w-[150px] min-w-[150px] h-full bg-[#050505] flex-shrink-0 border-r border-white/[0.05] overflow-hidden">
                  {anuncio.media_url ? (
                    anuncio.tipo_media === 'video' ? (
                      <video src={anuncio.media_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" muted loop playsInline autoPlay />
                    ) : (
                      <img src={anuncio.media_url} alt={anuncio.titulo} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-gray-800" />
                    </div>
                  )}

                  {/* Gradiente e Badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90"></div>
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest backdrop-blur-md border flex items-center gap-1.5 ${anuncio.ativo ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${anuncio.ativo ? 'bg-[#8cf059] animate-pulse' : 'bg-red-400'}`}></div>
                      {anuncio.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {anuncio.tipo_media === 'video' && (
                    <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md p-1.5 rounded-lg border border-white/[0.05]">
                      <VideoIcon size={14} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Direita: Informações */}
                <div className="p-5 flex flex-col flex-1 min-w-0 relative z-10">

                  {/* 1. Título */}
                  <h3 className="text-white font-semibold text-lg mb-1.5 truncate group-hover:text-[#8cf059] transition-colors duration-300" title={anuncio.titulo}>
                    {anuncio.titulo}
                  </h3>

                  {/* 2. Subtítulo (Descrição) */}
                  <p className="text-gray-500 text-xs line-clamp-2 mb-4 leading-relaxed" title={anuncio.descricao}>
                    {anuncio.descricao || 'Sem descrição'}
                  </p>

                  {/* 3. Hotspots (Um abaixo do outro) */}
                  <div className="flex flex-col gap-2 mb-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
                    {anuncio.hotspot_nomes && anuncio.hotspot_nomes.length > 0 ? (
                      anuncio.hotspot_nomes.map((nome, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                          <MapPin size={12} className="text-[#6be12f]/70 mt-0.5 flex-shrink-0" />
                          <span className="truncate leading-tight">{nome}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-600 text-xs italic">Nenhum hotspot vinculado</span>
                    )}
                  </div>

                  {/* Container fixo na parte inferior */}
                  <div className="mt-auto pt-4 border-t border-white/[0.05]">

                    {/* 4. Localização (Nova Linha) Inteligente */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 truncate pr-2">
                  <MapPin size={12} className="text-gray-600 flex-shrink-0" />
                  <span className="truncate font-medium text-gray-400">
                  {(anuncio.cidade || anuncio.cliente?.cidade) && (anuncio.estado || anuncio.cliente?.estado)
                  ? `${anuncio.cidade || anuncio.cliente?.cidade}, ${anuncio.estado || anuncio.cliente?.estado}`
                  : 'Localização não definida'}
                  </span>
                  </div>

                    {/* 5. Cliente e Tempo (Mesma linha) */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <User size={12} className="text-gray-600 flex-shrink-0" />
                        <span className="truncate font-medium text-gray-400">{anuncio.cliente?.nome || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 bg-white/[0.02] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                        <Clock size={12} className="text-[#6be12f]/70" />
                        <span className="font-medium text-gray-300">{anuncio.duracao_segundos}s</span>
                      </div>
                    </div>

                    {/* 6. Botões (Centralizados) */}
                    <div className="flex justify-center items-center gap-2 w-full">
                      <button
                        onClick={() => toggleAtivo(anuncio)}
                        className={`flex-1 text-[11px] py-2 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${anuncio.ativo ? 'bg-white/[0.02] border border-white/[0.05] text-gray-500 hover:bg-white/[0.05] hover:text-white' : 'bg-[#6be12f]/10 border border-[#6be12f]/20 text-[#8cf059] hover:bg-[#6be12f]/20'}`}
                      >
                        {anuncio.ativo ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => abrirModal(anuncio)}
                        className="flex-1 text-[11px] py-2 rounded-xl font-bold uppercase tracking-wider bg-white/[0.02] border border-white/[0.05] text-gray-500 hover:bg-white/[0.05] hover:text-white transition-all duration-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(anuncio.id)}
                        className="flex-1 text-[11px] py-2 rounded-xl font-bold uppercase tracking-wider bg-red-500/5 border border-red-500/10 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Premium */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-3xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <h2 className="text-white font-bold text-2xl tracking-tight">
                {anuncioEditando ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <button onClick={fecharModal} className="p-2.5 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Cliente Responsável</label>
                  <div className="relative group/select">
                    <select
                      value={selectedClientInModal}
                      onChange={(e) => {
                        const newClientId = e.target.value;
                        setSelectedClientInModal(newClientId);

                        // Lógica de auto-preenchimento de estado e cidade
                        const cliente = clientes.find(c => c.id === newClientId);
                        if (cliente) {
                          setForm(prev => ({
                            ...prev,
                            estado: cliente.estado || prev.estado,
                            cidade: cliente.cidade || prev.cidade
                          }));
                        }
                      }}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none"
                    >
                      <option value="" className="bg-[#050505]">Selecione um cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#050505]">{c.nome}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Duração (Segundos)</label>
                  <div className="relative group/select">
                    <select
                      value={form.duracao_segundos}
                      onChange={(e) => setForm({ ...form, duracao_segundos: parseInt(e.target.value) })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none"
                    >
                      {[10, 15, 20, 30, 40].map(sec => (
                        <option key={sec} value={sec} className="bg-[#050505]">{sec} segundos</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hotspots como Tags/Pílulas */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Vincular Hotspots</label>
                <div className="bg-[#050505] border border-white/[0.05] rounded-2xl p-5 shadow-inner">
                  {allActiveHotspotsForModal.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">Nenhum hotspot ativo disponível para o estado deste cliente.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {allActiveHotspotsForModal.map((h) => {
                        const isSelected = selectedHotspotIds.includes(h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => handleHotspotSelection(h.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 border ${
                              isSelected
                                ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                : 'bg-white/[0.02] text-gray-500 border-white/[0.05] hover:border-white/[0.1] hover:text-white'
                            }`}
                          >
                            {h.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Título da Campanha</label>
                <input
                  type="text"
                  placeholder="Ex: Oferta Especial de Verão"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Descrição</label>
                <textarea
                  placeholder="Detalhes que chamem a atenção do usuário..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Link de Destino (CTA)</label>
                  <input
                    type="url"
                    placeholder="https://seusite.com.br"
                    value={form.url_destino}
                    onChange={(e) => setForm({ ...form, url_destino: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div className="flex items-center mt-7">
                  <label className="flex items-center gap-4 cursor-pointer p-4 w-full bg-[#050505] rounded-2xl border border-white/[0.05] hover:border-white/[0.1] transition-colors shadow-inner">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={form.ativo}
                        onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-11 h-6 bg-white/[0.05] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-transparent after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6be12f]"></div>
                    </div>
                    <span className="text-sm font-bold text-gray-300">Campanha Ativa</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">Mídia (Imagem ou Vídeo)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-white/[0.05] border-dashed rounded-2xl cursor-pointer bg-[#050505] hover:bg-white/[0.02] hover:border-[#6be12f]/30 transition-all shadow-inner group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-gray-600 group-hover:text-[#6be12f]/70 transition-colors" />
                      <p className="mb-2 text-sm text-gray-400"><span className="font-bold text-[#6be12f]">Clique para enviar</span> ou arraste o arquivo</p>
                      <p className="text-xs text-gray-600 font-medium">PNG, JPG ou MP4 (Recomendado: 1080x1920px)</p>
                    </div>
                    <input type="file" accept="image/*,video/*" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" />
                  </label>
                </div>

                {(selectedFile || form.media_url) && (
                  <div className="mt-5 p-4 bg-[#050505] border border-white/[0.05] rounded-2xl flex items-center gap-5 shadow-inner">
                    <div className="w-16 h-24 rounded-xl overflow-hidden bg-[#0a0a0a] flex-shrink-0 border border-white/[0.05]">
                      {selectedFile && selectedFile.type.startsWith('video/') ? (
                        <video src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                      ) : selectedFile && selectedFile.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : form.media_url && form.tipo_media === 'video' ? (
                        <video src={form.media_url} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                      ) : form.media_url && form.tipo_media === 'imagem' ? (
                        <img src={form.media_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {selectedFile ? selectedFile.name : 'Mídia atual da campanha'}
                      </p>
                      <p className="text-xs font-bold text-[#6be12f] mt-1.5 uppercase tracking-widest">Pronto para uso</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex gap-4 p-8 border-t border-white/[0.05] bg-white/[0.01] rounded-b-[2.5rem] flex-shrink-0">
              <button
                onClick={fecharModal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-gray-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || uploading || !form.titulo.trim() || !selectedClientInModal || selectedHotspotIds.length === 0}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-black bg-[#6be12f] hover:bg-[#8cf059] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {(salvando || uploading) ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  anuncioEditando ? 'Salvar Alterações' : 'Publicar Anúncio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilo extra para a barra de rolagem do modal ficar elegante */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

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