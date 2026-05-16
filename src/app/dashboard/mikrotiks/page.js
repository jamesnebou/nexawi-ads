'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Router,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
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
  base_url: '',
  username: 'nexawi_api',
  password: '',
  hotspot_server: 'hotspot1',
  status: 'Ativo',
  localizacao: '',
  observacoes: '',
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function corStatus(status) {
  if (status === 'Ativo') return 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
  if (status === 'Inativo') return 'bg-red-500/10 text-red-400 border border-red-500/20'
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
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
    <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0a0a] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">{label}</p>
          <p className={`text-2xl font-black mt-2 ${accent ? 'text-[#6be12f]' : 'text-white'}`}>
            {value}
          </p>
          {description && <p className="text-xs text-neutral-600 mt-1">{description}</p>}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <Icon size={20} className="text-[#6be12f]" />
        </div>
      </div>
    </div>
  )
}

export default function MikrotiksPage() {
  const [routers, setRouters] = useState([])
  const [totals, setTotals] = useState(null)
  const [permissions, setPermissions] = useState(permissoesIniciais)

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  const [modalAberto, setModalAberto] = useState(false)
  const [routerSelecionado, setRouterSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [diagnosticsRouter, setDiagnosticsRouter] = useState(null)
  const [diagnosticsData, setDiagnosticsData] = useState(null)
  const [diagnosticsLoadingId, setDiagnosticsLoadingId] = useState(null)

  const [form, setForm] = useState(DEFAULT_FORM)

  const canCreate = Boolean(permissions.create)
  const canUpdate = Boolean(permissions.update)
  const canDelete = Boolean(permissions.delete)
  const showReadOnly = !canCreate && !canUpdate && !canDelete

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarRouters()
    }, 250)

    return () => clearTimeout(timer)
  }, [busca, filtroStatus])

  const routersFiltrados = useMemo(() => routers || [], [routers])

  async function carregarRouters() {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)

      const data = await adminApiFetch(`/api/admin/mikrotiks?${params.toString()}`)

      setRouters(data.routers || [])
      setTotals(data.totals || null)
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao carregar MikroTiks:', error)
      toast.error(error.message || 'Erro ao carregar MikroTiks.')
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(router = null) {
    if (router && !canUpdate) {
      toast.error('Você não tem permissão para editar MikroTiks.')
      return
    }

    if (!router && !canCreate) {
      toast.error('Você não tem permissão para criar MikroTiks.')
      return
    }

    if (router) {
      setRouterSelecionado(router)
      setForm({
        nome: router.nome || '',
        slug: router.slug || '',
        base_url: router.base_url || '',
        username: router.username || 'nexawi_api',
        password: '',
        hotspot_server: router.hotspot_server || 'hotspot1',
        status: router.status || 'Ativo',
        localizacao: router.localizacao || '',
        observacoes: router.observacoes || '',
      })
    } else {
      setRouterSelecionado(null)
      setForm(DEFAULT_FORM)
    }

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setRouterSelecionado(null)
    setForm(DEFAULT_FORM)
  }

  function atualizarNome(value) {
    setForm((prev) => ({
      ...prev,
      nome: value,
      slug: routerSelecionado ? prev.slug : slugify(value),
    }))
  }

  async function salvarRouter() {
    if (routerSelecionado && !canUpdate) {
      toast.error('Você não tem permissão para editar MikroTiks.')
      return
    }

    if (!routerSelecionado && !canCreate) {
      toast.error('Você não tem permissão para criar MikroTiks.')
      return
    }

    if (!form.nome.trim()) {
      toast.error('Informe o nome do MikroTik.')
      return
    }

    if (!form.base_url.trim()) {
      toast.error('Informe a Base URL.')
      return
    }

    if (!form.username.trim()) {
      toast.error('Informe o usuário.')
      return
    }

    if (!routerSelecionado && !form.password.trim()) {
      toast.error('Informe a senha.')
      return
    }

    setSaving(true)

    try {
      await adminApiFetch('/api/admin/mikrotiks', {
        method: 'POST',
        body: {
          action: routerSelecionado ? 'update' : 'create',
          id: routerSelecionado?.id,
          router: form,
        },
      })

      toast.success(routerSelecionado ? 'MikroTik atualizado!' : 'MikroTik criado!')
      await carregarRouters()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar MikroTik:', error)
      toast.error(error.message || 'Erro ao salvar MikroTik.')
    } finally {
      setSaving(false)
    }
  }

  async function testarRouter(router) {
    return diagnosticarRouter(router)
  }

  async function diagnosticarRouter(router) {
    setDiagnosticsRouter(router)
    setDiagnosticsData(null)
    setDiagnosticsOpen(true)
    setDiagnosticsLoadingId(router.id)

    try {
      const data = await adminApiFetch('/api/admin/mikrotiks/diagnostics', {
        method: 'POST',
        body: {
          id: router.id,
        },
      })

      setDiagnosticsData(data.diagnostics || null)

      if (data.diagnostics?.ready) {
        toast.success('MikroTik pronto para operar.')
      } else {
        toast.error('Diagnóstico encontrou pendências.')
      }
    } catch (error) {
      console.error('Erro ao diagnosticar MikroTik:', error)

      setDiagnosticsData({
        ok: false,
        ready: false,
        error: error.message || 'Erro ao diagnosticar MikroTik',
        checks: [],
        summary: {
          criticalIssues: 1,
          warnings: 0,
          checks: 0,
        },
      })

      toast.error(error.message || 'Erro ao diagnosticar MikroTik.')
    } finally {
      setDiagnosticsLoadingId(null)
    }
  }

  function fecharDiagnostics() {
    setDiagnosticsOpen(false)
    setDiagnosticsRouter(null)
    setDiagnosticsData(null)
  }

  async function copiarTexto(value) {
    try {
      await navigator.clipboard.writeText(value || '')
      toast.success('Copiado!')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  async function excluirRouter(id) {
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir MikroTiks.')
      return
    }

    try {
      await adminApiFetch('/api/admin/mikrotiks', {
        method: 'POST',
        body: {
          action: 'delete',
          id,
        },
      })

      toast.success('MikroTik excluído.')
      setConfirmDelete(null)
      await carregarRouters()
    } catch (error) {
      console.error('Erro ao excluir MikroTik:', error)
      toast.error(error.message || 'Erro ao excluir MikroTik.')
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
        }}
      />

      <main className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <header className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-extrabold text-[#8cf059] mb-4">
              <Router size={14} />
              Infraestrutura
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              MikroTiks
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium max-w-2xl">
              Cadastre os roteadores que controlam os hotspots físicos da NexaWi.
            </p>

            {showReadOnly && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} className="text-neutral-500" />
                Modo leitura: você pode visualizar, mas não alterar MikroTiks.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={carregarRouters}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Atualizar
            </button>

            {canCreate && (
              <button
                onClick={() => abrirModal()}
                className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Novo MikroTik
              </button>
            )}
          </div>
        </header>

        <section className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Router}
            label="MikroTiks"
            value={totals?.routers ?? routers.length}
            description="cadastrados"
          />
          <StatCard
            icon={ShieldCheck}
            label="Ativos"
            value={totals?.ativos ?? 0}
            description="em operação"
            accent
          />
          <StatCard
            icon={Wifi}
            label="Vinculados"
            value={totals?.vinculados ?? 0}
            description="com hotspots"
          />
        </section>

        <section className="relative z-10 flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 group/input">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
            <input
              type="text"
              placeholder="Buscar por nome, slug, URL ou localização..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
            />
          </div>

          <div className="relative w-full lg:w-56">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30"
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
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="animate-spin text-[#6be12f]" size={34} />
          </div>
        ) : routersFiltrados.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center">
            <Router size={36} className="text-neutral-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum MikroTik encontrado
            </h3>
            <p className="text-sm text-neutral-500 mb-8">
              Cadastre o primeiro roteador para vincular aos hotspots.
            </p>
            {canCreate && (
              <button
                onClick={() => abrirModal()}
                className="bg-[#6be12f] text-black font-bold py-3 px-6 rounded-2xl text-sm flex items-center gap-2"
              >
                <Plus size={18} />
                Cadastrar MikroTik
              </button>
            )}
          </div>
        ) : (
          <section className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {routersFiltrados.map((routerItem) => {
              const testing = processingId === routerItem.id
              const diagnosing = diagnosticsLoadingId === routerItem.id

              return (
                <article
                  key={routerItem.id}
                  className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.06] bg-[#0a0a0a] p-6"
                >
                  <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-[#6be12f]/5 blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
                          <Server size={22} className="text-[#6be12f]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h2 className="text-lg font-black text-white truncate">
                              {routerItem.nome}
                            </h2>

                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${corStatus(routerItem.status)}`}>
                              {routerItem.status}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-500 font-bold truncate">
                            {routerItem.slug}
                          </p>

                          <p className="text-xs text-neutral-600 mt-1 truncate">
                            {routerItem.localizacao || 'Localização não informada'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => abrirModal(routerItem)}
                            className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-xl"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => setConfirmDelete(routerItem.id)}
                            className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          Base URL
                        </p>
                        <p className="text-sm font-bold text-white break-all">
                          {routerItem.base_url}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          Hotspot Server
                        </p>
                        <p className="text-sm font-bold text-white">
                          {routerItem.hotspot_server || 'hotspot1'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          Usuário
                        </p>
                        <p className="text-sm font-bold text-white">
                          {routerItem.username}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          Hotspots vinculados
                        </p>
                        <p className="text-sm font-bold text-white">
                          {routerItem.hotspots_count || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => testarRouter(routerItem)}
                        disabled={diagnosing}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black hover:bg-[#8cf059] disabled:opacity-50"
                      >
                        {diagnosing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        Diagnóstico
                      </button>

                      <button
                        onClick={() => copiarTexto(routerItem.base_url)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06]"
                      >
                        <Copy size={16} />
                        Copiar URL
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
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05]">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {routerSelecionado ? 'Editar MikroTik' : 'Novo MikroTik'}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  A senha nunca será exibida depois de salva.
                </p>
              </div>

              <button onClick={fecharModal} className="p-2.5 text-neutral-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Nome *
                  </label>
                  <input
                    value={form.nome}
                    onChange={(e) => atualizarNome(e.target.value)}
                    placeholder="Ex: MikroTik Cândido Sales 01"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Slug
                  </label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    placeholder="mikrotik-candido-sales-01"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                  Base URL *
                </label>
                <input
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="http://10.70.0.2"
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Usuário *
                  </label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="nexawi_api"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Senha {routerSelecionado ? '(opcional)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={routerSelecionado ? 'Deixe vazio para manter' : 'Senha do usuário API'}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Hotspot Server
                  </label>
                  <input
                    value={form.hotspot_server}
                    onChange={(e) => setForm({ ...form, hotspot_server: e.target.value })}
                    placeholder="hotspot1"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Localização
                  </label>
                  <input
                    value={form.localizacao}
                    onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                    placeholder="Ex: Cândido Sales"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none"
                  >
                    {statusOpcoes.map((status) => (
                      <option key={status} value={status} className="bg-[#050505]">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                  Observações
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Informações internas sobre este MikroTik..."
                  rows={3}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none resize-none"
                />
              </div>

              {routerSelecionado && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-yellow-400 mt-0.5" />
                  <p className="text-xs text-yellow-200 leading-relaxed">
                    Para manter a senha atual, deixe o campo senha vazio. Para trocar, digite a nova senha.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 p-8 border-t border-white/[0.05]">
              <button
                onClick={fecharModal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] border border-white/[0.05]"
              >
                Cancelar
              </button>

              <button
                onClick={salvarRouter}
                disabled={saving || !form.nome.trim()}
                className="flex-1 bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    {routerSelecionado ? 'Salvar Alterações' : 'Cadastrar MikroTik'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {diagnosticsOpen && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#8cf059] mb-3">
                  <ShieldCheck size={13} />
                  Diagnóstico técnico
                </div>

                <h2 className="text-2xl font-bold text-white">
                  {diagnosticsRouter?.nome || 'MikroTik'}
                </h2>

                <p className="text-xs text-neutral-500 mt-1 break-all">
                  {diagnosticsRouter?.base_url || ''}
                </p>
              </div>

              <button onClick={fecharDiagnostics} className="p-2.5 text-neutral-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow space-y-6">
              {diagnosticsLoadingId ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={34} className="animate-spin text-[#6be12f]" />
                  <p className="text-sm font-bold text-neutral-400">
                    Executando diagnóstico no MikroTik...
                  </p>
                </div>
              ) : diagnosticsData?.error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-red-300">
                        Diagnóstico falhou
                      </p>
                      <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                        {diagnosticsData.error}
                      </p>
                    </div>
                  </div>
                </div>
              ) : diagnosticsData ? (
                <>
                  <div className={`rounded-[2rem] border p-6 ${
                    diagnosticsData.ready
                      ? 'border-[#6be12f]/20 bg-[#6be12f]/10'
                      : 'border-yellow-500/20 bg-yellow-500/10'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className={`text-sm font-black ${
                          diagnosticsData.ready ? 'text-[#8cf059]' : 'text-yellow-300'
                        }`}>
                          {diagnosticsData.ready ? 'MikroTik pronto para operar' : 'MikroTik precisa de atenção'}
                        </p>

                        <p className="text-xs text-neutral-400 mt-1">
                          {diagnosticsData.summary?.criticalIssues || 0} críticos · {diagnosticsData.summary?.warnings || 0} avisos · {diagnosticsData.summary?.checks || 0} verificações
                        </p>
                      </div>

                      <div className="text-xs font-bold text-neutral-500">
                        {diagnosticsData.checkedAt ? new Date(diagnosticsData.checkedAt).toLocaleString('pt-BR') : ''}
                      </div>
                    </div>
                  </div>

                  {diagnosticsData.router && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          Modelo
                        </p>
                        <p className="text-sm font-black text-white">
                          {diagnosticsData.router.boardName || '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          RouterOS
                        </p>
                        <p className="text-sm font-black text-white">
                          {diagnosticsData.router.version || '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-1">
                          Uptime
                        </p>
                        <p className="text-sm font-black text-white">
                          {diagnosticsData.router.uptime || '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-black text-white mb-4">
                      Verificações
                    </h3>

                    <div className="space-y-3">
                      {(diagnosticsData.checks || []).map((check) => (
                        <div
                          key={check.id}
                          className={`rounded-2xl border p-5 ${
                            check.ok
                              ? 'border-[#6be12f]/15 bg-[#6be12f]/5'
                              : check.severity === 'critical'
                                ? 'border-red-500/20 bg-red-500/10'
                                : 'border-yellow-500/20 bg-yellow-500/10'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              check.ok ? 'bg-[#6be12f]/10 text-[#8cf059]' : 'bg-yellow-500/10 text-yellow-300'
                            }`}>
                              {check.ok ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-black text-white">
                                {check.label}
                              </p>

                              {check.message && (
                                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                  {check.message}
                                </p>
                              )}

                              {!check.ok && check.recommendation && (
                                <p className="text-xs text-yellow-200 mt-2 leading-relaxed">
                                  Recomendação: {check.recommendation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-5">
                      <p className="text-sm font-black text-white mb-3">
                        Hotspot servers
                      </p>

                      {(diagnosticsData.hotspotServers || []).length === 0 ? (
                        <p className="text-xs text-neutral-500">Nenhum servidor hotspot encontrado.</p>
                      ) : (
                        <div className="space-y-2">
                          {(diagnosticsData.hotspotServers || []).map((server) => (
                            <div key={server.id || server.name} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3">
                              <p className="text-sm font-bold text-white">{server.name}</p>
                              <p className="text-xs text-neutral-500 mt-1">
                                Interface: {server.interface || '—'} · Profile: {server.profile || '—'} · {server.enabled ? 'Ativo' : 'Desativado'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-5">
                      <p className="text-sm font-black text-white mb-3">
                        Serviços RouterOS
                      </p>

                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {(diagnosticsData.services || []).map((service) => (
                          <div key={service.id || service.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3">
                            <div>
                              <p className="text-sm font-bold text-white">{service.name}</p>
                              <p className="text-xs text-neutral-500">Porta {service.port || '—'} · {service.address || 'sem restrição exibida'}</p>
                            </div>

                            <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 ${
                              service.enabled
                                ? 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
                                : 'bg-red-500/10 text-red-300 border border-red-500/20'
                            }`}>
                              {service.enabled ? 'Ativo' : 'Off'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex gap-4 p-8 border-t border-white/[0.05]">
              <button
                onClick={fecharDiagnostics}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] border border-white/[0.05]"
              >
                Fechar
              </button>

              {diagnosticsRouter && (
                <button
                  onClick={() => diagnosticarRouter(diagnosticsRouter)}
                  disabled={Boolean(diagnosticsLoadingId)}
                  className="flex-1 bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2"
                >
                  {diagnosticsLoadingId ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                  Rodar novamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && canDelete && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md p-8 text-center">
            <Trash2 size={36} className="text-red-500 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-white mb-3">
              Excluir MikroTik?
            </h2>
            <p className="text-sm text-neutral-500 mb-8">
              Só será possível excluir se ele não estiver vinculado a nenhum hotspot.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 bg-white/[0.02] border border-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirRouter(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-sm"
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