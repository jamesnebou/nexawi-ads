'use client'

// src/app/cliente/dashboard/page.js
// ============================================================
// Dashboard premium do cliente NexaWi ADS.
// Agora não consulta mais tabelas direto pelo navegador.
// Tudo vem de /api/cliente/dashboard, que valida a sessão e
// garante que o cliente só veja os próprios dados.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente-client'
import {
  LogOut,
  Eye,
  MousePointerClick,
  Activity,
  LayoutDashboard,
  KeyRound,
  PauseCircle,
  X,
  Check,
  Loader2,
  Building2,
  Wifi,
  Users,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  LifeBuoy,
  ExternalLink,
  Megaphone,
  CalendarDays,
  Printer,
  FileText,
} from 'lucide-react'

const supabase = createClient()


async function clienteApiFetch(path) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    const error = new Error('Sessão do cliente não encontrada.')
    error.status = 401
    throw error
  }

  const response = await fetch(path, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data?.error || 'Erro ao carregar dados do cliente.')
    error.status = response.status
    throw error
  }

  return data
}

async function registrarAcessoPortalCliente() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    return
  }

  try {
    await fetch('/api/cliente/access-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Erro ao registrar acesso do cliente:', error)
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('pt-BR')
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function statusCampanhaStyle(status) {
  if (status === 'no_ar') {
    return {
      box: 'bg-[#6be12f]/10 border-[#6be12f]/20',
      text: 'text-[#8cf059]',
      icon: CheckCircle2,
    }
  }

  if (status === 'financeiro_pendente') {
    return {
      box: 'bg-yellow-500/10 border-yellow-500/20',
      text: 'text-yellow-300',
      icon: AlertTriangle,
    }
  }

  if (status === 'pausada' || status === 'sem_anuncio_ativo') {
    return {
      box: 'bg-white/[0.04] border-white/[0.08]',
      text: 'text-neutral-300',
      icon: PauseCircle,
    }
  }

  return {
    box: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-300',
    icon: Activity,
  }
}

export default function ClientDashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [campanha, setCampanha] = useState(null)
  const [resumo, setResumo] = useState({
    anunciosAtivos: 0,
    anunciosInativos: 0,
    totalAnuncios: 0,
    totalVisualizacoes: 0,
    totalCliques: 0,
    totalLeads: 0,
    ctrGeral: 0,
    hotspotsVinculados: 0,
  })
  const [financeiro, setFinanceiro] = useState({
    totalPago: 0,
    totalPendente: 0,
    pagamentosPendentes: 0,
    proximoPagamento: null,
  })
  const [ads, setAds] = useState([])
  const [leadsRecentes, setLeadsRecentes] = useState([])
  const [pagamentosRecentes, setPagamentosRecentes] = useState([])
  const [hotspotsVinculados, setHotspotsVinculados] = useState([])
  const [commercialReport, setCommercialReport] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [pwdForm, setPwdForm] = useState({ new: '', confirm: '' })
  const [pwdStatus, setPwdStatus] = useState({
    loading: false,
    error: '',
    success: '',
  })

  useEffect(() => {
    let isMounted = true

    async function carregarDashboard() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !sessionData?.session) {
          router.replace('/cliente/login?expired=1')
          return
        }

        if (isMounted) {
          setUser(sessionData.session.user)
        }

        const data = await clienteApiFetch('/api/cliente/dashboard')

        let commercialData = null

        try {
          commercialData = await clienteApiFetch('/api/cliente/relatorio-comercial?periodo=ultimos_30')
        } catch (reportError) {
          console.error('Erro ao carregar relatório comercial:', reportError)
        }

        await registrarAcessoPortalCliente()

        if (!isMounted) return

        setCliente(data.cliente || null)
        setCampanha(data.campanha || null)
        setResumo(data.resumo || {})
        setFinanceiro(data.financeiro || {})
        setAds(data.anuncios || [])
        setLeadsRecentes(data.leadsRecentes || [])
        setPagamentosRecentes(data.pagamentosRecentes || [])
        setHotspotsVinculados(data.hotspotsVinculados || [])
        setCommercialReport(commercialData || null)
        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar painel do cliente:', err)

        if (!isMounted) return

        if (err.status === 401) {
          router.replace('/cliente/login?expired=1')
          return
        }

        setError(err.message || 'Não foi possível carregar seus dados.')
        setLoading(false)
      }
    }

    carregarDashboard()

    return () => {
      isMounted = false
    }
  }, [router])

  function gerarPDFCliente() {
    if (!commercialReport?.ok) {
      return
    }

    window.print()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/cliente/login?logout=1')
  }

  async function handlePasswordChange(e) {
    e.preventDefault()

    if (pwdForm.new !== pwdForm.confirm) {
      setPwdStatus({
        loading: false,
        error: 'As senhas não coincidem.',
        success: '',
      })
      return
    }

    if (pwdForm.new.length < 6) {
      setPwdStatus({
        loading: false,
        error: 'A senha deve ter pelo menos 6 caracteres.',
        success: '',
      })
      return
    }

    setPwdStatus({
      loading: true,
      error: '',
      success: '',
    })

    const { error: updateError } = await supabase.auth.updateUser({
      password: pwdForm.new,
    })

    if (updateError) {
      setPwdStatus({
        loading: false,
        error: updateError.message,
        success: '',
      })
      return
    }

    setPwdStatus({
      loading: false,
      error: '',
      success: 'Senha atualizada com sucesso!',
    })

    setTimeout(() => {
      setIsPasswordModalOpen(false)
      setPwdForm({ new: '', confirm: '' })
      setPwdStatus({ loading: false, error: '', success: '' })
    }, 1800)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <div className="relative w-20 h-20 flex items-center justify-center mb-5">
          <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
          <Activity className="text-[#6be12f] animate-pulse" size={30} />
        </div>

        <p className="text-sm font-bold text-white">Carregando painel</p>
        <p className="text-xs text-neutral-500 mt-1">
          Buscando seus anúncios e resultados...
        </p>
      </div>
    )
  }

  const campanhaStyle = statusCampanhaStyle(campanha?.status)
  const CampanhaIcon = campanhaStyle.icon

  const cards = [
    {
      label: 'Anúncios ativos',
      value: resumo.anunciosAtivos || 0,
      icon: Activity,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
    },
    {
      label: 'Visualizações',
      value: resumo.totalVisualizacoes || 0,
      icon: Eye,
      text: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'Cliques no CTA',
      value: resumo.totalCliques || 0,
      icon: MousePointerClick,
      text: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
    {
      label: 'Leads capturados',
      value: resumo.totalLeads || 0,
      icon: Users,
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
    },
    {
      label: 'CTR geral',
      value: `${resumo.ctrGeral || 0}%`,
      icon: TrendingUp,
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
    },
    {
      label: 'Hotspots',
      value: resumo.hotspotsVinculados || 0,
      icon: Wifi,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
    },
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6be12f]/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[#6be12f]/5 rounded-full blur-[130px] pointer-events-none"></div>

      <nav className="sticky top-0 z-40 bg-[#050505]/75 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-3">
              <img
                src="/Nexa-logo.png"
                alt="Nexa Logo"
                className="h-16 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />

              <div className="hidden sm:block">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Área do cliente
                </p>
                <p className="text-sm font-bold text-white">
                  {cliente?.nome_empresa || cliente?.nome || 'NexaWi ADS'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.05]">
                <div className="w-2 h-2 rounded-full bg-[#6be12f] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-xs font-medium text-gray-400">
                  {user?.email}
                </span>
              </div>

              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <KeyRound size={16} />
                <span className="hidden sm:inline">Senha</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-10">
        <div className="mb-10 animate-fade-in-up">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-5">
                <ShieldCheck size={13} className="text-[#6be12f]" />
                Painel de performance
              </div>

              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
                Olá, {cliente?.nome?.split(' ')?.[0] || 'cliente'}
              </h1>

              <p className="text-gray-500 font-medium">
                Acompanhe o desempenho das suas campanhas na rede NexaWi.
              </p>
            </div>

           
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={gerarPDFCliente}
                disabled={!commercialReport?.ok}
                className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white transition-all hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={17} />
                Gerar PDF
              </button>

              <button
                onClick={() => router.push('/cliente/suporte')}
                className="no-print inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black transition-all hover:bg-[#8cf059] shadow-[0_0_25px_rgba(107,225,47,0.18)]"
              >
                <LifeBuoy size={17} />
                Abrir suporte
              </button>
            </div>
          </div>
        </div>

        <ClientPrintableReport
          cliente={cliente}
          campanha={campanha}
          resumo={resumo}
          financeiro={financeiro}
          report={commercialReport}
        />

        {error && (
          <div className="p-5 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {campanha && (
          <div className={`rounded-[2rem] border p-6 sm:p-8 mb-8 ${campanhaStyle.box} animate-fade-in-up`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black/20 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <CampanhaIcon size={24} className={campanhaStyle.text} />
                </div>

                <div>
                  <p className={`text-sm font-extrabold uppercase tracking-widest ${campanhaStyle.text}`}>
                    {campanha.label}
                  </p>

                  <h2 className="text-2xl font-extrabold text-white mt-2">
                    {cliente?.nome_empresa || 'Sua campanha'}
                  </h2>

                  <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
                    {campanha.message}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/[0.06] px-5 py-4 min-w-[210px]">
                <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-1">
                  Plano atual
                </p>

                <p className="text-lg font-bold text-white">
                  {cliente?.plano_nome || 'Sem plano'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-10">
          {cards.map((card, index) => (
            <MetricCard key={card.label} card={card} index={index} />
          ))}
        </div>

        <CommercialReportSection report={commercialReport} />

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-10">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Building2 size={21} className="text-[#6be12f]" />
                Dados da conta
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Informações principais do seu cadastro NexaWi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoBox icon={Building2} label="Empresa" value={cliente?.nome_empresa || '—'} />
              <InfoBox icon={Mail} label="E-mail" value={cliente?.email || '—'} />
              <InfoBox icon={Phone} label="Telefone" value={cliente?.telefone || '—'} />
              <InfoBox icon={MapPin} label="Localização" value={`${cliente?.cidade || '—'}, ${cliente?.estado || '—'}`} />
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <CreditCard size={21} className="text-[#6be12f]" />
                Financeiro
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Resumo dos pagamentos da sua conta.
              </p>
            </div>

            <div className="space-y-4">
              <FinanceBox
                label="Total pago"
                value={formatMoney(financeiro.totalPago)}
                color="text-[#8cf059]"
              />

              <FinanceBox
                label="Pendente"
                value={formatMoney(financeiro.totalPendente)}
                color={financeiro.totalPendente > 0 ? 'text-yellow-400' : 'text-neutral-300'}
              />

              <div className="rounded-2xl bg-[#050505] border border-white/[0.05] p-4">
                <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-600 mb-1">
                  Próximo pagamento
                </p>

                <p className="text-sm font-bold text-white">
                  {financeiro.proximoPagamento
                    ? `${formatMoney(financeiro.proximoPagamento.valor)} · ${formatDate(financeiro.proximoPagamento.data_vencimento || financeiro.proximoPagamento.created_at)}`
                    : 'Nenhuma cobrança pendente'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <SectionTitle
          icon={Megaphone}
          title="Suas campanhas"
          subtitle="Anúncios vinculados à sua conta"
        />

        {ads.length === 0 ? (
          <div className="bg-white/[0.01] border border-white/[0.03] rounded-[2.5rem] p-14 text-center mb-10 animate-fade-in-up">
            <div className="w-24 h-24 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-8 border border-white/[0.05]">
              <LayoutDashboard size={32} className="text-gray-600" />
            </div>

            <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">
              Nenhuma campanha encontrada
            </h3>

            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Você ainda não possui anúncios vinculados à sua conta. Fale com o suporte para iniciar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-10">
            {ads.map((ad, index) => (
              <CampaignCard key={ad.id} ad={ad} index={index} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
          <RecentLeads leads={leadsRecentes} />
          <LinkedHotspots hotspots={hotspotsVinculados} />
        </div>

        <RecentPayments pagamentos={pagamentosRecentes} />
      </main>

      {isPasswordModalOpen && (
        <PasswordModal
          pwdForm={pwdForm}
          setPwdForm={setPwdForm}
          pwdStatus={pwdStatus}
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={handlePasswordChange}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .client-print-report {
          display: none;
        }

        /* CLIENT_PDF_REPORT_PATCH */
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: #050505 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .client-print-report,
          .client-print-report * {
            visibility: visible !important;
          }

          .client-print-report {
            display: block !important;
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            background: #050505 !important;
            color: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          .no-print,
          nav,
          button,
          .fixed,
          .sticky {
            display: none !important;
          }

          .client-print-cover,
          .client-print-section {
            page-break-after: always;
            break-after: page;
            background: #050505 !important;
            color: #ffffff !important;
            padding: 0;
          }

          .client-print-section:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .client-print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border: 1px solid rgba(255,255,255,0.16);
            border-radius: 24px;
            padding: 24px;
            background: linear-gradient(135deg, rgba(107,225,47,0.12), rgba(255,255,255,0.03)) !important;
            margin-bottom: 18px;
          }

          .client-print-header p,
          .client-print-title p {
            margin: 0 0 8px;
            font-size: 10px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            font-weight: 900;
            color: #8cf059 !important;
          }

          .client-print-header h1,
          .client-print-title h2 {
            margin: 0;
            color: #ffffff !important;
            font-size: 30px;
            line-height: 1.1;
            font-weight: 900;
          }

          .client-print-header span,
          .client-print-title span {
            display: block;
            margin-top: 8px;
            color: #dbeafe !important;
            font-size: 12px;
          }

          .client-print-header img {
            width: 120px;
            max-height: 68px;
            object-fit: contain;
          }

          .client-print-status {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 12px;
            margin-bottom: 18px;
          }

          .client-print-status div,
          .client-print-kpis div,
          .client-print-row,
          .client-print-quality,
          .client-print-empty {
            border: 1px solid rgba(255,255,255,0.14);
            background: #090909 !important;
            border-radius: 18px;
            padding: 16px;
          }

          .client-print-status strong,
          .client-print-row h3,
          .client-print-quality h2 {
            color: #ffffff !important;
            font-weight: 900;
          }

          .client-print-status span,
          .client-print-row p,
          .client-print-quality p {
            color: #dbeafe !important;
            font-size: 12px;
            line-height: 1.5;
          }

          .client-print-kpis {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .client-print-kpis strong {
            display: block;
            font-size: 28px;
            color: #ffffff !important;
            font-weight: 900;
          }

          .client-print-kpis span,
          .client-print-row-metrics span {
            display: block;
            margin-top: 6px;
            font-size: 9px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #dbeafe !important;
            font-weight: 900;
          }

          .client-print-title {
            border-bottom: 1px solid rgba(140,240,89,0.45);
            padding-bottom: 14px;
            margin-bottom: 18px;
          }

          .client-print-ranking {
            display: grid;
            gap: 12px;
          }

          .client-print-row {
            display: grid;
            grid-template-columns: 1.4fr 1.6fr;
            gap: 16px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .client-print-row > div > strong {
            color: #8cf059 !important;
            font-size: 13px;
          }

          .client-print-row-metrics {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .client-print-row-metrics span {
            background: #050505 !important;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            padding: 10px;
          }

          .client-print-row-metrics b {
            display: block;
            color: #ffffff !important;
            font-size: 16px;
            margin-top: 6px;
          }

          .client-print-quality {
            margin-top: 18px;
          }

          .client-print-quality > div {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
          }

          .client-print-quality > div span {
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 999px;
            padding: 8px 12px;
            color: #dbeafe !important;
            font-size: 11px;
          }
        }
      `}} />
    </div>
  )
}

function ClientPrintableReport({ cliente, campanha, resumo, financeiro, report }) {
  if (!report?.ok) return null

  const rankings = report.rankings || {}
  const qualidade = report.qualidadeDados || {}
  const rankingAnuncios = rankings.anuncios || []
  const rankingHotspots = rankings.hotspots || []

  return (
    <div className="client-print-report">
      <section className="client-print-cover">
        <div className="client-print-header">
          <div>
            <p>NEXAWI ADS</p>
            <h1>Relatório de Performance</h1>
            <span>
              {cliente?.nome_empresa || cliente?.nome || 'Cliente NexaWi'}
            </span>
          </div>

          <img src="/Nexa-logo.png" alt="NexaWi" />
        </div>

        <div className="client-print-status">
          <div>
            <strong>{campanha?.label || 'Status da campanha'}</strong>
            <span>{campanha?.message || 'Resumo comercial da sua campanha NexaWi.'}</span>
          </div>

          <div>
            <strong>{cliente?.plano_nome || 'Plano NexaWi'}</strong>
            <span>Plano atual</span>
          </div>
        </div>

        <div className="client-print-kpis">
          <PrintClientKpi label="Anúncios ativos" value={formatNumber(resumo?.anunciosAtivos)} />
          <PrintClientKpi label="Visualizações" value={formatNumber(report.resumo?.totalVisualizacoes)} />
          <PrintClientKpi label="Cliques no CTA" value={formatNumber(report.resumo?.totalCliques)} />
          <PrintClientKpi label="Leads" value={formatNumber(report.resumo?.totalLeads)} />
          <PrintClientKpi label="CTR geral" value={`${report.resumo?.ctrGeral || 0}%`} />
          <PrintClientKpi label="Hotspots" value={formatNumber(report.resumo?.hotspotsComCampanha)} />
        </div>
      </section>

      <section className="client-print-section">
        <PrintClientTitle
          title="Ranking de campanhas"
          subtitle="Anúncios com maior entrega no período"
        />

        <PrintClientRanking items={rankingAnuncios} type="anuncio" />
      </section>

      <section className="client-print-section">
        <PrintClientTitle
          title="Locais de veiculação"
          subtitle="Hotspots vinculados à sua campanha"
        />

        <PrintClientRanking items={rankingHotspots} type="hotspot" />

        <div className="client-print-quality">
          <h2>Qualidade dos dados</h2>
          <p>
            {qualidade.usaFallbackHistorico
              ? 'Parte dos dados antigos foi calculada por vínculo histórico. Os novos eventos já usam hotspot real.'
              : 'Os eventos recentes estão usando hotspot real para cálculo de performance.'}
          </p>

          <div>
            <span>Views com hotspot real: {formatNumber(qualidade.viewsComHotspotReal)}</span>
            <span>Cliques com hotspot real: {formatNumber(qualidade.clicksComHotspotReal)}</span>
            <span>Gerado em: {formatDate(report.generatedAt)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function PrintClientKpi({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function PrintClientTitle({ title, subtitle }) {
  return (
    <div className="client-print-title">
      <p>NexaWi ADS</p>
      <h2>{title}</h2>
      <span>{subtitle}</span>
    </div>
  )
}

function PrintClientRanking({ items = [], type }) {
  const rows = items.slice(0, 10)

  if (rows.length === 0) {
    return (
      <div className="client-print-empty">
        Nenhum dado encontrado para este período.
      </div>
    )
  }

  return (
    <div className="client-print-ranking">
      {rows.map((item, index) => (
        <div key={item.id || index} className="client-print-row">
          <div>
            <strong>#{index + 1}</strong>
            <h3>{type === 'anuncio' ? item.titulo : item.nome}</h3>
            <p>{type === 'anuncio' ? item.cliente_nome || 'Campanha NexaWi' : item.cidade || item.cliente_nome || 'Hotspot NexaWi'}</p>
          </div>

          <div className="client-print-row-metrics">
            <span>Views <b>{formatNumber(item.visualizacoes)}</b></span>
            <span>Cliques <b>{formatNumber(item.cliques)}</b></span>
            <span>Leads <b>{formatNumber(item.leads)}</b></span>
            <span>CTR <b>{item.ctr || 0}%</b></span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CommercialReportSection({ report }) {
  if (!report?.ok) return null

  const resumo = report.resumo || {}
  const rankings = report.rankings || {}
  const qualidade = report.qualidadeDados || {}

  const rankingAnuncios = rankings.anuncios || []
  const rankingHotspots = rankings.hotspots || []

  const cards = [
    {
      label: 'Alcance total',
      value: formatNumber(resumo.totalVisualizacoes),
      detail: 'visualizações nos últimos 30 dias',
      icon: Eye,
      accent: 'text-blue-400',
    },
    {
      label: 'Ações no CTA',
      value: formatNumber(resumo.totalCliques),
      detail: 'cliques e tentativas de abertura',
      icon: MousePointerClick,
      accent: 'text-purple-400',
    },
    {
      label: 'Leads gerados',
      value: formatNumber(resumo.totalLeads),
      detail: 'contatos capturados',
      icon: Users,
      accent: 'text-orange-400',
    },
    {
      label: 'CTR comercial',
      value: `${resumo.ctrGeral || 0}%`,
      detail: 'taxa geral de interesse',
      icon: TrendingUp,
      accent: 'text-cyan-400',
    },
  ]

  return (
    <section className="mb-10 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-[#6be12f]/15 bg-gradient-to-br from-[#6be12f]/10 via-white/[0.025] to-white/[0.015] p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#6be12f]/10 blur-[90px]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <TrendingUp size={13} />
              Relatório comercial premium
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Performance real da sua campanha
            </h2>

            <p className="text-sm text-neutral-500 mt-2 max-w-2xl leading-relaxed">
              Dados consolidados por anúncios, hotspots e interações reais registradas no portal NexaWi.
            </p>
          </div>

          <div className="rounded-2xl bg-black/20 border border-white/[0.06] px-5 py-4 min-w-[220px]">
            <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-1">
              Período analisado
            </p>
            <p className="text-sm font-bold text-white">
              Últimos 30 dias
            </p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Gerado em {formatDate(report.generatedAt)}
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <CommercialMetric key={card.label} card={card} />
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-5">
          <CommercialRanking
            title="Ranking de anúncios"
            subtitle="Campanhas com maior exposição"
            icon={Megaphone}
            items={rankingAnuncios}
            emptyTitle="Sem dados de anúncios"
            type="anuncio"
          />

          <CommercialRanking
            title="Ranking de hotspots"
            subtitle="Locais com maior entrega"
            icon={Wifi}
            items={rankingHotspots}
            emptyTitle="Sem dados de hotspots"
            type="hotspot"
          />
        </div>

        <div className="relative z-10 mt-6 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2">
            Qualidade dos dados
          </p>

          <p className="text-xs text-neutral-400 leading-relaxed">
            {qualidade.usaFallbackHistorico
              ? 'Parte dos dados antigos foi calculada por vínculo histórico de anúncio com hotspot. Os novos eventos já usam hotspot real.'
              : 'Os eventos recentes estão usando hotspot real para cálculo de performance.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] text-neutral-400">
              Views com hotspot real: {formatNumber(qualidade.viewsComHotspotReal)}
            </span>
            <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] text-neutral-400">
              Cliques com hotspot real: {formatNumber(qualidade.clicksComHotspotReal)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function CommercialMetric({ card }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-[#050505]/70 p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500">
          {card.label}
        </p>

        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
          <card.icon size={17} className={card.accent} />
        </div>
      </div>

      <p className="text-3xl font-light text-white tracking-tight">
        {card.value}
      </p>

      <p className="text-xs text-neutral-600 mt-2">
        {card.detail}
      </p>
    </div>
  )
}

function CommercialRanking({ title, subtitle, icon: Icon, items, emptyTitle, type }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.06] bg-[#050505]/70 p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Icon size={19} className="text-[#6be12f]" />
            {title}
          </h3>

          <p className="text-xs text-neutral-500 mt-1">
            {subtitle}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={emptyTitle}
          description="Assim que houver novas interações, o ranking será atualizado."
        />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 5).map((item, index) => (
            <div key={item.id || index} className="rounded-2xl bg-black/25 border border-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {index + 1}. {type === 'anuncio' ? item.titulo : item.nome}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-1">
                    {type === 'anuncio'
                      ? item.cliente_nome || 'Campanha NexaWi'
                      : item.cidade || item.cliente_nome || 'Hotspot NexaWi'}
                  </p>
                </div>

                <span className="rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 px-3 py-1 text-[11px] font-black text-[#8cf059]">
                  {item.ctr || 0}% CTR
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MiniMetric icon={Eye} label="Views" value={formatNumber(item.visualizacoes)} />
                <MiniMetric icon={MousePointerClick} label="Cliques" value={formatNumber(item.cliques)} />
                <MiniMetric icon={Users} label="Leads" value={formatNumber(item.leads)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ card, index }) {
  return (
    <div
      className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 ${card.bg}`} />

      <div className="relative z-10 flex items-center justify-between mb-6">
        <h3 className="text-gray-500 text-xs font-bold tracking-widest uppercase">
          {card.label}
        </h3>

        <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05] group-hover:scale-110 transition-transform shadow-inner">
          <card.icon size={18} className={card.text} />
        </div>
      </div>

      <p className="relative z-10 text-4xl font-light text-white tracking-tight">
        {card.value}
      </p>
    </div>
  )
}

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#050505] border border-white/[0.05] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-[#6be12f]" />
        <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-600">
          {label}
        </p>
      </div>

      <p className="text-sm font-bold text-white break-words">
        {value}
      </p>
    </div>
  )
}

function FinanceBox({ label, value, color }) {
  return (
    <div className="rounded-2xl bg-[#050505] border border-white/[0.05] p-4 flex items-center justify-between">
      <p className="text-sm font-bold text-neutral-400">{label}</p>
      <p className={`text-base font-extrabold ${color}`}>{value}</p>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-8 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
        <Icon size={22} className="text-[#6be12f]" />
        {title}
      </h2>

      <p className="text-sm text-neutral-500 mt-1">
        {subtitle}
      </p>
    </div>
  )
}

function CampaignCard({ ad, index }) {
  return (
    <div
      className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden hover:border-white/[0.15] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up"
      style={{ animationDelay: `${0.2 + index * 0.08}s` }}
    >
      <div className="relative h-56 overflow-hidden bg-[#0a0a0a]">
        {ad.media_url ? (
          ad.tipo_media === 'video' ? (
            <video
              src={ad.media_url}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={ad.media_url}
              alt={ad.titulo || 'Anúncio'}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-sm">
            Sem mídia
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />

        <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${ad.ativo ? 'bg-[#6be12f] animate-pulse' : 'bg-neutral-500'}`}></div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
            {ad.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="p-8 relative z-10 -mt-6">
        <h3 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-[#8cf059] transition-colors">
          {ad.titulo || 'Anúncio sem título'}
        </h3>

        <p className="text-gray-500 text-sm mb-8 line-clamp-2 leading-relaxed">
          {ad.descricao || 'Sem descrição cadastrada.'}
        </p>

        <div className="pt-5 border-t border-white/[0.05] grid grid-cols-3 gap-3">
          <MiniMetric icon={Eye} label="Views" value={ad.visualizacoes || 0} />
          <MiniMetric icon={MousePointerClick} label="Cliques" value={ad.cliques || 0} />
          <MiniMetric icon={TrendingUp} label="CTR" value={`${ad.ctr || 0}%`} />
        </div>

        {ad.link_cta && (
          <a
            href={ad.link_cta}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#8cf059] hover:text-[#6be12f]"
          >
            Ver destino do CTA
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#0a0a0a] border border-white/[0.05] p-3 text-center">
      <Icon size={15} className="text-neutral-500 mx-auto mb-2" />
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-neutral-600 uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

function RecentLeads({ leads }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8">
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Users size={21} className="text-[#6be12f]" />
          Leads recentes
        </h2>

        <p className="text-sm text-neutral-500 mt-1">
          Contatos capturados pelas suas campanhas
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum lead recente"
          description="Quando novos leads forem capturados, eles aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {leads.slice(0, 8).map((lead) => (
            <div key={lead.id} className="rounded-2xl bg-[#050505] border border-white/[0.05] p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{lead.nome || 'Lead sem nome'}</p>
                <p className="text-xs text-neutral-500 truncate">{lead.email || lead.telefone || 'Sem contato'}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs text-neutral-500">{lead.hotspots?.nome || 'Hotspot'}</p>
                <p className="text-[11px] text-neutral-600 mt-1">{formatDate(lead.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LinkedHotspots({ hotspots }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8">
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Wifi size={21} className="text-[#6be12f]" />
          Pontos de exibição
        </h2>

        <p className="text-sm text-neutral-500 mt-1">
          Locais onde sua campanha pode aparecer
        </p>
      </div>

      {hotspots.length === 0 ? (
        <EmptyState
          icon={Wifi}
          title="Nenhum hotspot vinculado"
          description="Quando sua campanha for vinculada a pontos de exibição, eles aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {hotspots.map((hotspot) => (
            <div key={hotspot.id} className="rounded-2xl bg-[#050505] border border-white/[0.05] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">{hotspot.nome}</p>
                <p className="text-xs text-neutral-500 mt-1">Ponto de acesso NexaWi</p>
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                hotspot.status === 'Ativo'
                  ? 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
                  : 'bg-white/[0.04] text-neutral-400 border border-white/[0.08]'
              }`}>
                {hotspot.status || 'Indefinido'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RecentPayments({ pagamentos }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8 mb-10">
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays size={21} className="text-[#6be12f]" />
          Histórico financeiro recente
        </h2>

        <p className="text-sm text-neutral-500 mt-1">
          Últimas movimentações vinculadas à sua conta
        </p>
      </div>

      {pagamentos.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum pagamento encontrado"
          description="Quando houver cobranças ou pagamentos, eles aparecerão aqui."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-xs font-bold text-gray-600 uppercase tracking-widest pb-4">Data</th>
                <th className="text-xs font-bold text-gray-600 uppercase tracking-widest pb-4">Valor</th>
                <th className="text-xs font-bold text-gray-600 uppercase tracking-widest pb-4 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.02]">
              {pagamentos.map((pagamento) => (
                <tr key={pagamento.id}>
                  <td className="py-4 text-sm text-neutral-400">{formatDate(pagamento.data_pagamento || pagamento.created_at)}</td>
                  <td className="py-4 text-sm font-bold text-white">{formatMoney(pagamento.valor)}</td>
                  <td className="py-4 text-right">
                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                      pagamento.status === 'Pago'
                        ? 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20'
                        : pagamento.status === 'Pendente'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {pagamento.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="py-10 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
        <Icon size={26} className="text-neutral-600" />
      </div>

      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm">{description}</p>
    </div>
  )
}

function PasswordModal({
  pwdForm,
  setPwdForm,
  pwdStatus,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-white/[0.05]">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Trocar senha</h2>
            <p className="text-sm text-neutral-500 mt-1.5 font-medium">
              Crie uma nova senha segura para seu acesso.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8">
          <div className="space-y-5 mb-8">
            <PasswordInput
              label="Nova senha"
              value={pwdForm.new}
              onChange={(value) => setPwdForm({ ...pwdForm, new: value })}
              placeholder="Mínimo 6 caracteres"
            />

            <PasswordInput
              label="Confirmar nova senha"
              value={pwdForm.confirm}
              onChange={(value) => setPwdForm({ ...pwdForm, confirm: value })}
              placeholder="Repita a nova senha"
            />
          </div>

          {pwdStatus.error && (
            <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {pwdStatus.error}
            </div>
          )}

          {pwdStatus.success && (
            <div className="p-4 mb-6 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 text-[#8cf059] text-sm text-center flex items-center justify-center gap-2">
              <Check size={16} />
              {pwdStatus.success}
            </div>
          )}

          <button
            type="submit"
            disabled={pwdStatus.loading || pwdStatus.success}
            className="w-full bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:-translate-y-1"
          >
            {pwdStatus.loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Atualizar senha'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function PasswordInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
        {label}
      </label>

      <div className="relative group/input">
        <KeyRound
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors"
        />

        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  )
}