'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { adminApiFetch } from '@/lib/admin-api-client'

const PAGE_SIZE = 50

function formatDate(value) {
  if (!value) return 'Ainda sem acessos'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default function ShortLinksPage() {
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://www.nexawi.com.br')
  const [permissions, setPermissions] = useState({ canCreate: false, canUpdate: false })
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [latestUrl, setLatestUrl] = useState('')
  const [title, setTitle] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
        if (search.trim()) params.set('search', search.trim())
        if (companyId) params.set('empresa_id', companyId)
        const data = await adminApiFetch(`/api/admin/short-links?${params}`)
        if (!active) return
        setItems(data.items || [])
        setCompanies(data.companies || [])
        setTotal(Number(data.total || 0))
        setBaseUrl(data.base_url || 'https://www.nexawi.com.br')
        setPermissions({
          canCreate: Boolean(data.scope?.canCreate),
          canUpdate: Boolean(data.scope?.canUpdate),
        })
        if (!companyId) {
          setCompanyId(data.scope?.activeEmpresaId || data.companies?.[0]?.id || '')
        }
      } catch (error) {
        if (active) setFeedback({ type: 'error', text: error.message || 'Não foi possível carregar os links.' })
      } finally {
        if (active) setLoading(false)
      }
    }, search ? 300 : 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [companyId, offset, refreshKey, search])

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url)
      setFeedback({ type: 'success', text: 'Link copiado.' })
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível copiar. Selecione o endereço e copie manualmente.' })
    }
  }

  async function createLink(event) {
    event.preventDefault()
    if (!companyId) {
      setFeedback({ type: 'error', text: 'Selecione uma empresa.' })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const data = await adminApiFetch('/api/admin/short-links', {
        method: 'POST',
        body: JSON.stringify({ empresa_id: companyId, title, target_url: targetUrl, slug }),
      })
      setLatestUrl(data.item.short_url)
      setTitle('')
      setTargetUrl('')
      setSlug('')
      setOffset(0)
      setRefreshKey((value) => value + 1)
      setFeedback({ type: 'success', text: 'Link curto criado. Você já pode copiá-lo e compartilhar.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Não foi possível criar o link.' })
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    setFeedback(null)
    try {
      await adminApiFetch(`/api/admin/short-links/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editing.title, target_url: editing.target_url }),
      })
      setEditing(null)
      setRefreshKey((value) => value + 1)
      setFeedback({ type: 'success', text: 'Destino atualizado. O endereço curto continua o mesmo.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Não foi possível atualizar o link.' })
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(item) {
    setBusy(true)
    setFeedback(null)
    try {
      await adminApiFetch(`/api/admin/short-links/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: item.status === 'active' ? 'inactive' : 'active' }),
      })
      setRefreshKey((value) => value + 1)
      setFeedback({ type: 'success', text: item.status === 'active' ? 'Link pausado.' : 'Link reativado.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Não foi possível alterar o status.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080b09] px-4 py-8 text-white sm:px-7 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#69e52f]/25 bg-[#69e52f]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#9af36c]">
              <Link2 size={15} /> Geradores NexaWi
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Encurtador de links</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Crie endereços curtos para campanhas, WhatsApp ou sites. Troque o destino depois sem mudar o link compartilhado.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-300">
            <BarChart3 size={19} className="text-[#8cf45e]" /> {total} link{total === 1 ? '' : 's'} nesta seleção
          </div>
        </div>

        {feedback && (
          <div role="status" className={`mb-6 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-[#69e52f]/30 bg-[#69e52f]/10 text-[#bbf9a4]'}`}>
            {feedback.text}
          </div>
        )}

        {permissions.canCreate && (
          <form onSubmit={createLink} className="mb-8 rounded-[2rem] border border-[#69e52f]/20 bg-[linear-gradient(135deg,rgba(105,229,47,0.09),rgba(255,255,255,0.025))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.16)] sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#69e52f]/15 text-[#8cf45e]"><Plus size={21} /></span>
              <div>
                <h2 className="text-lg font-extrabold">Novo link curto</h2>
                <p className="text-xs text-neutral-400">O código é opcional. Se ficar vazio, criamos um automaticamente.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Nome interno
                <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Campanha de setembro" className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-[#69e52f]/70" />
              </label>
              <label className="block text-xs font-semibold text-neutral-300">
                Empresa
                <select required value={companyId} onChange={(event) => { setCompanyId(event.target.value); setOffset(0) }} className="mt-2 w-full rounded-xl border border-white/15 bg-[#111713] px-4 py-3 text-sm text-white outline-none transition focus:border-[#69e52f]/70">
                  <option value="">Selecione uma empresa</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.nome_empresa}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-300 lg:col-span-2">
                URL de destino
                <input required type="url" maxLength={2048} value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://suaempresa.com.br/pagina" className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-[#69e52f]/70" />
              </label>
              <label className="block text-xs font-semibold text-neutral-300 lg:col-span-2">
                Código personalizado <span className="font-normal text-neutral-500">(opcional)</span>
                <input maxLength={40} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="minha-campanha" className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-[#69e52f]/70" />
                <span className="mt-2 block break-all font-normal text-neutral-500">{baseUrl}/l/{slug || 'codigo-gerado'}</span>
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-neutral-400"><ShieldCheck size={16} className="text-[#8cf45e]" /> Só usuários autorizados podem criar ou editar links.</p>
              <button type="submit" disabled={busy || !companyId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#69e52f] px-5 py-3 text-sm font-extrabold text-black transition hover:bg-[#8cf45e] disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Criar link
              </button>
            </div>
          </form>
        )}

        {latestUrl && (
          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#69e52f]/35 bg-[#69e52f]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#aaf48b]">Pronto para compartilhar</p><p className="mt-2 break-all text-lg font-bold">{latestUrl}</p></div>
            <button type="button" onClick={() => copyUrl(latestUrl)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#69e52f] px-4 py-3 text-sm font-bold text-black"><Copy size={16} /> Copiar link</button>
          </div>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-extrabold">Links criados</h2><p className="mt-1 text-xs text-neutral-500">O código permanece igual quando você troca o destino.</p></div>
            <label className="relative block w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0) }} placeholder="Buscar por nome ou código" aria-label="Buscar links por nome ou código" className="w-full rounded-xl border border-white/15 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#69e52f]/70" />
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-neutral-400"><Loader2 size={18} className="animate-spin" /> Carregando links...</div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center text-sm text-neutral-400">Nenhum link encontrado nesta seleção.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold">{item.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.status === 'active' ? 'bg-[#69e52f]/15 text-[#aaf48b]' : 'bg-white/10 text-neutral-400'}`}>{item.status === 'active' ? 'Ativo' : 'Pausado'}</span>
                      </div>
                      <a href={item.short_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-sm font-bold text-[#9bf070] hover:underline">{item.short_url}<ExternalLink size={13} className="shrink-0" /></a>
                      <p className="mt-2 break-all text-xs text-neutral-500">Destino: {item.target_url}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-400"><span className="inline-flex items-center gap-1"><BarChart3 size={14} /> {Number(item.click_count || 0).toLocaleString('pt-BR')} acessos</span><span>Último acesso: {formatDate(item.last_clicked_at)}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => copyUrl(item.short_url)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white transition hover:border-[#69e52f]/40"><Copy size={14} /> Copiar</button>
                      {permissions.canUpdate && <button type="button" onClick={() => setEditing({ id: item.id, title: item.title, target_url: item.target_url })} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white transition hover:border-[#69e52f]/40"><Pencil size={14} /> Editar</button>}
                      {permissions.canUpdate && <button type="button" disabled={busy} onClick={() => toggleStatus(item)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-neutral-300 transition hover:border-[#69e52f]/40 disabled:opacity-50">{item.status === 'active' ? 'Pausar' : 'Reativar'}</button>}
                    </div>
                  </div>
                  {editing?.id === item.id && (
                    <form onSubmit={saveEdit} className="mt-5 grid gap-3 border-t border-white/10 pt-5">
                      <label className="text-xs font-semibold text-neutral-300">Nome<input required maxLength={160} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#69e52f]/70" /></label>
                      <label className="text-xs font-semibold text-neutral-300">Novo destino<input required type="url" maxLength={2048} value={editing.target_url} onChange={(event) => setEditing({ ...editing, target_url: event.target.value })} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#69e52f]/70" /></label>
                      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#69e52f] px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50"><Check size={14} /> Salvar</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold">Cancelar</button></div>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}

          {total > PAGE_SIZE && <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-neutral-400"><span>Exibindo {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}</span><div className="flex gap-2"><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Anterior</button><button type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Próxima <ArrowRight size={12} className="ml-1 inline" /></button></div></div>}
        </section>
      </div>
    </main>
  )
}
