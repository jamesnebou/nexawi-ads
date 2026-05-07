'use client'

// src/app/dashboard/hotspots/page.js
// ============================================================
// Aba Hotspots da dashboard NexaWi ADS.
//
// Agora esta tela respeita as permissões retornadas pela API:
// - hotspots.view: permite visualizar a lista
// - hotspots.create: mostra botão Novo Hotspot e permite cadastrar
// - hotspots.update: mostra botão Editar e permite salvar alterações
// - hotspots.delete: mostra botão Excluir e permite abrir confirmação
// - hotspots.export: reservado para exportação futura
//
// Importante:
// - A segurança real fica na API /api/admin/hotspots.
// - Esta tela apenas melhora a experiência visual, escondendo ações
//   que o administrador não pode executar.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  Wifi,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  MapPin,
  Lock,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

// Cliente Supabase usado apenas para pegar a sessão do admin logado.
// As operações sensíveis agora passam por /api/admin/hotspots.
const supabase = createBrowserSupabaseClient()

const statusOpcoes = ['Ativo', 'Inativo', 'Manutenção']

const permissoesIniciais = {
  view: false,
  create: false,
  update: false,
  delete: false,
  export: false,
}

const corStatus = (status) => {
  if (status === 'Ativo') return 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
  if (status === 'Inativo') return 'bg-red-500/10 text-red-400 border border-red-500/20'
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
}

// ============================================================
// Chamada padrão para APIs administrativas.
// Essa função pega o token do usuário logado e envia para a API.
// A API valida se o usuário é admin antes de consultar o banco.
// ============================================================

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

export default function Hotspots() {
  const [hotspots, setHotspots] = useState([])
  const [permissions, setPermissions] = useState(permissoesIniciais)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [hotspotSelecionado, setHotspotSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // Estados e cidades via IBGE.
  const [estadosIBGE, setEstadosIBGE] = useState([])
  const [cidadesIBGE, setCidadesIBGE] = useState([])

  const [form, setForm] = useState({
    nome: '',
    estado: '',
    cidade: '',
    endereco: '',
    parceiro: '',
    status: 'Ativo',
  })

  const canCreate = Boolean(permissions.create)
  const canUpdate = Boolean(permissions.update)
  const canDelete = Boolean(permissions.delete)
  const canExport = Boolean(permissions.export)
  const showActionsColumn = canUpdate || canDelete

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then((res) => res.json())
      .then((dados) => setEstadosIBGE(dados))
      .catch((err) => console.error('Erro ao buscar estados:', err))
  }, [])

  useEffect(() => {
    if (!form.estado) {
      setCidadesIBGE([])
      return
    }

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`)
      .then((res) => res.json())
      .then((dados) => setCidadesIBGE(dados))
      .catch((err) => console.error('Erro ao buscar cidades:', err))
  }, [form.estado])

  useEffect(() => {
    buscarDados()
  }, [busca, filtroStatus])

  async function buscarDados() {
    setCarregando(true)

    try {
      // Agora a aba Hotspots não busca mais direto na tabela hotspots.
      // Ela chama uma API protegida, que valida admin e usa service_role no servidor.
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)

      const data = await adminApiFetch(`/api/admin/hotspots?${params.toString()}`)

      setHotspots(data.hotspots || [])
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao buscar hotspots:', error)
      toast.error(error.message || 'Erro ao carregar hotspots.')
    } finally {
      setCarregando(false)
    }
  }

  function abrirModal(hotspot = null) {
    if (hotspot && !canUpdate) {
      toast.error('Você não tem permissão para editar hotspots.')
      return
    }

    if (!hotspot && !canCreate) {
      toast.error('Você não tem permissão para criar hotspots.')
      return
    }

    if (hotspot) {
      setHotspotSelecionado(hotspot)
      setForm({
        nome: hotspot.nome || '',
        estado: hotspot.estado || '',
        cidade: hotspot.cidade || '',
        endereco: hotspot.endereco || '',
        parceiro: hotspot.parceiro || '',
        status: hotspot.status || 'Ativo',
      })
    } else {
      setHotspotSelecionado(null)
      setForm({
        nome: '',
        estado: '',
        cidade: '',
        endereco: '',
        parceiro: '',
        status: 'Ativo',
      })
    }

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setHotspotSelecionado(null)
  }

  async function salvarHotspot() {
    if (hotspotSelecionado && !canUpdate) {
      toast.error('Você não tem permissão para editar hotspots.')
      return
    }

    if (!hotspotSelecionado && !canCreate) {
      toast.error('Você não tem permissão para criar hotspots.')
      return
    }

    if (!form.nome.trim()) {
      toast.error('Informe o nome do hotspot.')
      return
    }

    setSalvando(true)

    try {
      if (hotspotSelecionado) {
        // Atualização via API protegida.
        await adminApiFetch('/api/admin/hotspots', {
          method: 'POST',
          body: {
            action: 'update',
            id: hotspotSelecionado.id,
            hotspot: form,
          },
        })

        toast.success('Hotspot atualizado!')
      } else {
        // Criação via API protegida.
        await adminApiFetch('/api/admin/hotspots', {
          method: 'POST',
          body: {
            action: 'create',
            hotspot: form,
          },
        })

        toast.success('Hotspot criado!')
      }

      await buscarDados()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar hotspot:', error)
      toast.error(error.message || 'Erro ao salvar hotspot.')
    } finally {
      setSalvando(false)
    }
  }

  function solicitarExclusaoHotspot(id) {
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir hotspots.')
      return
    }

    setConfirmDelete(id)
  }

  async function excluirHotspot(id) {
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir hotspots.')
      return
    }

    try {
      // Exclusão via API protegida.
      // Atenção: se houver anúncios, leads ou sessões vinculadas,
      // o banco pode impedir a exclusão por integridade referencial.
      await adminApiFetch('/api/admin/hotspots', {
        method: 'POST',
        body: {
          action: 'delete',
          id,
        },
      })

      toast.success('Hotspot excluído com sucesso!')
      setConfirmDelete(null)
      await buscarDados()
    } catch (error) {
      console.error('Erro ao excluir hotspot:', error)
      toast.error(error.message || 'Erro ao excluir hotspot. Verifique se há vínculos com anúncios, leads ou sessões.')
    }
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#0a0a0a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0a0a0a',
            },
          },
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        {/* Header e controles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <Wifi className="text-[#6be12f]" size={24} />
              </div>
              Hotspots
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Gerencie os pontos de acesso Wi-Fi da sua rede.
            </p>

            {!canCreate && !canUpdate && !canDelete && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} className="text-neutral-500" />
                Modo leitura: você pode visualizar, mas não alterar hotspots.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-72 group/input">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300"
              />
              <input
                type="text"
                placeholder="Buscar por nome, cidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
              />
            </div>

            <div className="relative w-full sm:w-48 group/select">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer shadow-inner"
              >
                <option value="Todos" className="bg-[#0a0a0a]">
                  Todos os Status
                </option>
                {statusOpcoes.map((status) => (
                  <option key={status} value={status} className="bg-[#0a0a0a]">
                    {status}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>

            {canCreate && (
              <button
                onClick={() => abrirModal()}
                className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                <Plus size={18} strokeWidth={2.5} />
                Novo Hotspot
              </button>
            )}
          </div>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
              <Wifi className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : hotspots.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <Wifi size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum hotspot encontrado
            </h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md">
              Você ainda não tem pontos de acesso cadastrados ou nenhum resultado corresponde à sua busca.
            </p>

            {canCreate && (
              <button
                onClick={() => abrirModal()}
                className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={18} />
                Cadastrar primeiro hotspot
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">
                      Hotspot
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">
                      Cidade
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">
                      Parceiro
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 whitespace-nowrap">
                      Criado em
                    </th>
                    {showActionsColumn && (
                      <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 text-right whitespace-nowrap">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {hotspots.map((hotspot) => (
                    <tr key={hotspot.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center flex-shrink-0 shadow-inner group-hover:border-white/[0.1] transition-colors">
                            <Wifi size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors truncate">
                              {hotspot.nome}
                            </p>
                            <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1 truncate font-medium">
                              <MapPin size={12} className="flex-shrink-0 text-neutral-600" />
                              {hotspot.endereco || 'Endereço não informado'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-neutral-400 font-medium whitespace-nowrap">
                        {hotspot.cidade || '—'}
                      </td>

                      <td className="px-6 py-5 text-sm text-neutral-400 font-medium whitespace-nowrap">
                        {hotspot.parceiro || '—'}
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${corStatus(hotspot.status)}`}>
                          {hotspot.status || 'Ativo'}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-neutral-500 font-medium whitespace-nowrap">
                        {hotspot.created_at
                          ? new Date(hotspot.created_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>

                      {showActionsColumn && (
                        <td className="px-6 py-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                            {canUpdate && (
                              <button
                                onClick={() => abrirModal(hotspot)}
                                className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => solicitarExclusaoHotspot(hotspot.id)}
                                className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
                  <Wifi size={18} className="text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {hotspotSelecionado ? 'Editar Hotspot' : 'Novo Hotspot'}
                  </h2>
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Nome do Hotspot *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Hotspot Centro"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores, 123"
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                      Estado
                    </label>
                    <div className="relative group/select">
                      <select
                        value={form.estado}
                        onChange={(e) => setForm({ ...form, estado: e.target.value, cidade: '' })}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                      >
                        <option value="" className="bg-[#050505]">
                          Selecione o UF
                        </option>
                        {estadosIBGE.map((estado) => (
                          <option key={estado.id} value={estado.sigla} className="bg-[#050505]">
                            {estado.nome} ({estado.sigla})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                      Cidade
                    </label>
                    <input
                      list="lista-cidades-hotspot"
                      type="text"
                      placeholder={form.estado ? 'Digite para buscar a cidade' : 'Selecione o estado primeiro'}
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      disabled={!form.estado}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <datalist id="lista-cidades-hotspot">
                      {cidadesIBGE.map((cidade) => (
                        <option key={cidade.id} value={cidade.nome} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                      Parceiro
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Restaurante XYZ"
                      value={form.parceiro}
                      onChange={(e) => setForm({ ...form, parceiro: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                      Status
                    </label>
                    <div className="relative group/select">
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                      >
                        {statusOpcoes.map((status) => (
                          <option key={status} value={status} className="bg-[#050505]">
                            {status}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
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
                onClick={salvarHotspot}
                disabled={salvando || !form.nome.trim()}
                className="flex-1 bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    {hotspotSelecionado ? 'Salvar Alterações' : 'Cadastrar Hotspot'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && canDelete && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Excluir hotspot?
            </h2>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
              Esta ação não pode ser desfeita. O ponto de acesso será removido permanentemente do sistema.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirHotspot(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:-translate-y-1"
              >
                Sim, Excluir
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