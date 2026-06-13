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
  hotspot_id: '',
  apply_base_policy: true,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

function RemoteAccessPanel() {
  const steps = [
    {
      title: '1. Fechar VPN antes da instalacao',
      description: 'Use WireGuard entre o MikroTik e a VPS para acessar o roteador mesmo sem cabo, IP publico ou presenca fisica.',
    },
    {
      title: '2. Liberar REST somente pela VPN',
      description: 'O servico www do RouterOS deve aceitar apenas o IP da VPS ou da rede VPN. Nao exponha RouterOS aberto na internet.',
    },
    {
      title: '3. Validar hotspot e sub-rede',
      description: 'Depois da VPN ativa, rode o diagnostico para confirmar hotspot server, sub-rede e politica NexaWi.',
    },
  ]

  const commands = [
    {
      label: 'MikroTik como cliente WireGuard',
      value: [
        '/interface wireguard add name=wg-nexawi mtu=1420 private-key="<PRIVATE_KEY_DO_MIKROTIK>"',
        '/ip address add address=10.99.0.2/30 interface=wg-nexawi comment="NexaWi VPN"',
        '/interface wireguard peers add interface=wg-nexawi public-key="<PUBLIC_KEY_DA_VPS>" endpoint-address="<IP_PUBLICO_OU_DNS_DA_VPS>" endpoint-port=13231 allowed-address=10.99.0.1/32 persistent-keepalive=25s comment="NexaWi VPS"',
      ].join('\n'),
    },
    {
      label: 'REST restrito pela VPN',
      value: '/ip service set www disabled=no port=80 address=10.99.0.1/32',
    },
  ]

  return (
    <section className="relative z-10 rounded-[2rem] border border-[#6be12f]/15 bg-[#071006] p-6 mb-8">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#8cf059] mb-4">
            <ShieldCheck size={13} />
            Acesso remoto recomendado
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            Prepare o MikroTik para operar sem cabo
          </h2>

          <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
            Em producao, o roteador pode ficar atras de CGNAT ou instalado em local sem acesso fisico.
            A forma mais segura e previsivel e criar uma VPN antes da instalacao e deixar a Control API acessar o RouterOS por esse tunel.
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs font-bold text-yellow-100 leading-relaxed">
          Se o MikroTik estiver sem cabo agora, o erro de conexao e esperado. O ponto critico e sair para campo com a VPN testada.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-6">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
            <p className="text-sm font-black text-white">{step.title}</p>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-5">
        {commands.map((command) => (
          <div key={command.label} className="rounded-2xl border border-white/[0.06] bg-[#050505] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <p className="text-xs font-black text-white">{command.label}</p>

              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(command.value).then(() => toast.success('Copiado!')).catch(() => toast.error('Nao foi possivel copiar.'))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-[11px] font-black text-neutral-300 hover:bg-[#6be12f]/10 hover:text-[#8cf059]"
              >
                <Copy size={13} />
                Copiar
              </button>
            </div>

            <code className="block whitespace-pre-wrap break-all rounded-lg bg-black/60 px-3 py-2 text-[11px] leading-relaxed text-neutral-300">
              {command.value}
            </code>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function MikrotiksPage() {
  const [routers, setRouters] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [totals, setTotals] = useState(null)
  const [permissions, setPermissions] = useState(permissoesIniciais)

  const [loading, setLoading] = useState(true)
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
  const [diagnosticsStep, setDiagnosticsStep] = useState('vpn')

  const [form, setForm] = useState(DEFAULT_FORM)
  const [formDiagnostics, setFormDiagnostics] = useState(null)
  const [formDiagnosticsLoading, setFormDiagnosticsLoading] = useState(false)

  const [trafficByRouter, setTrafficByRouter] = useState({})
  const [trafficLoadingId, setTrafficLoadingId] = useState(null)
  const [speedTestByRouter, setSpeedTestByRouter] = useState({})
  const [speedTestErrorByRouter, setSpeedTestErrorByRouter] = useState({})
  const [speedTestLoadingId, setSpeedTestLoadingId] = useState(null)

  const canCreate = Boolean(permissions.create)
  const canUpdate = Boolean(permissions.update)
  const canDelete = Boolean(permissions.delete)
  const showReadOnly = !canCreate && !canUpdate && !canDelete

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarRouters()
    carregarHotspots()
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
      setFormDiagnostics(null)
    } else {
      setRouterSelecionado(null)
      setForm(DEFAULT_FORM)
      setFormDiagnostics(null)
    }

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setRouterSelecionado(null)
    setForm(DEFAULT_FORM)
    setFormDiagnostics(null)
    setFormDiagnosticsLoading(false)
  }

  function atualizarNome(value) {
    setForm((prev) => ({
      ...prev,
      nome: value,
      slug: routerSelecionado ? prev.slug : slugify(value),
    }))
  }

  function usarHotspotServerDoDiagnostico(serverName) {
    const value = String(serverName || '').trim()

    if (!value) return

    setForm((current) => ({
      ...current,
      hotspot_server: value,
    }))

    toast.success(`Hotspot server selecionado: ${value}`)
  }

  async function diagnosticarFormularioRouter() {
    setFormDiagnostics(null)

    if (!form.base_url.trim()) {
      toast.error('Informe a Base URL antes de diagnosticar.')
      return
    }

    if (!form.username.trim()) {
      toast.error('Informe o usuário antes de diagnosticar.')
      return
    }

    if (!routerSelecionado && !form.password.trim()) {
      toast.error('Informe a senha antes de diagnosticar.')
      return
    }

    if (routerSelecionado && !form.password.trim()) {
      toast.error('Para diagnosticar editando, informe a senha atual ou nova.')
      return
    }

    setFormDiagnosticsLoading(true)

    try {
      const data = await adminApiFetch('/api/admin/mikrotiks/diagnostics', {
        method: 'POST',
        body: {
          router: {
            nome: form.nome,
            slug: form.slug,
            base_url: form.base_url,
            username: form.username,
            password: form.password,
            hotspot_server: form.hotspot_server || 'hotspot1',
          },
        },
      })

      setFormDiagnostics(data.diagnostics || null)

      if (data.diagnostics?.ready) {
        toast.success('MikroTik pronto para salvar.')
      } else {
        toast.error('Diagnóstico encontrou pendências.')
      }
    } catch (error) {
      console.error('Erro ao diagnosticar formulário:', error)

      setFormDiagnostics({
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
      setFormDiagnosticsLoading(false)
    }
  }

  async function carregarHotspots() {
    try {
      const data = await adminApiFetch('/api/admin/hotspots')

      const candidatos = [
        data?.hotspots,
        data?.data,
        data?.items,
        data?.results,
        data?.hotspots?.data,
        data?.payload?.hotspots,
        data?.payload?.data,
      ]

      const lista = candidatos.find((item) => Array.isArray(item)) || []

      setHotspots(lista)
    } catch (error) {
      console.error('Erro ao carregar hotspots:', error)
      setHotspots([])
    }
  }

  async function vincularRouterAoHotspot(routerId, hotspotId) {
    if (!routerId || !hotspotId) return null

    return adminApiFetch('/api/admin/mikrotiks/link-hotspot', {
      method: 'POST',
      body: {
        routerId,
        hotspotId,
        applyBasePolicy: form.apply_base_policy,
      },
    })
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
      const savedResponse = await adminApiFetch('/api/admin/mikrotiks', {
        method: 'POST',
        body: {
          action: routerSelecionado ? 'update' : 'create',
          id: routerSelecionado?.id,
          router: form,
        },
      })

      

      const savedRouter =
        savedResponse?.router ||
        savedResponse?.mikrotik ||
        savedResponse?.data ||
        savedResponse?.item ||
        savedResponse?.result ||
        routerSelecionado ||
        null

      const savedRouterId =
        savedRouter?.id ||
        routerSelecionado?.id ||
        savedResponse?.id ||
        null

      if (form.hotspot_id && savedRouterId) {
        await vincularRouterAoHotspot(savedRouterId, form.hotspot_id)
      }toast.success(routerSelecionado ? 'MikroTik atualizado!' : 'MikroTik criado!')
      await carregarRouters()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar MikroTik:', error)
      toast.error(error.message || 'Erro ao salvar MikroTik.')
    } finally {
      setSaving(false)
    }
  }

  async function monitorarTrafegoRouter(router, interfaceName = '') {
    if (!router?.id) return

    setTrafficLoadingId(router.id)

    try {
      const data = await adminApiFetch('/api/admin/mikrotiks/traffic', {
        method: 'POST',
        body: {
          routerId: router.id,
          interfaceName,
        },
      })

      setTrafficByRouter((current) => ({
        ...current,
        [router.id]: data.monitor,
      }))

      toast.success('Tráfego atualizado.')
    } catch (error) {
      console.error('Erro ao monitorar tráfego:', error)
      toast.error(error.message || 'Erro ao monitorar tráfego.')
    } finally {
      setTrafficLoadingId(null)
    }
  }

  async function testarVelocidadeInternet(router) {
    if (!router?.id) return

    setSpeedTestLoadingId(router.id)

    try {
      const data = await adminApiFetch('/api/admin/mikrotiks/traffic', {
        method: 'POST',
        body: {
          routerId: router.id,
          mode: 'internet-test',
          bytes: 1000000000,
          pingHost: '1.1.1.1',
        },
      })

      setSpeedTestByRouter((current) => ({
        ...current,
        [router.id]: data.monitor,
      }))
      setSpeedTestErrorByRouter((current) => ({
        ...current,
        [router.id]: '',
      }))

      toast.success('Teste de internet concluido.')
    } catch (error) {
      console.error('Erro ao testar velocidade da internet:', error)
      setSpeedTestErrorByRouter((current) => ({
        ...current,
        [router.id]: error.message || 'Erro ao testar velocidade da internet.',
      }))
      toast.error(error.message || 'Erro ao testar velocidade da internet.')
    } finally {
      setSpeedTestLoadingId(null)
    }
  }

  async function testarRouter(router) {
    return diagnosticarRouter(router)
  }

  async function diagnosticarRouter(router) {
    setDiagnosticsRouter(router)
    setDiagnosticsData(null)
    setDiagnosticsOpen(true)
    setDiagnosticsStep('vpn')
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
    setDiagnosticsStep('vpn')
  }

  async function copiarTexto(value) {
    try {
      await navigator.clipboard.writeText(value || '')
      toast.success('Copiado!')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  function findDiagnosticCheck(diagnostics, id) {
    return (diagnostics?.checks || []).find((check) => check.id === id) || null
  }

  function findOnboardingItem(diagnostics, id) {
    return (diagnostics?.onboarding?.checklist || []).find((item) => item.id === id) || null
  }

  function buildWizardSteps(diagnostics) {
    const routerReachable = findDiagnosticCheck(diagnostics, 'router_reachable')
    const restWww = findDiagnosticCheck(diagnostics, 'rest_www_enabled')
    const hotspotServer = findDiagnosticCheck(diagnostics, 'target_hotspot_server')
    const hotspotSubnet = findDiagnosticCheck(diagnostics, 'hotspot_subnet')
    const policyStatus = findDiagnosticCheck(diagnostics, 'policy_status')
    const remoteAccess = findOnboardingItem(diagnostics, 'remote_access')
    const hasWireGuard = (diagnostics?.services || []).some((service) =>
      service.enabled && String(service.name || '').toLowerCase().includes('wireguard')
    )

    return [
      {
        id: 'vpn',
        title: 'VPN',
        subtitle: 'WireGuard',
        ok: Boolean(hasWireGuard || remoteAccess?.done),
        status: hasWireGuard || remoteAccess?.done ? 'ok' : 'warning',
        message: hasWireGuard
          ? 'WireGuard ativo no MikroTik.'
          : remoteAccess?.detail || 'Configure WireGuard antes de instalar o roteador em campo.',
        detail: 'Garante acesso remoto sem cabo, mesmo com o MikroTik instalado em outra cidade.',
        commands: ['WireGuard no MikroTik como cliente da VPS'],
      },
      {
        id: 'rest',
        title: 'REST',
        subtitle: 'Control API',
        ok: Boolean(routerReachable?.ok && restWww?.ok),
        status: routerReachable?.ok && restWww?.ok ? 'ok' : 'critical',
        message: restWww?.message || routerReachable?.message || 'REST ainda nao validado.',
        detail: 'Confirma que a VPS consegue enviar comandos RouterOS REST com seguranca.',
        commands: ['Habilitar REST seguro por origem', 'Criar usuario da Control API'],
      },
      {
        id: 'hotspot',
        title: 'Hotspot',
        subtitle: 'Servidor',
        ok: Boolean(hotspotServer?.ok),
        status: hotspotServer?.ok ? 'ok' : 'critical',
        message: hotspotServer?.message || 'Hotspot server ainda nao validado.',
        detail: 'Confirma que o hotspot server cadastrado no painel existe e esta ativo.',
        commands: ['Validar hotspot server'],
      },
      {
        id: 'subnet',
        title: 'Sub-rede',
        subtitle: 'Gateway',
        ok: Boolean(hotspotSubnet?.ok),
        status: hotspotSubnet?.ok ? 'ok' : 'critical',
        message: hotspotSubnet?.message || 'Sub-rede ainda nao validada.',
        detail: 'Confirma se a interface do hotspot tem IP dentro da sub-rede NexaWi.',
        commands: ['Validar IP da interface do hotspot', 'Adicionar IP da sub-rede no hotspot'],
      },
      {
        id: 'policy',
        title: 'Politica',
        subtitle: 'NexaWi',
        ok: Boolean(policyStatus?.ok),
        status: policyStatus?.ok ? 'ok' : 'warning',
        message: policyStatus?.message || 'Politica ainda nao lida.',
        detail: 'Confirma se as regras NexaWi podem ser lidas e auditadas no RouterOS.',
        commands: ['Habilitar DNS para politica base'],
      },
      {
        id: 'final',
        title: 'Teste final',
        subtitle: 'Operacao',
        ok: Boolean(diagnostics?.ready),
        status: diagnostics?.ready ? 'ok' : 'warning',
        message: diagnostics?.ready
          ? 'MikroTik pronto para operar.'
          : 'Resolva as pendencias antes de liberar para campo.',
        detail: 'Depois desta etapa, teste aplicar politica, bloquear e desbloquear um dominio real.',
        commands: [],
      },
    ]
  }

  function statusClass(status, selected = false) {
    if (status === 'ok') {
      return selected
        ? 'border-[#6be12f]/40 bg-[#6be12f]/15 text-[#8cf059]'
        : 'border-[#6be12f]/15 bg-[#6be12f]/5 text-[#8cf059]'
    }

    if (status === 'critical') {
      return selected
        ? 'border-red-500/40 bg-red-500/15 text-red-200'
        : 'border-red-500/20 bg-red-500/10 text-red-300'
    }

    return selected
      ? 'border-yellow-500/40 bg-yellow-500/15 text-yellow-100'
      : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
  }

  function renderDiagnosticsWizard(diagnostics) {
    const steps = buildWizardSteps(diagnostics)
    const activeStep = steps.find((step) => step.id === diagnosticsStep) || steps[0]
    const onboardingCommands = diagnostics?.onboarding?.commands || []
    const activeCommands = onboardingCommands.filter((command) =>
      (activeStep.commands || []).includes(command.title)
    )

    return (
      <div className="rounded-[2rem] border border-white/[0.06] bg-[#050505] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-sm font-black text-white">
              Wizard de onboarding MikroTik
            </p>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Siga as etapas na ordem para validar um roteador antes de colocar em campo.
            </p>
          </div>

          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border ${statusClass(diagnostics?.ready ? 'ok' : 'warning')}`}>
            {diagnostics?.ready ? 'Pronto para operar' : 'Com pendencias'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-5">
          {steps.map((step, index) => {
            const selected = activeStep.id === step.id

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setDiagnosticsStep(step.id)}
                className={`text-left rounded-2xl border p-3 transition-all ${statusClass(step.status, selected)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {step.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
                </div>
                <p className="text-sm font-black text-white mt-2">
                  {step.title}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mt-1">
                  {step.subtitle}
                </p>
              </button>
            )
          })}
        </div>

        <div className={`rounded-2xl border p-5 ${statusClass(activeStep.status, true)}`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <p className="text-lg font-black text-white">
                {activeStep.title}: {activeStep.ok ? 'validado' : 'precisa de atencao'}
              </p>
              <p className="text-sm font-bold mt-2">
                {activeStep.message}
              </p>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {activeStep.detail}
              </p>
            </div>
          </div>

          {activeCommands.length > 0 && (
            <div className="mt-5 space-y-3">
              {activeCommands.map((command) => (
                <div key={command.title} className="rounded-xl border border-white/[0.06] bg-black/40 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-black text-white">
                        {command.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        {command.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copiarTexto(command.value)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-[11px] font-black text-neutral-300 hover:bg-[#6be12f]/10 hover:text-[#8cf059]"
                    >
                      <Copy size={13} />
                      Copiar
                    </button>
                  </div>

                  <code className="block whitespace-pre-wrap break-all rounded-lg bg-black/60 px-3 py-2 text-[11px] leading-relaxed text-neutral-300">
                    {command.value}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderOnboardingPanel(diagnostics) {
    const onboarding = diagnostics?.onboarding

    if (!onboarding) return null

    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#050505] p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-black text-white">
              Onboarding RouterOS
            </p>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Checklist e comandos para validar o MikroTik antes de colocar o hotspot em producao.
            </p>
          </div>

          <span className="rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#8cf059]">
            {onboarding.hotspotSubnet}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {(onboarding.checklist || []).map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-4 py-3 ${
                item.done
                  ? 'border-[#6be12f]/15 bg-[#6be12f]/5'
                  : 'border-yellow-500/20 bg-yellow-500/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                  item.done ? 'bg-[#6be12f] text-black' : 'bg-yellow-500/15 text-yellow-300'
                }`}>
                  {item.done ? <Check size={13} /> : <AlertTriangle size={13} />}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black text-white">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {(onboarding.commands || []).map((command) => (
            <div key={command.title} className="rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-black text-white">
                    {command.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    {command.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copiarTexto(command.value)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-[11px] font-black text-neutral-300 hover:bg-[#6be12f]/10 hover:text-[#8cf059]"
                >
                  <Copy size={13} />
                  Copiar
                </button>
              </div>

              <code className="block whitespace-pre-wrap break-all rounded-lg bg-black/60 px-3 py-2 text-[11px] leading-relaxed text-neutral-300">
                {command.value}
              </code>
            </div>
          ))}
        </div>
      </div>
    )
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

      <main className="relative z-10 max-w-full overflow-x-hidden px-0 sm:px-2 md:px-4 pb-12 animate-fade-in-up">
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

        <RemoteAccessPanel />

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
              const diagnosing = diagnosticsLoadingId === routerItem.id

              return (
                <article
                  key={routerItem.id}
                  className="mobile-tight-card relative max-w-full overflow-hidden rounded-[2.25rem] border border-white/[0.06] bg-[#0a0a0a] p-6"
                >
                  <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-[#6be12f]/5 blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
                          <Server size={22} className="text-[#6be12f]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-col-reverse items-center gap-2 mb-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <h2 className="text-lg font-black text-white">
                              {routerItem.nome}
                            </h2>

                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${corStatus(routerItem.status)}`}>
                              {routerItem.status}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-500 font-bold break-all">
                            {routerItem.slug}
                          </p>

                          <p className="text-xs text-neutral-600 mt-1">
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

                    {trafficByRouter[routerItem.id] && (
                      <div className="rounded-2xl border border-[#6be12f]/15 bg-[#071006] p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-black text-[#8cf059]">
                              Monitoramento ao vivo
                            </p>
                            <p className="text-[11px] text-neutral-500 mt-1">
                              Interface: {trafficByRouter[routerItem.id]?.interface?.name || 'auto'}
                            </p>
                          </div>

                          <span className="rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#8cf059]">
                            Online
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/[0.05] bg-black/30 p-3">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                              Download
                            </p>
                            <p className="text-xl font-black text-white mt-1">
                              {trafficByRouter[routerItem.id]?.traffic?.download || '0 Mbps'}
                            </p>
                            <p className="text-[10px] text-neutral-600 mt-1">
                              rx-bits/s
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/[0.05] bg-black/30 p-3">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                              Upload
                            </p>
                            <p className="text-xl font-black text-white mt-1">
                              {trafficByRouter[routerItem.id]?.traffic?.upload || '0 Mbps'}
                            </p>
                            <p className="text-[10px] text-neutral-600 mt-1">
                              tx-bits/s
                            </p>
                          </div>
                        </div>

                        <p className="text-[10px] text-neutral-600 mt-3">
                          Última leitura: {trafficByRouter[routerItem.id]?.checkedAt
                            ? new Date(trafficByRouter[routerItem.id].checkedAt).toLocaleTimeString('pt-BR')
                            : '-'}
                        </p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-sky-400/15 bg-sky-950/10 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-black text-sky-300">
                            Teste rapido da internet
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1">
                            O MikroTik baixa um arquivo grande e o painel estima a banda de download que chega nele.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                          Operadora
                        </span>
                      </div>

                      {speedTestByRouter[routerItem.id] ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-white/[0.05] bg-black/30 p-3">
                              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                                Download medio
                              </p>
                              <p className="text-xl font-black text-white mt-1">
                                {speedTestByRouter[routerItem.id]?.internetTest?.download || '0 Mbps'}
                              </p>
                              <p className="text-[10px] text-neutral-600 mt-1">
                                pico {speedTestByRouter[routerItem.id]?.internetTest?.peakDownload || '-'}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/[0.05] bg-black/30 p-3">
                              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                                Upload observado
                              </p>
                              <p className="text-xl font-black text-white mt-1">
                                {speedTestByRouter[routerItem.id]?.internetTest?.upload || '0 Mbps'}
                              </p>
                              <p className="text-[10px] text-neutral-600 mt-1">
                                pico {speedTestByRouter[routerItem.id]?.internetTest?.peakUpload || '-'}
                              </p>
                            </div>
                          </div>

                          <p className="text-[10px] text-neutral-600 mt-3">
                            Ping: {speedTestByRouter[routerItem.id]?.internetTest?.ping?.average || '-'} | perda {speedTestByRouter[routerItem.id]?.internetTest?.ping?.lossPercent ?? '-'}% | Duracao: {speedTestByRouter[routerItem.id]?.internetTest?.durationSeconds || '-'}s
                          </p>

                          <p className="text-[10px] text-neutral-600 mt-2">
                            Amostras: {speedTestByRouter[routerItem.id]?.internetTest?.samplesCount || 0} | Ultima leitura: {speedTestByRouter[routerItem.id]?.checkedAt
                              ? new Date(speedTestByRouter[routerItem.id].checkedAt).toLocaleTimeString('pt-BR')
                              : '-'}
                          </p>

                          <p className="text-[10px] text-neutral-600 mt-2">
                            Medido na interface {speedTestByRouter[routerItem.id]?.interface?.name || 'auto'} durante download controlado.
                          </p>
                        </>
                      ) : speedTestErrorByRouter[routerItem.id] ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                          <p className="text-xs font-black text-red-300">
                            Teste nao concluido
                          </p>
                          <p className="text-[11px] text-red-200/80 mt-1 break-words">
                            {speedTestErrorByRouter[routerItem.id]}
                          </p>
                          <p className="text-[10px] text-neutral-500 mt-2">
                            Para medicao de cobranca, o MikroTik precisa conseguir baixar o arquivo de teste pela WAN e responder amostras de monitoramento. Se falhar, valide DNS, gateway, rota e acesso HTTP/HTTPS no roteador.
                          </p>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-white/[0.05] bg-black/30 p-3 text-xs text-neutral-500">
                          Clique no botao Teste de internet para estimar a velocidade que chega ao MikroTik. O botao de trafego mostra apenas o uso atual.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => monitorarTrafegoRouter(routerItem)}
                        disabled={trafficLoadingId === routerItem.id}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-3 text-sm font-black text-[#8cf059] hover:bg-[#6be12f]/15 disabled:opacity-50"
                      >
                        {trafficLoadingId === routerItem.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                        Trafego agora
                      </button>

                      <button
                        onClick={() => testarVelocidadeInternet(routerItem)}
                        disabled={speedTestLoadingId === routerItem.id}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-sm font-black text-sky-200 hover:bg-sky-400/15 disabled:opacity-50"
                      >
                        {speedTestLoadingId === routerItem.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                        Teste de internet
                      </button>

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

              <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#050505] p-5">
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                  Vincular ao Hotspot
                </label>

                <select
                  value={form.hotspot_id}
                  onChange={(e) => setForm({ ...form, hotspot_id: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#6be12f]/30"
                >
                  <option value="">Não vincular agora</option>

                  {hotspots.map((hotspot) => (
                    <option key={hotspot.id} value={hotspot.id}>
                      {hotspot.nome || hotspot.name || hotspot.slug || hotspot.id}
                      {hotspot.router_id ? ' — já possui MikroTik' : ''}
                    </option>
                  ))}
                </select>

                <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                  Ao salvar, este MikroTik será vinculado ao hotspot escolhido. Isso permite que o Controle de Rede aplique regras no roteador correto.
                </p>

                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/5 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.apply_base_policy}
                    onChange={(e) => setForm({ ...form, apply_base_policy: e.target.checked })}
                    className="mt-1"
                  />

                  <div>
                    <p className="text-sm font-black text-white">
                      Aplicar política base após salvar
                    </p>

                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Cria a política padrão do hotspot e envia as regras iniciais para o MikroTik automaticamente.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#050505] p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-black text-white">
                      Diagnóstico antes de salvar
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Teste Base URL, usuário, senha e hotspot server antes de gravar este MikroTik no sistema.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={diagnosticarFormularioRouter}
                    disabled={formDiagnosticsLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black hover:bg-[#8cf059] disabled:opacity-50"
                  >
                    {formDiagnosticsLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Diagnosticar
                  </button>
                </div>

                {formDiagnosticsLoading && (
                  <div className="rounded-2xl border border-white/[0.05] bg-[#0a0a0a] px-4 py-4 flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-[#6be12f]" />
                    <p className="text-sm font-bold text-neutral-400">
                      Consultando MikroTik...
                    </p>
                  </div>
                )}

                {!formDiagnosticsLoading && formDiagnostics?.error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-red-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-red-300">
                          Diagnóstico falhou
                        </p>
                        <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                          {formDiagnostics.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!formDiagnosticsLoading && formDiagnostics && !formDiagnostics.error && (
                  <div className={`rounded-2xl border px-4 py-4 ${
                    formDiagnostics.ready
                      ? 'border-[#6be12f]/20 bg-[#6be12f]/10'
                      : 'border-yellow-500/20 bg-yellow-500/10'
                  }`}>
                    <div className="flex items-start gap-3">
                      {formDiagnostics.ready ? (
                        <ShieldCheck size={20} className="text-[#8cf059] mt-0.5" />
                      ) : (
                        <AlertTriangle size={20} className="text-yellow-300 mt-0.5" />
                      )}

                      <div className="min-w-0">
                        <p className={`text-sm font-black ${
                          formDiagnostics.ready ? 'text-[#8cf059]' : 'text-yellow-300'
                        }`}>
                          {formDiagnostics.ready ? 'MikroTik pronto para salvar' : 'MikroTik com pendências'}
                        </p>

                        <p className="text-xs text-neutral-400 mt-1">
                          {formDiagnostics.summary?.criticalIssues || 0} críticos · {formDiagnostics.summary?.warnings || 0} avisos · {formDiagnostics.summary?.checks || 0} verificações
                        </p>

                        {formDiagnostics.router && (
                          <p className="text-xs text-neutral-300 mt-2">
                            {formDiagnostics.router.boardName || 'MikroTik'} · RouterOS {formDiagnostics.router.version || '—'} · Uptime {formDiagnostics.router.uptime || '—'}
                          </p>
                        )}

                        {(formDiagnostics.checks || []).filter((check) => !check.ok).slice(0, 3).map((check) => (
                          <p key={check.id} className="text-xs text-yellow-100 mt-2 leading-relaxed">
                            {check.label}: {check.message}
                          </p>
                        ))}

                        {(formDiagnostics.hotspotServers || []).length > 0 && (
                          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#050505] p-4">
                            <p className="text-xs font-black text-white mb-3">
                              Hotspot servers encontrados
                            </p>

                            <div className="space-y-2">
                              {(formDiagnostics.hotspotServers || []).map((server) => {
                                const selected = form.hotspot_server === server.name

                                return (
                                  <div
                                    key={server.id || server.name}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                                      selected
                                        ? 'border-[#6be12f]/25 bg-[#6be12f]/10'
                                        : 'border-white/[0.05] bg-white/[0.02]'
                                    }`}
                                  >
                                    <div>
                                      <p className="text-sm font-black text-white">
                                        {server.name}
                                      </p>

                                      <p className="text-xs text-neutral-500 mt-1">
                                        Interface: {server.interface || '—'} · Profile: {server.profile || '—'} · {server.enabled ? 'Ativo' : 'Desativado'}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => usarHotspotServerDoDiagnostico(server.name)}
                                      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-black transition-all ${
                                        selected
                                          ? 'bg-[#6be12f] text-black'
                                          : 'bg-white/[0.05] text-neutral-300 hover:bg-[#6be12f]/10 hover:text-[#8cf059]'
                                      }`}
                                    >
                                      {selected ? 'Selecionado' : 'Usar este'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!formDiagnosticsLoading && formDiagnostics && !formDiagnostics.error && renderOnboardingPanel(formDiagnostics)}
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
                  {renderDiagnosticsWizard(diagnosticsData)}

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

                  {renderOnboardingPanel(diagnosticsData)}
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
