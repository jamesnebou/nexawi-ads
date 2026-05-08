'use client'

// src/app/dashboard/clientes/page.js
// ============================================================
// Aba Clientes da dashboard NexaWi ADS.
//
// Agora esta tela respeita as permissões retornadas pela API:
// - clientes.view: permite visualizar a lista
// - clientes.create: mostra botão Novo Cliente e permite cadastrar
// - clientes.update: mostra botão Editar e permite salvar alterações
// - clientes.delete: mostra botão Excluir e permite abrir confirmação
// - clientes.export: reservado para exportação futura
//
// Agora também possui:
// - Status de onboarding/implantação
// - Checklist interno de setup
// - Cliente travado por pendência
// - Responsável interno pela implantação
// - Cards operacionais de acompanhamento
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  Lock,
  KeyRound,
  Loader2,
  Copy,
  ClipboardCheck,
  Flag,
  AlertTriangle,
  Rocket,
  UserCheck,
  Clock3,
  CheckCircle2,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const statusCores = {
  Ativo: 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20',
  Inativo: 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]',
  Inadimplente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  Cancelado: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

const statusOpcoes = ['Ativo', 'Inativo', 'Inadimplente', 'Cancelado']

const onboardingStatusOpcoes = [
  { value: 'novo_lead', label: 'Novo lead' },
  { value: 'contrato_enviado', label: 'Contrato enviado' },
  { value: 'pagamento_pendente', label: 'Pagamento pendente' },
  { value: 'pagamento_confirmado', label: 'Pagamento confirmado' },
  { value: 'setup_em_andamento', label: 'Setup em andamento' },
  { value: 'hotspot_configurado', label: 'Hotspot configurado' },
  { value: 'campanha_criada', label: 'Campanha criada' },
  { value: 'portal_testado', label: 'Portal testado' },
  { value: 'cliente_ativo', label: 'Cliente ativo' },
  { value: 'cliente_pausado', label: 'Cliente pausado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const onboardingStatusCores = {
  novo_lead: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  contrato_enviado: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  pagamento_pendente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  pagamento_confirmado: 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20',
  setup_em_andamento: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  hotspot_configurado: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  campanha_criada: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  portal_testado: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  cliente_ativo: 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20',
  cliente_pausado: 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]',
  cancelado: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

const checklistLabels = [
  { key: 'contrato_enviado', label: 'Contrato enviado' },
  { key: 'pagamento_confirmado', label: 'Pagamento confirmado' },
  { key: 'dados_empresa_recebidos', label: 'Dados da empresa recebidos' },
  { key: 'criativo_recebido', label: 'Criativo recebido' },
  { key: 'hotspot_vinculado', label: 'Hotspot vinculado' },
  { key: 'anuncio_criado', label: 'Anúncio criado' },
  { key: 'portal_testado', label: 'Portal testado' },
  { key: 'cliente_liberado', label: 'Cliente liberado' },
]

const checklistPadrao = {
  contrato_enviado: false,
  pagamento_confirmado: false,
  dados_empresa_recebidos: false,
  criativo_recebido: false,
  hotspot_vinculado: false,
  anuncio_criado: false,
  portal_testado: false,
  cliente_liberado: false,
}

const permissoesIniciais = {
  view: false,
  create: false,
  update: false,
  delete: false,
  export: false,
}

const resumoInicial = {
  total: 0,
  novoLead: 0,
  emSetup: 0,
  ativos: 0,
  pausados: 0,
  cancelados: 0,
  travados: 0,
  pagamentoPendente: 0,
}

function getOnboardingLabel(value) {
  return onboardingStatusOpcoes.find((item) => item.value === value)?.label || 'Novo lead'
}

function normalizarChecklist(checklist = {}) {
  return {
    ...checklistPadrao,
    ...(checklist || {}),
  }
}

function calcularProgressoChecklist(checklist = {}) {
  const normalizado = normalizarChecklist(checklist)
  const total = checklistLabels.length
  const feitos = checklistLabels.filter((item) => Boolean(normalizado[item.key])).length

  return {
    total,
    feitos,
    percentual: total > 0 ? Math.round((feitos / total) * 100) : 0,
  }
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

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [permissions, setPermissions] = useState(permissoesIniciais)
  const [resumoOnboarding, setResumoOnboarding] = useState(resumoInicial)

  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [filtroOnboarding, setFiltroOnboarding] = useState('Todos')
  const [filtroTravado, setFiltroTravado] = useState('Todos')

  const [modalAberto, setModalAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [resetandoAcessoId, setResetandoAcessoId] = useState('')
  const [resetAccessInfo, setResetAccessInfo] = useState(null)

  const [estadosIBGE, setEstadosIBGE] = useState([])
  const [cidadesIBGE, setCidadesIBGE] = useState([])

  const [form, setForm] = useState({
    nome: '',
    nome_empresa: '',
    nome_responsavel: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    plano_id: '',
    status: 'Ativo',

    onboarding_status: 'novo_lead',
    onboarding_checklist: checklistPadrao,
    onboarding_observacao: '',
    onboarding_responsavel: '',
    onboarding_travado: false,
    onboarding_motivo_trava: '',
  })

  const [cpfCnpjError, setCpfCnpjError] = useState('')
  const [telefoneError, setTelefoneError] = useState('')
  const [nomeEmpresarioError, setNomeEmpresarioError] = useState('')
  const [nomeEmpresaError, setNomeEmpresaError] = useState('')
  const [nomeResponsavelError, setNomeResponsavelError] = useState('')

  const canCreate = Boolean(permissions.create)
  const canUpdate = Boolean(permissions.update)
  const canDelete = Boolean(permissions.delete)
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
  }, [busca, filtroStatus, filtroOnboarding, filtroTravado])

  async function buscarDados() {
    setCarregando(true)

    try {
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroOnboarding) params.set('onboarding_status', filtroOnboarding)
      if (filtroTravado) params.set('travado', filtroTravado)

      const data = await adminApiFetch(`/api/admin/clientes?${params.toString()}`)

      setPlanos(data.planos || [])
      setClientes(data.clientes || [])
      setResumoOnboarding(data.resumoOnboarding || resumoInicial)
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      toast.error(error.message || 'Erro ao carregar clientes.')
    } finally {
      setCarregando(false)
    }
  }

  const validarCpfCnpj = (valor) => {
    const numeros = valor.replace(/\D/g, '')

    if (numeros.length > 0 && numeros.length !== 11 && numeros.length !== 14) {
      return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.'
    }

    return ''
  }

  const validarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, '')

    if (numeros.length > 0 && numeros.length < 10) {
      return 'Telefone inválido. Inclua o DDD.'
    }

    return ''
  }

  const validarNome = (valor, campo) => {
    if (valor.trim().length > 0 && valor.trim().length < 3) {
      return `${campo} deve ter pelo menos 3 caracteres.`
    }

    return ''
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let newValue = type === 'checkbox' ? checked : value

    if (name === 'cpf_cnpj') {
      newValue = value.replace(/\D/g, '').slice(0, 14)
      setCpfCnpjError(validarCpfCnpj(newValue))
    } else if (name === 'telefone') {
      newValue = value.replace(/\D/g, '').slice(0, 11)
      setTelefoneError(validarTelefone(newValue))
    } else if (name === 'nome') {
      setNomeEmpresarioError(validarNome(newValue, 'Nome do empresário'))
    } else if (name === 'nome_empresa') {
      setNomeEmpresaError(validarNome(newValue, 'Nome da empresa'))
    } else if (name === 'nome_responsavel') {
      setNomeResponsavelError(validarNome(newValue, 'Nome do responsável'))
    }

    if (name === 'estado') {
      setForm({ ...form, [name]: newValue, cidade: '' })
    } else {
      setForm({ ...form, [name]: newValue })
    }
  }

  function toggleChecklist(key) {
    setForm((prev) => ({
      ...prev,
      onboarding_checklist: {
        ...normalizarChecklist(prev.onboarding_checklist),
        [key]: !Boolean(prev.onboarding_checklist?.[key]),
      },
    }))
  }

  function abrirModal(cliente = null) {
    if (cliente && !canUpdate) {
      toast.error('Você não tem permissão para editar clientes.')
      return
    }

    if (!cliente && !canCreate) {
      toast.error('Você não tem permissão para criar clientes.')
      return
    }

    if (cliente) {
      setClienteSelecionado(cliente)
      setForm({
        nome: cliente.nome || '',
        nome_empresa: cliente.nome_empresa || '',
        nome_responsavel: cliente.nome_responsavel || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        plano_id: cliente.plano_id || '',
        status: cliente.status || 'Ativo',

        onboarding_status: cliente.onboarding_status || 'novo_lead',
        onboarding_checklist: normalizarChecklist(cliente.onboarding_checklist),
        onboarding_observacao: cliente.onboarding_observacao || '',
        onboarding_responsavel: cliente.onboarding_responsavel || '',
        onboarding_travado: Boolean(cliente.onboarding_travado),
        onboarding_motivo_trava: cliente.onboarding_motivo_trava || '',
      })
    } else {
      setClienteSelecionado(null)
      setForm({
        nome: '',
        nome_empresa: '',
        nome_responsavel: '',
        email: '',
        telefone: '',
        cpf_cnpj: '',
        endereco: '',
        cidade: '',
        estado: '',
        plano_id: '',
        status: 'Ativo',

        onboarding_status: 'novo_lead',
        onboarding_checklist: checklistPadrao,
        onboarding_observacao: '',
        onboarding_responsavel: '',
        onboarding_travado: false,
        onboarding_motivo_trava: '',
      })
    }

    setCpfCnpjError('')
    setTelefoneError('')
    setNomeEmpresarioError('')
    setNomeEmpresaError('')
    setNomeResponsavelError('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setClienteSelecionado(null)
  }

  async function salvarCliente() {
    if (clienteSelecionado && !canUpdate) {
      toast.error('Você não tem permissão para editar clientes.')
      return
    }

    if (!clienteSelecionado && !canCreate) {
      toast.error('Você não tem permissão para criar clientes.')
      return
    }

    if (cpfCnpjError || telefoneError || nomeEmpresarioError || nomeEmpresaError || nomeResponsavelError) {
      toast.error('Corrija os erros no formulário antes de salvar.')
      return
    }

    if (
      !form.nome.trim() ||
      !form.nome_empresa.trim() ||
      !form.nome_responsavel.trim() ||
      !form.telefone.trim() ||
      !form.cpf_cnpj.trim() ||
      !form.email.trim()
    ) {
      toast.error('Preencha todos os campos obrigatórios, incluindo o E-mail.')
      return
    }

    setSalvando(true)

    const dadosParaSalvar = {
      ...form,
      plano_id: form.plano_id || null,
      onboarding_checklist: normalizarChecklist(form.onboarding_checklist),
    }

    try {
      if (clienteSelecionado) {
        await adminApiFetch('/api/admin/clientes', {
          method: 'POST',
          body: {
            action: 'update',
            id: clienteSelecionado.id,
            cliente: dadosParaSalvar,
          },
        })

        toast.success('Cliente atualizado com sucesso!')
      } else {
        await adminApiFetch('/api/admin/clientes', {
          method: 'POST',
          body: {
            action: 'create',
            cliente: dadosParaSalvar,
          },
        })

        toast.success('Cliente cadastrado e acesso criado com sucesso!')
      }

      fecharModal()
      buscarDados()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error(error.message || 'Erro ao salvar cliente.')
    } finally {
      setSalvando(false)
    }
  }

  function solicitarExclusaoCliente(id) {
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir clientes.')
      return
    }

    setConfirmDelete(id)
  }

  async function excluirCliente(id) {
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir clientes.')
      return
    }

    try {
      await adminApiFetch('/api/admin/clientes', {
        method: 'POST',
        body: {
          action: 'delete',
          id,
        },
      })

      toast.success('Cliente excluído com sucesso!')
      setConfirmDelete(null)
      buscarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error(error.message || 'Erro ao excluir cliente. Verifique se há dependências.')
    }
  }


  async function resetarAcessoCliente(cliente) {
  if (!canUpdate) {
    toast.error('Você não tem permissão para resetar acesso de clientes.')
    return
  }

  if (!cliente?.id) {
    toast.error('Cliente inválido.')
    return
  }

  setResetandoAcessoId(cliente.id)

  try {
    const data = await adminApiFetch('/api/admin/clientes', {
      method: 'POST',
      body: {
        action: 'reset_access',
        id: cliente.id,
      },
    })

    setResetAccessInfo({
      email: data.email,
      senha: data.senha_inicial,
      created: Boolean(data.created),
      message: data.message,
    })

    toast.success(data.message || 'Acesso do cliente pronto!')
    buscarDados()
  } catch (error) {
    console.error('Erro ao resetar acesso do cliente:', error)
    toast.error(error.message || 'Erro ao resetar acesso do cliente.')
  } finally {
    setResetandoAcessoId('')
  }
}

async function copiarAcessoCliente() {
  if (!resetAccessInfo) return

  const texto = `Acesso NexaWi ADS\nE-mail: ${resetAccessInfo.email}\nSenha inicial: ${resetAccessInfo.senha}`

  try {
    await navigator.clipboard.writeText(texto)
    toast.success('Acesso copiado!')
  } catch {
    toast.error('Não foi possível copiar automaticamente.')
  }
}

  const cards = [
    {
      label: 'Clientes',
      value: resumoOnboarding.total,
      sub: 'na base filtrada',
      icon: Users,
      text: 'text-white',
    },
    {
      label: 'Em setup',
      value: resumoOnboarding.emSetup,
      sub: 'implantação em andamento',
      icon: Rocket,
      text: 'text-purple-400',
    },
    {
      label: 'Ativos',
      value: resumoOnboarding.ativos,
      sub: 'liberados para operação',
      icon: CheckCircle2,
      text: 'text-[#8cf059]',
    },
    {
      label: 'Pag. pendente',
      value: resumoOnboarding.pagamentoPendente,
      sub: 'aguardando financeiro',
      icon: Clock3,
      text: 'text-yellow-400',
    },
    {
      label: 'Travados',
      value: resumoOnboarding.travados,
      sub: 'precisam de atenção',
      icon: AlertTriangle,
      text: 'text-red-400',
    },
  ]

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight">
              Clientes
            </h1>
            <p className="text-sm text-neutral-500 mt-1.5 font-medium">
              Gerencie sua base, contratos e implantação dos clientes
            </p>

            {!canCreate && !canUpdate && !canDelete && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} className="text-neutral-500" />
                Modo leitura: você pode visualizar, mas não alterar clientes.
              </div>
            )}
          </div>

          {canCreate && (
            <button
              onClick={() => abrirModal()}
              className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
            >
              <Plus size={18} strokeWidth={2.5} />
              Novo Cliente
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  {card.label}
                </p>

                <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05]">
                  <card.icon size={18} className={card.text} />
                </div>
              </div>

              <p className="text-4xl font-light text-white tracking-tight">
                {card.value}
              </p>

              <p className="text-xs text-neutral-500 mt-2 font-medium">
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative group/input">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300"
            />
            <input
              type="text"
              placeholder="Buscar cliente, empresa, CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
            />
          </div>

          <SelectFiltro value={filtroStatus} onChange={setFiltroStatus}>
            <option value="Todos" className="bg-[#0a0a0a]">Todos os Status</option>
            {statusOpcoes.map((status) => (
              <option key={status} value={status} className="bg-[#0a0a0a]">
                {status}
              </option>
            ))}
          </SelectFiltro>

          <SelectFiltro value={filtroOnboarding} onChange={setFiltroOnboarding}>
            <option value="Todos" className="bg-[#0a0a0a]">Todas as etapas</option>
            {onboardingStatusOpcoes.map((status) => (
              <option key={status.value} value={status.value} className="bg-[#0a0a0a]">
                {status.label}
              </option>
            ))}
          </SelectFiltro>

          <SelectFiltro value={filtroTravado} onChange={setFiltroTravado}>
            <option value="Todos" className="bg-[#0a0a0a]">Todos</option>
            <option value="Sim" className="bg-[#0a0a0a]">Só travados</option>
            <option value="Não" className="bg-[#0a0a0a]">Não travados</option>
          </SelectFiltro>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
              <Users className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : clientes.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <Users size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum cliente encontrado
            </h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md">
              Você ainda não tem clientes cadastrados ou nenhum resultado corresponde à sua busca.
            </p>

            {canCreate && (
              <button
                onClick={() => abrirModal()}
                className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={18} />
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1150px]">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">
                      Empresa / Contato
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">
                      Comunicação
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">
                      Localização
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">
                      Plano / Resp.
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">
                      Implantação
                    </th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">
                      Status
                    </th>
                    {showActionsColumn && (
                      <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 text-right">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.02]">
                  {clientes.map((cliente) => {
                    const progresso = calcularProgressoChecklist(cliente.onboarding_checklist)

                    return (
                      <tr key={cliente.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center text-neutral-400 font-bold text-sm shadow-inner flex-shrink-0 group-hover:text-white group-hover:border-white/[0.1] transition-colors">
                              {cliente.nome?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">
                                {cliente.nome || '—'}
                              </p>
                              <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1">
                                <Building size={12} className="text-neutral-600" />
                                {cliente.nome_empresa || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2.5 text-neutral-500 group-hover:text-neutral-400 transition-colors">
                              <Phone size={14} className="text-neutral-600" />
                              <span className="text-xs font-medium">{cliente.telefone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-neutral-500 group-hover:text-neutral-400 transition-colors">
                              <Mail size={14} className="text-neutral-600" />
                              <span className="text-xs font-medium truncate max-w-[150px]" title={cliente.email}>
                                {cliente.email || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2.5 text-neutral-400 mb-1.5">
                            <MapPin size={14} className="text-neutral-600" />
                            <span className="text-xs font-bold">
                              {cliente.cidade || '—'}, {cliente.estado || '—'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 truncate max-w-[180px] font-medium" title={cliente.endereco}>
                            {cliente.endereco || '—'}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-neutral-300">
                            {cliente.planos?.nome || 'Sem plano'}
                          </p>
                          <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1 font-medium">
                            <User size={12} className="text-neutral-600" />
                            {cliente.nome_responsavel || '—'}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${onboardingStatusCores[cliente.onboarding_status] || onboardingStatusCores.novo_lead}`}>
                              {cliente.onboarding_travado ? <AlertTriangle size={12} /> : <Flag size={12} />}
                              {getOnboardingLabel(cliente.onboarding_status)}
                            </span>

                            <div className="w-40 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#6be12f]"
                                style={{ width: `${progresso.percentual}%` }}
                              />
                            </div>

                            <p className="text-[11px] text-neutral-500 font-medium">
                              {progresso.feitos}/{progresso.total} etapas · {cliente.onboarding_responsavel || 'Sem responsável'}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${statusCores[cliente.status] || 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'}`}>
                            {cliente.status || 'Desconhecido'}
                          </span>
                        </td>

                        {showActionsColumn && (
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                              {canUpdate && (
  <button
    onClick={() => resetarAcessoCliente(cliente)}
    disabled={resetandoAcessoId === cliente.id}
    className="p-2.5 text-neutral-500 hover:text-[#8cf059] hover:bg-[#6be12f]/10 rounded-xl transition-all duration-300 border border-transparent hover:border-[#6be12f]/20 disabled:opacity-50 disabled:cursor-not-allowed"
    title="Resetar acesso do cliente"
  >
    {resetandoAcessoId === cliente.id ? (
      <Loader2 size={16} className="animate-spin" />
    ) : (
      <KeyRound size={16} />
    )}
  </button>
)}
{canUpdate && (
                                <button
                                  onClick={() => abrirModal(cliente)}
                                  className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                                  title="Editar cliente"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => solicitarExclusaoCliente(cliente.id)}
                                  className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
                                  title="Excluir cliente"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-6xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {clienteSelecionado ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <p className="text-sm text-neutral-500 mt-1.5 font-medium">
                  Preencha os dados da empresa, contato principal e implantação
                </p>
              </div>
              <button
                onClick={fecharModal}
                className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/[0.015] border border-white/[0.05] rounded-[2rem] p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                      <Building size={18} className="text-[#6be12f]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Dados do cliente</h3>
                      <p className="text-xs text-neutral-500">Informações comerciais e de contato</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField
                      label="Empresário *"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      icon={Briefcase}
                      placeholder="Nome completo"
                      error={nomeEmpresarioError}
                    />

                    <InputField
                      label="Empresa *"
                      name="nome_empresa"
                      value={form.nome_empresa}
                      onChange={handleChange}
                      icon={Building}
                      placeholder="Nome do negócio"
                      error={nomeEmpresaError}
                    />

                    <InputField
                      label="Responsável pela venda *"
                      name="nome_responsavel"
                      value={form.nome_responsavel}
                      onChange={handleChange}
                      icon={User}
                      placeholder="Quem fechou o negócio"
                      error={nomeResponsavelError}
                    />

                    <InputField
                      label="CPF/CNPJ *"
                      name="cpf_cnpj"
                      value={form.cpf_cnpj}
                      onChange={handleChange}
                      icon={CreditCard}
                      placeholder="Apenas números"
                      maxLength={14}
                      error={cpfCnpjError}
                    />

                    <InputField
                      label="Email/Login *"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      icon={Mail}
                      placeholder="contato@empresa.com"
                    />

                    <InputField
                      label="Telefone/WhatsApp *"
                      name="telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      icon={Phone}
                      placeholder="DDD + Número"
                      maxLength={11}
                      error={telefoneError}
                    />

                    <div className="md:col-span-2">
                      <InputField
                        label="Endereço completo"
                        name="endereco"
                        value={form.endereco}
                        onChange={handleChange}
                        icon={MapPin}
                        placeholder="Rua, número, complemento, bairro"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                        Estado
                      </label>
                      <select
                        name="estado"
                        value={form.estado}
                        onChange={handleChange}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
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
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                        Cidade
                      </label>
                      <input
                        list="lista-cidades-ibge"
                        type="text"
                        name="cidade"
                        value={form.cidade}
                        onChange={handleChange}
                        placeholder={form.estado ? 'Digite para buscar a cidade' : 'Selecione o estado primeiro'}
                        disabled={!form.estado}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <datalist id="lista-cidades-ibge">
                        {cidadesIBGE.map((cidade) => (
                          <option key={cidade.id} value={cidade.nome} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                        Plano contratado
                      </label>
                      <select
                        name="plano_id"
                        value={form.plano_id}
                        onChange={handleChange}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                      >
                        <option value="" className="bg-[#050505]">
                          Sem plano vinculado
                        </option>
                        {planos.map((plano) => (
                          <option key={plano.id} value={plano.id} className="bg-[#050505]">
                            {plano.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                        Status da conta
                      </label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                      >
                        {statusOpcoes.map((status) => (
                          <option key={status} value={status} className="bg-[#050505]">
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.015] border border-white/[0.05] rounded-[2rem] p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                      <ClipboardCheck size={18} className="text-[#6be12f]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Onboarding / Implantação</h3>
                      <p className="text-xs text-neutral-500">Controle interno do setup do cliente</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                        Etapa atual
                      </label>
                      <select
                        name="onboarding_status"
                        value={form.onboarding_status}
                        onChange={handleChange}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                      >
                        {onboardingStatusOpcoes.map((status) => (
                          <option key={status.value} value={status.value} className="bg-[#050505]">
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField
                      label="Responsável interno"
                      name="onboarding_responsavel"
                      value={form.onboarding_responsavel}
                      onChange={handleChange}
                      icon={UserCheck}
                      placeholder="Ex: James, Suporte, Financeiro..."
                    />

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, onboarding_travado: !prev.onboarding_travado }))}
                      className={`w-full flex items-center justify-between gap-4 rounded-2xl border p-5 transition-all ${
                        form.onboarding_travado
                          ? 'bg-red-500/10 border-red-500/20 text-red-300'
                          : 'bg-[#050505] border-white/[0.05] text-neutral-300 hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">
                          Cliente travado
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          Marque quando a implantação estiver parada por pendência.
                        </p>
                      </div>

                      <div className={`w-14 h-7 rounded-full relative transition-colors ${form.onboarding_travado ? 'bg-red-500' : 'bg-neutral-800'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${form.onboarding_travado ? 'left-8' : 'left-1'}`} />
                      </div>
                    </button>

                    {form.onboarding_travado && (
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                          Motivo da trava
                        </label>
                        <textarea
                          name="onboarding_motivo_trava"
                          value={form.onboarding_motivo_trava}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Ex: Cliente ainda não enviou arte, pagamento não confirmado, hotspot pendente..."
                          className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner resize-none"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest">
                          Checklist de implantação
                        </label>

                        <span className="text-xs text-neutral-500 font-bold">
                          {calcularProgressoChecklist(form.onboarding_checklist).percentual}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {checklistLabels.map((item) => {
                          const ativo = Boolean(form.onboarding_checklist?.[item.key])

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => toggleChecklist(item.key)}
                              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                                ativo
                                  ? 'bg-[#6be12f]/10 border-[#6be12f]/20 text-[#8cf059]'
                                  : 'bg-[#050505] border-white/[0.05] text-neutral-500 hover:text-white hover:border-white/[0.1]'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${ativo ? 'bg-[#6be12f] border-[#6be12f]' : 'border-white/[0.12]'}`}>
                                {ativo && <Check size={13} className="text-black" />}
                              </div>

                              <span className="text-xs font-bold">
                                {item.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                        Observação interna
                      </label>
                      <textarea
                        name="onboarding_observacao"
                        value={form.onboarding_observacao}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Notas internas sobre implantação, pendências, próximos passos..."
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner resize-none"
                      />
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
                onClick={salvarCliente}
                disabled={
                  salvando ||
                  nomeEmpresarioError ||
                  nomeEmpresaError ||
                  nomeResponsavelError ||
                  telefoneError ||
                  cpfCnpjError ||
                  !form.nome.trim() ||
                  !form.nome_empresa.trim() ||
                  !form.nome_responsavel.trim() ||
                  !form.telefone.trim() ||
                  !form.cpf_cnpj.trim() ||
                  !form.email.trim()
                }
                className="flex-1 bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    {clienteSelecionado ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
              Excluir cliente?
            </h2>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
              Esta ação não pode ser desfeita. Todos os pagamentos e dados vinculados serão perdidos permanentemente.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirCliente(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:-translate-y-1"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {resetAccessInfo && (
  <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
    <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
      <div className="w-20 h-20 rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(107,225,47,0.15)]">
        <KeyRound size={32} className="text-[#6be12f]" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
        {resetAccessInfo.created ? 'Acesso criado' : 'Acesso resetado'}
      </h2>

      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
        Envie estes dados para o cliente acessar a área do cliente.
      </p>

      <div className="text-left rounded-2xl bg-[#050505] border border-white/[0.06] p-5 mb-6">
        <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-600 mb-2">
          E-mail
        </p>
        <p className="text-sm font-bold text-white break-words mb-5">
          {resetAccessInfo.email}
        </p>

        <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-600 mb-2">
          Senha inicial
        </p>
        <p className="text-lg font-extrabold text-[#8cf059] break-words">
          {resetAccessInfo.senha}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setResetAccessInfo(null)}
          className="py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
        >
          Fechar
        </button>

        <button
          onClick={copiarAcessoCliente}
          className="bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
        >
          <Copy size={16} />
          Copiar acesso
        </button>
      </div>
    </div>
  </div>
)}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
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

function SelectFiltro({ value, onChange, children }) {
  return (
    <div className="relative group/select">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer shadow-inner"
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  )
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  icon: Icon,
  error = '',
  type = 'text',
  maxLength,
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative group/input">
        {Icon && (
          <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full bg-[#050505] border border-white/[0.05] rounded-2xl ${Icon ? 'pl-12' : 'pl-5'} pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner`}
        />
      </div>
      {error && <p className="text-red-400 text-xs mt-2 font-medium">{error}</p>}
    </div>
  )
}
