'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Plus,
  QrCode,
  Save,
  Trash2,
  Wifi,
  Star,
  Search,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Clock3,
  ListFilter,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

const planoInicial = {
  id: '',
  nome: 'Acesso avulso',
  descricao: '',
  valor: '5.00',
  duracaoMinutos: 60,
  velocidadeDownload: '15M',
  velocidadeUpload: '15M',
  ordem: 0,
  ativo: true,
  recomendado: false,
}

const periodosRelatorio = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_7', label: 'Ultimos 7 dias' },
  { value: 'ultimos_30', label: 'Ultimos 30 dias' },
  { value: 'mes_atual', label: 'Mes atual' },
  { value: 'todos', label: 'Todo periodo' },
]

const statusRelatorioOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'autorizado', label: 'Autorizado' },
  { value: 'expirado', label: 'Expirado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'erro', label: 'Erro' },
]

const relatorioInicial = {
  resumo: {
    totalVendas: 0,
    vendasConfirmadas: 0,
    pendentes: 0,
    pagas: 0,
    autorizadas: 0,
    expiradas: 0,
    canceladas: 0,
    erros: 0,
    planoMaisVendido: null,
    receitaConfirmada: 0,
    ticketMedio: 0,
    porStatus: [],
    porMetodo: [],
    porGateway: [],
    porDia: [],
    porHotspot: [],
    receitaPendente: 0,
    taxaAutorizacao: 0,
  },
  vendas: [],
}

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada.')
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
    throw new Error(data?.error || 'Erro na API administrativa.')
  }

  return data
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function statusClass(status = '') {
  if (status === 'autorizado') return 'bg-[#6be12f]/15 text-[#6be12f]'
  if (status === 'pago') return 'bg-blue-500/15 text-blue-300'
  if (status === 'pendente') return 'bg-yellow-500/15 text-yellow-300'
  if (status === 'expirado') return 'bg-orange-500/15 text-orange-300'
  if (status === 'cancelado') return 'bg-gray-500/15 text-gray-300'
  if (status === 'erro') return 'bg-red-500/15 text-red-300'
  return 'bg-white/[0.06] text-gray-400'
}

function statusLabel(status = '') {
  const option = statusRelatorioOptions.find((item) => item.value === status)
  return option?.label || status || 'Pendente'
}

function formatDateTime(value = '') {
  if (!value) return '-'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 11) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7)
  if (digits.length === 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6)
  return value || '-'
}

function formatDuration(minutes = 0) {
  const total = Number(minutes || 0)

  if (total >= 1440 && total % 1440 === 0) return `${total / 1440} dia(s)`
  if (total >= 60 && total % 60 === 0) return `${total / 60} hora(s)`

  return `${total} minuto(s)`
}

export default function WifiPixPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hotspots, setHotspots] = useState([])
  const [planos, setPlanos] = useState([])
  const [hotspotId, setHotspotId] = useState('')
  const [portalModoAcesso, setPortalModoAcesso] = useState('anuncios')
  const [wifiPixAtivo, setWifiPixAtivo] = useState(false)
  const [formPlano, setFormPlano] = useState(planoInicial)
  const [mensagem, setMensagem] = useState('')
  const [periodoRelatorio, setPeriodoRelatorio] = useState('ultimos_30')
  const [statusRelatorio, setStatusRelatorio] = useState('')
  const [hotspotRelatorioId, setHotspotRelatorioId] = useState('')
  const [buscaRelatorio, setBuscaRelatorio] = useState('')
  const [operacaoVendaId, setOperacaoVendaId] = useState('')
  const [relatorioPix, setRelatorioPix] = useState(relatorioInicial)

  const hotspotSelecionado = useMemo(
    () => hotspots.find((item) => item.id === hotspotId) || null,
    [hotspots, hotspotId]
  )

  const planosDoHotspot = useMemo(
    () => planos.filter((plano) => plano.hotspot_id === hotspotId),
    [planos, hotspotId]
  )

  const planosAtivosDoHotspot = useMemo(
    () => planosDoHotspot.filter((plano) => plano.ativo !== false),
    [planosDoHotspot]
  )

  async function carregar() {
    setLoading(true)
    setMensagem('')

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodoRelatorio)
      if (statusRelatorio) params.set('status', statusRelatorio)
      if (hotspotRelatorioId) params.set('hotspotId', hotspotRelatorioId)
      if (buscaRelatorio.trim()) params.set('search', buscaRelatorio.trim())

      const data = await adminApiFetch(`/api/admin/wifi-pix?${params.toString()}`)
      const loadedHotspots = data.hotspots || []

      setHotspots(loadedHotspots)
      setPlanos(data.planos || [])
      setRelatorioPix(data.relatorio || relatorioInicial)

      const primeiro = loadedHotspots[0]
      if (primeiro && !hotspotId) {
        setHotspotId(primeiro.id)
        setPortalModoAcesso(primeiro.portal_modo_acesso || 'anuncios')
        setWifiPixAtivo(Boolean(primeiro.wifi_pix_ativo))
      }
    } catch (error) {
      setMensagem(error.message || 'Erro ao carregar Wi-Fi no Pix.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoRelatorio, statusRelatorio, hotspotRelatorioId])

  useEffect(() => {
    if (!hotspotSelecionado) return

    setPortalModoAcesso(hotspotSelecionado.portal_modo_acesso || 'anuncios')
    setWifiPixAtivo(Boolean(hotspotSelecionado.wifi_pix_ativo))
  }, [hotspotSelecionado])

  async function salvarHotspot() {
    if (!hotspotId) return

    setSaving(true)
    setMensagem('')

    try {
      await adminApiFetch('/api/admin/wifi-pix', {
        method: 'POST',
        body: {
          action: 'hotspot',
          hotspotId,
          portalModoAcesso,
          wifiPixAtivo,
        },
      })

      setMensagem('Configuração do hotspot salva.')
      await carregar()
    } catch (error) {
      setMensagem(error.message || 'Erro ao salvar hotspot.')
    } finally {
      setSaving(false)
    }
  }

  async function salvarPlano(event) {
    event.preventDefault()

    if (!hotspotId) return

    setSaving(true)
    setMensagem('')

    try {
      await adminApiFetch('/api/admin/wifi-pix', {
        method: 'POST',
        body: {
          action: 'plano',
          hotspotId,
          ...formPlano,
        },
      })

      setFormPlano(planoInicial)
      setMensagem('Plano salvo.')
      await carregar()
    } catch (error) {
      setMensagem(error.message || 'Erro ao salvar plano.')
    } finally {
      setSaving(false)
    }
  }

  async function arquivarPlano(id) {
    setSaving(true)
    setMensagem('')

    try {
      await adminApiFetch('/api/admin/wifi-pix', {
        method: 'POST',
        body: {
          action: 'arquivar_plano',
          id,
        },
      })

      setMensagem('Plano arquivado.')
      await carregar()
    } catch (error) {
      setMensagem(error.message || 'Erro ao arquivar plano.')
    } finally {
      setSaving(false)
    }
  }
  async function executarAcaoVenda(action, venda) {
    if (!venda?.id || operacaoVendaId) return

    let payload = { action, vendaId: venda.id }

    if (action === 'liberar_venda') {
      const macAtual = venda.mac_address || ''
      const ipAtual = venda.ip_address || ''
      const macAddress = macAtual || window.prompt('Informe o MAC do aparelho para liberar no MikroTik:') || ''
      const ipAddress = ipAtual || window.prompt('Informe o IP do aparelho, se souber. Pode deixar vazio:') || ''

      if (!macAddress.trim()) {
        setMensagem('Liberação cancelada: MAC do aparelho é obrigatório.')
        return
      }

      payload = {
        ...payload,
        hotspotSlug: venda.hotspot_slug,
        macAddress,
        ipAddress,
      }
    }

    if (action === 'cancelar_venda') {
      const ok = window.confirm('Cancelar esta venda pendente? Essa ação não apaga o histórico.')
      if (!ok) return
    }

    if (action === 'expirar_venda') {
      const ok = window.confirm('Marcar esta venda como expirada? Essa ação não remove acesso ativo no roteador.')
      if (!ok) return
    }

    setOperacaoVendaId(venda.id + ':' + action)
    setMensagem('')

    try {
      await adminApiFetch('/api/admin/wifi-pix', {
        method: 'POST',
        body: payload,
      })

      const labels = {
        verificar_venda: 'Pagamento verificado.',
        liberar_venda: 'Liberação solicitada ao MikroTik.',
        cancelar_venda: 'Venda cancelada.',
        expirar_venda: 'Venda expirada.',
      }

      setMensagem(labels[action] || 'Venda atualizada.')
      await carregar()
    } catch (error) {
      setMensagem(error.message || 'Erro ao operar venda Wi-Fi no Pix.')
    } finally {
      setOperacaoVendaId('')
    }
  }

  function editarPlano(plano) {
    setFormPlano({
      id: plano.id,
      nome: plano.nome || '',
      descricao: plano.descricao || '',
      valor: String(plano.valor || ''),
      duracaoMinutos: Number(plano.duracao_minutos || 60),
      velocidadeDownload: plano.velocidade_download || '15M',
      velocidadeUpload: plano.velocidade_upload || '15M',
      ordem: Number(plano.ordem || 0),
      ativo: plano.ativo !== false,
      recomendado: Boolean(plano.recomendado),
    })
  }

  const resumoPix = relatorioPix?.resumo || relatorioInicial.resumo
  const vendasPix = relatorioPix?.vendas || []
  const alertasPix = relatorioPix?.alertas || []
  const hotspotsMaisRentaveis = resumoPix.porHotspot || []
  const gatewayPix = resumoPix.porGateway || []
  const diasPix = resumoPix.porDia || []
  const webhookEfi = relatorioPix?.webhookEfi || null

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#050505] px-0 py-5 text-white sm:px-2 sm:py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/30 bg-[#6be12f]/10 px-4 py-2 text-[#6be12f] text-xs font-black uppercase tracking-[0.18em] mb-4">
              <Wifi size={15} /> Extensão comercial
            </div>
            <h1 className="text-4xl font-black tracking-tight">Wi-Fi no Pix</h1>
            <p className="text-gray-500 mt-2 max-w-2xl">
              Configure venda de acesso onde anúncio não faz sentido. O Pix passa pela Efí, o cartão continua no Asaas e a liberação passa pelo MikroTik.
            </p>
          </div>

          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 font-bold text-sm text-gray-200"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </header>

        {mensagem ? (
          <div className="rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-sm text-[#b6ff91]">
            {mensagem}
          </div>
        ) : null}

        {alertasPix.length ? (
          <div className="grid gap-3">
            {alertasPix.map((alerta) => (
              <div
                key={alerta.type + (alerta.hotspotId || '')}
                className={
                  alerta.severity === 'critical'
                    ? 'rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-100'
                    : 'rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100'
                }
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-black">{alerta.title}</p>
                    <p className="mt-1 text-white/70">{alerta.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <section className="mobile-tight-card rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <BarChart3 size={20} className="text-[#ff9d2e]" /> Relatório e gestão Wi-Fi no Pix
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Vendas por período, receita, plano mais vendido, hotspot, cliente, telefone e status operacional.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative block">
                <select
                  value={periodoRelatorio}
                  onChange={(event) => setPeriodoRelatorio(event.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 pr-10 text-sm font-bold text-white outline-none"
                >
                  {periodosRelatorio.map((periodo) => (
                    <option key={periodo.value} value={periodo.value}>{periodo.label}</option>
                  ))}
                </select>
                <CalendarDays size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </label>

              <label className="relative block">
                <select
                  value={hotspotRelatorioId}
                  onChange={(event) => setHotspotRelatorioId(event.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 pr-10 text-sm font-bold text-white outline-none"
                >
                  <option value="">Todos hotspots</option>
                  {hotspots.map((hotspot) => (
                    <option key={hotspot.id} value={hotspot.id}>{hotspot.nome}</option>
                  ))}
                </select>
                <Wifi size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </label>

              <label className="relative block">
                <select
                  value={statusRelatorio}
                  onChange={(event) => setStatusRelatorio(event.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 pr-10 text-sm font-bold text-white outline-none"
                >
                  {statusRelatorioOptions.map((statusItem) => (
                    <option key={statusItem.value || 'todos'} value={statusItem.value}>{statusItem.label}</option>
                  ))}
                </select>
                <ListFilter size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </label>

              <button
                type="button"
                onClick={carregar}
                disabled={loading}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-black text-gray-200 disabled:opacity-70"
              >
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <input
                value={buscaRelatorio}
                onChange={(event) => setBuscaRelatorio(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') carregar()
                }}
                className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 pl-11 text-sm font-bold text-white outline-none"
                placeholder="Buscar por cliente, telefone, CPF/CNPJ, MAC, IP ou TXID"
              />
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </label>
            <button
              type="button"
              onClick={carregar}
              className="rounded-2xl bg-[#ff7a00] px-5 py-3 text-sm font-black text-black"
            >
              Filtrar vendas
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <PixMetricCard label="Receita" value={money(resumoPix.receitaConfirmada)} detail={(resumoPix.vendasConfirmadas || 0) + ' confirmada(s)'} icon={CreditCard} />
            <PixMetricCard label="Pendente" value={money(resumoPix.receitaPendente)} detail={(resumoPix.pendentes || 0) + ' venda(s)'} icon={Clock3} />
            <PixMetricCard label="Vendas" value={resumoPix.totalVendas || 0} detail={(resumoPix.pendentes || 0) + ' pendente(s)'} icon={QrCode} />
            <PixMetricCard label="Pagas" value={resumoPix.pagas || 0} detail="Aguardando liberacao" icon={CheckCircle2} />
            <PixMetricCard label="Autorizadas" value={resumoPix.autorizadas || 0} detail="Liberadas no MikroTik" icon={ShieldCheck} />
            <PixMetricCard label="Taxa liberacao" value={(resumoPix.taxaAutorizacao || 0) + '%'} detail="Pagas que viraram acesso" icon={Wifi} />
            <PixMetricCard label="Ticket medio" value={money(resumoPix.ticketMedio)} detail="Pagas/autorizadas" icon={BarChart3} />
            <PixMetricCard label="Erros" value={resumoPix.erros || 0} detail="Exigem suporte" icon={AlertTriangle} />
          </div>

          {webhookEfi?.enabled ? (
            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={
                    webhookEfi.status === 'critical'
                      ? 'rounded-xl border border-red-500/25 bg-red-500/10 p-2 text-red-300'
                      : webhookEfi.status === 'warning'
                        ? 'rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-2 text-yellow-300'
                        : 'rounded-xl border border-[#6be12f]/25 bg-[#6be12f]/10 p-2 text-[#6be12f]'
                  }>
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black">Monitor Efi</p>
                    <p className="mt-1 text-lg font-black text-white">{webhookEfi.status === 'ok' ? 'Operando' : webhookEfi.status === 'critical' ? 'Critico' : 'Atencao'}</p>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">{webhookEfi.message}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <MiniMetric label="Ultimo evento" value={formatDateTime(webhookEfi.lastEventAt)} />
                  <MiniMetric label="Eventos 7d" value={webhookEfi.events7d || 0} />
                  <MiniMetric label="Pagos 7d" value={webhookEfi.paid7d || 0} />
                  <MiniMetric label="Nao casados" value={webhookEfi.unmatched7d || 0} />
                  <MiniMetric label="Alertas" value={webhookEfi.activeAlerts || 0} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_0.9fr_0.9fr_1.1fr]">
            <div className="mobile-tight-card rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black mb-3">Plano mais vendido</p>
              {resumoPix.planoMaisVendido ? (
                <div className="rounded-xl border border-[#ff7a00]/25 bg-[#ff7a00]/10 px-4 py-4">
                  <p className="text-lg font-black text-white">{resumoPix.planoMaisVendido.plano_nome}</p>
                  <p className="mt-1 text-sm text-gray-400">{resumoPix.planoMaisVendido.total_vendas} venda(s)</p>
                  <p className="mt-3 text-xl font-black text-[#ff9d2e]">{money(resumoPix.planoMaisVendido.receita_confirmada)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sem vendas no periodo.</p>
              )}
            </div>

            <div className="mobile-tight-card rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black mb-3">Status</p>
              <div className="grid gap-2">
                {(resumoPix.porStatus || []).length ? resumoPix.porStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                    <span className={'rounded-full px-2 py-1 text-[10px] font-black uppercase ' + statusClass(item.status)}>{statusLabel(item.status)}</span>
                    <span className="text-sm font-black text-white">{item.total}</span>
                  </div>
                )) : <p className="text-sm text-gray-500">Sem status no periodo.</p>}
              </div>
            </div>

            <div className="mobile-tight-card rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black mb-3">Gateway</p>
              {gatewayPix.length ? (
                <div className="grid gap-2">
                  {gatewayPix.slice(0, 4).map((item) => (
                    <div key={item.gateway} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                      <span className="text-sm font-bold uppercase text-white">{item.gateway}</span>
                      <span className="text-sm font-black text-[#ff9d2e]">{money(item.receita_confirmada)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">Sem gateway no periodo.</p>}
            </div>

            <div className="mobile-tight-card rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black mb-3">Hotspots por receita</p>
              {hotspotsMaisRentaveis.length ? (
                <div className="grid gap-3">
                  {hotspotsMaisRentaveis.slice(0, 5).map((item) => (
                    <div key={item.hotspot_id || item.hotspot_nome} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{item.hotspot_nome}</p>
                        <p className="text-xs text-gray-600">{item.total_vendas} venda(s)</p>
                      </div>
                      <p className="text-sm font-black text-[#ff9d2e]">{money(item.receita_confirmada)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sem vendas no periodo.</p>
              )}
            </div>
          </div>

          {diasPix.length ? (
            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black mb-3">Vendas por dia</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {diasPix.slice(0, 14).map((item) => (
                  <div key={item.dia} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3">
                    <p className="text-[11px] font-black text-gray-500">{item.dia}</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{item.total_vendas} venda(s)</p>
                    <p className="text-xs font-bold text-[#ff9d2e]">{money(item.receita_confirmada)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black">Gestão de vendas Pix</p>
                <p className="mt-1 text-sm text-gray-500">Verifique pagamento, libere suporte e encerre vendas pendentes sem apagar histórico.</p>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-400">
                {vendasPix.length} registro(s)
              </span>
            </div>

            {vendasPix.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.16em] text-gray-600">
                    <tr className="border-b border-white/[0.06]">
                      <th className="py-3 pr-3">Cliente</th>
                      <th className="py-3 pr-3">Plano / Hotspot</th>
                      <th className="py-3 pr-3">Valor</th>
                      <th className="py-3 pr-3">Status</th>
                      <th className="py-3 pr-3">Datas</th>
                      <th className="py-3 pr-3">Aparelho</th>
                      <th className="py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasPix.map((venda) => {
                      const busy = operacaoVendaId.startsWith(venda.id + ':')
                      return (
                        <tr key={venda.id} className="border-b border-white/[0.04] align-top">
                          <td className="whitespace-nowrap py-4 pr-3">
                            <p className="font-black text-white">{venda.nome || 'Cliente sem nome'}</p>
                            <p className="text-xs text-gray-500">{formatPhone(venda.telefone)}</p>
                            <p className="text-[11px] text-gray-700">{venda.cliente_nome || 'Sem cliente vinculado'}</p>
                          </td>
                          <td className="whitespace-nowrap py-4 pr-3">
                            <p className="font-bold text-white">{venda.plano_nome || 'Sem plano'}</p>
                            <p className="text-xs text-gray-500">{venda.hotspot_nome || 'Sem hotspot'}</p>
                            <p className="text-[11px] text-gray-700">{venda.metodo_pagamento || 'PIX'} / {venda.gateway_pagamento || venda.asaas_payload?.provider || 'asaas'}</p>
                            {venda.efi_txid ? <p className="mt-1 text-[11px] text-[#ff9d2e]">TXID: {venda.efi_txid}</p> : null}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-3 font-black text-[#ff9d2e]">{money(venda.valor)}</td>
                          <td className="whitespace-nowrap py-4 pr-3">
                            <span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ' + statusClass(venda.status)}>{statusLabel(venda.status)}</span>
                            {venda.erro_autorizacao ? <p className="mt-2 max-w-44 text-[11px] text-red-300">{venda.erro_autorizacao}</p> : null}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-3 text-xs text-gray-500">
                            <p>Criada: {formatDateTime(venda.created_at)}</p>
                            <p>Paga: {formatDateTime(venda.pago_em)}</p>
                            <p>Expira: {formatDateTime(venda.expira_em)}</p>
                          </td>
                          <td className="whitespace-nowrap py-4 pr-3 text-xs text-gray-500">
                            <p>MAC: {venda.mac_address || '-'}</p>
                            <p>IP: {venda.ip_address || '-'}</p>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <VendaActionButton busy={busy} onClick={() => executarAcaoVenda('verificar_venda', venda)} icon={RefreshCw} label="Verificar" />
                              <VendaActionButton busy={busy} disabled={!['pago', 'autorizado'].includes(venda.status)} onClick={() => executarAcaoVenda('liberar_venda', venda)} icon={ShieldCheck} label="Liberar" strong />
                              <VendaActionButton busy={busy} disabled={venda.status !== 'pendente'} onClick={() => executarAcaoVenda('cancelar_venda', venda)} icon={XCircle} label="Cancelar" danger />
                              <VendaActionButton busy={busy} disabled={venda.status === 'expirado'} onClick={() => executarAcaoVenda('expirar_venda', venda)} icon={Clock3} label="Expirar" />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-5 py-10 text-center text-gray-500">
                Nenhuma venda encontrada com os filtros atuais.
              </div>
            )}
          </div>
        </section>        <section className="mobile-tight-card rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold">Hotspot</span>
              <select
                value={hotspotId}
                onChange={(event) => setHotspotId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
              >
                {hotspots.map((hotspot) => (
                  <option key={hotspot.id} value={hotspot.id}>
                    {hotspot.nome} /{hotspot.slug}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold">Modo do portal</span>
              <select
                value={portalModoAcesso}
                onChange={(event) => setPortalModoAcesso(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
              >
                <option value="anuncios">Anúncios</option>
                <option value="pix">Somente Pix</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
              <input
                type="checkbox"
                checked={wifiPixAtivo}
                onChange={(event) => setWifiPixAtivo(event.target.checked)}
                className="h-5 w-5 accent-[#6be12f]"
              />
              <span className="font-bold text-sm">Wi-Fi no Pix ativo</span>
            </label>

            <button
              type="button"
              onClick={salvarHotspot}
              disabled={saving || !hotspotId}
              className="rounded-2xl bg-[#6be12f] px-6 py-3 text-black font-black flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar
            </button>
          </div>
        </section>

        {(portalModoAcesso === 'pix' || portalModoAcesso === 'hibrido') && planosAtivosDoHotspot.length === 0 ? (
          <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-yellow-300" size={18} />
              <p>
                Este hotspot está em modo pago, mas ainda não tem plano ativo. Cadastre e ative pelo menos um plano antes de publicar o modo Pix ou Híbrido.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="mobile-tight-card rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
            <h2 className="text-xl font-black mb-5 flex items-center gap-2">
              <Plus size={20} className="text-[#6be12f]" /> Plano de acesso
            </h2>

            <form onSubmit={salvarPlano} className="grid gap-4">
              <div className="rounded-2xl border border-[#ff7a00]/20 bg-[#ff7a00]/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#ffb15c] font-black">Oferta no portal</p>
                <p className="text-sm text-gray-300 mt-2">
                  Use nome curto, descrição direta, duração clara e marque um plano como recomendado para aumentar conversão.
                </p>
              </div>

              <input
                value={formPlano.nome}
                onChange={(event) => setFormPlano((prev) => ({ ...prev, nome: event.target.value }))}
                className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                placeholder="Nome do plano"
              />
              <textarea
                value={formPlano.descricao}
                onChange={(event) => setFormPlano((prev) => ({ ...prev, descricao: event.target.value }))}
                className="min-h-24 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                placeholder="Descrição curta"
              />

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Preço</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formPlano.valor}
                    onChange={(event) => setFormPlano((prev) => ({ ...prev, valor: event.target.value }))}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                    placeholder="Valor"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Duração</span>
                  <input
                    type="number"
                    min="1"
                    value={formPlano.duracaoMinutos}
                    onChange={(event) => setFormPlano((prev) => ({ ...prev, duracaoMinutos: event.target.value }))}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                    placeholder="Minutos"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">Ordem</span>
                  <input
                    type="number"
                    min="0"
                    value={formPlano.ordem}
                    onChange={(event) => setFormPlano((prev) => ({ ...prev, ordem: event.target.value }))}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={formPlano.velocidadeDownload}
                  onChange={(event) => setFormPlano((prev) => ({ ...prev, velocidadeDownload: event.target.value }))}
                  className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                  placeholder="Download"
                />
                <input
                  value={formPlano.velocidadeUpload}
                  onChange={(event) => setFormPlano((prev) => ({ ...prev, velocidadeUpload: event.target.value }))}
                  className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                  placeholder="Upload"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3 text-sm font-bold text-gray-300">
                  <input
                    type="checkbox"
                    checked={formPlano.ativo}
                    onChange={(event) => setFormPlano((prev) => ({ ...prev, ativo: event.target.checked }))}
                    className="h-5 w-5 accent-[#6be12f]"
                  />
                  Plano ativo no portal
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-[#ff7a00]/20 bg-[#ff7a00]/10 px-4 py-3 text-sm font-bold text-[#ffb15c]">
                  <input
                    type="checkbox"
                    checked={formPlano.recomendado}
                    onChange={(event) => setFormPlano((prev) => ({ ...prev, recomendado: event.target.checked }))}
                    className="h-5 w-5 accent-[#ff7a00]"
                  />
                  Plano recomendado
                </label>
              </div>

              <button
                type="submit"
                disabled={saving || !hotspotId}
                className="rounded-2xl bg-[#6be12f] px-6 py-4 text-black font-black flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar plano
              </button>
            </form>
          </section>

          <section className="mobile-tight-card rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
            <h2 className="text-xl font-black mb-5 flex items-center gap-2">
              <QrCode size={20} className="text-[#6be12f]" /> Planos cadastrados
            </h2>

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="animate-spin text-[#6be12f]" />
              </div>
            ) : planosDoHotspot.length ? (
              <div className="grid gap-4">
                {planosDoHotspot.map((plano) => (
                                    <div
                    key={plano.id}
                    className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 ${
                      plano.recomendado
                        ? 'border-[#ff7a00]/45 bg-[#ff7a00]/10 shadow-[0_0_32px_rgba(255,122,0,0.12)]'
                        : 'border-white/[0.06] bg-[#0a0a0a]'
                    }`}
                  >
                    {plano.recomendado ? (
                      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[plan-reflex_3.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    ) : null}

                    <div className="relative space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            plano.ativo ? 'bg-[#6be12f]/15 text-[#6be12f]' : 'bg-white/[0.06] text-gray-500'
                          }`}>
                            {plano.ativo ? 'Ativo' : 'Arquivado'}
                          </span>
                          {plano.recomendado ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#ff7a00] px-2.5 py-1 text-[10px] font-black uppercase text-black">
                              <Star size={11} fill="currentColor" /> Recomendado
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className={plano.recomendado ? 'text-[#ff9d2e] font-black' : 'text-[#6be12f] font-black'}>
                              {money(plano.valor)}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-600">Ordem {plano.ordem ?? 0}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => editarPlano(plano)}
                            className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-bold"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => arquivarPlano(plano.id)}
                            disabled={!plano.ativo}
                            className="rounded-xl border border-red-500/20 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="truncate text-lg font-black text-white">{plano.nome}</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{plano.descricao || 'Sem descrição'}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <SmallPlanInfo label="Duração" value={formatDuration(plano.duracao_minutos)} />
                        <SmallPlanInfo label="Download" value={plano.velocidade_download || '15M'} />
                        <SmallPlanInfo label="Upload" value={plano.velocidade_upload || '15M'} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-5 py-10 text-center text-gray-500">
                Nenhum plano cadastrado para este hotspot.
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-4 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <CreditCard className="text-[#6be12f] mt-0.5" size={18} />
                <p>
                  Pix usa Efí e cartão usa link seguro do Asaas. Para funcionar dentro do hotspot bloqueado,
                  libere os domínios da Efí, Asaas e NexaWi no walled garden do MikroTik.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.05] bg-black/20 px-2 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value || '-'}</p>
    </div>
  )
}

function SmallPlanInfo({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.05] bg-black/20 px-2 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function VendaActionButton({ label, icon: Icon, onClick, disabled = false, busy = false, strong = false, danger = false }) {
  const color = danger
    ? 'border-red-500/20 text-red-300 hover:bg-red-500/10'
    : strong
      ? 'border-[#6be12f]/25 text-[#6be12f] hover:bg-[#6be12f]/10'
      : 'border-white/[0.08] text-gray-300 hover:bg-white/[0.04]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={'inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 ' + color}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  )
}
function PixMetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-500 font-black">{label}</p>
        <div className="rounded-xl border border-[#ff7a00]/20 bg-[#ff7a00]/10 p-2 text-[#ff9d2e]">
          <Icon size={17} />
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-600">{detail}</p>
    </div>
  )
}
