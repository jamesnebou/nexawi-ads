'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Download,
  Edit3,
  FileText,
  Flame,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Search,
  Target,
  Thermometer,
  Users,
  XCircle,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const etapas = [
  { value: 'novo_lead', label: 'Novo lead' },
  { value: 'em_contato', label: 'Em contato' },
  { value: 'reuniao_agendada', label: 'Reunião agendada' },
  { value: 'proposta_enviada', label: 'Proposta enviada' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'cliente_fechado', label: 'Cliente fechado' },
  { value: 'perdido', label: 'Perdido' },
]

const temperaturas = ['Frio', 'Morno', 'Quente']

const etapaStyles = {
  novo_lead: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  em_contato: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  reuniao_agendada: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  proposta_enviada: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  negociacao: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  cliente_fechado: 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20',
  perdido: 'bg-red-500/10 text-red-300 border-red-500/20',
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
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function getEtapaLabel(value) {
  return etapas.find((item) => item.value === value)?.label || 'Novo lead'
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function CrmClientesPage() {
  const [clientes, setClientes] = useState([])
  const [prospects, setProspects] = useState([])
  const [resumo, setResumo] = useState({})
  const [resumoProspects, setResumoProspects] = useState({})
  const [permissions, setPermissions] = useState({})
  const [origens, setOrigens] = useState([])

  const [etapa, setEtapa] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [origem, setOrigem] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')

  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [savingId, setSavingId] = useState('')
  const [form, setForm] = useState({
    crm_etapa: 'novo_lead',
    crm_origem: 'Manual',
    crm_temperatura: 'Morno',
    crm_proximo_contato: '',
    crm_valor_potencial: '',
    crm_observacoes: '',
    crm_responsavel: '',
  })

  const canUpdate = permissions.update !== false
  const canExport = permissions.export !== false
  const temFiltros = Boolean(etapa) || Boolean(temperatura) || Boolean(origem) || Boolean(buscaAplicada)
  const totalRegistros = clientes.length + prospects.length

  useEffect(() => {
    carregarCrm()
  }, [etapa, temperatura, origem, buscaAplicada])

  async function carregarCrm() {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (etapa) params.set('etapa', etapa)
      if (temperatura) params.set('temperatura', temperatura)
      if (origem) params.set('origem', origem)
      if (buscaAplicada) params.set('busca', buscaAplicada)

      const queryString = params.toString()
      const [clientesData, prospectsData] = await Promise.all([
        adminApiFetch(`/api/admin/clientes-crm?${queryString}`),
        adminApiFetch(`/api/admin/crm-prospects?${queryString}`),
      ])

      const origensUnicas = [
        ...new Set([
          ...(clientesData.options?.origens || []),
          ...(prospectsData.options?.origens || []),
        ].filter(Boolean)),
      ].sort()

      setClientes(clientesData.clientes || [])
      setProspects(prospectsData.prospects || [])
      setResumo(clientesData.resumo || {})
      setResumoProspects(prospectsData.resumo || {})
      setPermissions(clientesData.permissions || prospectsData.permissions || {})
      setOrigens(origensUnicas)
    } catch (error) {
      console.error('Erro ao carregar CRM clientes:', error)
      toast.error(error.message || 'Erro ao carregar CRM.')
    } finally {
      setLoading(false)
    }
  }

  function aplicarBusca(e) {
    e.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  function limparFiltros() {
    setEtapa('')
    setTemperatura('')
    setOrigem('')
    setBusca('')
    setBuscaAplicada('')
  }

  function editarCliente(cliente) {
    setEditingId(`cliente:${cliente.id}`)
    setForm({
      crm_etapa: cliente.crm_etapa || 'novo_lead',
      crm_origem: cliente.crm_origem || 'Manual',
      crm_temperatura: cliente.crm_temperatura || 'Morno',
      crm_proximo_contato: cliente.crm_proximo_contato || '',
      crm_valor_potencial: cliente.crm_valor_potencial || '',
      crm_observacoes: cliente.crm_observacoes || '',
      crm_responsavel: cliente.crm_responsavel || '',
    })
  }

  function cancelarEdicao() {
    setEditingId('')
    setSavingId('')
  }

  async function salvarCliente(clienteId) {
    if (!canUpdate) {
      toast.error('Você não tem permissão para atualizar clientes.')
      return
    }

    setSavingId(`cliente:${clienteId}`)

    try {
      const data = await adminApiFetch('/api/admin/clientes-crm', {
        method: 'PATCH',
        body: {
          id: clienteId,
          ...form,
        },
      })

      setClientes((current) =>
        current.map((cliente) =>
          cliente.id === clienteId ? { ...cliente, ...data.cliente } : cliente
        )
      )

      toast.success('CRM atualizado com sucesso.')
      cancelarEdicao()
      carregarCrm()
    } catch (error) {
      console.error('Erro ao salvar CRM:', error)
      toast.error(error.message || 'Erro ao salvar CRM.')
    } finally {
      setSavingId('')
    }
  }

  function editarProspect(prospect) {
    setEditingId(`prospect:${prospect.id}`)
    setForm({
      crm_etapa: prospect.etapa || 'novo_lead',
      crm_origem: prospect.origem || 'Landing Page',
      crm_temperatura: prospect.temperatura || 'Quente',
      crm_proximo_contato: prospect.proximo_contato || '',
      crm_valor_potencial: prospect.valor_potencial || '',
      crm_observacoes: prospect.observacoes || '',
      crm_responsavel: prospect.responsavel_interno || '',
    })
  }

  async function salvarProspect(prospectId) {
    if (!canUpdate) {
      toast.error('Voce nao tem permissao para atualizar prospects.')
      return
    }

    const prospect = prospects.find((item) => item.id === prospectId)

    if (!prospect) {
      toast.error('Prospect nao encontrado.')
      return
    }

    setSavingId(`prospect:${prospectId}`)

    try {
      const data = await adminApiFetch('/api/admin/crm-prospects', {
        method: 'PATCH',
        body: {
          id: prospectId,
          empresa: prospect.empresa,
          responsavel: prospect.responsavel,
          email: prospect.email,
          telefone: prospect.telefone,
          cidade: prospect.cidade,
          segmento: prospect.segmento,
          etapa: form.crm_etapa,
          origem: form.crm_origem,
          temperatura: form.crm_temperatura,
          proximo_contato: form.crm_proximo_contato,
          valor_potencial: form.crm_valor_potencial,
          observacoes: form.crm_observacoes,
          responsavel_interno: form.crm_responsavel,
        },
      })

      setProspects((current) =>
        current.map((item) =>
          item.id === prospectId ? { ...item, ...data.prospect } : item
        )
      )

      toast.success('Prospect atualizado com sucesso.')
      cancelarEdicao()
      carregarCrm()
    } catch (error) {
      console.error('Erro ao salvar prospect:', error)
      toast.error(error.message || 'Erro ao salvar prospect.')
    } finally {
      setSavingId('')
    }
  }

  function exportarCSV() {
    if (!canExport) {
      toast.error('Você não tem permissão para exportar.')
      return
    }

    if (totalRegistros === 0) {
      toast.error('Nenhum registro para exportar.')
      return
    }

    const linhas = [
      ['Tipo', 'Empresa', 'Responsável', 'E-mail', 'Telefone', 'Cidade', 'Segmento', 'Etapa', 'Origem', 'Temperatura', 'Próximo contato', 'Valor potencial', 'Responsável interno', 'Observações'],
      ...clientes.map((cliente) => [
        'Cliente',
        cliente.nome_empresa || '',
        cliente.nome_responsavel || cliente.nome || '',
        cliente.email || '',
        cliente.telefone || '',
        cliente.cidade || '',
        '',
        getEtapaLabel(cliente.crm_etapa),
        cliente.crm_origem || '',
        cliente.crm_temperatura || '',
        formatDate(cliente.crm_proximo_contato),
        Number(cliente.crm_valor_potencial || 0),
        cliente.crm_responsavel || '',
        cliente.crm_observacoes || '',
      ]),
      ...prospects.map((prospect) => [
        'Prospect landing',
        prospect.empresa || '',
        prospect.responsavel || '',
        prospect.email || '',
        prospect.telefone || '',
        prospect.cidade || '',
        prospect.segmento || '',
        getEtapaLabel(prospect.etapa),
        prospect.origem || '',
        prospect.temperatura || '',
        formatDate(prospect.proximo_contato),
        Number(prospect.valor_potencial || 0),
        prospect.responsavel_interno || '',
        prospect.observacoes || '',
      ]),
    ]

    const csvContent = '\uFEFF' + linhas.map((linha) => linha.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `crm_clientes_nexawi_${new Date().toISOString().slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const cards = [
    { label: 'CRM total', value: totalRegistros, detail: 'clientes e leads', icon: Users, accent: 'text-[#8cf059]' },
    { label: 'Landing', value: prospects.length, detail: 'captados em /anunciar', icon: Target, accent: 'text-blue-300' },
    { label: 'Novos leads', value: (resumo.novos || 0) + (resumoProspects.novos || 0), detail: 'entraram no CRM', icon: Target, accent: 'text-blue-300' },
    { label: 'Em contato', value: (resumo.emContato || 0) + (resumoProspects.emContato || 0), detail: 'conversa iniciada', icon: Phone, accent: 'text-cyan-300' },
    { label: 'Follow-ups', value: (resumo.proximosContatos || 0) + (resumoProspects.proximosContatos || 0), detail: 'proximos 7 dias', icon: CalendarDays, accent: 'text-orange-300' },
    { label: 'Fechados', value: (resumo.fechados || 0) + (resumoProspects.fechados || 0), detail: 'viraram cliente', icon: CheckCircle2, accent: 'text-[#8cf059]' },
    { label: 'Valor potencial', value: formatCurrency((resumo.valorPotencial || 0) + (resumoProspects.valorPotencial || 0)), detail: 'pipeline estimado', icon: DollarSign, accent: 'text-purple-300', currency: true },
  ]

  return (
    <>
      <Toaster position="top-right" />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <header className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <Building2 size={13} />
              CRM Clientes
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              CRM de clientes e prospects
            </h1>

            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Controle empresas vindas do tráfego, acompanhe negociações e organize o funil comercial da NexaWi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {canExport && (
              <button
                type="button"
                onClick={exportarCSV}
                disabled={totalRegistros === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white transition-all hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={17} />
                Exportar CSV
              </button>
            )}

            <button
              type="button"
              onClick={carregarCrm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black transition-all hover:bg-[#8cf059]"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </header>

        <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500">
                  {card.label}
                </p>
                <div className="rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-2.5">
                  <card.icon size={18} className={card.accent} />
                </div>
              </div>

              <p className={`${card.currency ? 'text-2xl' : 'text-4xl'} font-light text-white truncate`}>
                {card.currency ? card.value : formatNumber(card.value)}
              </p>

              <p className="text-xs text-neutral-500 mt-2 truncate">
                {card.detail}
              </p>
            </div>
          ))}
        </section>

        <section className="relative z-10 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1fr_1.4fr_auto] gap-4 items-end">
            <FilterSelect
              label="Etapa"
              icon={Target}
              value={etapa}
              onChange={setEtapa}
              options={[{ value: '', label: 'Todas as etapas' }, ...etapas]}
            />

            <FilterSelect
              label="Temperatura"
              icon={Thermometer}
              value={temperatura}
              onChange={setTemperatura}
              options={[{ value: '', label: 'Todas' }, ...temperaturas.map((item) => ({ value: item, label: item }))]}
            />

            <FilterSelect
              label="Origem"
              icon={Flame}
              value={origem}
              onChange={setOrigem}
              options={[{ value: '', label: 'Todas as origens' }, ...origens.map((item) => ({ value: item, label: item }))]}
            />

            <form onSubmit={aplicarBusca}>
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
                <Search size={13} className="text-[#6be12f]" />
                Buscar empresa
              </span>

              <div className="flex gap-2">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Empresa, responsável, e-mail ou telefone..."
                  className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none"
                />

                <button
                  type="submit"
                  className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-5 text-sm font-bold text-white hover:bg-white/[0.07] transition-colors"
                >
                  Buscar
                </button>
              </div>
            </form>

            {temFiltros && (
              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                Limpar
              </button>
            )}
          </div>
        </section>

        <KanbanCrmPreview
          clientes={[
            ...prospects.map((prospect) => ({
              id: `prospect:${prospect.id}`,
              nome_empresa: prospect.empresa,
              nome_responsavel: prospect.responsavel,
              crm_etapa: prospect.etapa,
              crm_temperatura: prospect.temperatura,
              crm_valor_potencial: prospect.valor_potencial,
              crm_proximo_contato: prospect.proximo_contato,
            })),
            ...clientes,
          ]}
          onSelectEtapa={setEtapa}
        />

        <section className="relative z-10 rounded-[2rem] border border-[#6be12f]/10 bg-[#6be12f]/[0.03] p-5 sm:p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-3">
                <Target size={13} />
                Landing Page
              </div>

              <h2 className="text-xl font-black text-white tracking-tight">
                Leads captados pela pagina /anunciar
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                {formatNumber(prospects.length)} prospect(s) vindos do formulario publico.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-10 text-center">
              <Target size={30} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhum lead da landing ainda</h3>
              <p className="text-sm text-neutral-500 mt-2">Quando alguem preencher /anunciar, o registro aparece aqui automaticamente.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {prospects.map((prospect) => (
                <ProspectCrmCard
                  key={prospect.id}
                  prospect={prospect}
                  canUpdate={canUpdate}
                  isEditing={editingId === `prospect:${prospect.id}`}
                  isSaving={savingId === `prospect:${prospect.id}`}
                  form={form}
                  setForm={setForm}
                  onEdit={() => editarProspect(prospect)}
                  onCancel={cancelarEdicao}
                  onSave={() => salvarProspect(prospect.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="relative z-10 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Pipeline comercial
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {formatNumber(clientes.length)} empresa(s) encontradas
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
              <Building2 size={34} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhum prospect encontrado</h3>
              <p className="text-sm text-neutral-500 mt-2">Ajuste os filtros ou cadastre novas empresas na aba Clientes.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {clientes.map((cliente) => (
                <ClienteCrmCard
                  key={cliente.id}
                  cliente={cliente}
                  canUpdate={canUpdate}
                  isEditing={editingId === `cliente:${cliente.id}`}
                  isSaving={savingId === `cliente:${cliente.id}`}
                  form={form}
                  setForm={setForm}
                  onEdit={() => editarCliente(cliente)}
                  onCancel={cancelarEdicao}
                  onSave={() => salvarCliente(cliente.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function KanbanCrmPreview({ clientes = [], onSelectEtapa }) {
  const total = clientes.length

  const columns = etapas.map((etapa) => {
    const items = clientes.filter((cliente) => cliente.crm_etapa === etapa.value)

    return {
      ...etapa,
      count: items.length,
      items: items.slice(0, 4),
    }
  })

  return (
    <section className="relative z-10 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 mb-8">
      {/* KANBAN_CRM_CLIENTES_PATCH */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-3">
            <Target size={13} />
            Funil comercial
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            Visão Kanban dos prospects
          </h2>

          <p className="text-sm text-neutral-500 mt-1">
            {formatNumber(total)} empresa(s) distribuídas por etapa comercial.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
        {columns.map((column) => (
          <div
            key={column.value}
            className="rounded-3xl border border-white/[0.05] bg-[#050505] p-4 min-h-[220px]"
          >
            <button
              type="button"
              onClick={() => onSelectEtapa(column.value)}
              className="w-full flex items-start justify-between gap-3 text-left mb-4"
            >
              <div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${etapaStyles[column.value] || etapaStyles.novo_lead}`}>
                  {column.label}
                </span>

                <p className="text-xs text-neutral-500 mt-2">
                  {formatNumber(column.count)} empresa(s)
                </p>
              </div>
            </button>

            {column.items.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 text-center">
                <p className="text-xs text-neutral-600">
                  Sem prospects nesta etapa.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {column.items.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="rounded-2xl border border-white/[0.05] bg-black/30 p-3"
                  >
                    <p className="text-sm font-black text-white truncate">
                      {cliente.nome_empresa || 'Empresa sem nome'}
                    </p>

                    <p className="text-[11px] text-neutral-500 truncate mt-1">
                      {cliente.nome_responsavel || cliente.nome || 'Sem responsável'}
                    </p>

                    <div className="mt-3 grid gap-1.5 text-[11px] text-neutral-500">
                      <span>
                        Temp.: <strong className="text-white">{cliente.crm_temperatura || 'Morno'}</strong>
                      </span>

                      <span>
                        Valor: <strong className="text-white">{formatCurrency(cliente.crm_valor_potencial || 0)}</strong>
                      </span>

                      <span>
                        Próx.: <strong className="text-white">{formatDate(cliente.crm_proximo_contato)}</strong>
                      </span>
                    </div>
                  </div>
                ))}

                {column.count > column.items.length && (
                  <button
                    type="button"
                    onClick={() => onSelectEtapa(column.value)}
                    className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    Ver todos desta etapa
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function FilterSelect({ label, icon: Icon, value, onChange, options }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
        <Icon size={13} className="text-[#6be12f]" />
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none"
      >
        {options.map((item) => (
          <option key={item.value || item.label} value={item.value} className="bg-[#0a0a0a]">
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function EtapaBadge({ etapa }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${etapaStyles[etapa] || etapaStyles.novo_lead}`}>
      {getEtapaLabel(etapa)}
    </span>
  )
}

function ClienteCrmCard({ cliente, canUpdate, isEditing, isSaving, form, setForm, onEdit, onCancel, onSave }) {
  return (
    <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5 hover:border-[#6be12f]/20 transition-colors">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.3fr_1.2fr_1fr_auto] gap-5 items-center">
        <div>
          <div className="mb-2">
            <EtapaBadge etapa={cliente.crm_etapa} />
          </div>

          <p className="text-base font-black text-white truncate">
            {cliente.nome_empresa || 'Empresa sem nome'}
          </p>

          <p className="text-xs text-neutral-500 mt-1 truncate">
            {cliente.nome_responsavel || cliente.nome || 'Responsável não informado'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoPill icon={Phone} label="Telefone" value={cliente.telefone || '—'} />
          <InfoPill icon={Mail} label="E-mail" value={cliente.email || '—'} />
        </div>

        <div className="grid gap-2 text-xs text-neutral-500">
          <p>Origem: {cliente.crm_origem || 'Manual'}</p>
          <p>Temperatura: {cliente.crm_temperatura || 'Morno'}</p>
          <p>Potencial: {formatCurrency(cliente.crm_valor_potencial || 0)}</p>
        </div>

        <div className="grid gap-2 text-xs text-neutral-500">
          <p>Próximo: {formatDate(cliente.crm_proximo_contato)}</p>
          <p>Resp.: {cliente.crm_responsavel || '—'}</p>
          {cliente.crm_observacoes && <p className="line-clamp-2">{cliente.crm_observacoes}</p>}
        </div>

        <div className="grid gap-2">
          <a
            href={`/dashboard/contratos/gerar?source=cliente&id=${cliente.id}`}
            className="rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059] hover:bg-[#6be12f]/15 transition-colors flex items-center justify-center gap-2"
          >
            <FileText size={15} />
            Contrato
          </a>

          {canUpdate && (
            <button
              type="button"
              onClick={isEditing ? onCancel : onEdit}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-black text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2"
            >
              {isEditing ? <XCircle size={15} /> : <Edit3 size={15} />}
              {isEditing ? 'Fechar' : 'Editar'}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mt-5 rounded-3xl border border-[#6be12f]/15 bg-[#6be12f]/5 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <FieldSelect label="Etapa" value={form.crm_etapa} onChange={(value) => setForm((current) => ({ ...current, crm_etapa: value }))} options={etapas} />
            <FieldSelect label="Temperatura" value={form.crm_temperatura} onChange={(value) => setForm((current) => ({ ...current, crm_temperatura: value }))} options={temperaturas.map((item) => ({ value: item, label: item }))} />
            <FieldInput label="Origem" value={form.crm_origem} onChange={(value) => setForm((current) => ({ ...current, crm_origem: value }))} placeholder="Instagram, Google, indicação..." />
            <FieldInput label="Valor potencial" type="number" value={form.crm_valor_potencial} onChange={(value) => setForm((current) => ({ ...current, crm_valor_potencial: value }))} placeholder="650" />
            <FieldInput label="Próximo contato" type="date" value={form.crm_proximo_contato} onChange={(value) => setForm((current) => ({ ...current, crm_proximo_contato: value }))} />
            <FieldInput label="Responsável interno" value={form.crm_responsavel} onChange={(value) => setForm((current) => ({ ...current, crm_responsavel: value }))} placeholder="James, comercial..." />
            <div className="lg:col-span-2">
              <FieldInput label="Observações" value={form.crm_observacoes} onChange={(value) => setForm((current) => ({ ...current, crm_observacoes: value }))} placeholder="Ex: pediu proposta, quer anunciar em Barueri..." />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="w-full rounded-2xl bg-[#6be12f] px-5 py-3.5 text-sm font-black text-black hover:bg-[#8cf059] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar CRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProspectCrmCard({ prospect, canUpdate, isEditing, isSaving, form, setForm, onEdit, onCancel, onSave }) {
  return (
    <div className="rounded-3xl border border-[#6be12f]/10 bg-[#050505] p-5 hover:border-[#6be12f]/25 transition-colors">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.3fr_1.2fr_1fr_auto] gap-5 items-center">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <EtapaBadge etapa={prospect.etapa} />
            <span className="inline-flex items-center rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#8cf059]">
              Landing
            </span>
          </div>

          <p className="text-base font-black text-white truncate">
            {prospect.empresa || 'Empresa sem nome'}
          </p>

          <p className="text-xs text-neutral-500 mt-1 truncate">
            {prospect.responsavel || 'Responsavel nao informado'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoPill icon={Phone} label="Telefone" value={prospect.telefone || '-'} />
          <InfoPill icon={Mail} label="E-mail" value={prospect.email || '-'} />
        </div>

        <div className="grid gap-2 text-xs text-neutral-500">
          <p>Cidade: {prospect.cidade || '-'}</p>
          <p>Segmento: {prospect.segmento || '-'}</p>
          <p>Origem: {prospect.origem || 'Landing Page'}</p>
        </div>

        <div className="grid gap-2 text-xs text-neutral-500">
          <p>Temp.: {prospect.temperatura || 'Quente'}</p>
          <p>Proximo: {formatDate(prospect.proximo_contato)}</p>
          <p>Resp.: {prospect.responsavel_interno || '-'}</p>
          {prospect.observacoes && <p className="line-clamp-2">{prospect.observacoes}</p>}
        </div>

        {canUpdate && (
          <button
            type="button"
            onClick={isEditing ? onCancel : onEdit}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-black text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2"
          >
            {isEditing ? <XCircle size={15} /> : <Edit3 size={15} />}
            {isEditing ? 'Fechar' : 'Editar'}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="mt-5 rounded-3xl border border-[#6be12f]/15 bg-[#6be12f]/5 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <FieldSelect label="Etapa" value={form.crm_etapa} onChange={(value) => setForm((current) => ({ ...current, crm_etapa: value }))} options={etapas} />
            <FieldSelect label="Temperatura" value={form.crm_temperatura} onChange={(value) => setForm((current) => ({ ...current, crm_temperatura: value }))} options={temperaturas.map((item) => ({ value: item, label: item }))} />
            <FieldInput label="Origem" value={form.crm_origem} onChange={(value) => setForm((current) => ({ ...current, crm_origem: value }))} placeholder="Landing Page, indicacao..." />
            <FieldInput label="Valor potencial" type="number" value={form.crm_valor_potencial} onChange={(value) => setForm((current) => ({ ...current, crm_valor_potencial: value }))} placeholder="650" />
            <FieldInput label="Proximo contato" type="date" value={form.crm_proximo_contato} onChange={(value) => setForm((current) => ({ ...current, crm_proximo_contato: value }))} />
            <FieldInput label="Responsavel interno" value={form.crm_responsavel} onChange={(value) => setForm((current) => ({ ...current, crm_responsavel: value }))} placeholder="James, comercial..." />
            <div className="lg:col-span-2">
              <FieldInput label="Observacoes" value={form.crm_observacoes} onChange={(value) => setForm((current) => ({ ...current, crm_observacoes: value }))} placeholder="Ex: pediu proposta, quer anunciar em Barueri..." />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="w-full rounded-2xl bg-[#6be12f] px-5 py-3.5 text-sm font-black text-black hover:bg-[#8cf059] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar prospect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none">
        {options.map((item) => <option key={item.value} value={item.value} className="bg-[#0a0a0a]">{item.label}</option>)}
      </select>
    </label>
  )
}

function FieldInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">{label}</span>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none" />
    </label>
  )
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600 flex items-center gap-2 mb-1">
        <Icon size={12} className="text-[#6be12f]" />
        {label}
      </p>
      <p className="text-sm font-bold text-white break-all">{value}</p>
    </div>
  )
}
