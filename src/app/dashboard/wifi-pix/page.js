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
}

const periodosRelatorio = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_7', label: 'Ultimos 7 dias' },
  { value: 'ultimos_30', label: 'Ultimos 30 dias' },
  { value: 'mes_atual', label: 'Mes atual' },
  { value: 'todos', label: 'Todo periodo' },
]

const relatorioInicial = {
  resumo: {
    totalVendas: 0,
    vendasConfirmadas: 0,
    pendentes: 0,
    autorizadas: 0,
    erros: 0,
    receitaConfirmada: 0,
    ticketMedio: 0,
    porStatus: [],
    porMetodo: [],
    porHotspot: [],
  },
  vendas: [],
}

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessao administrativa nao encontrada.')
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
  if (status === 'erro') return 'bg-red-500/15 text-red-300'
  return 'bg-white/[0.06] text-gray-400'
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
  const [relatorioPix, setRelatorioPix] = useState(relatorioInicial)

  const hotspotSelecionado = useMemo(
    () => hotspots.find((item) => item.id === hotspotId) || null,
    [hotspots, hotspotId]
  )

  const planosDoHotspot = useMemo(
    () => planos.filter((plano) => plano.hotspot_id === hotspotId),
    [planos, hotspotId]
  )

  async function carregar() {
    setLoading(true)
    setMensagem('')

    try {
      const params = new URLSearchParams()
      params.set('periodo', periodoRelatorio)

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
  }, [periodoRelatorio])

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
    })
  }

  const resumoPix = relatorioPix?.resumo || relatorioInicial.resumo
  const vendasPix = relatorioPix?.vendas || []
  const hotspotsMaisRentaveis = resumoPix.porHotspot || []

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/30 bg-[#6be12f]/10 px-4 py-2 text-[#6be12f] text-xs font-black uppercase tracking-[0.18em] mb-4">
              <Wifi size={15} /> Extensão comercial
            </div>
            <h1 className="text-4xl font-black tracking-tight">Wi-Fi no Pix</h1>
            <p className="text-gray-500 mt-2 max-w-2xl">
              Configure venda de acesso onde anúncio não faz sentido. O pagamento é feito no Asaas e a liberação passa pelo MikroTik.
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

        <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <BarChart3 size={20} className="text-[#ff9d2e]" /> Relatorio Wi-Fi no Pix
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Vendas, receita, status, planos e hotspots no periodo selecionado.
              </p>
            </div>

            <label className="relative block">
              <select
                value={periodoRelatorio}
                onChange={(event) => setPeriodoRelatorio(event.target.value)}
                className="w-full lg:w-56 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 pr-11 text-sm font-bold text-white outline-none"
              >
                {periodosRelatorio.map((periodo) => (
                  <option key={periodo.value} value={periodo.value}>
                    {periodo.label}
                  </option>
                ))}
              </select>
              <CalendarDays size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <PixMetricCard label="Receita confirmada" value={money(resumoPix.receitaConfirmada)} detail={`${resumoPix.vendasConfirmadas || 0} venda(s) confirmadas`} icon={CreditCard} />
            <PixMetricCard label="Total de vendas" value={resumoPix.totalVendas || 0} detail={`${resumoPix.pendentes || 0} pendente(s)`} icon={QrCode} />
            <PixMetricCard label="Autorizadas" value={resumoPix.autorizadas || 0} detail="Internet liberada no MikroTik" icon={CheckCircle2} />
            <PixMetricCard label="Ticket medio" value={money(resumoPix.ticketMedio)} detail="Sobre vendas confirmadas" icon={BarChart3} />
            <PixMetricCard label="Erros" value={resumoPix.erros || 0} detail="Exigem verificacao manual" icon={AlertTriangle} />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
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

            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black mb-3">Vendas recentes</p>
              {vendasPix.length ? (
                <div className="max-h-80 overflow-auto pr-1">
                  <div className="grid gap-3">
                    {vendasPix.slice(0, 12).map((venda) => (
                      <div key={venda.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{venda.nome || 'Cliente sem nome'}</p>
                            <p className="truncate text-xs text-gray-500">
                              {venda.hotspot_nome || 'Sem hotspot'} / {venda.plano_nome || 'Sem plano'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {venda.cliente_nome || 'Sem cliente vinculado'} - {venda.metodo_pagamento || 'PIX'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-[#ff9d2e]">{money(venda.valor)}</p>
                            <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(venda.status)}`}>
                              {venda.status || 'pendente'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma venda registrada no periodo.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
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

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-xl font-black mb-5 flex items-center gap-2">
              <Plus size={20} className="text-[#6be12f]" /> Plano de acesso
            </h2>

            <form onSubmit={salvarPlano} className="grid gap-4">
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

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formPlano.valor}
                  onChange={(event) => setFormPlano((prev) => ({ ...prev, valor: event.target.value }))}
                  className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                  placeholder="Valor"
                />
                <input
                  type="number"
                  min="1"
                  value={formPlano.duracaoMinutos}
                  onChange={(event) => setFormPlano((prev) => ({ ...prev, duracaoMinutos: event.target.value }))}
                  className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-white outline-none"
                  placeholder="Minutos"
                />
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

              <label className="flex items-center gap-3 text-sm font-bold text-gray-300">
                <input
                  type="checkbox"
                  checked={formPlano.ativo}
                  onChange={(event) => setFormPlano((prev) => ({ ...prev, ativo: event.target.checked }))}
                  className="h-5 w-5 accent-[#6be12f]"
                />
                Plano ativo no portal
              </label>

              <button
                type="submit"
                disabled={saving || !hotspotId}
                className="rounded-2xl bg-[#6be12f] px-6 py-4 text-black font-black flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar plano
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-xl font-black mb-5 flex items-center gap-2">
              <QrCode size={20} className="text-[#6be12f]" /> Planos cadastrados
            </h2>

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="animate-spin text-[#6be12f]" />
              </div>
            ) : planosDoHotspot.length ? (
              <div className="grid gap-3">
                {planosDoHotspot.map((plano) => (
                  <div
                    key={plano.id}
                    className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black">{plano.nome}</p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                            plano.ativo ? 'bg-[#6be12f]/15 text-[#6be12f]' : 'bg-white/[0.06] text-gray-500'
                          }`}>
                            {plano.ativo ? 'Ativo' : 'Arquivado'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{plano.descricao || 'Sem descrição'}</p>
                        <p className="text-xs text-gray-600 mt-2">
                          {plano.duracao_minutos} min / {plano.velocidade_download} download / {plano.velocidade_upload} upload
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#6be12f] font-black">{money(plano.valor)}</p>
                        <div className="flex justify-end gap-2 mt-3">
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
                  Pix e cartão usam link seguro do Asaas. Para funcionar dentro do hotspot bloqueado,
                  libere os domínios do Asaas no walled garden do MikroTik.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
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
