'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente-client'
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  KeyRound,
  LifeBuoy,
  Loader2,
  LogOut,
  MousePointerClick,
  PauseCircle,
  Printer,
  TrendingUp,
  Users,
  Wifi,
  X,
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

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error(data?.error || 'Erro ao carregar dados do cliente.')
    error.status = response.status
    throw error
  }

  return data
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
      label: 'Campanha no ar',
    }
  }

  if (status === 'financeiro_pendente') {
    return {
      box: 'bg-yellow-500/10 border-yellow-500/20',
      text: 'text-yellow-300',
      icon: AlertTriangle,
      label: 'Financeiro pendente',
    }
  }

  if (status === 'pausada' || status === 'sem_anuncio_ativo') {
    return {
      box: 'bg-white/[0.04] border-white/[0.08]',
      text: 'text-neutral-300',
      icon: PauseCircle,
      label: 'Campanha pausada',
    }
  }

  return {
    box: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-300',
    icon: Activity,
    label: 'Campanha em acompanhamento',
  }
}

export default function ClientDashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [campanha, setCampanha] = useState(null)
  const [resumo, setResumo] = useState({})
  const [financeiro, setFinanceiro] = useState({})
  const [ads, setAds] = useState([])
  const [leadsRecentes, setLeadsRecentes] = useState([])
  const [pagamentosRecentes, setPagamentosRecentes] = useState([])
  const [hotspotsVinculados, setHotspotsVinculados] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [pwdForm, setPwdForm] = useState({ new: '', confirm: '' })
  const [pwdStatus, setPwdStatus] = useState({ loading: false, error: '', success: '' })

  useEffect(() => {
    let isMounted = true

    async function carregarDashboard() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !sessionData?.session) {
          router.replace('/cliente/login?expired=1')
          return
        }

        if (isMounted) setUser(sessionData.session.user)

        const data = await clienteApiFetch('/api/cliente/dashboard')

        if (!isMounted) return

        setCliente(data.cliente || null)
        setCampanha(data.campanha || null)
        setResumo(data.resumo || {})
        setFinanceiro(data.financeiro || {})
        setAds(data.anuncios || [])
        setLeadsRecentes(data.leadsRecentes || [])
        setPagamentosRecentes(data.pagamentosRecentes || [])
        setHotspotsVinculados(data.hotspotsVinculados || [])
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/cliente/login?logout=1')
  }

  async function handlePasswordChange(event) {
    event.preventDefault()

    if (pwdForm.new !== pwdForm.confirm) {
      setPwdStatus({ loading: false, error: 'As senhas não coincidem.', success: '' })
      return
    }

    if (pwdForm.new.length < 6) {
      setPwdStatus({ loading: false, error: 'A senha deve ter pelo menos 6 caracteres.', success: '' })
      return
    }

    setPwdStatus({ loading: true, error: '', success: '' })

    const { error: updateError } = await supabase.auth.updateUser({ password: pwdForm.new })

    if (updateError) {
      setPwdStatus({ loading: false, error: updateError.message, success: '' })
      return
    }

    setPwdStatus({ loading: false, error: '', success: 'Senha atualizada com sucesso!' })

    setTimeout(() => {
      setIsPasswordModalOpen(false)
      setPwdForm({ new: '', confirm: '' })
      setPwdStatus({ loading: false, error: '', success: '' })
    }, 1500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <div className="relative w-20 h-20 flex items-center justify-center mb-5">
          <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
          <Activity className="text-[#6be12f] animate-pulse" size={30} />
        </div>
        <p className="text-sm font-bold text-white">Carregando painel</p>
        <p className="text-xs text-neutral-500 mt-1">Buscando seus anúncios e resultados...</p>
      </div>
    )
  }

  const campanhaStyle = statusCampanhaStyle(campanha?.status)
  const CampanhaIcon = campanhaStyle.icon || Activity

  const cards = [
    { label: 'Anúncios ativos', value: resumo.anunciosAtivos || 0, icon: Activity, text: 'text-[#8cf059]', bg: 'bg-[#6be12f]/20' },
    { label: 'Visualizações', value: resumo.totalVisualizacoes || 0, icon: Eye, text: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Cliques no CTA', value: resumo.totalCliques || 0, icon: MousePointerClick, text: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Leads capturados', value: resumo.totalLeads || 0, icon: Users, text: 'text-orange-400', bg: 'bg-orange-500/20' },
    { label: 'CTR geral', value: `${resumo.ctrGeral || 0}%`, icon: TrendingUp, text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Hotspots', value: resumo.hotspotsVinculados || hotspotsVinculados.length || 0, icon: Wifi, text: 'text-[#8cf059]', bg: 'bg-[#6be12f]/20' },
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6be12f]/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[#6be12f]/5 rounded-full blur-[130px] pointer-events-none" />

      <nav className="sticky top-0 z-40 bg-[#050505]/75 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-3">
              <img
                src="/Nexa-logo.png"
                alt="Nexa Logo"
                className="h-16 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Área do cliente</p>
                <p className="text-sm font-bold text-white">{cliente?.nome_empresa || cliente?.nome || 'NexaWi ADS'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.05]">
                <div className="w-2 h-2 rounded-full bg-[#6be12f] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-medium text-gray-400">{user?.email}</span>
              </div>

              <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all">
                <KeyRound size={16} />
                <span className="hidden sm:inline">Senha</span>
              </button>

              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-10">
        <section className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-5">
                <CheckCircle2 size={13} className="text-[#6be12f]" />
                Painel de performance
              </div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
                Olá, {cliente?.nome?.split(' ')?.[0] || 'cliente'}
              </h1>
              <p className="text-gray-500 font-medium">Acompanhe o desempenho das suas campanhas na rede NexaWi.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => window.print()} className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white transition-all hover:bg-white/[0.06]">
                <Printer size={17} />
                Gerar PDF
              </button>

              <Link href="/cliente/contratos" className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm font-extrabold text-blue-300 transition-all hover:bg-blue-500/15">
                <FileText size={17} />
                Meus contratos
              </Link>

              <Link href="/cliente/leads" className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-sm font-extrabold text-[#8cf059] transition-all hover:bg-[#6be12f]/15">
                <Users size={17} />
                Ver leads
              </Link>

              <button onClick={() => router.push('/cliente/suporte')} className="no-print inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black transition-all hover:bg-[#8cf059] shadow-[0_0_25px_rgba(107,225,47,0.18)]">
                <LifeBuoy size={17} />
                Abrir suporte
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="p-5 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {campanha && (
          <section className={`rounded-[2rem] border p-6 sm:p-8 mb-8 ${campanhaStyle.box}`}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-black/20 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <CampanhaIcon size={24} className={campanhaStyle.text} />
              </div>
              <div>
                <p className={`text-sm font-extrabold uppercase tracking-widest ${campanhaStyle.text}`}>{campanha.label || campanhaStyle.label}</p>
                <h2 className="text-2xl font-extrabold text-white mt-2">{cliente?.nome_empresa || 'Sua campanha'}</h2>
                <p className="text-sm text-neutral-400 mt-2 max-w-2xl">{campanha.message || 'Acompanhe aqui o desempenho da sua operação.'}</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
          {cards.map((card) => {
            const Icon = card.icon || Activity
            return (
              <div key={card.label} className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6">
                <div className={`w-12 h-12 rounded-2xl ${card.bg || 'bg-white/[0.06]'} flex items-center justify-center mb-6`}>
                  <Icon size={22} className={card.text || 'text-white'} />
                </div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">{card.label}</p>
                <p className="text-3xl font-light text-white">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
              </div>
            )
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <Panel title="Financeiro" icon={CreditCard}>
            <InfoRow label="Total pago" value={formatMoney(financeiro.totalPago || 0)} />
            <InfoRow label="Total pendente" value={formatMoney(financeiro.totalPendente || 0)} />
            <InfoRow label="Pagamentos pendentes" value={formatNumber(financeiro.pagamentosPendentes || 0)} />
            <InfoRow label="Próximo pagamento" value={formatDate(financeiro.proximoPagamento?.vencimento)} />
          </Panel>

          <Panel title="Leads recentes" icon={Users}>
            {leadsRecentes.length === 0 ? (
              <EmptyText text="Nenhum lead recente." />
            ) : leadsRecentes.slice(0, 5).map((lead) => (
              <InfoRow key={lead.id || lead.email || lead.telefone} label={lead.nome || lead.email || 'Lead'} value={lead.telefone || lead.email || '—'} />
            ))}
          </Panel>

          <Panel title="Hotspots" icon={Wifi}>
            {hotspotsVinculados.length === 0 ? (
              <EmptyText text="Nenhum hotspot vinculado." />
            ) : hotspotsVinculados.slice(0, 5).map((hotspot) => (
              <InfoRow key={hotspot.id || hotspot.nome} label={hotspot.nome || 'Hotspot'} value={hotspot.cidade || hotspot.localizacao || '—'} />
            ))}
          </Panel>
        </section>

        <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Anúncios</h2>
              <p className="text-sm text-neutral-500 mt-1">Resumo dos anúncios vinculados à sua conta.</p>
            </div>
          </div>

          {ads.length === 0 ? (
            <EmptyText text="Nenhum anúncio encontrado." />
          ) : (
            <div className="grid gap-3">
              {ads.slice(0, 8).map((ad) => (
                <div key={ad.id || ad.titulo} className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{ad.titulo || ad.nome || 'Anúncio sem título'}</p>
                    <p className="text-xs text-neutral-500 mt-1">Status: {ad.status || '—'}</p>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatNumber(ad.visualizacoes || 0)} views · {formatNumber(ad.cliques || 0)} cliques
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
          <form onSubmit={handlePasswordChange} className="w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-[#0a0a0a] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-white">Alterar senha</h2>
                <p className="text-sm text-neutral-500 mt-1">Defina uma nova senha de acesso.</p>
              </div>
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="p-2 rounded-full hover:bg-white/[0.06] text-neutral-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <label className="block mb-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Nova senha</span>
              <input type="password" value={pwdForm.new} onChange={(event) => setPwdForm((current) => ({ ...current, new: event.target.value }))} className="w-full bg-[#050505] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm text-white outline-none" />
            </label>

            <label className="block mb-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Confirmar senha</span>
              <input type="password" value={pwdForm.confirm} onChange={(event) => setPwdForm((current) => ({ ...current, confirm: event.target.value }))} className="w-full bg-[#050505] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm text-white outline-none" />
            </label>

            {pwdStatus.error && <p className="text-sm text-red-300 mb-4">{pwdStatus.error}</p>}
            {pwdStatus.success && <p className="text-sm text-[#8cf059] mb-4">{pwdStatus.success}</p>}

            <button type="submit" disabled={pwdStatus.loading} className="w-full rounded-2xl bg-[#6be12f] py-4 text-sm font-extrabold text-black hover:bg-[#8cf059] disabled:opacity-60 flex items-center justify-center gap-2">
              {pwdStatus.loading ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
              Salvar nova senha
            </button>
          </form>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print, nav { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  )
}

function Panel({ title, icon: Icon, children }) {
  const SafeIcon = Icon || Activity

  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <SafeIcon size={18} className="text-[#8cf059]" />
        </div>
        <h2 className="text-lg font-extrabold text-white">{title}</h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
      <p className="text-[10px] font-extrabold text-neutral-600 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-white mt-1 break-words">{value}</p>
    </div>
  )
}

function EmptyText({ text }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-5 text-center">
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  )
}
