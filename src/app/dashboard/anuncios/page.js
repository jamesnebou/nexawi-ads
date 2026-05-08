'use client'

// src/app/dashboard/anuncios/page.js
// ============================================================
// Aba Anúncios da dashboard NexaWi ADS.
//
// Agora esta tela respeita as permissões retornadas pela API:
// - anuncios.view: permite visualizar a lista
// - anuncios.create: mostra Novo Anúncio e permite criar
// - anuncios.update: mostra Editar e permite salvar alterações
// - anuncios.delete: mostra Excluir
// - anuncios.activate: mostra Ativar
// - anuncios.pause: mostra Pausar
// - anuncios.export: reservado para exportação futura
//
// Importante:
// - A segurança real fica na API /api/admin/anuncios.
// - Esta tela apenas melhora a experiência visual, escondendo ações
//   que o administrador não pode executar.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  MapPin,
  Clock,
  Image as ImageIcon,
  Video as VideoIcon,
  User,
  Plus,
  Search,
  X,
  Lock,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const SearchIcon = dynamic(() => import('lucide-react').then((mod) => mod.Search), { ssr: false })

const supabase = createBrowserSupabaseClient()

const permissoesIniciais = {
  view: false,
  create: false,
  update: false,
  delete: false,
  activate: false,
  pause: false,
  export: false,
}

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

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`A API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

export default function Anuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [clientes, setClientes] = useState([])
  const [permissions, setPermissions] = useState(permissoesIniciais)
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
    cidade: '',
  })

  const [selectedHotspotIds, setSelectedHotspotIds] = useState([])
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

  const canCreate = Boolean(permissions.create)
  const canUpdate = Boolean(permissions.update)
  const canDelete = Boolean(permissions.delete)
  const canActivate = Boolean(permissions.activate)
  const canPause = Boolean(permissions.pause)
  const canExport = Boolean(permissions.export)

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then((res) => res.json())
      .then((dados) => setEstadosIBGE(dados))
      .catch((err) => console.error('Erro ao buscar estados:', err))
  }, [])

  useEffect(() => {
    if (!filterEstado) {
      setCidadesIBGE([])
      setFilterCidade('')
      return
    }

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${filterEstado}/municipios`)
      .then((res) => res.json())
      .then((dados) => setCidadesIBGE(dados))
      .catch((err) => console.error('Erro ao buscar cidades:', err))
  }, [filterEstado])

  useEffect(() => {
    buscarDados()
  }, [searchTerm, filterStatus, filterHotspotId, filterClientId, filterMediaType, filterEstado, filterCidade])

  async function buscarDados() {
    setCarregando(true)

    try {
      const params = new URLSearchParams()

      if (searchTerm) params.set('searchTerm', searchTerm)
      if (filterStatus) params.set('filterStatus', filterStatus)
      if (filterHotspotId) params.set('filterHotspotId', filterHotspotId)
      if (filterClientId) params.set('filterClientId', filterClientId)
      if (filterMediaType) params.set('filterMediaType', filterMediaType)
      if (filterEstado) params.set('filterEstado', filterEstado)
      if (filterCidade) params.set('filterCidade', filterCidade)

      const data = await adminApiFetch(`/api/admin/anuncios?${params.toString()}`)

      setClientes(data.clientes || [])
      setHotspots(data.hotspots || [])
      setAnuncios(data.anuncios || [])
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao buscar anúncios:', error)
      alert(error.message || 'Erro ao carregar anúncios. Por favor, tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  function abrirModal(anuncio = null) {
    if (anuncio && !canUpdate) {
      alert('Você não tem permissão para editar anúncios.')
      return
    }

    if (!anuncio && !canCreate) {
      alert('Você não tem permissão para criar anúncios.')
      return
    }

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
        cidade: anuncio.cidade || '',
      })
      setSelectedClientInModal(anuncio.cliente_id || '')
      setSelectedHotspotIds(
        anuncio.anuncio_hotspots
          ? anuncio.anuncio_hotspots.map((ah) => ah.hotspots?.id).filter(Boolean)
          : []
      )
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
        cidade: '',
      })
      setSelectedClientInModal('')
      setSelectedHotspotIds([])
    }

    setSelectedFile(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setAnuncioEditando(null)
    setSelectedFile(null)
    setSelectedClientInModal('')
    setSelectedHotspotIds([])
  }

  const allActiveHotspotsForModal = hotspots.filter((hotspot) => {
    if (!form.estado) return true
    return hotspot.estado === form.estado
  })

  function handleHotspotSelection(hotspotId) {
    setSelectedHotspotIds((prevSelected) =>
      prevSelected.includes(hotspotId)
        ? prevSelected.filter((id) => id !== hotspotId)
        : [...prevSelected, hotspotId]
    )
  }

  async function enviarMidiaPorUploadAssinado(file) {
    if (!file) return null

    const uploadInfo = await adminApiFetch('/api/admin/anuncios/upload-url', {
  method: 'POST',
  body: {
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    mode: anuncioEditando ? 'update' : 'create',
  },
})

    const { error: uploadError } = await supabase
      .storage
      .from('anuncios')
      .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Erro ao enviar mídia: ${uploadError.message}`)
    }

    return {
      mediaUrl: uploadInfo.publicUrl,
      tipoMedia: uploadInfo.tipoMedia,
    }
  }

  async function salvar() {
    if (anuncioEditando && !canUpdate) {
      alert('Você não tem permissão para editar anúncios.')
      return
    }

    if (!anuncioEditando && !canCreate) {
      alert('Você não tem permissão para criar anúncios.')
      return
    }

    if (!form.titulo.trim() || !selectedClientInModal || selectedHotspotIds.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios: Título, Cliente e selecione pelo menos um Hotspot.')
      return
    }

    setSalvando(true)
    setUploading(true)

    try {
      let mediaUrlToSave = form.media_url
      let mediaTypeToSave = form.tipo_media

      if (selectedFile) {
        const uploadResult = await enviarMidiaPorUploadAssinado(selectedFile)

        mediaUrlToSave = uploadResult.mediaUrl
        mediaTypeToSave = uploadResult.tipoMedia
      }

      setUploading(false)

      const dataToSave = {
        ...form,
        media_url: mediaUrlToSave,
        tipo_media: mediaTypeToSave,
        cliente_id: selectedClientInModal,
      }

      if (anuncioEditando) {
        await adminApiFetch('/api/admin/anuncios', {
          method: 'POST',
          body: {
            action: 'update',
            id: anuncioEditando.id,
            anuncio: dataToSave,
            hotspotIds: selectedHotspotIds,
          },
        })
      } else {
        await adminApiFetch('/api/admin/anuncios', {
          method: 'POST',
          body: {
            action: 'create',
            anuncio: dataToSave,
            hotspotIds: selectedHotspotIds,
          },
        })
      }

      setSalvando(false)
      fecharModal()
      buscarDados()
    } catch (error) {
      console.error('Erro ao salvar anúncio:', error)
      alert(error.message || 'Erro ao salvar anúncio. Por favor, tente novamente.')
      setSalvando(false)
      setUploading(false)
    }
  }

  async function toggleAtivo(anuncio) {
    const novoStatus = !anuncio.ativo

    if (novoStatus && !canActivate) {
      alert('Você não tem permissão para ativar anúncios.')
      return
    }

    if (!novoStatus && !canPause) {
      alert('Você não tem permissão para pausar anúncios.')
      return
    }

    try {
      await adminApiFetch('/api/admin/anuncios', {
        method: 'POST',
        body: {
          action: 'toggle',
          id: anuncio.id,
          ativo: novoStatus,
        },
      })

      buscarDados()
    } catch (error) {
      console.error('Erro ao alternar status do anúncio:', error)
      alert(error.message || 'Erro ao alternar status do anúncio. Por favor, tente novamente.')
    }
  }

  async function excluir(id) {
    if (!canDelete) {
      alert('Você não tem permissão para excluir anúncios.')
      return
    }

    if (!window.confirm('Tem certeza que deseja excluir este anúncio?')) {
      return
    }

    try {
      await adminApiFetch('/api/admin/anuncios', {
        method: 'POST',
        body: {
          action: 'delete',
          id,
        },
      })

      buscarDados()
    } catch (error) {
      console.error('Erro ao excluir anúncio:', error)
      alert(error.message || 'Erro ao excluir anúncio. Por favor, tente novamente.')
    }
  }

  return (
    <>
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tight">
              Anúncios
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 font-medium">
              Gerencie as campanhas exibidas no portal de captação
            </p>

            {!canCreate && !canUpdate && !canDelete && !canActivate && !canPause && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} className="text-neutral-500" />
                Modo leitura: você pode visualizar, mas não alterar anúncios.
              </div>
            )}
          </div>

          {canCreate && (
            <button
              onClick={() => abrirModal()}
              className="bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={18} strokeWidth={2.5} />
              Novo Anúncio
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-10">
          <div className="relative group/input">
            <input
              type="text"
              placeholder="Buscar anúncio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner pl-11"
            />
            <SearchIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300"
              size={16}
            />
          </div>

          {[
            {
              value: filterStatus,
              setter: setFilterStatus,
              options: [
                { val: 'todos', label: 'Status: Todos' },
                { val: 'ativo', label: 'Ativos' },
                { val: 'inativo', label: 'Inativos' },
              ],
            },
            {
              value: filterHotspotId,
              setter: setFilterHotspotId,
              options: [
                { val: '', label: 'Hotspot: Todos' },
                ...hotspots.map((hotspot) => ({ val: hotspot.id, label: hotspot.nome })),
              ],
            },
            {
              value: filterClientId,
              setter: setFilterClientId,
              options: [
                { val: '', label: 'Cliente: Todos' },
                ...clientes.map((cliente) => ({ val: cliente.id, label: cliente.nome })),
              ],
            },
            {
              value: filterMediaType,
              setter: setFilterMediaType,
              options: [
                { val: 'todos', label: 'Mídia: Todas' },
                { val: 'imagem', label: 'Imagens' },
                { val: 'video', label: 'Vídeos' },
              ],
            },
          ].map((filter, idx) => (
            <div key={idx} className="relative group/select">
              <select
                value={filter.value}
                onChange={(e) => filter.setter(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none cursor-pointer"
              >
                {filter.options.map((option) => (
                  <option key={option.val} value={option.val} className="bg-[#0a0a0a] text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ))}

          <div className="relative group/select">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0a0a0a] text-white">
                Estado: Todos
              </option>
              {estadosIBGE.map((estado) => (
                <option key={estado.id} value={estado.sigla} className="bg-[#0a0a0a] text-white">
                  {estado.sigla}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative group/select">
            <select
              value={filterCidade}
              onChange={(e) => setFilterCidade(e.target.value)}
              disabled={!filterEstado}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="" className="bg-[#0a0a0a] text-white">
                Cidade: Todas
              </option>
              {cidadesIBGE.map((cidade) => (
                <option key={cidade.id} value={cidade.nome} className="bg-[#0a0a0a] text-white">
                  {cidade.nome}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
              <ImageIcon className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : anuncios.length === 0 ? (
          <div className="text-center bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
              <ImageIcon size={32} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum anúncio encontrado
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Tente ajustar os filtros de busca ou crie uma nova campanha para começar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {anuncios.map((anuncio, index) => {
              const canToggleThisAd = anuncio.ativo ? canPause : canActivate
              const showActions = canToggleThisAd || canUpdate || canDelete

              return (
                <div
                  key={anuncio.id}
                  className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden flex flex-col lg:flex-row hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] h-auto lg:h-[280px] animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative w-full flex justify-center bg-[#050505] border-b lg:border-b-0 lg:border-r border-white/[0.05] overflow-hidden lg:w-[150px] lg:min-w-[150px] lg:h-full lg:block">
                    <div className="relative w-full max-w-[260px] aspect-[9/16] bg-[#050505] overflow-hidden lg:max-w-none lg:w-full lg:h-full lg:aspect-auto">
                      {anuncio.media_url ? (
                        anuncio.tipo_media === 'video' ? (
                          <video
                            src={anuncio.media_url}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                            muted
                            loop
                            playsInline
                            autoPlay
                          />
                        ) : (
                          <img
                            src={anuncio.media_url}
                            alt={anuncio.titulo}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={32} className="text-gray-800" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90" />

                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest backdrop-blur-md border flex items-center gap-1.5 ${anuncio.ativo ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${anuncio.ativo ? 'bg-[#8cf059] animate-pulse' : 'bg-red-400'}`} />
                          {anuncio.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {anuncio.tipo_media === 'video' && (
                        <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md p-1.5 rounded-lg border border-white/[0.05]">
                          <VideoIcon size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 min-w-0 relative z-10 text-center lg:text-left">
                    <h3 className="text-white font-semibold text-lg mb-1.5 line-clamp-2 lg:truncate group-hover:text-[#8cf059] transition-colors duration-300" title={anuncio.titulo}>
                      {anuncio.titulo}
                    </h3>

                    <p className="text-gray-500 text-xs line-clamp-2 mb-4 leading-relaxed" title={anuncio.descricao}>
                      {anuncio.descricao || 'Sem descrição'}
                    </p>

                    <div className="flex flex-col items-center lg:items-start gap-2 mb-4 lg:mb-2 overflow-visible lg:overflow-y-auto custom-scrollbar flex-none lg:flex-1 pr-0 lg:pr-2">
                      {anuncio.hotspot_nomes && anuncio.hotspot_nomes.length > 0 ? (
                        anuncio.hotspot_nomes.map((nome, idx) => (
                          <div key={idx} className="flex items-start justify-center lg:justify-start gap-2 text-xs text-gray-400 group-hover:text-gray-300 transition-colors max-w-full">
                            <MapPin size={12} className="text-[#6be12f]/70 mt-0.5 flex-shrink-0" />
                            <span className="truncate leading-tight">{nome}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-600 text-xs italic">Nenhum hotspot vinculado</span>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/[0.05]">
                      <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-between gap-2 text-xs text-gray-500 mb-4">
                        <MapPin size={12} className="text-gray-600 flex-shrink-0" />
                        <span className="truncate font-medium text-gray-400">
                          {(anuncio.cidade || anuncio.cliente?.cidade) && (anuncio.estado || anuncio.cliente?.estado)
                            ? `${anuncio.cidade || anuncio.cliente?.cidade}, ${anuncio.estado || anuncio.cliente?.estado}`
                            : 'Localização não definida'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <div className="flex items-center justify-center lg:justify-start gap-2 truncate pr-0 lg:pr-2">
                          <User size={12} className="text-gray-600 flex-shrink-0" />
                          <span className="truncate font-medium text-gray-400">{anuncio.cliente?.nome || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 bg-white/[0.02] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                          <Clock size={12} className="text-[#6be12f]/70" />
                          <span className="font-medium text-gray-300">{anuncio.duracao_segundos}s</span>
                        </div>
                      </div>

                      {showActions && (
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 w-full">
                          {canToggleThisAd && (
                            <button
                              onClick={() => toggleAtivo(anuncio)}
                              className={`w-full sm:flex-1 text-[11px] py-2 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${anuncio.ativo ? 'bg-white/[0.02] border border-white/[0.05] text-gray-500 hover:bg-white/[0.05] hover:text-white' : 'bg-[#6be12f]/10 border border-[#6be12f]/20 text-[#8cf059] hover:bg-[#6be12f]/20'}`}
                            >
                              {anuncio.ativo ? 'Pausar' : 'Ativar'}
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              onClick={() => abrirModal(anuncio)}
                              className="w-full sm:flex-1 text-[11px] py-2 rounded-xl font-bold uppercase tracking-wider bg-white/[0.02] border border-white/[0.05] text-gray-500 hover:bg-white/[0.05] hover:text-white transition-all duration-300"
                            >
                              Editar
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => excluir(anuncio.id)}
                              className="w-full sm:flex-1 text-[11px] py-2 rounded-xl font-bold uppercase tracking-wider bg-red-500/5 border border-red-500/10 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-3xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <h2 className="text-white font-bold text-2xl tracking-tight">
                {anuncioEditando ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <button onClick={fecharModal} className="p-2.5 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                    Cliente Responsável
                  </label>
                  <div className="relative group/select">
                    <select
                      value={selectedClientInModal}
                      onChange={(e) => {
                        const newClientId = e.target.value
                        setSelectedClientInModal(newClientId)

                        const cliente = clientes.find((c) => c.id === newClientId)
                        if (cliente) {
                          setForm((prev) => ({
                            ...prev,
                            estado: cliente.estado || prev.estado,
                            cidade: cliente.cidade || prev.cidade,
                          }))
                        }
                      }}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none"
                    >
                      <option value="" className="bg-[#050505]">
                        Selecione um cliente...
                      </option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id} className="bg-[#050505]">
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                    Duração (Segundos)
                  </label>
                  <div className="relative group/select">
                    <select
                      value={form.duracao_segundos}
                      onChange={(e) => setForm({ ...form, duracao_segundos: parseInt(e.target.value) })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none"
                    >
                      {[10, 15, 20, 30, 40].map((sec) => (
                        <option key={sec} value={sec} className="bg-[#050505]">
                          {sec} segundos
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                  Vincular Hotspots
                </label>
                <div className="bg-[#050505] border border-white/[0.05] rounded-2xl p-5 shadow-inner">
                  {allActiveHotspotsForModal.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">
                      Nenhum hotspot ativo disponível para o estado deste cliente.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {allActiveHotspotsForModal.map((hotspot) => {
                        const isSelected = selectedHotspotIds.includes(hotspot.id)

                        return (
                          <button
                            key={hotspot.id}
                            type="button"
                            onClick={() => handleHotspotSelection(hotspot.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 border ${isSelected ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-white/[0.02] text-gray-500 border-white/[0.05] hover:border-white/[0.1] hover:text-white'}`}
                          >
                            {hotspot.nome}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                  Título da Campanha
                </label>
                <input
                  type="text"
                  placeholder="Ex: Oferta Especial de Verão"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                  Descrição
                </label>
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
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                    Link de Destino (CTA)
                  </label>
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
                      <div className="w-11 h-6 bg-white/[0.05] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-transparent after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6be12f]" />
                    </div>
                    <span className="text-sm font-bold text-gray-300">Campanha Ativa</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                  Mídia (Imagem ou Vídeo)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-white/[0.05] border-dashed rounded-2xl cursor-pointer bg-[#050505] hover:bg-white/[0.02] hover:border-[#6be12f]/30 transition-all shadow-inner group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-gray-600 group-hover:text-[#6be12f]/70 transition-colors" />
                      <p className="mb-2 text-sm text-gray-400">
                        <span className="font-bold text-[#6be12f]">Clique para enviar</span> ou arraste o arquivo
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        PNG, JPG ou MP4 (Recomendado: 1080x1920px)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                    />
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
                      <p className="text-xs font-bold text-[#6be12f] mt-1.5 uppercase tracking-widest">
                        Pronto para uso
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                {salvando || uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : anuncioEditando ? (
                  'Salvar Alterações'
                ) : (
                  'Publicar Anúncio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
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
