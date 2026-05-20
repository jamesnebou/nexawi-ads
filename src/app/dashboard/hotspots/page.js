'use client'

// src/app/dashboard/hotspots/page.js
// ============================================================
// Hotspots Pro - Centro operacional NexaWi ADS.
//
// Agora a aba Hotspots deixa de ser apenas cadastro e passa a mostrar:
// - MikroTik vinculado
// - Política de rede
// - Pessoas online
// - Anúncios vinculados
// - Domínios bloqueados/liberados
// - Botões operacionais: Gerenciar Rede, Testar MikroTik, Abrir Portal
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
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
  Network,
  Router,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Copy,
  Activity,
  Megaphone,
  Gauge,
  RefreshCcw,
  Loader2,
  AlertTriangle,
  Server,
  Settings2,
  Globe2,
  RadioTower,
  Zap,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const statusOpcoes = ['Ativo', 'Inativo', 'Manutenção']

const permissoesIniciais = {
  view: false,
  create: false,
  update: false,
  delete: false,
  export: false,
}

const DEFAULT_FORM = {
  nome: '',
  slug: '',
  estado: '',
  cidade: '',
  endereco: '',
  parceiro: '',
  status: 'Ativo',
  router_id: '',
}

function corStatus(status) {
  if (status === 'Ativo') return 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
  if (status === 'Inativo') return 'bg-red-500/10 text-red-400 border border-red-500/20'
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
}

function corRouter(status) {
  if (status === 'Ativo') return 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
  if (!status) return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getPortalUrl(hotspot) {
  if (!hotspot?.slug) return ''
  if (typeof window === 'undefined') return `/portal/${hotspot.slug}`
  return `${window.location.origin}/portal/${hotspot.slug}`
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

function StatCard({ icon: Icon, label, value, description, accent = false }) {
  return (
    <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0a0a] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            {label}
          </p>
          <p className={`text-2xl font-black mt-2 ${accent ? 'text-[#6be12f]' : 'text-white'}`}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-neutral-600 mt-1 font-medium">
              {description}
            </p>
          )}
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <Icon size={20} className="text-[#6be12f]" />
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className="text-[#6be12f]" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600">
          {label}
        </p>
      </div>
      <p className="text-sm font-black text-white">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${className}`}>
      {children}
    </span>
  )
}

function formatarLimitePlano(uso = 0, limite = 0) {
  return limite && limite > 0 ? `${uso}/${limite}` : `${uso}/∞`
}

function percentualLimitePlano(uso = 0, limite = 0) {
  if (!limite || limite <= 0) return 0
  return Math.min(100, Math.round((Number(uso || 0) / Number(limite || 1)) * 100))
}

function PlanoUsoBanner({ planoUso }) {
  if (!planoUso) return null

  const percentual = percentualLimitePlano(planoUso.uso, planoUso.limite)
  const noLimite = Boolean(planoUso.limite) && planoUso.uso >= planoUso.limite
  const pertoLimite = Boolean(planoUso.limite) && percentual >= 80 && !noLimite
  const bloqueado = Boolean(planoUso.bloqueado)
  const corBarra = bloqueado || noLimite ? 'bg-red-400' : pertoLimite ? 'bg-yellow-300' : 'bg-[#6be12f]'
  const corBorda = bloqueado || noLimite ? 'border-red-500/20 bg-red-500/10' : pertoLimite ? 'border-yellow-500/20 bg-yellow-500/10' : 'border-[#6be12f]/20 bg-[#6be12f]/10'

  return (
    <section className={`relative z-10 mb-8 rounded-3xl border p-5 ${corBorda}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black/20 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            {bloqueado || noLimite ? <AlertTriangle size={21} className="text-red-300" /> : <Wifi size={21} className="text-[#8cf059]" />}
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">Uso do plano</p>
            <h2 className="text-lg font-black text-white mt-1">Pontos Wi-Fi: {formatarLimitePlano(planoUso.uso, planoUso.limite)}</h2>
            <p className="text-sm text-neutral-400 mt-1">
              {planoUso.plano?.nome ? `Plano ${planoUso.plano.nome}. ` : ''}
              {bloqueado ? planoUso.motivo_bloqueio || 'Conta bloqueada.' : noLimite ? 'Limite atingido para este recurso.' : pertoLimite ? 'Uso próximo do limite contratado.' : 'Dentro do limite contratado.'}
            </p>
          </div>
        </div>
        {planoUso.limite > 0 ? (
          <div className="w-full lg:w-72">
            <div className="h-3 rounded-full bg-black/40 overflow-hidden border border-white/[0.06]">
              <div className={`h-full ${corBarra}`} style={{ width: `${percentual}%` }} />
            </div>
            <p className="mt-2 text-right text-xs font-bold text-neutral-500">{percentual}% utilizado</p>
          </div>
        ) : (
          <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-neutral-300">Ilimitado</span>
        )}
      </div>
    </section>
  )
}

export default function HotspotsPro() {
  const router = useRouter()

  const [hotspots, setHotspots] = useState([])
  const [routers, setRouters] = useState([])
  const [totals, setTotals] = useState(null)
  const [permissions, setPermissions] = useState(permissoesIniciais)

  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  const [modalAberto, setModalAberto] = useState(false)
  const [hotspotSelecionado, setHotspotSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [testandoRouterId, setTestandoRouterId] = useState(null)

  const [estadosIBGE, setEstadosIBGE] = useState([])
  const [cidadesIBGE, setCidadesIBGE] = useState([])

  const [form, setForm] = useState(DEFAULT_FORM)

  const canCreate = Boolean(permissions.create)
  const canUpdate = Boolean(permissions.update)
  const canDelete = Boolean(permissions.delete)
  const showActions = canUpdate || canDelete

  const hotspotsFiltrados = useMemo(() => {
    return hotspots || []
  }, [hotspots])

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
    const timer = setTimeout(() => {
      buscarDados()
    }, 250)

    return () => clearTimeout(timer)
  }, [busca, filtroStatus])

  async function buscarDados() {
    setCarregando(true)

    try {
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)

      const data = await adminApiFetch(`/api/admin/hotspots?${params.toString()}`)

      setHotspots(data.hotspots || [])
      setRouters(data.routers || [])
      setTotals(data.totals || null)

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
        slug: hotspot.slug || '',
        estado: hotspot.estado || '',
        cidade: hotspot.cidade || '',
        endereco: hotspot.endereco || '',
        parceiro: hotspot.parceiro || '',
        status: hotspot.status || 'Ativo',
        router_id: hotspot.router_id || '',
      })
    } else {
      setHotspotSelecionado(null)
      setForm(DEFAULT_FORM)
    }

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setHotspotSelecionado(null)
    setForm(DEFAULT_FORM)
  }

  function atualizarNome(value) {
    setForm((prev) => ({
      ...prev,
      nome: value,
      slug: hotspotSelecionado ? prev.slug : slugify(value),
    }))
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
      toast.error(error.message || 'Erro ao excluir hotspot. Verifique vínculos com anúncios, leads ou sessões.')
    }
  }

  async function testarMikrotik(hotspot) {
    if (!hotspot?.id) return

    setTestandoRouterId(hotspot.id)

    try {
      const data = await adminApiFetch('/api/admin/hotspots', {
        method: 'POST',
        body: {
          action: 'test_router',
          id: hotspot.id,
        },
      })

      if (data?.result?.ok) {
        toast.success('MikroTik respondeu corretamente.')
      } else {
        toast.error('MikroTik respondeu, mas o status não veio como OK.')
      }
    } catch (error) {
      console.error('Erro ao testar MikroTik:', error)
      toast.error(error.message || 'Erro ao testar MikroTik.')
    } finally {
      setTestandoRouterId(null)
    }
  }

  async function copiarPortal(hotspot) {
    const url = getPortalUrl(hotspot)

    if (!url) {
      toast.error('Este hotspot ainda não tem slug.')
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link do portal copiado!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  function abrirPortal(hotspot) {
    const url = getPortalUrl(hotspot)

    if (!url) {
      toast.error('Este hotspot ainda não tem slug.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function gerenciarRede(hotspot) {
    if (!hotspot?.id) return
    router.push(`/dashboard/rede?hotspotId=${hotspot.id}`)
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

      <main className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <header className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-extrabold text-[#8cf059] mb-4">
              <RadioTower size={14} />
              Centro operacional
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              Hotspots
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium max-w-2xl">
              Gerencie pontos físicos, MikroTiks vinculados, portal, política de rede e operação dos hotspots NexaWi.
            </p>

            {!canCreate && !canUpdate && !canDelete && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} className="text-neutral-500" />
                Modo leitura: você pode visualizar, mas não alterar hotspots.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={buscarDados}
              disabled={carregando}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] disabled:opacity-50 transition-all"
            >
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Atualizar
            </button>

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
        </header>

        <section className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Wifi}
            label="Hotspots"
            value={totals?.hotspots ?? hotspots.length}
            description="pontos cadastrados"
          />
          <StatCard
            icon={Activity}
            label="Online agora"
            value={totals?.onlineNow ?? 0}
            description="sessões autorizadas"
            accent
          />
          <StatCard
            icon={Router}
            label="Com MikroTik"
            value={totals?.comRouter ?? 0}
            description="roteador vinculado"
          />
          <StatCard
            icon={ShieldCheck}
            label="Política ativa"
            value={totals?.comPolitica ?? 0}
            description="controle de rede"
          />
        </section>

        <section className="relative z-10 flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 group/input">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300"
            />
            <input
              type="text"
              placeholder="Buscar por nome, slug, cidade, parceiro ou endereço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
            />
          </div>

          <div className="relative w-full lg:w-56 group/select">
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
        </section>

        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
              <Wifi className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : hotspotsFiltrados.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <Wifi size={32} className="text-neutral-600" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum hotspot encontrado
            </h3>

            <p className="text-sm text-neutral-500 mb-8 max-w-md">
              Você ainda não tem pontos de acesso cadastrados ou nenhum resultado corresponde à busca.
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
          <section className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {hotspotsFiltrados.map((hotspot) => {
              const routerInfo = hotspot.router
              const policy = hotspot.policy
              const metrics = hotspot.metrics || {}
              const testing = testandoRouterId === hotspot.id

              return (
                <article
                  key={hotspot.id}
                  className="group relative overflow-hidden rounded-[2.25rem] border border-white/[0.06] bg-[#0a0a0a] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] hover:border-white/[0.1] transition-all duration-300"
                >
                  <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-[#6be12f]/5 blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
                          <Wifi size={22} className="text-[#6be12f]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h2 className="text-lg font-black text-white truncate">
                              {hotspot.nome}
                            </h2>

                            <StatusBadge className={corStatus(hotspot.status)}>
                              {hotspot.status || 'Ativo'}
                            </StatusBadge>
                          </div>

                          <p className="text-xs text-neutral-500 font-bold flex items-center gap-1.5 truncate">
                            <Globe2 size={12} className="text-neutral-600 flex-shrink-0" />
                            /portal/{hotspot.slug || 'sem-slug'}
                          </p>

                          <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1 truncate font-medium">
                            <MapPin size={12} className="flex-shrink-0 text-neutral-600" />
                            {hotspot.cidade || 'Cidade não informada'}
                            {hotspot.estado ? `/${hotspot.estado}` : ''}
                            {hotspot.endereco ? ` · ${hotspot.endereco}` : ''}
                          </p>
                        </div>
                      </div>

                      {showActions && (
                        <div className="flex items-center gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => abrirModal(hotspot)}
                              className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                              title="Editar hotspot"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => solicitarExclusaoHotspot(hotspot.id)}
                              className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
                              title="Excluir hotspot"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <MiniMetric
                        icon={Activity}
                        label="Online"
                        value={metrics.onlineNow ?? 0}
                      />
                      <MiniMetric
                        icon={Megaphone}
                        label="Anúncios"
                        value={metrics.anunciosVinculados ?? 0}
                      />
                      <MiniMetric
                        icon={ShieldCheck}
                        label="Bloqueados"
                        value={metrics.blockedDomainsCount ?? 0}
                      />
                      <MiniMetric
                        icon={Gauge}
                        label="Velocidade"
                        value={policy ? `${policy.download_limit || '10M'} / ${policy.upload_limit || '3M'}` : '—'}
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-[1.5rem] border border-white/[0.05] bg-[#050505] p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                            <Router size={18} className="text-[#6be12f]" />
                          </div>

                          <div>
                            <p className="text-sm font-black text-white">
                              MikroTik
                            </p>
                            <p className="text-xs text-neutral-600">
                              Roteador vinculado
                            </p>
                          </div>
                        </div>

                        {routerInfo ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-neutral-300 truncate">
                                {routerInfo.nome}
                              </p>

                              <StatusBadge className={corRouter(routerInfo.status)}>
                                {routerInfo.status || 'Sem status'}
                              </StatusBadge>
                            </div>

                            <p className="text-xs text-neutral-500 truncate">
                              {routerInfo.base_url || 'URL não informada'}
                            </p>

                            <p className="text-xs text-neutral-600">
                              Server: <span className="text-neutral-400 font-bold">{routerInfo.hotspot_server || 'hotspot1'}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 px-4 py-3">
                            <p className="text-xs font-bold text-yellow-400 flex items-center gap-2">
                              <AlertTriangle size={14} />
                              Nenhum MikroTik vinculado
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[1.5rem] border border-white/[0.05] bg-[#050505] p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                            {policy?.active ? (
                              <ShieldCheck size={18} className="text-[#6be12f]" />
                            ) : (
                              <ShieldAlert size={18} className="text-yellow-400" />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-black text-white">
                              Política de Rede
                            </p>
                            <p className="text-xs text-neutral-600">
                              Controle aplicado por hotspot
                            </p>
                          </div>
                        </div>

                        {policy ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-neutral-300">
                                {policy.hotspot_subnet || '192.168.88.0/24'}
                              </p>

                              <StatusBadge
                                className={
                                  policy.active
                                    ? 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
                                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                }
                              >
                                {policy.active ? 'Ativa' : 'Inativa'}
                              </StatusBadge>
                            </div>

                            <p className="text-xs text-neutral-500">
                              DNS: {policy.force_dns ? 'ON' : 'OFF'} · QUIC: {policy.block_quic ? 'ON' : 'OFF'} · Jogos: {policy.block_games ? 'ON' : 'OFF'}
                            </p>

                            <p className="text-xs text-neutral-600">
                              Permitidos: <span className="text-neutral-400 font-bold">{metrics.allowedDomainsCount ?? 0}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 px-4 py-3">
                            <p className="text-xs font-bold text-yellow-400 flex items-center gap-2">
                              <AlertTriangle size={14} />
                              Política ainda não criada
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
                      <button
                        onClick={() => gerenciarRede(hotspot)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black hover:bg-[#8cf059] transition-all shadow-[0_0_30px_rgba(107,225,47,0.16)]"
                      >
                        <Network size={16} />
                        Gerenciar Rede
                      </button>

                      <button
                        onClick={() => testarMikrotik(hotspot)}
                        disabled={!routerInfo || testing}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {testing ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                        Testar MikroTik
                      </button>

                      <button
                        onClick={() => copiarPortal(hotspot)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06] transition-all"
                      >
                        <Copy size={16} />
                        Copiar
                      </button>

                      <button
                        onClick={() => abrirPortal(hotspot)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06] transition-all"
                      >
                        <ExternalLink size={16} />
                        Portal
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>

      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-3xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
                  <Wifi size={18} className="text-neutral-400" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {hotspotSelecionado ? 'Editar Hotspot' : 'Novo Hotspot'}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Vincule o ponto físico ao MikroTik correto.
                  </p>
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
                <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                      Nome do Hotspot *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Cândido Sales"
                      value={form.nome}
                      onChange={(e) => atualizarNome(e.target.value)}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                      Slug do Portal
                    </label>
                    <input
                      type="text"
                      placeholder="candido-sales"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    MikroTik Vinculado
                  </label>

                  <div className="relative group/select">
                    <select
                      value={form.router_id || ''}
                      onChange={(e) => setForm({ ...form, router_id: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer appearance-none pr-12 shadow-inner"
                    >
                      <option value="" className="bg-[#050505]">
                        Nenhum MikroTik vinculado
                      </option>

                      {routers.map((routerItem) => (
                        <option key={routerItem.id} value={routerItem.id} className="bg-[#050505]">
                          {routerItem.nome} · {routerItem.base_url} · {routerItem.hotspot_server || 'hotspot1'}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 mt-2">
                    Ao vincular um MikroTik, o sistema cria/atualiza a política padrão deste hotspot.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Praça Central, Cândido Sales"
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
                      placeholder="Ex: Prefeitura, Shopping, Evento..."
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

                <div className="rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/5 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <Settings2 size={18} className="text-[#6be12f] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      A configuração técnica detalhada, como bloqueios, DNS, torrent, jogos, domínios e velocidade, será feita no botão <strong className="text-white">Gerenciar Rede</strong> de cada hotspot.
                    </p>
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
              Esta ação pode falhar caso existam anúncios, leads, sessões ou políticas vinculadas a este hotspot.
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
