'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  CalendarDays,
  Download,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Building2,
  XCircle,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const periodos = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_7', label: 'Últimos 7 dias' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'todos', label: 'Todo período' },
]

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

function formatDateTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function getClienteLabel(cliente = {}) {
  return cliente.nome_empresa || cliente.nome || cliente.email || 'Cliente sem nome'
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([])
  const [anuncios, setAnuncios] = useState([])
  const [clientes, setClientes] = useState([])
  const [permissions, setPermissions] = useState({})
  const [resumo, setResumo] = useState({
    total: 0,
    hoje: 0,
    mes: 0,
    origemPrincipal: null,
  })

  const [periodo, setPeriodo] = useState('todos')
  const [clienteId, setClienteId] = useState('')
  const [anuncioId, setAnuncioId] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [loading, setLoading] = useState(true)

  const clienteSelecionado = useMemo(() => {
    return clientes.find((item) => item.id === clienteId)
  }, [clientes, clienteId])

  const anuncioSelecionado = useMemo(() => {
    return anuncios.find((item) => item.id === anuncioId)
  }, [anuncios, anuncioId])

  const temFiltros = periodo !== 'todos' || Boolean(clienteId) || Boolean(anuncioId) || Boolean(buscaAplicada)
  const canExport = permissions.export !== false

  useEffect(() => {
    carregarLeads()
  }, [periodo, clienteId, anuncioId, buscaAplicada])

  async function carregarLeads() {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodo)

      if (clienteId) params.set('clienteId', clienteId)
      if (anuncioId) params.set('anuncioId', anuncioId)
      if (buscaAplicada) params.set('busca', buscaAplicada)

      const data = await adminApiFetch(`/api/admin/leads-premium?${params.toString()}`)

      setLeads(data.leads || [])
      setAnuncios(data.anuncios || [])
      setClientes(data.clientes || [])
      setPermissions(data.permissions || {})
      setResumo(data.resumo || {
        total: 0,
        hoje: 0,
        mes: 0,
        origemPrincipal: null,
      })

      if (clienteId && anuncioId) {
        const anuncioExiste = (data.anuncios || []).some((ad) => ad.id === anuncioId)

        if (!anuncioExiste) {
          setAnuncioId('')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar leads admin:', error)
      toast.error(error.message || 'Erro ao carregar leads.')
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setPeriodo('todos')
    setClienteId('')
    setAnuncioId('')
    setBusca('')
    setBuscaAplicada('')
  }

  function exportarCSV() {
    if (!canExport) {
      toast.error('Você não tem permissão para exportar leads.')
      return
    }

    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar.')
      return
    }

    const linhas = [
      ['Cliente', 'Nome', 'Telefone', 'E-mail', 'Campanha', 'Hotspot', 'Data'],
      ...leads.map((lead) => [
        getClienteLabel(lead.clientes),
        lead.nome || '',
        lead.telefone || '',
        lead.email || '',
        lead.anuncios?.titulo || '',
        lead.hotspots?.nome || '',
        formatDateTime(lead.created_at),
      ]),
    ]

    const csvContent = '\uFEFF' + linhas
      .map((linha) => linha.map(csvCell).join(';'))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `leads_admin_nexawi_${new Date().toISOString().slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  function aplicarBusca(e) {
    e.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  const cards = [
    {
      label: 'Total de leads',
      value: resumo.total,
      detail: 'no filtro atual',
      icon: Users,
      accent: 'text-[#8cf059]',
    },
    {
      label: 'Leads hoje',
      value: resumo.hoje,
      detail: 'capturados hoje',
      icon: TrendingUp,
      accent: 'text-cyan-400',
    },
    {
      label: 'Leads no mês',
      value: resumo.mes,
      detail: 'mês atual',
      icon: CalendarDays,
      accent: 'text-orange-400',
    },
    {
      label: 'Origem principal',
      value: resumo.origemPrincipal?.total || 0,
      detail: resumo.origemPrincipal?.titulo || 'Sem origem dominante',
      icon: Megaphone,
      accent: 'text-purple-400',
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
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none" />

        <header className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <Users size={13} />
              Central de leads
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Leads capturados
            </h1>

            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Consulte, filtre e exporte os contatos capturados em todos os clientes da rede NexaWi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {canExport && (
              <button
                type="button"
                onClick={exportarCSV}
                disabled={leads.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white transition-all hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={17} />
                Exportar CSV
              </button>
            )}

            <button
              type="button"
              onClick={carregarLeads}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black transition-all hover:bg-[#8cf059] shadow-[0_0_25px_rgba(107,225,47,0.18)]"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </header>

        <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
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

              <p className="text-4xl font-light text-white">
                {formatNumber(card.value)}
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
              label="Período"
              icon={CalendarDays}
              value={periodo}
              onChange={setPeriodo}
              options={periodos.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />

            <FilterSelect
              label="Cliente"
              icon={Building2}
              value={clienteId}
              onChange={(value) => {
                setClienteId(value)
                setAnuncioId('')
              }}
              options={[
                { value: '', label: 'Todos os clientes' },
                ...clientes.map((cliente) => ({
                  value: cliente.id,
                  label: getClienteLabel(cliente),
                })),
              ]}
            />

            <FilterSelect
              label="Campanha"
              icon={Megaphone}
              value={anuncioId}
              onChange={setAnuncioId}
              options={[
                { value: '', label: 'Todas as campanhas' },
                ...anuncios.map((ad) => ({
                  value: ad.id,
                  label: ad.titulo || 'Anúncio sem título',
                })),
              ]}
            />

            <form onSubmit={aplicarBusca}>
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
                <Search size={13} className="text-[#6be12f]" />
                Buscar lead
              </span>

              <div className="flex gap-2">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome, e-mail ou telefone..."
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

          {temFiltros && (
            <div className="mt-5 flex flex-wrap gap-2">
              {periodo !== 'todos' && (
                <Badge label="Período" value={periodos.find((item) => item.value === periodo)?.label || periodo} />
              )}
              {clienteSelecionado && (
                <Badge label="Cliente" value={getClienteLabel(clienteSelecionado)} />
              )}
              {anuncioSelecionado && (
                <Badge label="Campanha" value={anuncioSelecionado.titulo || 'Anúncio'} />
              )}
              {buscaAplicada && (
                <Badge label="Busca" value={buscaAplicada} />
              )}
            </div>
          )}
        </section>

        <section className="relative z-10 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Lista de contatos
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {formatNumber(leads.length)} lead(s) encontrados
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
              <Users size={34} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhum lead encontrado</h3>
              <p className="text-sm text-neutral-500 mt-2">
                Ajuste os filtros ou aguarde novas capturas no portal.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </section>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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

function Badge({ label, value }) {
  return (
    <span className="rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs text-[#8cf059]">
      <strong>{label}:</strong> {value}
    </span>
  )
}

function LeadCard({ lead }) {
  return (
    <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5 hover:border-[#6be12f]/20 transition-colors">
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr_1.1fr_1fr] gap-5 items-center">
        <div>
          <p className="text-base font-black text-white truncate">
            {lead.nome || 'Lead sem nome'}
          </p>

          <p className="text-xs text-neutral-500 mt-1">
            Capturado em {formatDateTime(lead.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ContactPill icon={Phone} label="Telefone" value={lead.telefone || '—'} />
          <ContactPill icon={Mail} label="E-mail" value={lead.email || '—'} />
        </div>

        <div className="grid gap-2">
          <SmallInfo icon={Building2} value={getClienteLabel(lead.clientes)} />
          <SmallInfo icon={Megaphone} value={lead.anuncios?.titulo || 'Campanha NexaWi'} />
        </div>

        <div className="grid gap-2">
          <SmallInfo icon={MapPin} value={lead.hotspots?.nome || 'Hotspot'} />
        </div>
      </div>
    </div>
  )
}

function ContactPill({ icon: Icon, label, value }) {
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

function SmallInfo({ icon: Icon, value }) {
  return (
    <p className="text-xs text-neutral-500 flex items-center gap-2 min-w-0">
      <Icon size={13} className="text-[#6be12f] flex-shrink-0" />
      <span className="truncate">{value}</span>
    </p>
  )
}
