'use client'

// src/app/dashboard/relatorios/comercial/page.js
// ============================================================
// Relatório Comercial Premium Admin NexaWi ADS.
// Usa /api/admin/relatorios/comercial.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  BarChart3,
  Eye,
  MousePointerClick,
  Users,
  TrendingUp,
  Wifi,
  Megaphone,
  RefreshCw,
  CalendarDays,
  Download,
  Lock,
  Activity,
  MapPin,
  ShieldCheck,
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

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function RelatorioComercialAdmin() {
  const [report, setReport] = useState(null)
  const [permissions, setPermissions] = useState(permissoesIniciais)
  const [periodo, setPeriodo] = useState('ultimos_30')
  const [carregando, setCarregando] = useState(true)

  const resumo = report?.resumo || {}
  const rankings = report?.rankings || {}
  const qualidade = report?.qualidadeDados || {}
  const rankingAnuncios = rankings.anuncios || []
  const rankingHotspots = rankings.hotspots || []
  const canExport = Boolean(permissions.export)

  useEffect(() => {
    buscarRelatorio()
  }, [periodo])

  async function buscarRelatorio() {
    setCarregando(true)

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodo)

      const data = await adminApiFetch(`/api/admin/relatorios/comercial?${params.toString()}`)

      setReport(data)
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao buscar relatório comercial:', error)
      toast.error(error.message || 'Erro ao carregar relatório comercial.')
    } finally {
      setCarregando(false)
    }
  }

  function exportarCSV() {
    if (!canExport) {
      toast.error('Você não tem permissão para exportar relatórios.')
      return
    }

    const linhas = [
      [
        'Tipo',
        'Nome',
        'Cliente/Cidade',
        'Visualizações',
        'Cliques',
        'Leads',
        'Usuários únicos',
        'CTR (%)',
      ],
      ...rankingAnuncios.map((item) => [
        'Anúncio',
        item.titulo || '',
        item.cliente_nome || '',
        item.visualizacoes || 0,
        item.cliques || 0,
        item.leads || 0,
        item.usuarios_unicos || 0,
        item.ctr || 0,
      ]),
      ...rankingHotspots.map((item) => [
        'Hotspot',
        item.nome || '',
        item.cidade || item.cliente_nome || '',
        item.visualizacoes || 0,
        item.cliques || 0,
        item.leads || 0,
        item.usuarios_unicos || 0,
        item.ctr || 0,
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
      `relatorio_comercial_${periodoLabel.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    )

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const cards = [
    {
      label: 'Visualizações',
      valor: resumo.totalVisualizacoes || 0,
      sub: 'impactos registrados',
      icon: Eye,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
    },
    {
      label: 'Cliques',
      valor: resumo.totalCliques || 0,
      sub: 'ações no CTA',
      icon: MousePointerClick,
      text: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
    {
      label: 'Leads',
      valor: resumo.totalLeads || 0,
      sub: 'contatos capturados',
      icon: Users,
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
    },
    {
      label: 'CTR geral',
      valor: `${resumo.ctrGeral || 0}%`,
      sub: 'taxa comercial',
      icon: TrendingUp,
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
    },
    {
      label: 'Usuários únicos',
      valor: resumo.usuariosUnicos || 0,
      sub: 'alcance estimado',
      icon: Activity,
      text: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'Hotspots',
      valor: resumo.hotspotsComCampanha || 0,
      sub: 'com campanha vinculada',
      icon: Wifi,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
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

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <ShieldCheck size={13} />
              Inteligência comercial
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <BarChart3 className="text-[#6be12f]" size={24} />
              </div>
              Relatório Comercial
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium max-w-2xl">
              Visão premium de performance por anúncios, hotspots, leads, CTR e qualidade dos dados.
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
                disabled={!report}
                className="bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
              >
                <Download size={17} />
                Exportar
              </button>
            )}

            <button
              onClick={buscarRelatorio}
              className="bg-[#6be12f] hover:bg-[#8cf059] text-black font-black py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(107,225,47,0.18)]"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-10">
          {cards.map((card, index) => (
            <CommercialCard key={card.label} card={card} index={index} />
          ))}
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
              <BarChart3 className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : !report ? (
          <EmptyReport />
        ) : (
          <div className="relative z-10 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <RankingPanel
                title="Ranking de anúncios"
                subtitle="Campanhas com maior entrega"
                icon={Megaphone}
                items={rankingAnuncios}
                type="anuncio"
              />

              <RankingPanel
                title="Ranking de hotspots"
                subtitle="Locais com maior performance"
                icon={MapPin}
                items={rankingHotspots}
                type="hotspot"
              />
            </div>

            <QualityBox qualidade={qualidade} generatedAt={report.generatedAt} />
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

function CommercialCard({ card, index }) {
  return (
    <div
      className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 ${card.bg}`} />

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
          {formatNumber(String(card.valor).replace('%', ''))}{String(card.valor).includes('%') ? '%' : ''}
        </p>
        <p className="text-xs text-neutral-500 mt-2 font-medium">
          {card.sub}
        </p>
      </div>
    </div>
  )
}

function RankingPanel({ title, subtitle, icon: Icon, items, type }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Icon size={21} className="text-[#6be12f]" />
            {title}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            {subtitle}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-10 text-center">
          <BarChart3 size={28} className="text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Sem dados ainda</h3>
          <p className="text-sm text-neutral-500">
            Assim que houver eventos no portal, o ranking será atualizado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.slice(0, 8).map((item, index) => (
            <RankingRow key={item.id || index} item={item} index={index} type={type} />
          ))}
        </div>
      )}
    </div>
  )
}

function RankingRow({ item, index, type }) {
  const nome = type === 'anuncio' ? item.titulo : item.nome
  const subtitulo = type === 'anuncio'
    ? item.cliente_nome || 'Campanha NexaWi'
    : item.cidade || item.cliente_nome || 'Hotspot NexaWi'

  return (
    <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5 hover:border-[#6be12f]/20 transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#8cf059] mb-1">
            #{index + 1}
          </p>

          <h3 className="text-lg font-bold text-white truncate">
            {nome || 'Sem nome'}
          </h3>

          <p className="text-xs text-neutral-500 truncate mt-1">
            {subtitulo}
          </p>
        </div>

        <span className="rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 px-3 py-1 text-[11px] font-black text-[#8cf059]">
          {item.ctr || 0}% CTR
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniMetric icon={Eye} label="Views" value={item.visualizacoes} />
        <MiniMetric icon={MousePointerClick} label="Cliques" value={item.cliques} />
        <MiniMetric icon={Users} label="Leads" value={item.leads} />
        <MiniMetric icon={Activity} label="Únicos" value={item.usuarios_unicos} />
      </div>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-black/30 border border-white/[0.04] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-neutral-500" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600">
          {label}
        </p>
      </div>
      <p className="text-lg font-black text-white">
        {formatNumber(value)}
      </p>
    </div>
  )
}

function QualityBox({ qualidade, generatedAt }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mb-2">
        <ShieldCheck size={21} className="text-[#6be12f]" />
        Qualidade dos dados
      </h2>

      <p className="text-sm text-neutral-500 max-w-3xl leading-relaxed">
        {qualidade?.usaFallbackHistorico
          ? 'Parte dos dados antigos foi calculada por vínculo histórico entre anúncio e hotspot. Os novos eventos já usam hotspot_id real.'
          : 'Os eventos recentes estão usando hotspot_id real para cálculo de performance.'}
      </p>

      <div className="flex flex-wrap gap-3 mt-5">
        <Badge label="Views com hotspot real" value={qualidade?.viewsComHotspotReal || 0} />
        <Badge label="Cliques com hotspot real" value={qualidade?.clicksComHotspotReal || 0} />
        <Badge label="Gerado em" value={formatDate(generatedAt)} />
      </div>
    </div>
  )
}

function Badge({ label, value }) {
  return (
    <span className="rounded-full border border-white/[0.06] bg-[#050505] px-4 py-2 text-xs text-neutral-400">
      <strong className="text-white">{label}:</strong> {typeof value === 'number' ? formatNumber(value) : value}
    </span>
  )
}

function EmptyReport() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
      <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
        <BarChart3 size={32} className="text-neutral-600" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
        Nenhum relatório encontrado
      </h3>
      <p className="text-sm text-neutral-500 mb-8 max-w-md mx-auto">
        Assim que houver visualizações, cliques ou leads, os dados aparecerão aqui.
      </p>
    </div>
  )
}
