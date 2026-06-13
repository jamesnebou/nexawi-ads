'use client'

// src/app/dashboard/relatorios/acesso/page.js
// ============================================================
// Relatório de Acesso da dashboard NexaWi ADS.
//
// Agora esta tela respeita as permissões retornadas pela API:
// - relatorios.view: permite visualizar o relatório
// - relatorios.export: mostra Exportar CSV
//
// Importante:
// - A segurança real fica na API /api/admin/relatorios/acesso.
// - Esta tela apenas melhora a experiência visual.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  MapPin,
  User,
  Eye,
  MousePointerClick,
  BarChart3,
  Copy,
  ExternalLink,
  RefreshCw,
  CalendarDays,
  Activity,
  TrendingUp,
  Download,
  Lock,
  Globe2,
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

const permissoesIniciais = {
  view: false,
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

export default function RelatorioAcesso() {
  const [relatorio, setRelatorio] = useState([])
  const [permissions, setPermissions] = useState(permissoesIniciais)
  const [resumo, setResumo] = useState({
    totalHotspots: 0,
    hotspotsComAcesso: 0,
    totalViews: 0,
    totalClicks: 0,
    totalCopias: 0,
    totalTentativasAbrir: 0,
    landingNativa: {
      totalViews: 0,
      visitantesUnicos: 0,
      leads: 0,
      cliques: 0,
      cliquesPendenteInstrumentacao: true,
      origemVisitas: [],
      origemLeads: [],
      origemCliques: [],
      cliquesPorDestino: [],
    },
  })
  const [periodo, setPeriodo] = useState('ultimos_30')
  const [carregando, setCarregando] = useState(true)

  const canExport = Boolean(permissions.export)

  useEffect(() => {
    buscarRelatorio()
  }, [periodo])

  async function buscarRelatorio() {
    setCarregando(true)

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodo)

      const data = await adminApiFetch(`/api/admin/relatorios/acesso?${params.toString()}`)

      setRelatorio(data.relatorio || [])
      setResumo(data.resumo || {
        totalHotspots: 0,
        hotspotsComAcesso: 0,
        totalViews: 0,
        totalClicks: 0,
        totalCopias: 0,
        totalTentativasAbrir: 0,
        landingNativa: {
          totalViews: 0,
          visitantesUnicos: 0,
          leads: 0,
          cliques: 0,
          cliquesPendenteInstrumentacao: true,
          origemVisitas: [],
          origemLeads: [],
          origemCliques: [],
          cliquesPorDestino: [],
        },
      })
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao buscar relatório de acesso:', error)
      toast.error(error.message || 'Erro ao carregar o relatório.')
    } finally {
      setCarregando(false)
    }
  }

  function exportarCSV() {
    if (!canExport) {
      toast.error('Você não tem permissão para exportar relatórios.')
      return
    }

    function csvCell(value) {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const linhas = [
      [
        'Hotspot',
        'Cliente',
        'Cidade',
        'Status',
        'Visualizações',
        'Cliques',
        'Links copiados',
        'Tentativas de abrir CTA',
        'CTR (%)',
      ],
      ...relatorio.map((item) => [
        item.hotspot_nome || '',
        item.cliente_nome || '',
        item.cidade || '',
        item.status || '',
        item.total_unique_views || 0,
        item.total_unique_clicks || 0,
        item.total_links_copiados || 0,
        item.total_tentativas_abrir || 0,
        item.taxa_clique || 0,
      ]),
    ]

    const csvContent = '\uFEFF' + linhas
      .map((linha) => linha.map(csvCell).join(';'))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const periodoLabel = periodos.find((item) => item.value === periodo)?.label || periodo

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `relatorio_acesso_${periodoLabel.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    )

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const taxaGeral =
    resumo.totalViews > 0
      ? ((resumo.totalClicks / resumo.totalViews) * 100).toFixed(1)
      : '0.0'

  const cards = [
    {
      label: 'LP nativa',
      valor: resumo.landingNativa?.visitantesUnicos || 0,
      sub: `${resumo.landingNativa?.totalViews || 0} visita(s), ${resumo.landingNativa?.leads || 0} lead(s)`,
      icon: Globe2,
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
    },
    {
      label: 'Visualizações',
      valor: resumo.totalViews,
      sub: 'Visitantes impactados',
      icon: Eye,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
    },
    {
      label: 'Cliques totais',
      valor: resumo.totalClicks,
      sub: `${taxaGeral}% de taxa geral`,
      icon: MousePointerClick,
      text: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'Copiaram link',
      valor: resumo.totalCopias,
      sub: 'Ação segura no portal',
      icon: Copy,
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
    },
    {
      label: 'Tentaram abrir',
      valor: resumo.totalTentativasAbrir,
      sub: 'Cliques no CTA',
      icon: ExternalLink,
      text: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
    {
      label: 'Hotspots com acesso',
      valor: resumo.hotspotsComAcesso,
      sub: `de ${resumo.totalHotspots} cadastrados`,
      icon: Activity,
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <BarChart3 className="text-[#6be12f]" size={24} />
              </div>
              Relatório de Acesso
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Métricas agregadas de visualizações, cliques, cópias e CTAs por hotspot
            </p>

            {!canExport && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                <Lock size={14} className="text-neutral-500" />
                Modo leitura: você pode visualizar, mas não exportar relatórios.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group/select">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full sm:w-56 bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 block pl-5 pr-12 py-3.5 transition-all cursor-pointer shadow-inner hover:border-white/[0.1] outline-none appearance-none"
              >
                {periodos.map((item) => (
                  <option key={item.value} value={item.value} className="bg-[#0a0a0a]">
                    {item.label}
                  </option>
                ))}
              </select>

              <CalendarDays
                size={18}
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-500 group-hover/select:text-[#6be12f] transition-colors"
              />
            </div>

            {canExport && (
              <button
                onClick={exportarCSV}
                disabled={relatorio.length === 0}
                className="bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
              >
                <Download size={17} />
                Exportar
              </button>
            )}

            <button
              onClick={buscarRelatorio}
              className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-10">
          {cards.map((card, index) => (
            <div
              key={card.label}
              className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 ${card.bg}`}></div>

              <div className="relative z-10 flex items-center justify-between mb-6">
                <h3 className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  {card.label}
                </h3>
                <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <card.icon size={18} className={card.text} />
                </div>
              </div>

              <div className="relative z-10">
                <p className="text-4xl font-light text-white tracking-tight">
                  {card.valor}
                </p>
                <p className="text-xs text-neutral-500 mt-2 font-medium">
                  {card.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-4 mb-5">
          <div className="mobile-tight-card bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 sm:p-6">
            <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-4">
              LP nativa
            </p>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Acessos" value={resumo.landingNativa?.totalViews || 0} />
              <MiniStat label="Leads" value={resumo.landingNativa?.leads || 0} />
              <MiniStat
                label="Cliques"
                value={resumo.landingNativa?.cliques || 0}
                muted={resumo.landingNativa?.cliquesPendenteInstrumentacao}
              />
            </div>
            {resumo.landingNativa?.cliquesPendenteInstrumentacao ? (
              <p className="text-[11px] text-neutral-600 mt-4 leading-relaxed">
                Aguardando a migration de cliques da LP nativa ser aplicada no Supabase.
              </p>
            ) : null}
          </div>

          <SourceBreakdown
            title="Origem das visitas"
            items={resumo.landingNativa?.origemVisitas || []}
          />

          <SourceBreakdown
            title="Origem dos leads"
            items={resumo.landingNativa?.origemLeads || []}
          />

          <SourceBreakdown
            title="Origem dos cliques"
            items={resumo.landingNativa?.origemCliques || []}
          />
        </div>

        <ClickTargetBreakdown
          items={resumo.landingNativa?.cliquesPorDestino || []}
          pending={resumo.landingNativa?.cliquesPendenteInstrumentacao}
        />

        <CommercialMetricsBreakdown
          anuncios={resumo.metricasAnuncios || []}
          clientes={resumo.metricasClientes || []}
        />

        {carregando ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
              <BarChart3 className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : relatorio.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <BarChart3 size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum dado de acesso encontrado
            </h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md mx-auto">
              Assim que usuários visualizarem anúncios no portal, os dados aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {relatorio.map((item, index) => (
              <div
                key={item.hotspot_id}
                className="bg-[#0a0a0a] border border-white/[0.05] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#6be12f]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                <div className="flex items-center gap-5 w-full xl:w-[320px] relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#050505] border border-white/[0.05] flex items-center justify-center shadow-inner group-hover:border-[#6be12f]/30 transition-all duration-300 flex-shrink-0">
                    <MapPin size={24} className="text-neutral-500 group-hover:text-[#6be12f] transition-colors duration-300" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#8cf059] transition-colors truncate tracking-tight">
                      {item.hotspot_nome}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1.5 font-medium">
                      <User size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        {item.cliente_nome || 'Sem cliente vinculado'}
                      </span>
                    </div>

                    {item.cidade && (
                      <p className="text-xs text-neutral-600 mt-1">
                        {item.cidade}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full xl:flex-1 relative z-10">
                  <MetricBox
                    label="Visualizações"
                    value={item.total_unique_views}
                    icon={Eye}
                    color="text-white"
                  />

                  <MetricBox
                    label="Cliques"
                    value={item.total_unique_clicks}
                    icon={MousePointerClick}
                    color="text-[#8cf059]"
                  />

                  <MetricBox
                    label="Copiaram"
                    value={item.total_links_copiados}
                    icon={Copy}
                    color="text-orange-400"
                  />

                  <MetricBox
                    label="Abriram CTA"
                    value={item.total_tentativas_abrir}
                    icon={ExternalLink}
                    color="text-blue-400"
                  />

                  <MetricBox
                    label="CTR"
                    value={`${item.taxa_clique}%`}
                    icon={TrendingUp}
                    color="text-purple-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
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

function MiniStat({ label, value, muted = false }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{label}</p>
      <p className={`mt-2 text-2xl font-black ${muted ? 'text-neutral-600' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function SourceBreakdown({ title, items = [] }) {
  const total = items.reduce((acc, item) => acc + Number(item.total || 0), 0)

  return (
    <div className="mobile-tight-card bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 sm:p-6">
      <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-4">
        {title}
      </p>

      {items.length ? (
        <div className="grid gap-3">
          {items.slice(0, 5).map((item) => {
            const percent = total > 0 ? Math.round((Number(item.total || 0) / total) * 100) : 0

            return (
              <div key={item.source} className="rounded-2xl border border-white/[0.05] bg-[#050505] p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-bold text-white capitalize">{item.source}</p>
                  <p className="text-xs font-black text-[#8cf059]">{item.total}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#6be12f]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Sem origem registrada ainda.</p>
      )}
    </div>
  )
}

function ClickTargetBreakdown({ items = [], pending = false }) {
  return (
    <div className="mobile-tight-card bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 sm:p-6 mb-8 sm:mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
          Destinos mais clicados da LP nativa
        </p>
        <p className="text-[11px] text-neutral-600 font-bold uppercase tracking-widest">
          {pending ? 'Pendente' : `${items.length} destino(s)`}
        </p>
      </div>

      {pending ? (
        <p className="text-sm text-neutral-500">
          Os destinos clicados aparecerao aqui depois que a migration de cliques for aplicada.
        </p>
      ) : items.length ? (
        <div className="grid gap-3">
          {items.slice(0, 8).map((item, index) => (
            <div
              key={`${item.label}-${item.url}-${index}`}
              className="max-w-full rounded-2xl border border-white/[0.05] bg-[#050505] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-white">{item.label || 'Clique'}</p>
                {item.url ? (
                  <p className="break-all text-xs text-neutral-600 mt-1">{item.url}</p>
                ) : (
                  <p className="text-xs text-neutral-700 mt-1">Botao sem URL direta</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#8cf059] font-black text-sm">
                <MousePointerClick size={15} />
                {item.total || 0}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Nenhum clique registrado ainda.</p>
      )}
    </div>
  )
}

function CommercialMetricsBreakdown({ anuncios = [], clientes = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2 mb-10">
      <CommercialRankList
        title="Anuncios por performance"
        empty="Nenhum anuncio com metrica no periodo."
        items={anuncios}
        type="anuncio"
      />
      <CommercialRankList
        title="Clientes por performance"
        empty="Nenhum cliente com metrica no periodo."
        items={clientes}
        type="cliente"
      />
    </div>
  )
}

function CommercialRankList({ title, empty, items = [], type }) {
  return (
    <div className="mobile-tight-card bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
          {title}
        </p>
        <p className="text-[11px] text-neutral-600 font-bold uppercase tracking-widest">
          Top {Math.min(items.length, type === 'cliente' ? 10 : 12)}
        </p>
      </div>

      {items.length ? (
        <div className="grid gap-3">
          {items.map((item, index) => {
            const titleText = type === 'cliente' ? item.cliente_nome : item.titulo
            const subtitle = type === 'cliente'
              ? `${item.anuncios || 0} anuncio(s)`
              : item.cliente_nome
            const hotspots = Array.isArray(item.hotspots) ? item.hotspots : []

            return (
              <div
                key={`${type}-${item.anuncio_id || item.cliente_id || index}`}
                className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#8cf059]">#{index + 1}</span>
                      <p className="break-words text-sm font-bold text-white">{titleText || 'Sem nome'}</p>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 truncate">{subtitle}</p>
                    {type === 'anuncio' && hotspots.length ? (
                      <p className="text-[11px] text-neutral-600 mt-1 truncate">
                        {hotspots.join(', ')}{item.hotspots_extra ? ` +${item.hotspots_extra}` : ''}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:min-w-[220px]">
                    <SmallMetric label="Views" value={item.total_unique_views || 0} />
                    <SmallMetric label="Cliques" value={item.total_unique_clicks || 0} />
                    <SmallMetric label="CTR" value={`${item.taxa_clique || 0}%`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{empty}</p>
      )}
    </div>
  )
}

function SmallMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.05] bg-white/[0.02] px-2 py-2 text-center">
      <p className="truncate text-[9px] text-neutral-600 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-sm text-white font-black mt-1">{value}</p>
    </div>
  )
}
function MetricBox({ label, value, icon: Icon, color }) {
  return (
    <div className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-4 shadow-inner group/metric hover:border-white/[0.1] transition-colors">
      <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover/metric:bg-white/[0.05] transition-colors">
        <Icon size={18} className={color} />
      </div>

      <div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-white leading-none tracking-tight">
          {value}
        </p>
      </div>
    </div>
  )
}
