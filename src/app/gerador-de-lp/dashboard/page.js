'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { LP_GENERATOR_TEMPLATES } from '@/lib/lp-generator-defaults'
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessao administrativa nao encontrada. Faca login novamente.')
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
    throw new Error(`A API nao retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) throw new Error(data?.error || 'Erro na API administrativa')
  return data
}

function statusBadge(status) {
  if (status === 'published') {
    return 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20'
  }

  return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LpGeneratorDashboard() {
  const router = useRouter()
  const [pages, setPages] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(LP_GENERATOR_TEMPLATES[0]?.id || '')

  const loadPages = useCallback(async (nextBusca = busca) => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (nextBusca.trim()) params.set('busca', nextBusca.trim())

      const data = await adminApiFetch(`/api/admin/lp-generator?${params.toString()}`)
      setPages(data.pages || [])
    } catch (error) {
      console.error(error)
      toast.error(error.message || 'Erro ao carregar landing pages.')
    } finally {
      setLoading(false)
    }
  }, [busca])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  async function createPage() {
    setSaving(true)

    try {
      const data = await adminApiFetch('/api/admin/lp-generator', {
        method: 'POST',
        body: {
          action: 'create',
          template: selectedTemplate,
        },
      })

      toast.success('LP criada.')
      router.push(`/gerador-de-lp/editor/${data.page.id}`)
    } catch (error) {
      toast.error(error.message || 'Erro ao criar LP.')
    } finally {
      setSaving(false)
    }
  }

  async function runAction(action, id) {
    setSaving(true)

    try {
      await adminApiFetch('/api/admin/lp-generator', {
        method: 'POST',
        body: { action, id },
      })

      toast.success('Acao concluida.')
      loadPages()
    } catch (error) {
      toast.error(error.message || 'Erro ao executar acao.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Toaster position="top-right" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 p-3 text-[#8cf059]">
              <FileText size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8cf059]">
                NexaWi LP Builder
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Gerador de LP
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">
                Crie landing pages de alta conversao com secoes editaveis, publicacao por slug e pagina publica pronta para captar leads.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/gerador-de-lp/leads"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-4 text-sm font-black text-white transition hover:bg-white/[0.08]"
            >
              <UserPlus size={18} />
              Leads
            </Link>

            <button
              onClick={createPage}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-6 py-4 text-sm font-black text-black shadow-[0_0_28px_rgba(107,225,47,0.22)] transition hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Nova LP
            </button>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
          <div className="mb-4 flex items-center gap-3">
            <BadgeCheck size={19} className="text-[#8cf059]" />
            <div>
              <h2 className="text-lg font-black">Templates prontos</h2>
              <p className="text-xs text-neutral-500">Escolha o ponto de partida antes de criar uma nova LP.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {LP_GENERATOR_TEMPLATES.map((template) => {
              const selected = selectedTemplate === template.id

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-[#6be12f]/40 bg-[#6be12f]/10'
                      : 'border-white/[0.06] bg-black/30 hover:border-white/[0.14] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{template.name}</p>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-500">{template.description}</p>
                    </div>
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${selected ? 'bg-[#6be12f]' : 'bg-white/15'}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              loadPages()
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome ou slug"
                className="w-full rounded-2xl border border-white/[0.06] bg-black/40 py-4 pl-12 pr-4 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
              />
            </div>

            <button className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm font-black text-white transition hover:bg-white/[0.08]">
              Buscar
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          {loading ? (
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-[#8cf059]" size={28} />
              <p className="mt-4 text-sm font-bold text-neutral-400">Carregando LPs...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-10 text-center">
              <p className="text-lg font-black">Nenhuma LP criada ainda.</p>
              <p className="mt-2 text-sm text-neutral-500">Crie a primeira para abrir o editor.</p>
            </div>
          ) : (
            pages.map((page) => (
              <article key={page.id} className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-black">{page.name}</h2>
                      <span className={`rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadge(page.status)}`}>
                        {page.status === 'published' ? 'publicada' : 'rascunho'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-500">/lp/{page.slug}</p>
                    <p className="mt-1 text-xs text-neutral-600">Atualizada em {formatDate(page.updated_at)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/gerador-de-lp/editor/${page.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.08]"
                    >
                      <Pencil size={15} />
                      Editar
                    </Link>
                    <Link
                      href={`/lp/${page.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.08]"
                    >
                      <ExternalLink size={15} />
                      Abrir
                    </Link>
                    <button
                      onClick={() => runAction('toggle', page.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059] transition hover:bg-[#6be12f]/15 disabled:opacity-60"
                    >
                      <Globe2 size={15} />
                      {page.status === 'published' ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => runAction('duplicate', page.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                    >
                      <Copy size={15} />
                      Duplicar
                    </button>
                    <button
                      onClick={() => runAction('archive', page.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-black text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
                    >
                      <Trash2 size={15} />
                      Arquivar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
