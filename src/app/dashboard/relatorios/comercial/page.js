'use client'

// src/app/dashboard/relatorios/comercial/page.js
// ============================================================
// Relatório Comercial Premium Admin NexaWi ADS.
// Usa /api/admin/relatorios/comercial.
// ============================================================

import { useEffect, useState } from 'react'
import { Poppins } from 'next/font/google'
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
  Printer,
  Mail,
  Lock,
  Activity,
  MapPin,
  ShieldCheck,
  Filter,
  XCircle,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

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

function extractArray(data, keys = []) {
  if (Array.isArray(data)) return data

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }

  return []
}

function getClienteLabel(cliente = {}) {
  return cliente.nome_empresa || cliente.nome || cliente.email || 'Cliente sem nome'
}

function getHotspotLabel(hotspot = {}) {
  const cidade = hotspot.cidade ? ` · ${hotspot.cidade}` : ''
  return `${hotspot.nome || 'Hotspot sem nome'}${cidade}`
}

export default function RelatorioComercialAdmin() {
  const [report, setReport] = useState(null)
  const [permissions, setPermissions] = useState(permissoesIniciais)
  const [periodo, setPeriodo] = useState('ultimos_30')
  const [clienteId, setClienteId] = useState('')
  const [hotspotId, setHotspotId] = useState('')
  const [clientes, setClientes] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoFiltros, setCarregandoFiltros] = useState(true)
  const [enviandoEmail, setEnviandoEmail] = useState(false)

  const resumo = report?.resumo || {}
  const rankings = report?.rankings || {}
  const qualidade = report?.qualidadeDados || {}
  const rankingAnuncios = rankings.anuncios || []
  const rankingHotspots = rankings.hotspots || []
  const onlinePorHora = report?.onlinePorHora || []
  const canExport = Boolean(permissions.export)
  const temFiltrosAtivos = periodo !== 'ultimos_30' || Boolean(clienteId) || Boolean(hotspotId)
  const clienteSelecionado = clientes.find((cliente) => cliente.id === clienteId)
  const hotspotSelecionado = hotspots.find((hotspot) => hotspot.id === hotspotId)

  useEffect(() => {
    carregarFiltros()
  }, [])

  useEffect(() => {
    buscarRelatorio()
  }, [periodo, clienteId, hotspotId])

  async function carregarFiltros() {
    setCarregandoFiltros(true)

    try {
      const [clientesData, hotspotsData] = await Promise.all([
        adminApiFetch('/api/admin/clientes'),
        adminApiFetch('/api/admin/hotspots'),
      ])

      const clientesList = extractArray(clientesData, ['clientes', 'items', 'data'])
      const hotspotsList = extractArray(hotspotsData, ['hotspots', 'items', 'data'])

      setClientes(clientesList)
      setHotspots(hotspotsList)
    } catch (error) {
      console.error('Erro ao carregar filtros do relatório comercial:', error)
      toast.error(error.message || 'Erro ao carregar filtros.')
    } finally {
      setCarregandoFiltros(false)
    }
  }

  function limparFiltros() {
    setPeriodo('ultimos_30')
    setClienteId('')
    setHotspotId('')
  }

  async function buscarRelatorio() {
    setCarregando(true)

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodo)

      if (clienteId) {
        params.set('clienteId', clienteId)
      }

      if (hotspotId) {
        params.set('hotspotId', hotspotId)
      }

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

  function gerarPDF() {
    if (!report) {
      toast.error('Carregue o relatório antes de gerar o PDF.')
      return
    }

    window.print()
  }

  async function exportarCSV() {
    if (!canExport) {
      toast.error('Você não tem permissão para exportar relatórios.')
      return
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Sessao administrativa nao encontrada. Faca login novamente.')
      }

      const params = new URLSearchParams()
      params.set('periodo', periodo)
      params.set('format', 'csv')

      if (clienteId) params.set('clienteId', clienteId)
      if (hotspotId) params.set('hotspotId', hotspotId)

      const response = await fetch(`/api/admin/relatorios/comercial?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Erro ao exportar relatorio comercial.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const disposition = response.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] || `relatorio_comercial_${new Date().toISOString().slice(0, 10)}.csv`

      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', filename)

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    } catch (error) {
      console.error('Erro ao exportar relatorio comercial:', error)
      toast.error(error.message || 'Erro ao exportar relatorio comercial.')
      return
    }

  }

  async function enviarRelatorioEmail() {
    if (!canExport) {
      toast.error('Voce nao tem permissao para enviar relatorios.')
      return
    }

    if (!report) {
      toast.error('Carregue o relatorio antes de enviar por e-mail.')
      return
    }

    setEnviandoEmail(true)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Sessao administrativa nao encontrada. Faca login novamente.')
      }

      const response = await fetch('/api/admin/relatorios/comercial/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({
          periodo,
          clienteId,
          hotspotId,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao enviar relatorio comercial por e-mail.')
      }

      toast.success('Relatorio enviado por e-mail.')
    } catch (error) {
      console.error('Erro ao enviar relatorio comercial por e-mail:', error)
      toast.error(error.message || 'Erro ao enviar relatorio comercial por e-mail.')
    } finally {
      setEnviandoEmail(false)
    }
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

      <div className={`${poppins.className} print-dark-page relative z-10 max-w-full overflow-x-hidden px-3 sm:px-5 md:px-8 pb-12 animate-fade-in-up`}>
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

          <div className="no-print flex flex-col sm:flex-row gap-3">
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

            {canExport && (
              <button
                onClick={enviarRelatorioEmail}
                disabled={!report || enviandoEmail}
                className="bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
              >
                {enviandoEmail ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : (
                  <Mail size={17} />
                )}
                Enviar e-mail
              </button>
            )}

            <button
              onClick={gerarPDF}
              disabled={!report}
              className="bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
            >
              <Printer size={17} />
              Gerar PDF
            </button>

            <button
              onClick={buscarRelatorio}
              className="bg-[#6be12f] hover:bg-[#8cf059] text-black font-black py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(107,225,47,0.18)]"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </div>

        <PrintReportHeader
          periodo={periodos.find((item) => item.value === periodo)?.label || periodo}
          cliente={clienteSelecionado ? getClienteLabel(clienteSelecionado) : 'Todos os clientes'}
          hotspot={hotspotSelecionado ? getHotspotLabel(hotspotSelecionado) : 'Todos os hotspots'}
          generatedAt={report?.generatedAt}
          resumo={resumo}
        />

        <PremiumFiltersPanel
          periodo={periodo}
          setPeriodo={setPeriodo}
          clienteId={clienteId}
          setClienteId={setClienteId}
          hotspotId={hotspotId}
          setHotspotId={setHotspotId}
          clientes={clientes}
          hotspots={hotspots}
          carregandoFiltros={carregandoFiltros}
          temFiltrosAtivos={temFiltrosAtivos}
          clienteSelecionado={clienteSelecionado}
          hotspotSelecionado={hotspotSelecionado}
          onClear={limparFiltros}
        />

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

            <OnlineHourPanel items={onlinePorHora} resumo={resumo} />

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

        .print-report-header {
          display: none;
        }

        /* PRINT_DARK_CONTRAST_PATCH */

        /* PRINT_REMOVE_WHITE_HEADER_PATCH */
        @media print {
          .print-report-header,
          .clean-print-report,
          .print-cover,
          .print-page,
          .print-meta-grid.clean,
          .print-summary-grid {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
          }

          .print-dark-page {
            padding-top: 0 !important;
          }

          .print-dark-page > .absolute,
          .print-dark-page .absolute.top-20 {
            display: none !important;
          }

          .print-dark-page h1 {
            margin-top: 0 !important;
          }

          .print-dark-page .relative.z-10.flex.flex-col.lg\:flex-row {
            margin-bottom: 22px !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .print-dark-page .grid.grid-cols-1.sm\:grid-cols-2.xl\:grid-cols-6 {
            margin-top: 0 !important;
            margin-bottom: 28px !important;
          }

          .print-dark-page .bg-white\/\[0\.02\],
          .print-dark-page .bg-\[\#0a0a0a\],
          .print-dark-page .bg-\[\#050505\] {
            background: #070707 !important;
          }

          .print-dark-page h2,
          .print-dark-page h3,
          .print-dark-page p,
          .print-dark-page span {
            opacity: 1 !important;
          }
        }
        @media print {
          html,
          body {
            background: #050505 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          aside,
          nav,
          .fixed,
          .sticky,
          .no-print,
          button,
          select {
            display: none !important;
          }

          main {
            margin-left: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #050505 !important;
          }

          .print-dark-page {
            background: #050505 !important;
            color: #ffffff !important;
            padding: 0 !important;
          }

          .print-dark-page * {
            opacity: 1 !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }

          .print-dark-page h1,
          .print-dark-page h2,
          .print-dark-page h3,
          .print-dark-page h4,
          .print-dark-page strong,
          .print-dark-page .text-white,
          .print-dark-page .font-bold,
          .print-dark-page .font-black,
          .print-dark-page .font-extrabold {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          }

          .print-dark-page p,
          .print-dark-page span,
          .print-dark-page div,
          .print-dark-page td,
          .print-dark-page th,
          .print-dark-page .text-neutral-400,
          .print-dark-page .text-neutral-500,
          .print-dark-page .text-neutral-600,
          .print-dark-page .text-gray-400,
          .print-dark-page .text-gray-500 {
            color: #dbeafe !important;
            -webkit-text-fill-color: #dbeafe !important;
          }

          .print-dark-page .text-transparent {
            color: #ffffff !important;
            background: none !important;
            -webkit-text-fill-color: #ffffff !important;
          }

          .print-dark-page .text-\[\#8cf059\],
          .print-dark-page .text-\[\#6be12f\] {
            color: #8cf059 !important;
            -webkit-text-fill-color: #8cf059 !important;
          }

          .print-dark-page .bg-\[\#050505\],
          .print-dark-page .bg-\[\#0a0a0a\],
          .print-dark-page .bg-black\/20,
          .print-dark-page .bg-black\/25,
          .print-dark-page .bg-black\/30,
          .print-dark-page .bg-white\/\[0\.02\],
          .print-dark-page .bg-white\/\[0\.03\] {
            background: #090909 !important;
          }

          .print-dark-page .border-white\/\[0\.04\],
          .print-dark-page .border-white\/\[0\.05\],
          .print-dark-page .border-white\/\[0\.06\],
          .print-dark-page .border-white\/\[0\.08\],
          .print-dark-page .border-white\/\[0\.1\] {
            border-color: rgba(255, 255, 255, 0.22) !important;
          }

          .print-dark-page .rounded-\[2rem\],
          .print-dark-page .rounded-\[2\.5rem\],
          .print-dark-page .rounded-3xl {
            border-radius: 20px !important;
          }

          .print-dark-page .grid,
          .print-dark-page section,
          .print-dark-page .space-y-4 > *,
          .print-dark-page .space-y-8 > * {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-report-header,
          .print-report-header * {
            color: #111827 !important;
            -webkit-text-fill-color: #111827 !important;
          }

          .print-report-header {
            display: block !important;
            background: linear-gradient(135deg, #f7fee7 0%, #ffffff 45%, #f9fafb 100%) !important;
            border: 1px solid #e5e7eb !important;
            margin-bottom: 24px !important;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          aside,
          nav,
          button,
          [role="status"],
          .fixed,
          .sticky,
          .Toaster,
          .toaster,
          .react-hot-toast,
          .relative.z-10.mb-10.rounded-\[2rem\],
          .group\/select,
          .animate-ping {
            display: none !important;
          }

          main {
            margin-left: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .animate-fade-in-up {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .print-report-header {
            display: block !important;
            break-after: avoid;
            page-break-after: avoid;
            margin-bottom: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 22px;
            background: linear-gradient(135deg, #f7fee7 0%, #ffffff 45%, #f9fafb 100%) !important;
          }

          .print-brand-row {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            margin-bottom: 20px;
          }

          .print-kicker {
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #3f7f1f !important;
            font-weight: 800;
            margin-bottom: 6px;
          }

          .print-brand-row h1 {
            font-size: 28px;
            line-height: 1.1;
            color: #111827 !important;
            font-weight: 800;
            margin: 0;
          }

          .print-subtitle {
            font-size: 12px;
            color: #6b7280 !important;
            margin-top: 8px;
            max-width: 560px;
          }

          .print-logo-box {
            width: 120px;
            height: 58px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }

          .print-logo-box img {
            max-height: 54px;
            max-width: 120px;
            object-fit: contain;
          }

          .print-meta-grid,
          .print-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .print-meta-grid {
            margin-bottom: 12px;
          }

          .print-meta-grid div,
          .print-summary-grid div {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 10px 12px;
            background: #ffffff !important;
          }

          .print-meta-grid strong,
          .print-summary-grid span {
            display: block;
            font-size: 9px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #6b7280 !important;
            font-weight: 800;
            margin-bottom: 4px;
          }

          .print-meta-grid span {
            display: block;
            font-size: 11px;
            color: #111827 !important;
            font-weight: 700;
          }

          .print-summary-grid strong {
            display: block;
            font-size: 20px;
            color: #111827 !important;
            font-weight: 800;
          }

          .bg-\[\#050505\],
          .bg-\[\#0a0a0a\],
          .bg-white\/\[0\.02\],
          .bg-white\/\[0\.03\],
          .bg-black\/20,
          .bg-black\/25,
          .bg-black\/30 {
            background: #ffffff !important;
          }

          .text-white,
          .text-neutral-400,
          .text-neutral-500,
          .text-neutral-600 {
            color: #111827 !important;
          }

          .border-white\/\[0\.05\],
          .border-white\/\[0\.06\],
          .border-white\/\[0\.08\],
          .border-white\/\[0\.1\],
          .border-\[\#6be12f\]\/20 {
            border-color: #e5e7eb !important;
          }

          .shadow-\[0_20px_40px_rgba\(0\,0\,0\,0\.4\)\],
          .shadow-inner,
          .shadow-\[0_0_30px_rgba\(107\,225\,47\,0\.18\)\] {
            box-shadow: none !important;
          }

          .rounded-\[2rem\],
          .rounded-\[2\.5rem\],
          .rounded-3xl {
            border-radius: 16px !important;
          }

          .grid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .space-y-8 > * + * {
            margin-top: 18px !important;
          }

          .hover\:-translate-y-1,
          .group:hover {
            transform: none !important;
          }
        }
      `}} />
    </>
  )
}

function PrintReportHeader({ periodo, cliente, hotspot, generatedAt, resumo }) {
  return (
    <div className="print-report-header">
      <div className="print-brand-row">
        <div>
          <p className="print-kicker">NexaWi ADS</p>
          <h1>Relatório Comercial Premium</h1>
          <p className="print-subtitle">
            Performance consolidada de anúncios, hotspots, leads e interações comerciais.
          </p>
        </div>

        <div className="print-logo-box">
          <img src="/Nexa-logo.png" alt="NexaWi" />
        </div>
      </div>

      <div className="print-meta-grid">
        <div>
          <strong>Período</strong>
          <span>{periodo}</span>
        </div>
        <div>
          <strong>Cliente</strong>
          <span>{cliente}</span>
        </div>
        <div>
          <strong>Hotspot</strong>
          <span>{hotspot}</span>
        </div>
        <div>
          <strong>Gerado em</strong>
          <span>{formatDate(generatedAt || new Date().toISOString())}</span>
        </div>
      </div>

      <div className="print-summary-grid">
        <div>
          <strong>{formatNumber(resumo?.totalVisualizacoes || 0)}</strong>
          <span>Visualizações</span>
        </div>
        <div>
          <strong>{formatNumber(resumo?.totalCliques || 0)}</strong>
          <span>Cliques</span>
        </div>
        <div>
          <strong>{formatNumber(resumo?.totalLeads || 0)}</strong>
          <span>Leads</span>
        </div>
        <div>
          <strong>{resumo?.ctrGeral || 0}%</strong>
          <span>CTR geral</span>
        </div>
      </div>
    </div>
  )
}

function PremiumFiltersPanel({
  periodo,
  setPeriodo,
  clienteId,
  setClienteId,
  hotspotId,
  setHotspotId,
  clientes,
  hotspots,
  carregandoFiltros,
  temFiltrosAtivos,
  clienteSelecionado,
  hotspotSelecionado,
  onClear,
}) {
  return (
    <div className="no-print relative z-10 mb-10 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-3">
            <Filter size={13} className="text-[#6be12f]" />
            Filtros premium
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            Refine a leitura comercial
          </h2>

          <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
            Analise o desempenho por período, cliente ou hotspot específico.
          </p>
        </div>

        {temFiltrosAtivos && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06] transition-all"
          >
            <XCircle size={16} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <FilterSelect
          label="Período"
          icon={CalendarDays}
          value={periodo}
          onChange={setPeriodo}
          disabled={false}
          options={periodos.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
        />

        <FilterSelect
          label="Cliente"
          icon={Users}
          value={clienteId}
          onChange={setClienteId}
          disabled={carregandoFiltros}
          options={[
            { value: '', label: carregandoFiltros ? 'Carregando clientes...' : 'Todos os clientes' },
            ...clientes.map((cliente) => ({
              value: cliente.id,
              label: getClienteLabel(cliente),
            })),
          ]}
        />

        <FilterSelect
          label="Hotspot"
          icon={MapPin}
          value={hotspotId}
          onChange={setHotspotId}
          disabled={carregandoFiltros}
          options={[
            { value: '', label: carregandoFiltros ? 'Carregando hotspots...' : 'Todos os hotspots' },
            ...hotspots.map((hotspot) => ({
              value: hotspot.id,
              label: getHotspotLabel(hotspot),
            })),
          ]}
        />
      </div>

      {temFiltrosAtivos && (
        <div className="mt-5 flex flex-wrap gap-2">
          {periodo !== 'ultimos_30' && (
            <FilterBadge label="Período" value={periodos.find((item) => item.value === periodo)?.label || periodo} />
          )}

          {clienteSelecionado && (
            <FilterBadge label="Cliente" value={getClienteLabel(clienteSelecionado)} />
          )}

          {hotspotSelecionado && (
            <FilterBadge label="Hotspot" value={getHotspotLabel(hotspotSelecionado)} />
          )}
        </div>
      )}
    </div>
  )
}

function FilterSelect({ label, icon: Icon, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2">
        <Icon size={13} className="text-[#6be12f]" />
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 block px-5 py-3.5 transition-all cursor-pointer shadow-inner hover:border-white/[0.1] outline-none disabled:opacity-50"
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

function FilterBadge({ label, value }) {
  return (
    <span className="rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs text-[#8cf059]">
      <strong>{label}:</strong> {value}
    </span>
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
    <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
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
        <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-5 sm:p-8 text-center">
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
    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4 hover:border-[#6be12f]/20 transition-all">
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

function OnlineHourPanel({ items = [], resumo = {} }) {
  const horasComDados = items.filter((item) => Number(item.sessoes || 0) > 0)
  const max = Math.max(...items.map((item) => Number(item.sessoes || 0)), 1)

  return (
    <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-7">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity size={21} className="text-[#6be12f]" />
            Online por hora
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Sessões autorizadas no portal durante o período selecionado.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge label="Sessões" value={resumo.sessoesAutorizadas || 0} />
          <Badge label="Pico/hora" value={resumo.picoOnlineHora || 0} />
        </div>
      </div>

      {horasComDados.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-5 sm:p-8 text-center">
          <Activity size={28} className="text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Sem sessões no período</h3>
          <p className="text-sm text-neutral-500">
            Quando usuários forem liberados pelo portal, a distribuição por hora aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {items.map((item) => {
            const sessoes = Number(item.sessoes || 0)
            const width = `${Math.max(4, Math.round((sessoes / max) * 100))}%`

            return (
              <div key={item.hora} className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-black text-white">{item.hora}</span>
                  <span className="text-xs font-bold text-[#8cf059]">{formatNumber(sessoes)}</span>
                </div>
                <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/[0.04]">
                  <div className="h-full rounded-full bg-[#6be12f]" style={{ width }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
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
    <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-4 sm:p-6 text-center">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2 mb-2">
        <ShieldCheck size={21} className="text-[#6be12f]" />
        Qualidade dos dados
      </h2>

      <p className="mx-auto text-sm text-neutral-500 max-w-3xl leading-relaxed">
        {qualidade?.usaFallbackHistorico
          ? 'Parte dos dados antigos foi calculada por vínculo histórico entre anúncio e hotspot. Os novos eventos já usam hotspot_id real.'
          : 'Os eventos recentes estão usando hotspot_id real para cálculo de performance.'}
      </p>

      <div className="flex flex-wrap justify-center gap-3 mt-5">
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
