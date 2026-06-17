'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

async function adminApiFetch(path) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
  }

  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`A API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) throw new Error(data?.error || 'Erro na API administrativa')
  return data
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function csvCell(value) {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

function customFieldsFromLead(lead) {
  return Array.isArray(lead?.metadata?.custom_fields)
    ? lead.metadata.custom_fields.filter((field) => String(field?.valor || '').trim())
    : []
}

function customFieldsSummary(lead) {
  return customFieldsFromLead(lead)
    .map((field) => `${field.rotulo}: ${field.valor}`)
    .join(' | ')
}

function Kpi({ label, value, detail }) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs font-bold text-neutral-500">{detail}</p>
    </div>
  )
}

function SourceBreakdown({ title, items = [] }) {
  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0)

  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
      <h3 className="text-sm font-black text-white">{title}</h3>
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

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

export default function LpGeneratorLeadsPage() {
  const [leads, setLeads] = useState([])
  const [pages, setPages] = useState([])
  const [resumo, setResumo] = useState({
    total: 0,
    hoje: 0,
    mes: 0,
    visitas: 0,
    visitasHoje: 0,
    visitasMes: 0,
    conversao: 0,
  })
  const [busca, setBusca] = useState('')
  const [pageId, setPageId] = useState('')
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState({})

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === pageId) || null,
    [pageId, pages]
  )

  const loadLeads = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (busca.trim()) params.set('busca', busca.trim())
      if (pageId) params.set('pageId', pageId)

      const data = await adminApiFetch(`/api/admin/lp-generator/leads?${params.toString()}`)
      setLeads(data.leads || [])
      setPages(data.pages || [])
      setResumo(data.resumo || {
        total: 0,
        hoje: 0,
        mes: 0,
        visitas: 0,
        visitasHoje: 0,
        visitasMes: 0,
        conversao: 0,
      })
      setPermissions(data.permissions || {})
    } catch (error) {
      console.error(error)
      toast.error(error.message || 'Erro ao carregar leads das LPs.')
    } finally {
      setLoading(false)
    }
  }, [busca, pageId])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  function exportCsv() {
    if (leads.length === 0) {
      toast.error('Não há leads para exportar.')
      return
    }

    if (permissions.export === false) {
      toast.error('Você não tem permissão para exportar leads.')
      return
    }

    const rows = [
      ['Data', 'LP', 'Slug', 'Nome', 'Telefone', 'Email', 'Mensagem', 'Campos extras'],
      ...leads.map((lead) => [
        formatDate(lead.created_at),
        lead.page_name,
        lead.page_public_slug || lead.page_slug,
        lead.nome,
        lead.telefone,
        lead.email,
        lead.mensagem,
        customFieldsSummary(lead),
      ]),
    ]

    const csvContent = '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leads_lp_nexawi_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Toaster position="top-right" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/gerador-de-lp/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white">
              <ArrowLeft size={16} />
              Voltar para LPs
            </Link>

            <div className="mt-5 flex items-start gap-4">
              <div className="rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 p-3 text-[#8cf059]">
                <UserPlus size={30} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8cf059]">
                  Captura de leads
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                  Leads das LPs
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">
                  Acompanhe os contatos enviados pelas landing pages criadas no gerador.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading || leads.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-4 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Visitas" value={resumo.visitas || 0} detail="visualizações totais" />
          <Kpi label="Visitas hoje" value={resumo.visitasHoje || 0} detail="visualizações no dia" />
          <Kpi label="Visitas mês" value={resumo.visitasMes || 0} detail="visualizações no mês" />
          <Kpi label="Total" value={resumo.total || 0} detail="leads encontrados" />
          <Kpi label="Hoje" value={resumo.hoje || 0} detail="capturados no dia" />
          <Kpi label="Conversão" value={formatPercent(resumo.conversao)} detail="leads / visitas" />
        </section>

        <section className="rounded-[1.5rem] border border-[#6be12f]/20 bg-[#6be12f]/10 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-1 text-[#8cf059]" size={22} />
              <div>
                <h2 className="font-black text-white">Funil da LP</h2>
                <p className="mt-1 text-sm text-neutral-300">
                  {resumo.visitas || 0} visita(s) geraram {resumo.total || 0} lead(s).
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-black text-[#8cf059]">
              Conversão: {formatPercent(resumo.conversao)}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <SourceBreakdown title="Origem das visitas" items={resumo.origemVisitas || []} />
          <SourceBreakdown title="Origem dos leads" items={resumo.origemLeads || []} />
        </section>

        <section className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              loadLeads()
            }}
            className="grid gap-3 lg:grid-cols-[1fr_280px_auto]"
          >
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, telefone, email ou slug"
                className="w-full rounded-2xl border border-white/[0.06] bg-black/40 py-4 pl-12 pr-4 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
              />
            </div>

            <select
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
              className="rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-4 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
            >
              <option value="">Todas as LPs</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>

            <button className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm font-black text-white transition hover:bg-white/[0.08]">
              Buscar
            </button>
          </form>

          {selectedPage && (
            <p className="mt-3 text-xs font-bold text-neutral-500">
              Filtrando por /lp/{selectedPage.slug}
            </p>
          )}
        </section>

        <section className="grid gap-4">
          {loading ? (
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-[#8cf059]" size={28} />
              <p className="mt-4 text-sm font-bold text-neutral-400">Carregando leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-10 text-center">
              <FileText className="mx-auto text-neutral-600" size={34} />
              <p className="mt-4 text-lg font-black">Nenhum lead encontrado.</p>
              <p className="mt-2 text-sm text-neutral-500">Quando alguém preencher uma LP publicada, o contato aparece aqui.</p>
            </div>
          ) : (
            leads.map((lead) => (
              <article key={lead.id} className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-black">{lead.nome || 'Lead sem nome'}</h2>
                      <span className="rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#8cf059]">
                        {lead.page_name}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-neutral-300">
                      {lead.telefone || '-'} {lead.email ? `- ${lead.email}` : ''}
                    </p>
                    {lead.mensagem && (
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-500">{lead.mensagem}</p>
                    )}
                    {customFieldsFromLead(lead).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {customFieldsFromLead(lead).map((field) => (
                          <span key={`${lead.id}-${field.id}`} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-neutral-300">
                            <strong className="text-white">{field.rotulo}:</strong> {field.valor}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-neutral-600">{formatDate(lead.created_at)}</p>
                  </div>

                  {lead.page_public_slug && (
                    <Link
                      href={`/lp/${lead.page_public_slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.08]"
                    >
                      <ExternalLink size={15} />
                      Abrir LP
                    </Link>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
