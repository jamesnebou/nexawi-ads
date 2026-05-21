'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { getLpConfig, slugifyLp } from '@/lib/lp-generator-defaults'
import {
  ArrowLeft,
  Upload,
  Eye,
  Image as ImageIcon,
  Loader2,
  Palette,
  Save,
  Settings2,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const tabs = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'hero', label: 'Hero' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'prova', label: 'Prova social' },
  { id: 'oferta', label: 'Oferta' },
  { id: 'faq', label: 'FAQ' },
  { id: 'formulario', label: 'Formulario' },
  { id: 'seo', label: 'SEO' },
]

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

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

function updateNested(setConfig, section, key, value) {
  setConfig((current) => ({
    ...current,
    [section]: {
      ...(current[section] || {}),
      [key]: value,
    },
  }))
}

function Field({ label, value, onChange, placeholder = '', textarea = false, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
        />
      )}
    </label>
  )
}

function ImageUploadField({ label, value, onChange, field, slug }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const uploadInfo = await adminApiFetch('/api/admin/lp-generator/upload-url', {
        method: 'POST',
        body: {
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          slug,
          field,
        },
      })

      const { error: uploadError } = await supabase.storage
        .from('landing-assets')
        .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      onChange(uploadInfo.publicUrl)
      toast.success('Imagem enviada.')
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar imagem.')
    } finally {
      event.target.value = ''
      setUploading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {value ? (
          <img src={value} alt="" className="h-24 w-32 rounded-xl border border-white/[0.08] object-cover" />
        ) : (
          <div className="flex h-24 w-32 items-center justify-center rounded-xl border border-dashed border-white/[0.14] bg-black/40 text-neutral-600">
            <ImageIcon size={24} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">{label}</p>
          <input
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder="URL da imagem"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-black text-[#8cf059] transition hover:bg-[#6be12f]/15">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {uploading ? 'Enviando...' : 'Enviar imagem'}
              <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
            </label>

            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-black text-white"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#6be12f]"
      />
    </label>
  )
}

function ListEditor({ items = [], labels, onChange }) {
  function updateItem(index, key, value) {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    onChange(next)
  }

  function addItem() {
    onChange([...items, labels.reduce((acc, item) => ({ ...acc, [item.key]: '' }), {})])
  }

  function removeItem(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl border border-white/[0.06] bg-black/35 p-4">
          <div className="grid gap-3">
            {labels.map((label) => (
              <Field
                key={label.key}
                label={label.label}
                value={item[label.key]}
                onChange={(value) => updateItem(index, label.key, value)}
                textarea={label.textarea}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
          >
            Remover item
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059]"
      >
        Adicionar item
      </button>
    </div>
  )
}

export default function LpEditorPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const hasValidId = isValidUuid(id)
  const [activeTab, setActiveTab] = useState('identidade')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState('draft')
  const [config, setConfig] = useState(getLpConfig())

  const publicUrl = useMemo(() => `/lp/${slug || 'slug-da-lp'}`, [slug])

  const loadPage = useCallback(async () => {
    if (!hasValidId) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const data = await adminApiFetch(`/api/admin/lp-generator?id=${id}`)
      setPage(data.page)
      setName(data.page.name || '')
      setSlug(data.page.slug || '')
      setStatus(data.page.status || 'draft')
      setConfig(getLpConfig(data.page.config || {}))
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar LP.')
    } finally {
      setLoading(false)
    }
  }, [hasValidId, id])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  async function savePage() {
    if (!hasValidId) {
      toast.error('Abra o editor pelo botao Editar de uma LP existente.')
      return
    }

    setSaving(true)

    try {
      const data = await adminApiFetch('/api/admin/lp-generator', {
        method: 'POST',
        body: {
          action: 'update',
          id,
          name,
          slug,
          status,
          config,
        },
      })

      setPage(data.page)
      setSlug(data.page.slug || slug)
      toast.success('LP salva.')
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar LP.')
    } finally {
      setSaving(false)
    }
  }

  function renderTab() {
    if (activeTab === 'identidade') {
      return (
        <div className="grid gap-4">
          <Field label="Nome interno" value={name} onChange={setName} />
          <Field label="Slug publico" value={slug} onChange={(value) => setSlug(slugifyLp(value))} />
          <Field label="Marca exibida" value={config.identidade.marca} onChange={(value) => updateNested(setConfig, 'identidade', 'marca', value)} />
          <ImageUploadField label="Logo" field="logo" slug={slug || name} value={config.identidade.logoUrl} onChange={(value) => updateNested(setConfig, 'identidade', 'logoUrl', value)} />
          <div className="grid gap-4 sm:grid-cols-4">
            <Field type="color" label="Primaria" value={config.identidade.corPrimaria} onChange={(value) => updateNested(setConfig, 'identidade', 'corPrimaria', value)} />
            <Field type="color" label="Secundaria" value={config.identidade.corSecundaria} onChange={(value) => updateNested(setConfig, 'identidade', 'corSecundaria', value)} />
            <Field type="color" label="Fundo" value={config.identidade.corFundo} onChange={(value) => updateNested(setConfig, 'identidade', 'corFundo', value)} />
            <Field type="color" label="Texto" value={config.identidade.corTexto} onChange={(value) => updateNested(setConfig, 'identidade', 'corTexto', value)} />
          </div>
        </div>
      )
    }

    if (activeTab === 'hero') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir hero" checked={config.hero.ativo} onChange={(value) => updateNested(setConfig, 'hero', 'ativo', value)} />
          <Field label="Eyebrow" value={config.hero.eyebrow} onChange={(value) => updateNested(setConfig, 'hero', 'eyebrow', value)} />
          <Field label="Titulo" value={config.hero.titulo} onChange={(value) => updateNested(setConfig, 'hero', 'titulo', value)} textarea />
          <Field label="Subtitulo" value={config.hero.subtitulo} onChange={(value) => updateNested(setConfig, 'hero', 'subtitulo', value)} textarea />
          <Field label="Texto do CTA" value={config.hero.ctaTexto} onChange={(value) => updateNested(setConfig, 'hero', 'ctaTexto', value)} />
          <Field label="URL do CTA" value={config.hero.ctaUrl} onChange={(value) => updateNested(setConfig, 'hero', 'ctaUrl', value)} />
          <ImageUploadField label="Imagem principal" field="hero" slug={slug || name} value={config.hero.imagemUrl} onChange={(value) => updateNested(setConfig, 'hero', 'imagemUrl', value)} />
          <ImageUploadField label="Background" field="background" slug={slug || name} value={config.hero.backgroundUrl} onChange={(value) => updateNested(setConfig, 'hero', 'backgroundUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'beneficios') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir beneficios" checked={config.beneficios.ativo} onChange={(value) => updateNested(setConfig, 'beneficios', 'ativo', value)} />
          <Field label="Titulo" value={config.beneficios.titulo} onChange={(value) => updateNested(setConfig, 'beneficios', 'titulo', value)} />
          <ListEditor
            items={config.beneficios.itens || []}
            labels={[{ key: 'titulo', label: 'Titulo' }, { key: 'texto', label: 'Texto', textarea: true }]}
            onChange={(value) => updateNested(setConfig, 'beneficios', 'itens', value)}
          />
        </div>
      )
    }

    if (activeTab === 'prova') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir prova social" checked={config.prova.ativo} onChange={(value) => updateNested(setConfig, 'prova', 'ativo', value)} />
          <Field label="Titulo" value={config.prova.titulo} onChange={(value) => updateNested(setConfig, 'prova', 'titulo', value)} />
          <Field label="Depoimento" value={config.prova.depoimento} onChange={(value) => updateNested(setConfig, 'prova', 'depoimento', value)} textarea />
          <Field label="Autor" value={config.prova.autor} onChange={(value) => updateNested(setConfig, 'prova', 'autor', value)} />
        </div>
      )
    }

    if (activeTab === 'oferta') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir oferta" checked={config.oferta.ativo} onChange={(value) => updateNested(setConfig, 'oferta', 'ativo', value)} />
          <Field label="Titulo" value={config.oferta.titulo} onChange={(value) => updateNested(setConfig, 'oferta', 'titulo', value)} />
          <Field label="Texto" value={config.oferta.texto} onChange={(value) => updateNested(setConfig, 'oferta', 'texto', value)} textarea />
          <Field label="Preco" value={config.oferta.preco} onChange={(value) => updateNested(setConfig, 'oferta', 'preco', value)} />
          <Field label="Texto do CTA" value={config.oferta.ctaTexto} onChange={(value) => updateNested(setConfig, 'oferta', 'ctaTexto', value)} />
          <Field label="URL do CTA" value={config.oferta.ctaUrl} onChange={(value) => updateNested(setConfig, 'oferta', 'ctaUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'faq') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir FAQ" checked={config.faq.ativo} onChange={(value) => updateNested(setConfig, 'faq', 'ativo', value)} />
          <Field label="Titulo" value={config.faq.titulo} onChange={(value) => updateNested(setConfig, 'faq', 'titulo', value)} />
          <ListEditor
            items={config.faq.itens || []}
            labels={[{ key: 'pergunta', label: 'Pergunta' }, { key: 'resposta', label: 'Resposta', textarea: true }]}
            onChange={(value) => updateNested(setConfig, 'faq', 'itens', value)}
          />
        </div>
      )
    }

    if (activeTab === 'formulario') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir formulario" checked={config.formulario.ativo} onChange={(value) => updateNested(setConfig, 'formulario', 'ativo', value)} />
          <Field label="Titulo" value={config.formulario.titulo} onChange={(value) => updateNested(setConfig, 'formulario', 'titulo', value)} />
          <Field label="Texto" value={config.formulario.texto} onChange={(value) => updateNested(setConfig, 'formulario', 'texto', value)} textarea />
          <Field label="Texto do botao" value={config.formulario.botao} onChange={(value) => updateNested(setConfig, 'formulario', 'botao', value)} />
          <Field label="WhatsApp destino" value={config.formulario.destinoWhatsapp} onChange={(value) => updateNested(setConfig, 'formulario', 'destinoWhatsapp', value)} />
        </div>
      )
    }

    return (
      <div className="grid gap-4">
        <Field label="Title SEO" value={config.seo.title} onChange={(value) => updateNested(setConfig, 'seo', 'title', value)} />
        <Field label="Description SEO" value={config.seo.description} onChange={(value) => updateNested(setConfig, 'seo', 'description', value)} textarea />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Toaster position="top-right" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/gerador-de-lp/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white">
              <ArrowLeft size={16} />
              Voltar para LPs
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Editor de LP
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {page?.slug ? `/lp/${page.slug}` : 'Carregando...'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={publicUrl} target="_blank" className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-black text-white">
              <Eye size={17} />
              Preview
            </Link>
            <button
              onClick={savePage}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              Salvar
            </button>
          </div>
        </header>

        {!hasValidId ? (
          <div className="rounded-[1.5rem] border border-yellow-500/20 bg-yellow-500/10 p-10 text-center">
            <p className="text-lg font-black text-yellow-200">ID da LP invalido.</p>
            <p className="mt-2 text-sm text-yellow-100/75">
              Volte para o painel do gerador e abra uma landing page pelo botao Editar.
            </p>
            <Link
              href="/gerador-de-lp/dashboard"
              className="mt-6 inline-flex rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black"
            >
              Voltar para LPs
            </Link>
          </div>
        ) : loading ? (
          <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-10 text-center">
            <Loader2 className="mx-auto animate-spin text-[#8cf059]" size={28} />
            <p className="mt-4 text-sm font-bold text-neutral-400">Carregando editor...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 lg:sticky lg:top-6 lg:self-start">
              <div className="mb-4 flex items-center gap-3 px-2">
                <Settings2 size={18} className="text-[#8cf059]" />
                <p className="text-sm font-black">Secoes</p>
              </div>

              <nav className="grid gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                      activeTab === tab.id
                        ? 'bg-[#6be12f] text-black'
                        : 'bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Status</p>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black px-3 py-2 text-sm text-white"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicada</option>
                </select>
              </div>
            </aside>

            <section className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                {activeTab === 'identidade' ? <Palette size={20} className="text-[#8cf059]" /> : <ImageIcon size={20} className="text-[#8cf059]" />}
                <div>
                  <h2 className="text-xl font-black">
                    {tabs.find((tab) => tab.id === activeTab)?.label}
                  </h2>
                  <p className="text-xs text-neutral-500">Edite os campos e clique em salvar.</p>
                </div>
              </div>

              {renderTab()}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
