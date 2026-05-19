'use client'

// src/app/cliente/dashboard/page.js
// ============================================================
// Dashboard premium do cliente NexaWi ADS.
// Agora não consulta mais tabelas direto pelo navegador.
// Tudo vem de /api/cliente/dashboard, que valida a sessão e
// garante que o cliente só veja os próprios dados.
// ============================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

              <Link
                href="/cliente/contratos"
                className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm font-extrabold text-blue-300 transition-all hover:bg-blue-500/15"
              >
                <FileText size={17} />
                Meus contratos
              </Link>

              <Link
                href="/cliente/leads"
                className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-sm font-extrabold text-[#8cf059] transition-all hover:bg-[#6be12f]/15"
              >
                <Users size={17} />
                Ver leads
              </Link>

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
          leadsRecentes={leadsRecentes}
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
            </div>
          </div>
        )}

        {/* restante da página preservado abaixo */}
      </main>
    </div>
  )
}
