'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { BarChart2, Building2, CalendarDays, Eye, MousePointerClick, RefreshCw, UserPlus, Wifi, Megaphone } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const periodos = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_7', label: 'Últimos 7 dias' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'todos', label: 'Todo o período' },
]

async function adminApiFetch(path) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão não encontrada. Faça login novamente.')
  }

  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao carregar dashboard do anunciante.')
  }

  return data
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function getEmpresaOptions(data) {
  return (data?.empresaScope?.empresas || [])
    .map((item) => ({
      value: item.empresa_id,
      label: item.empresa?.nome_empresa || item.nome || item.email || 'Empresa sem nome',
    }))
    .filter((item) => item.value)
}

export default function DashboardAnunciantePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('ultimos_30')
  const [empresaId, setEmpresaId] = useState('')

  const empresaOptions = useMemo(() => getEmpresaOptions(data), [data])

  useEffect(() => {
    carregar({ periodoAtual: periodo, empresaAtual: empresaId })
  }, [])

  async function carregar({ periodoAtual = periodo, empresaAtual = empresaId } = {}) {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodoAtual)
      if (empresaAtual) params.set('empresa_id', empresaAtual)

      const result = await adminApiFetch(`/api/admin/dashboard-anunciante?${params.toString()}`)
      const activeEmpresaId = result?.empresaScope?.activeEmpresaId || result?.empresa?.id || ''

      setData(result)
      setPeriodo(result?.periodo || periodoAtual)

      if (activeEmpresaId && activeEmpresaId !== empresaId) {
        setEmpresaId(activeEmpresaId)
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard do anunciante:', error)
      toast.error(error.message || 'Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }

  function handleChangeEmpresa(value) {
    setEmpresaId(value)
    carregar({ periodoAtual: periodo, empresaAtual: value })
  }

  function handleChangePeriodo(value) {
    setPeriodo(value)
    carregar({ periodoAtual: value, empresaAtual: empresaId })
  }

  const resumo = data?.resumo || {}
  const empresa = data?.empresa || {}
  const semEmpresaAtiva = Boolean(data?.semEmpresaAtiva)

  return (
    <>
      <Toaster position="top-right" />
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <Building2 size={13} />
              Dashboard do anunciante
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {empresa.nome_empresa || 'Minha empresa'}
            </h1>

            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Acompanhe campanhas, hotspots, leads, visualizações, cliques e CTR da empresa selecionada.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            {empresaOptions.length > 0 && (
              <label className="min-w-[240px]">
                <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
                  <Building2 size={13} className="text-[#6be12f]" />
                  Empresa
                </span>
                <select
                  value={empresaId}
                  onChange={(event) => handleChangeEmpresa(event.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-bold rounded-2xl block px-5 py-3.5 outline-none"
                >
                  {empresaOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="min-w-[190px]">
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
                <CalendarDays size={13} className="text-[#6be12f]" />
                Período
              </span>
              <select
                value={periodo}
                onChange={(event) => handleChangePeriodo(event.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-bold rounded-2xl block px-5 py-3.5 outline-none"
              >
                {periodos.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button onClick={() => carregar()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-3.5 text-sm font-extrabold text-black hover:bg-[#8cf059]">
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-24 flex items-center justify-center"><div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" /></div>
        ) : !data ? (
          <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
            <h3 className="text-lg font-bold text-white">Não foi possível carregar o dashboard</h3>
            <p className="text-sm text-neutral-500 mt-2">Verifique se este usuário está vinculado a uma empresa.</p>
          </div>
        ) : semEmpresaAtiva ? (
          <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
            <Building2 size={34} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-lg font-bold text-white">Nenhuma empresa ativa encontrada</h3>
            <p className="text-sm text-neutral-500 mt-2">Vincule este usuário a uma empresa ou crie uma empresa em /dashboard/empresas.</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-5 mb-8">
              <KpiCard icon={Megaphone} label="Campanhas" value={resumo.campanhas} detail={`${formatNumber(resumo.campanhasAtivas)} ativa(s)`} />
              <KpiCard icon={Wifi} label="Hotspots" value={resumo.hotspots} detail="pontos vinculados" />
              <KpiCard icon={UserPlus} label="Leads" value={resumo.leads} detail="capturados" />
              <KpiCard icon={Eye} label="Visualizações" value={resumo.visualizacoes} detail="impressões" />
              <KpiCard icon={MousePointerClick} label="Cliques" value={resumo.cliques} detail="ações no CTA" />
              <KpiCard icon={UserPlus} label="Usuários únicos" value={resumo.usuariosUnicos} detail="por IP/sessão" />
              <KpiCard icon={BarChart2} label="CTR" value={formatPercent(resumo.ctr)} detail="cliques/views" isText />
            </section>

            {data?.qualidadeDados?.usaFallbackHistorico && (
              <div className="mb-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
                Parte dos dados antigos foi estimada por vínculo histórico. Os novos eventos já usam hotspot_id e empresa_id reais.
              </div>
            )}

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <Panel title="Campanhas" subtitle="Performance por anúncio">
                {(data.campanhas || []).length === 0 ? (
                  <Empty text="Nenhuma campanha vinculada a esta empresa." />
                ) : (
                  <div className="grid gap-3">
                    {data.campanhas.map((campanha) => (
                      <div key={campanha.id} className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <h3 className="text-base font-black text-white">{campanha.titulo}</h3>
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{campanha.descricao || 'Sem descrição'}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${campanha.ativo !== false ? 'bg-[#6be12f]/10 text-[#8cf059]' : 'bg-red-500/10 text-red-300'}`}>
                            {campanha.ativo !== false ? 'Ativa' : 'Pausada'}
                          </span>
                        </div>
                        <MetricGrid metricas={campanha.metricas} />
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Hotspots" subtitle="Locais onde a marca aparece">
                {(data.hotspots || []).length === 0 ? (
                  <Empty text="Nenhum hotspot vinculado a esta empresa." />
                ) : (
                  <div className="grid gap-3">
                    {data.hotspots.map((hotspot) => (
                      <div key={hotspot.id} className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5">
                        <h3 className="text-base font-black text-white">{hotspot.nome}</h3>
                        <p className="text-xs text-neutral-500 mt-1">{hotspot.cidade || 'Cidade não informada'} {hotspot.estado ? `/${hotspot.estado}` : ''}</p>
                        <div className="mt-4"><MetricGrid metricas={hotspot.metricas} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </section>

            <Panel title="Leads recentes" subtitle="Últimos cadastros capturados no portal">
              {(data.leadsRecentes || []).length === 0 ? (
                <Empty text="Nenhum lead capturado ainda." />
              ) : (
                <div className="grid gap-3">
                  {data.leadsRecentes.map((lead) => (
                    <div key={lead.id} className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <p className="text-sm font-black text-white">{lead.nome || 'Sem nome'}</p>
                      <p className="text-xs text-neutral-500">{lead.email || 'Sem e-mail'}</p>
                      <p className="text-xs text-neutral-500">{lead.telefone || 'Sem telefone'}</p>
                      <p className="text-xs text-neutral-600">{lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </>
  )
}

function KpiCard({ icon: Icon, label, value, detail, isText = false }) {
  return (
    <div className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500">{label}</p>
        <Icon size={18} className="text-[#8cf059]" />
      </div>
      <p className={`${isText ? 'text-3xl' : 'text-4xl'} font-light text-white`}>{isText ? value : formatNumber(value)}</p>
      <p className="text-xs text-neutral-500 mt-2">{detail}</p>
    </div>
  )
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function MetricGrid({ metricas = {} }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <SmallMetric label="Views" value={metricas.visualizacoes} />
      <SmallMetric label="Cliques" value={metricas.cliques} />
      <SmallMetric label="Leads" value={metricas.leads} />
      <SmallMetric label="Únicos" value={metricas.usuarios_unicos} />
      <SmallMetric label="CTR" value={formatPercent(metricas.ctr)} isText />
    </div>
  )
}

function SmallMetric({ label, value, isText = false }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600">{label}</p>
      <p className="text-lg font-black text-white mt-1">{isText ? value : formatNumber(value)}</p>
    </div>
  )
}

function Empty({ text }) {
  return <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-8 text-center text-sm text-neutral-500">{text}</div>
}
