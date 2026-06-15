'use client'

import { Poppins } from 'next/font/google'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente-client'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const supabase = createClient()

async function getClienteAccessToken() {
  const { data: sessionData } = await supabase.auth.getSession()

  if (sessionData?.session?.access_token) return sessionData.session.access_token

  const { data: refreshedData } = await supabase.auth.refreshSession()
  return refreshedData?.session?.access_token || ''
}

async function clienteApiFetch(path) {
  const token = await getClienteAccessToken()

  if (!token) {
    throw new Error('Sessao do cliente nao encontrada.')
  }

  const response = await fetch(path, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`A API nao retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) throw new Error(data?.error || 'Erro ao carregar LPs.')
  return data
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

function SourceBreakdown({ title, items = [] }) {
  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0)

  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-white">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">Sem origem registrada ainda.</p>
        ) : items.slice(0, 5).map((item) => {
          const percent = total > 0 ? Math.round((Number(item.total || 0) / total) * 100) : 0

          return (
            <div key={item.source}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold">
                <span className="capitalize text-neutral-300">{item.source}</span>
                <span className="text-neutral-500">{item.total} - {percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#6be12f]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function camposExtrasDoLead(lead) {
  return Array.isArray(lead?.metadata?.custom_fields)
    ? lead.metadata.custom_fields.filter((field) => String(field?.valor || '').trim())
    : []
}

function resumoCamposExtras(lead) {
  return camposExtrasDoLead(lead)
    .map((field) => `${field.rotulo}: ${field.valor}`)
    .join(' | ')
}

export default function ClienteLpsPage() {
  const router = useRouter()
  const [pages, setPages] = useState([])
  const [leads, setLeads] = useState([])
  const [resumo, setResumo] = useState({})
  const [pageId, setPageId] = useState('')
  const [loading, setLoading] = useState(true)

  const selectedPage = useMemo(() => {
    return pages.find((page) => page.id === pageId) || null
  }, [pages, pageId])

  const carregarDados = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (pageId) params.set('pageId', pageId)

      const data = await clienteApiFetch(`/api/cliente/lp-generator?${params.toString()}`)
      setPages(data.pages || [])
      setLeads(data.leads || [])
      setResumo(data.resumo || {})
    } catch (error) {
      console.error('Erro ao carregar LPs do cliente:', error)

      if (String(error.message || '').includes('Sessao do cliente')) {
        toast.error('Sessao expirada. Faca login novamente.')
        setTimeout(() => router.push('/cliente/login?redirect=/cliente/lps'), 900)
        return
      }

      toast.error(error.message || 'Erro ao carregar LPs.')
    } finally {
      setLoading(false)
    }
  }, [pageId, router])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  function exportarCSV() {
    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar.')
      return
    }

    const linhas = [
      ['Nome', 'Telefone', 'E-mail', 'Mensagem', 'Campos extras', 'LP', 'Data'],
      ...leads.map((lead) => [
        lead.nome || '',
        lead.telefone || '',
        lead.email || '',
        lead.mensagem || '',
        resumoCamposExtras(lead),
        lead.page_name || lead.page_slug || '',
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
    link.download = `leads_lps_${new Date().toISOString().slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const cards = [
    { label: 'LPs', value: resumo.paginas, detail: `${formatNumber(resumo.publicadas)} publicadas`, icon: FileText, color: 'text-[#8cf059]' },
    { label: 'Visitas', value: resumo.visitas, detail: `${formatNumber(resumo.visitasHoje)} hoje`, icon: BarChart3, color: 'text-cyan-300' },
    { label: 'Visitas no mes', value: resumo.visitasMes, detail: 'mes atual', icon: CalendarDays, color: 'text-blue-300' },
    { label: 'Leads', value: resumo.leads, detail: `${formatNumber(resumo.leadsHoje)} hoje`, icon: Users, color: 'text-orange-300' },
    { label: 'Leads no mes', value: resumo.leadsMes, detail: 'mes atual', icon: TrendingUp, color: 'text-purple-300' },
    { label: 'Conversao', value: formatPercent(resumo.conversao), detail: 'lead por visita', icon: TrendingUp, color: 'text-[#8cf059]' },
  ]

  return (
    <>
      <Toaster position="top-right" />

      <main className={`${poppins.className} min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6`}>
        <div className="mx-auto max-w-7xl">
          <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push('/cliente/dashboard')}
                className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-neutral-500 transition-colors hover:text-white"
              >
                <ArrowLeft size={16} />
                Voltar ao painel
              </button>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059]">
                <Globe2 size={13} />
                Minhas landing pages
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                LPs e conversao
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">
                Acompanhe visitas, leads e contatos recebidos pelas landing pages vinculadas a sua conta.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={exportarCSV}
                disabled={leads.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white transition-all hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} />
                Exportar CSV
              </button>

              <button
                type="button"
                onClick={carregarDados}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black transition-all hover:bg-[#8cf059]"
              >
                <RefreshCw size={17} />
                Atualizar
              </button>
            </div>
          </header>

          <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-6">
            {cards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.label} className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">{card.label}</p>
                    <div className="rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-2.5">
                      <Icon size={18} className={card.color} />
                    </div>
                  </div>
                  <p className="text-3xl font-light text-white">
                    {typeof card.value === 'string' ? card.value : formatNumber(card.value)}
                  </p>
                  <p className="mt-2 truncate text-xs text-neutral-500">{card.detail}</p>
                </div>
              )
            })}
          </section>

          <section className="mb-8 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label>
                <span className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                  <FileText size={13} className="text-[#6be12f]" />
                  Landing page
                </span>
                <select
                  value={pageId}
                  onChange={(event) => setPageId(event.target.value)}
                  className="block w-full rounded-2xl border border-white/[0.05] bg-[#0a0a0a] px-5 py-3.5 text-sm font-medium text-white outline-none"
                >
                  <option value="" className="bg-[#0a0a0a]">Todas as LPs</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id} className="bg-[#0a0a0a]">
                      {page.name} - {page.status === 'published' ? 'publicada' : 'rascunho'}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPage?.slug ? (
                <a
                  href={`/lp/${selectedPage.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-sm font-extrabold text-[#8cf059] transition-all hover:bg-[#6be12f]/15"
                >
                  <ExternalLink size={17} />
                  Abrir LP
                </a>
              ) : null}
            </div>
          </section>

          <section className="mb-8 grid gap-5 lg:grid-cols-2">
            <SourceBreakdown title="Origem das visitas" items={resumo.origemVisitas || []} />
            <SourceBreakdown title="Origem dos leads" items={resumo.origemLeads || []} />
          </section>

          <section className="grid gap-8 xl:grid-cols-[0.9fr_1.4fr]">
            <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-xl font-extrabold text-white">LPs vinculadas</h2>
                <p className="mt-1 text-sm text-neutral-500">{formatNumber(pages.length)} pagina(s) encontradas</p>
              </div>

              {loading ? (
                <LoadingBox />
              ) : pages.length === 0 ? (
                <EmptyBox title="Nenhuma LP vinculada" text="Quando uma LP for criada para sua empresa, ela aparecera aqui." />
              ) : (
                <div className="grid gap-3">
                  {pages.map((page) => (
                    <article key={page.id} className="rounded-3xl border border-white/[0.05] bg-[#050505] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-extrabold text-white">{page.name}</h3>
                          <p className="mt-1 text-xs text-neutral-500">/lp/{page.slug}</p>
                          <p className="mt-2 text-[11px] text-neutral-600">Atualizada em {formatDateTime(page.updated_at)}</p>
                        </div>

                        <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                          page.status === 'published'
                            ? 'border-[#6be12f]/20 bg-[#6be12f]/10 text-[#8cf059]'
                            : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
                        }`}>
                          {page.status === 'published' ? 'publicada' : 'rascunho'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/cliente/lps/editor/${page.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-white/[0.08]"
                        >
                          <Pencil size={14} />
                          Editar LP
                        </Link>

                        {page.slug ? (
                          <a
                            href={`/lp/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2.5 text-xs font-extrabold text-[#8cf059] transition hover:bg-[#6be12f]/15"
                          >
                            <ExternalLink size={14} />
                            Abrir
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Leads das LPs</h2>
                  <p className="mt-1 text-sm text-neutral-500">{formatNumber(leads.length)} contato(s) recentes</p>
                </div>
              </div>

              {loading ? (
                <LoadingBox />
              ) : leads.length === 0 ? (
                <EmptyBox title="Nenhum lead de LP" text="Os contatos capturados pelas suas LPs aparecerao nesta lista." />
              ) : (
                <div className="grid gap-3">
                  {leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function LoadingBox() {
  return (
    <div className="flex items-center justify-center rounded-3xl border border-white/[0.05] bg-[#050505] py-20">
      <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-[#6be12f]/60" />
    </div>
  )
}

function EmptyBox({ title, text }) {
  return (
    <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-10 text-center">
      <FileText size={34} className="mx-auto mb-4 text-neutral-700" />
      <h3 className="text-lg font-extrabold text-white">{title}</h3>
      <p className="mt-2 text-sm text-neutral-500">{text}</p>
    </div>
  )
}

function LeadCard({ lead }) {
  return (
    <article className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr_0.9fr] lg:items-center">
        <div>
          <p className="truncate text-base font-extrabold text-white">{lead.nome || 'Lead sem nome'}</p>
          <p className="mt-1 text-xs text-neutral-500">Capturado em {formatDateTime(lead.created_at)}</p>
          <p className="mt-2 truncate text-xs text-[#8cf059]">{lead.page_name || lead.page_slug || 'LP'}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ContactPill icon={Phone} label="Telefone" value={lead.telefone || '-'} />
          <ContactPill icon={Mail} label="E-mail" value={lead.email || '-'} />
        </div>

        <div>
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-500">
            {lead.mensagem || 'Sem mensagem adicional.'}
          </p>
          {camposExtrasDoLead(lead).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {camposExtrasDoLead(lead).map((field) => (
                <span key={`${lead.id}-${field.id}`} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-neutral-300">
                  <strong className="text-white">{field.rotulo}:</strong> {field.valor}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ContactPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <p className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-neutral-600">
        <Icon size={12} className="text-[#6be12f]" />
        {label}
      </p>
      <p className="break-all text-sm font-bold text-white">{value}</p>
    </div>
  )
}
