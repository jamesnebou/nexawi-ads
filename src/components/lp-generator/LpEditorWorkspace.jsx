'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { createClient as createClienteSupabaseClient } from '@/lib/supabase/cliente-client'
import {
  getLpConfig,
  LP_GENERATOR_HERO_VARIANTS,
  LP_GENERATOR_ORDERABLE_SECTIONS,
  LP_GENERATOR_VISUAL_STYLES,
  slugifyLp,
} from '@/lib/lp-generator-defaults'
import GeneratedLandingPage from '@/components/lp-generator/GeneratedLandingPage'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  Upload,
  Eye,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Settings2,
  Smartphone,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const adminSupabase = createBrowserSupabaseClient()
const clienteSupabase = createClienteSupabaseClient()

const tabs = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'cabecalho', label: 'Cabecalho' },
  { id: 'hero', label: 'Hero' },
  { id: 'midia', label: 'Midia' },
  { id: 'logos', label: 'Logos' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'prova', label: 'Prova social' },
  { id: 'galeria', label: 'Prova visual' },
  { id: 'oferta', label: 'Oferta' },
  { id: 'garantia', label: 'Garantia' },
  { id: 'urgencia', label: 'Urgencia' },
  { id: 'precos', label: 'Precos' },
  { id: 'cta', label: 'CTA' },
  { id: 'faq', label: 'FAQ' },
  { id: 'formulario', label: 'Formulario' },
  { id: 'rodape', label: 'Rodape' },
  { id: 'ordem', label: 'Ordem' },
  { id: 'seo', label: 'SEO' },
  { id: 'integracoes', label: 'Integracoes' },
]

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

function getEditorContext(scope = 'admin') {
  if (scope === 'cliente') {
    return {
      apiPath: '/api/cliente/lp-generator',
      uploadPath: '/api/cliente/lp-generator/upload-url',
      assetsPath: '/api/cliente/lp-generator/assets',
      backHref: '/cliente/lps',
      backLabel: 'Voltar para minhas LPs',
      sessionLabel: 'cliente',
      supabase: clienteSupabase,
    }
  }

  return {
    apiPath: '/api/admin/lp-generator',
    uploadPath: '/api/admin/lp-generator/upload-url',
    assetsPath: '/api/admin/lp-generator/assets',
    backHref: '/gerador-de-lp/dashboard',
    backLabel: 'Voltar para LPs',
    sessionLabel: 'administrativa',
    supabase: adminSupabase,
  }
}

async function editorApiFetch(scope, path, { method = 'GET', body } = {}) {
  const context = getEditorContext(scope)
  const { data: sessionData, error: sessionError } = await context.supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error(`Sessao ${context.sessionLabel} nao encontrada. Faca login novamente.`)
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

  if (!response.ok) throw new Error(data?.error || 'Erro na API do editor')
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

function ImageUploadField({ label, value, onChange, field, slug, scope, pageId, onUploaded }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const context = getEditorContext(scope)
      const uploadInfo = await editorApiFetch(scope, context.uploadPath, {
        method: 'POST',
        body: {
          pageId,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          slug,
          field,
        },
      })

      const { error: uploadError } = await context.supabase.storage
        .from('landing-assets')
        .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      onChange(uploadInfo.publicUrl)
      onUploaded?.()
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

function PricePlansEditor({ plans = [], onChange }) {
  function updatePlan(index, key, value) {
    const next = [...plans]
    next[index] = { ...next[index], [key]: value }
    onChange(next)
  }

  function addPlan() {
    if (plans.length >= 3) return

    onChange([
      ...plans,
      {
        nome: '',
        descricao: '',
        preco: '',
        periodo: '',
        ctaTexto: 'Escolher plano',
        ctaUrl: '#formulario',
        destaque: false,
        entregaveis: [''],
      },
    ])
  }

  function removePlan(index) {
    onChange(plans.filter((_, itemIndex) => itemIndex !== index))
  }

  function updateDeliverable(planIndex, itemIndex, value) {
    const next = [...plans]
    const deliverables = [...(next[planIndex]?.entregaveis || [])]
    deliverables[itemIndex] = value
    next[planIndex] = { ...next[planIndex], entregaveis: deliverables }
    onChange(next)
  }

  function addDeliverable(planIndex) {
    const next = [...plans]
    next[planIndex] = {
      ...next[planIndex],
      entregaveis: [...(next[planIndex]?.entregaveis || []), ''],
    }
    onChange(next)
  }

  function removeDeliverable(planIndex, itemIndex) {
    const next = [...plans]
    next[planIndex] = {
      ...next[planIndex],
      entregaveis: (next[planIndex]?.entregaveis || []).filter((_, index) => index !== itemIndex),
    }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {plans.map((plan, planIndex) => (
        <div key={planIndex} className="rounded-2xl border border-white/[0.06] bg-black/35 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black text-white">Tabela {planIndex + 1}</p>
            <button
              type="button"
              onClick={() => removePlan(planIndex)}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
            >
              Remover tabela
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do plano" value={plan.nome} onChange={(value) => updatePlan(planIndex, 'nome', value)} />
            <Field label="Preco" value={plan.preco} onChange={(value) => updatePlan(planIndex, 'preco', value)} />
            <Field label="Periodo" value={plan.periodo} onChange={(value) => updatePlan(planIndex, 'periodo', value)} placeholder="/mes" />
            <Field label="Texto do CTA" value={plan.ctaTexto} onChange={(value) => updatePlan(planIndex, 'ctaTexto', value)} />
          </div>

          <div className="mt-3 grid gap-3">
            <Field label="Descricao" value={plan.descricao} onChange={(value) => updatePlan(planIndex, 'descricao', value)} textarea />
            <Field label="URL do CTA" value={plan.ctaUrl} onChange={(value) => updatePlan(planIndex, 'ctaUrl', value)} />
            <Toggle label="Destacar esta tabela" checked={plan.destaque} onChange={(value) => updatePlan(planIndex, 'destaque', value)} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-neutral-500">Entregaveis</p>
            <div className="grid gap-2">
              {(plan.entregaveis || []).map((item, itemIndex) => (
                <div key={itemIndex} className="flex gap-2">
                  <input
                    value={item || ''}
                    onChange={(event) => updateDeliverable(planIndex, itemIndex, event.target.value)}
                    placeholder={`Entregavel ${itemIndex + 1}`}
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeDeliverable(planIndex, itemIndex)}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-black text-red-300"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addDeliverable(planIndex)}
              className="mt-3 rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059]"
            >
              Adicionar entregavel
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addPlan}
        disabled={plans.length >= 3}
        className="rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {plans.length >= 3 ? 'Limite de 3 tabelas atingido' : 'Adicionar tabela de preco'}
      </button>
    </div>
  )
}

function ChoiceGrid({ choices, selected, onSelect, applyLabel = '' }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {choices.map((choice) => {
        const active = selected === choice.id

        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelect(choice)}
            className={`min-h-[132px] rounded-2xl border p-4 text-left transition ${
              active
                ? 'border-[#6be12f]/45 bg-[#6be12f]/[0.12] shadow-[0_16px_50px_rgba(107,225,47,.12)]'
                : 'border-white/[0.06] bg-black/35 hover:border-white/[0.15] hover:bg-black/50'
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="text-sm font-black text-white">{choice.name}</span>
              {active ? (
                <span className="rounded-full bg-[#6be12f] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                  Atual
                </span>
              ) : null}
            </span>
            <span className="mt-3 block text-xs leading-relaxed text-neutral-400">{choice.description}</span>
            {applyLabel ? <span className="mt-4 inline-flex text-[11px] font-black uppercase tracking-widest text-[#8cf059]">{applyLabel}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function MediaItemsEditor({
  items = [],
  onChange,
  maxItems = 6,
  title = 'Itens',
  fields = [],
  addLabel = 'Adicionar item',
  imageLabel = 'Imagem',
  fieldPrefix,
  slug,
  scope,
  pageId,
}) {
  function updateItem(index, key, value) {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    onChange(next)
  }

  function addItem() {
    if (items.length >= maxItems) return

    onChange([
      ...items,
      fields.reduce((acc, field) => ({ ...acc, [field.key]: '' }), { imagemUrl: '' }),
    ])
  }

  function removeItem(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          Cada item pode receber imagem por upload ou URL.
        </p>
      </div>

      {items.map((item, index) => (
        <div key={`${fieldPrefix}-${index}`} className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black text-white">Item {index + 1}</p>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
            >
              Remover item
            </button>
          </div>

          <div className="grid gap-3">
            {fields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                value={item[field.key]}
                onChange={(value) => updateItem(index, field.key, value)}
                textarea={field.textarea}
              />
            ))}
            <ImageUploadField
              label={imageLabel}
              field={`${fieldPrefix}-${index}`}
              slug={slug}
              scope={scope}
              pageId={pageId}
              value={item.imagemUrl}
              onChange={(value) => updateItem(index, 'imagemUrl', value)}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= maxItems}
        className="rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {items.length >= maxItems ? `Limite de ${maxItems} itens atingido` : addLabel}
      </button>
    </div>
  )
}

function FormFieldsEditor({ fields = {}, customFields = [], onFieldsChange, onCustomFieldsChange }) {
  const standardFields = [
    { id: 'nome', label: 'Nome' },
    { id: 'telefone', label: 'Telefone / WhatsApp' },
    { id: 'email', label: 'E-mail' },
    { id: 'mensagem', label: 'Mensagem' },
  ]

  function updateStandardField(fieldId, key, value) {
    onFieldsChange({
      ...fields,
      [fieldId]: {
        ...(fields[fieldId] || {}),
        [key]: value,
      },
    })
  }

  function addCustomField() {
    if (customFields.length >= 8) return

    onCustomFieldsChange([
      ...customFields,
      {
        id: `campo-${Date.now()}`,
        rotulo: '',
        placeholder: '',
        tipo: 'text',
        obrigatorio: false,
      },
    ])
  }

  function updateCustomField(index, key, value) {
    const next = [...customFields]
    next[index] = { ...next[index], [key]: value }

    if (key === 'rotulo' && !String(next[index].id || '').trim()) {
      next[index].id = slugifyLp(value) || `campo-${index + 1}`
    }

    onCustomFieldsChange(next)
  }

  function removeCustomField(index) {
    onCustomFieldsChange(customFields.filter((_, fieldIndex) => fieldIndex !== index))
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
        <div>
          <p className="text-sm font-black text-white">Campos padrao</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            O lead continua usando estes campos nas colunas principais do painel e do CSV.
          </p>
        </div>

        {standardFields.map((field) => (
          <div key={field.id} className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            <p className="text-sm font-black text-white">{field.label}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Exibir campo" checked={fields[field.id]?.ativo} onChange={(value) => updateStandardField(field.id, 'ativo', value)} />
              <Toggle label="Obrigatorio" checked={fields[field.id]?.obrigatorio} onChange={(value) => updateStandardField(field.id, 'obrigatorio', value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rotulo" value={fields[field.id]?.rotulo} onChange={(value) => updateStandardField(field.id, 'rotulo', value)} />
              <Field label="Placeholder" value={fields[field.id]?.placeholder} onChange={(value) => updateStandardField(field.id, 'placeholder', value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/[0.06] p-4">
        <div>
          <p className="text-sm font-black text-white">Campos personalizados</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-300">
            Use para captar empresa, cidade, interesse, numero de convidados ou outro dado especifico desta LP.
          </p>
        </div>

        {customFields.map((field, index) => (
          <div key={`${field.id || 'campo'}-${index}`} className="grid gap-3 rounded-2xl border border-white/[0.08] bg-black/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-white">Campo extra {index + 1}</p>
              <button
                type="button"
                onClick={() => removeCustomField(index)}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
              >
                Remover campo
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rotulo" value={field.rotulo} onChange={(value) => updateCustomField(index, 'rotulo', value)} />
              <Field label="Placeholder" value={field.placeholder} onChange={(value) => updateCustomField(index, 'placeholder', value)} />
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-neutral-500">Tipo</span>
                <select
                  value={field.tipo || 'text'}
                  onChange={(event) => updateCustomField(index, 'tipo', event.target.value)}
                  className="w-full rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
                >
                  <option value="text">Texto curto</option>
                  <option value="tel">Telefone</option>
                  <option value="email">E-mail</option>
                  <option value="textarea">Texto longo</option>
                </select>
              </label>
              <Toggle label="Obrigatorio" checked={field.obrigatorio} onChange={(value) => updateCustomField(index, 'obrigatorio', value)} />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addCustomField}
          disabled={customFields.length >= 8}
          className="rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {customFields.length >= 8 ? 'Limite de 8 campos extras atingido' : 'Adicionar campo personalizado'}
        </button>
      </div>
    </div>
  )
}

function SectionOrderEditor({ order = [], onChange }) {
  const orderedSections = [
    ...order
      .map((id) => LP_GENERATOR_ORDERABLE_SECTIONS.find((section) => section.id === id))
      .filter(Boolean),
    ...LP_GENERATOR_ORDERABLE_SECTIONS.filter((section) => !order.includes(section.id)),
  ]

  function move(index, delta) {
    const target = index + delta
    if (target < 0 || target >= orderedSections.length) return

    const next = [...orderedSections]
    const current = next[index]
    next[index] = next[target]
    next[target] = current
    onChange(next.map((section) => section.id))
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/[0.06] p-4 text-sm leading-relaxed text-neutral-300">
        O hero permanece na primeira dobra. Reordene aqui o fluxo de conversao que aparece abaixo dele.
      </div>

      {orderedSections.map((section, index) => (
        <div key={section.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/35 px-4 py-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Secao {index + 1}</p>
            <p className="mt-1 text-sm font-black text-white">{section.label}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              title="Subir secao"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === orderedSections.length - 1}
              title="Descer secao"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowDown size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LpEditorWorkspace({ scope = 'admin' }) {
  const context = getEditorContext(scope)
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const hasValidId = isValidUuid(id)
  const [activeTab, setActiveTab] = useState('identidade')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState('draft')
  const [config, setConfig] = useState(getLpConfig())
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [assets, setAssets] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetsWarning, setAssetsWarning] = useState('')

  const publicUrl = useMemo(() => `/lp/${slug || 'slug-da-lp'}`, [slug])
  const previewPage = useMemo(() => ({
    id: page?.id || id,
    name: name || page?.name || 'Preview da LP',
    slug: slug || page?.slug || 'preview',
  }), [id, name, page, slug])

  const loadAssets = useCallback(async () => {
    if (!hasValidId) return

    setAssetsLoading(true)
    setAssetsWarning('')

    try {
      const params = new URLSearchParams({ pageId: id })
      const data = await editorApiFetch(scope, `${context.assetsPath}?${params.toString()}`)
      setAssets(data.assets || [])
      setAssetsWarning(data.warning || '')
    } catch (error) {
      setAssets([])
      setAssetsWarning(error.message || 'Nao foi possivel carregar a biblioteca.')
    } finally {
      setAssetsLoading(false)
    }
  }, [context.assetsPath, hasValidId, id, scope])

  const loadPage = useCallback(async () => {
    if (!hasValidId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    try {
      const data = await editorApiFetch(scope, `${context.apiPath}?id=${id}`)
      setPage(data.page)
      setClientes(data.clientes || [])
      setName(data.page.name || '')
      setSlug(data.page.slug || '')
      setClienteId(data.page.cliente_id || '')
      setStatus(data.page.status || 'draft')
      setConfig(getLpConfig(data.page.config || {}))
      loadAssets()

    } catch (error) {
      setLoadError(error.message || 'Erro ao carregar LP.')
      toast.error(error.message || 'Erro ao carregar LP.')
    } finally {
      setLoading(false)
    }
  }, [context.apiPath, hasValidId, id, loadAssets, scope])

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
      const data = await editorApiFetch(scope, context.apiPath, {
        method: 'POST',
        body: {
          action: 'update',
          id,
          name,
          slug,
          ...(scope === 'admin' ? { cliente_id: clienteId || null } : {}),
          status,
          config,
        },
      })

      setPage(data.page)
      setSlug(data.page.slug || slug)
      setClienteId(data.page.cliente_id || clienteId)
      toast.success('LP salva.')
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar LP.')
    } finally {
      setSaving(false)
    }
  }

  async function copyAssetUrl(url) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL da imagem copiada.')
    } catch {
      toast.error('Nao foi possivel copiar a URL.')
    }
  }

  function renderTab() {
    function applyVisualStyle(style) {
      setConfig((current) => ({
        ...current,
        estilo: {
          ...(current.estilo || {}),
          preset: style.id,
        },
        identidade: {
          ...(current.identidade || {}),
          ...style.palette,
        },
        hero: {
          ...(current.hero || {}),
          variante: style.heroVariant,
        },
      }))
    }

    if (activeTab === 'identidade') {
      return (
        <div className="grid gap-4">
          <Field label="Nome interno" value={name} onChange={setName} />
          <Field label="Slug publico" value={slug} onChange={(value) => setSlug(slugifyLp(value))} />
          {scope === 'admin' ? (
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-neutral-500">
                Cliente vinculado
              </span>
              <select
                value={clienteId}
                onChange={(event) => setClienteId(event.target.value)}
                className="w-full rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#6be12f]/40"
              >
                <option value="">Sem cliente definido</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome_empresa || cliente.nome || cliente.email}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field label="Marca exibida" value={config.identidade.marca} onChange={(value) => updateNested(setConfig, 'identidade', 'marca', value)} />
          <ImageUploadField label="Logo" field="logo" slug={slug || name} scope={scope} pageId={id} value={config.identidade.logoUrl} onChange={(value) => updateNested(setConfig, 'identidade', 'logoUrl', value)} />
          <div className="grid gap-4 rounded-[1.5rem] border border-white/[0.06] bg-black/35 p-4">
            <div>
              <p className="text-sm font-black text-white">Biblioteca visual</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                O preset muda atmosfera, superficies, hero inicial e paleta. Textos, imagens e campos da LP sao preservados.
              </p>
            </div>
            <ChoiceGrid
              choices={LP_GENERATOR_VISUAL_STYLES}
              selected={config.estilo?.preset}
              onSelect={applyVisualStyle}
              applyLabel="Aplicar estilo"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field type="color" label="Primaria" value={config.identidade.corPrimaria} onChange={(value) => updateNested(setConfig, 'identidade', 'corPrimaria', value)} />
            <Field type="color" label="Secundaria" value={config.identidade.corSecundaria} onChange={(value) => updateNested(setConfig, 'identidade', 'corSecundaria', value)} />
            <Field type="color" label="Fundo" value={config.identidade.corFundo} onChange={(value) => updateNested(setConfig, 'identidade', 'corFundo', value)} />
            <Field type="color" label="Texto" value={config.identidade.corTexto} onChange={(value) => updateNested(setConfig, 'identidade', 'corTexto', value)} />
          </div>
        </div>
      )
    }

    if (activeTab === 'cabecalho') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir cabecalho fixo" checked={config.cabecalho.ativo} onChange={(value) => updateNested(setConfig, 'cabecalho', 'ativo', value)} />

          <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
            <p className="text-sm font-black text-white">Marca no menu</p>
            <Toggle label="Mostrar logo e marca" checked={config.cabecalho.mostrarMarca} onChange={(value) => updateNested(setConfig, 'cabecalho', 'mostrarMarca', value)} />
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
            <p className="text-sm font-black text-white">Link de precos</p>
            <Toggle label="Mostrar link para precos" checked={config.cabecalho.mostrarPrecos} onChange={(value) => updateNested(setConfig, 'cabecalho', 'mostrarPrecos', value)} />
            <Field label="Texto do link" value={config.cabecalho.precosTexto} onChange={(value) => updateNested(setConfig, 'cabecalho', 'precosTexto', value)} />
            <p className="text-xs leading-relaxed text-neutral-500">
              Este link aparece somente quando a secao de precos estiver ativa e com ao menos uma tabela visivel.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/[0.06] p-4">
            <p className="text-sm font-black text-white">CTA do cabecalho</p>
            <Toggle label="Mostrar botao de contato" checked={config.cabecalho.mostrarContato} onChange={(value) => updateNested(setConfig, 'cabecalho', 'mostrarContato', value)} />
            <Field label="Texto do botao" value={config.cabecalho.contatoTexto} onChange={(value) => updateNested(setConfig, 'cabecalho', 'contatoTexto', value)} />
            <Field label="URL do botao" value={config.cabecalho.contatoUrl} onChange={(value) => updateNested(setConfig, 'cabecalho', 'contatoUrl', value)} placeholder="#formulario" />
          </div>
        </div>
      )
    }

    if (activeTab === 'midia') {
      return (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/[0.06] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">Biblioteca de imagens da LP</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                  Toda imagem enviada pelo editor fica registrada aqui para reutilizar em outras secoes.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAssets}
                disabled={assetsLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-black text-white disabled:opacity-60"
              >
                {assetsLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                Atualizar
              </button>
            </div>
            {assetsWarning ? (
              <p className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-200">
                {assetsWarning}
              </p>
            ) : null}
          </div>

          {assetsLoading ? (
            <div className="rounded-2xl border border-white/[0.06] bg-black/35 p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-[#8cf059]" size={24} />
              <p className="mt-3 text-sm font-bold text-neutral-400">Carregando biblioteca...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-black/35 p-10 text-center">
              <ImageIcon size={34} className="mx-auto text-neutral-700" />
              <p className="mt-3 text-sm font-black text-white">Nenhuma imagem enviada ainda.</p>
              <p className="mt-1 text-xs text-neutral-500">Envie imagens nos campos do editor e clique em Atualizar.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <article key={asset.id || asset.public_url} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/35">
                  <img src={asset.public_url} alt="" className="h-40 w-full object-cover" />
                  <div className="grid gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{asset.filename || 'Imagem'}</p>
                      <p className="mt-1 truncate text-xs text-neutral-500">{asset.field || asset.path}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => copyAssetUrl(asset.public_url)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-black text-white"
                      >
                        <Copy size={14} />
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => updateNested(setConfig, 'hero', 'imagemUrl', asset.public_url)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-2 text-xs font-black text-[#8cf059]"
                      >
                        Usar no hero
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'hero') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir hero" checked={config.hero.ativo} onChange={(value) => updateNested(setConfig, 'hero', 'ativo', value)} />
          <div className="grid gap-4 rounded-[1.5rem] border border-white/[0.06] bg-black/35 p-4">
            <div>
              <p className="text-sm font-black text-white">Variacao visual do hero</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Escolha a composicao da primeira dobra. A imagem principal pode ficar lateral, central, invertida ou imersiva.
              </p>
            </div>
            <ChoiceGrid
              choices={LP_GENERATOR_HERO_VARIANTS}
              selected={config.hero.variante}
              onSelect={(choice) => updateNested(setConfig, 'hero', 'variante', choice.id)}
            />
          </div>
          <Field label="Eyebrow" value={config.hero.eyebrow} onChange={(value) => updateNested(setConfig, 'hero', 'eyebrow', value)} />
          <Field label="Titulo" value={config.hero.titulo} onChange={(value) => updateNested(setConfig, 'hero', 'titulo', value)} textarea />
          <Field label="Subtitulo" value={config.hero.subtitulo} onChange={(value) => updateNested(setConfig, 'hero', 'subtitulo', value)} textarea />
          <Field label="Texto do CTA" value={config.hero.ctaTexto} onChange={(value) => updateNested(setConfig, 'hero', 'ctaTexto', value)} />
          <Field label="URL do CTA" value={config.hero.ctaUrl} onChange={(value) => updateNested(setConfig, 'hero', 'ctaUrl', value)} />
          <ImageUploadField label="Imagem principal" field="hero" slug={slug || name} scope={scope} pageId={id} value={config.hero.imagemUrl} onChange={(value) => updateNested(setConfig, 'hero', 'imagemUrl', value)} />
          <ImageUploadField label="Background da secao" field="hero-background" slug={slug || name} scope={scope} pageId={id} value={config.hero.backgroundUrl} onChange={(value) => updateNested(setConfig, 'hero', 'backgroundUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'beneficios') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir beneficios" checked={config.beneficios.ativo} onChange={(value) => updateNested(setConfig, 'beneficios', 'ativo', value)} />
          <Field label="Titulo" value={config.beneficios.titulo} onChange={(value) => updateNested(setConfig, 'beneficios', 'titulo', value)} />
          <ImageUploadField label="Background da secao" field="beneficios-background" slug={slug || name} scope={scope} pageId={id} value={config.beneficios.backgroundUrl} onChange={(value) => updateNested(setConfig, 'beneficios', 'backgroundUrl', value)} />
          <ListEditor
            items={config.beneficios.itens || []}
            labels={[{ key: 'titulo', label: 'Titulo' }, { key: 'texto', label: 'Texto', textarea: true }]}
            onChange={(value) => updateNested(setConfig, 'beneficios', 'itens', value)}
          />
        </div>
      )
    }

    if (activeTab === 'logos') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir logos" checked={config.logos.ativo} onChange={(value) => updateNested(setConfig, 'logos', 'ativo', value)} />
          <Field label="Eyebrow" value={config.logos.eyebrow} onChange={(value) => updateNested(setConfig, 'logos', 'eyebrow', value)} />
          <Field label="Titulo" value={config.logos.titulo} onChange={(value) => updateNested(setConfig, 'logos', 'titulo', value)} textarea />
          <ImageUploadField label="Background da secao" field="logos-background" slug={slug || name} scope={scope} pageId={id} value={config.logos.backgroundUrl} onChange={(value) => updateNested(setConfig, 'logos', 'backgroundUrl', value)} />
          <MediaItemsEditor
            title="Logos e marcas"
            items={config.logos.itens || []}
            onChange={(value) => updateNested(setConfig, 'logos', 'itens', value)}
            maxItems={8}
            addLabel="Adicionar logo"
            imageLabel="Logo"
            fieldPrefix="logo-marca"
            slug={slug || name}
            scope={scope}
            pageId={id}
            fields={[{ key: 'nome', label: 'Nome de apoio' }]}
          />
        </div>
      )
    }

    if (activeTab === 'prova') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir prova social" checked={config.prova.ativo} onChange={(value) => updateNested(setConfig, 'prova', 'ativo', value)} />
          <Field label="Titulo" value={config.prova.titulo} onChange={(value) => updateNested(setConfig, 'prova', 'titulo', value)} />
          <ImageUploadField label="Background da secao" field="prova-background" slug={slug || name} scope={scope} pageId={id} value={config.prova.backgroundUrl} onChange={(value) => updateNested(setConfig, 'prova', 'backgroundUrl', value)} />
          <Field label="Depoimento" value={config.prova.depoimento} onChange={(value) => updateNested(setConfig, 'prova', 'depoimento', value)} textarea />
          <Field label="Autor" value={config.prova.autor} onChange={(value) => updateNested(setConfig, 'prova', 'autor', value)} />
        </div>
      )
    }

    if (activeTab === 'galeria') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir prova visual" checked={config.galeria.ativo} onChange={(value) => updateNested(setConfig, 'galeria', 'ativo', value)} />
          <Field label="Eyebrow" value={config.galeria.eyebrow} onChange={(value) => updateNested(setConfig, 'galeria', 'eyebrow', value)} />
          <Field label="Titulo" value={config.galeria.titulo} onChange={(value) => updateNested(setConfig, 'galeria', 'titulo', value)} textarea />
          <Field label="Texto" value={config.galeria.texto} onChange={(value) => updateNested(setConfig, 'galeria', 'texto', value)} textarea />
          <ImageUploadField label="Background da secao" field="galeria-background" slug={slug || name} scope={scope} pageId={id} value={config.galeria.backgroundUrl} onChange={(value) => updateNested(setConfig, 'galeria', 'backgroundUrl', value)} />
          <MediaItemsEditor
            title="Imagens de prova"
            items={config.galeria.itens || []}
            onChange={(value) => updateNested(setConfig, 'galeria', 'itens', value)}
            maxItems={6}
            addLabel="Adicionar imagem"
            imageLabel="Imagem da prova"
            fieldPrefix="galeria"
            slug={slug || name}
            scope={scope}
            pageId={id}
            fields={[
              { key: 'titulo', label: 'Titulo' },
              { key: 'texto', label: 'Texto', textarea: true },
            ]}
          />
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
          <ImageUploadField label="Background da secao" field="oferta-background" slug={slug || name} scope={scope} pageId={id} value={config.oferta.backgroundUrl} onChange={(value) => updateNested(setConfig, 'oferta', 'backgroundUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'garantia') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir garantia" checked={config.garantia.ativo} onChange={(value) => updateNested(setConfig, 'garantia', 'ativo', value)} />
          <Field label="Eyebrow" value={config.garantia.eyebrow} onChange={(value) => updateNested(setConfig, 'garantia', 'eyebrow', value)} />
          <Field label="Titulo" value={config.garantia.titulo} onChange={(value) => updateNested(setConfig, 'garantia', 'titulo', value)} textarea />
          <Field label="Texto" value={config.garantia.texto} onChange={(value) => updateNested(setConfig, 'garantia', 'texto', value)} textarea />
          <Field label="Selo" value={config.garantia.selo} onChange={(value) => updateNested(setConfig, 'garantia', 'selo', value)} />
          <ImageUploadField label="Background da secao" field="garantia-background" slug={slug || name} scope={scope} pageId={id} value={config.garantia.backgroundUrl} onChange={(value) => updateNested(setConfig, 'garantia', 'backgroundUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'urgencia') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir urgencia" checked={config.urgencia.ativo} onChange={(value) => updateNested(setConfig, 'urgencia', 'ativo', value)} />
          <Field label="Eyebrow" value={config.urgencia.eyebrow} onChange={(value) => updateNested(setConfig, 'urgencia', 'eyebrow', value)} />
          <Field label="Titulo" value={config.urgencia.titulo} onChange={(value) => updateNested(setConfig, 'urgencia', 'titulo', value)} textarea />
          <Field label="Texto" value={config.urgencia.texto} onChange={(value) => updateNested(setConfig, 'urgencia', 'texto', value)} textarea />
          <Field label="Destaque" value={config.urgencia.destaque} onChange={(value) => updateNested(setConfig, 'urgencia', 'destaque', value)} />
          <Field label="Texto do CTA" value={config.urgencia.ctaTexto} onChange={(value) => updateNested(setConfig, 'urgencia', 'ctaTexto', value)} />
          <Field label="URL do CTA" value={config.urgencia.ctaUrl} onChange={(value) => updateNested(setConfig, 'urgencia', 'ctaUrl', value)} />
          <ImageUploadField label="Background da secao" field="urgencia-background" slug={slug || name} scope={scope} pageId={id} value={config.urgencia.backgroundUrl} onChange={(value) => updateNested(setConfig, 'urgencia', 'backgroundUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'precos') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir secao de precos" checked={config.precos.ativo} onChange={(value) => updateNested(setConfig, 'precos', 'ativo', value)} />
          <Field label="Eyebrow" value={config.precos.eyebrow} onChange={(value) => updateNested(setConfig, 'precos', 'eyebrow', value)} />
          <Field label="Titulo" value={config.precos.titulo} onChange={(value) => updateNested(setConfig, 'precos', 'titulo', value)} textarea />
          <Field label="Texto" value={config.precos.texto} onChange={(value) => updateNested(setConfig, 'precos', 'texto', value)} textarea />
          <ImageUploadField label="Background da secao" field="precos-background" slug={slug || name} scope={scope} pageId={id} value={config.precos.backgroundUrl} onChange={(value) => updateNested(setConfig, 'precos', 'backgroundUrl', value)} />
          <PricePlansEditor plans={config.precos.planos || []} onChange={(value) => updateNested(setConfig, 'precos', 'planos', value)} />
        </div>
      )
    }

    if (activeTab === 'faq') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir FAQ" checked={config.faq.ativo} onChange={(value) => updateNested(setConfig, 'faq', 'ativo', value)} />
          <Field label="Titulo" value={config.faq.titulo} onChange={(value) => updateNested(setConfig, 'faq', 'titulo', value)} />
          <ImageUploadField label="Background da secao" field="faq-background" slug={slug || name} scope={scope} pageId={id} value={config.faq.backgroundUrl} onChange={(value) => updateNested(setConfig, 'faq', 'backgroundUrl', value)} />
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
          <ImageUploadField label="Background da secao" field="formulario-background" slug={slug || name} scope={scope} pageId={id} value={config.formulario.backgroundUrl} onChange={(value) => updateNested(setConfig, 'formulario', 'backgroundUrl', value)} />
          <FormFieldsEditor
            fields={config.formulario.campos || {}}
            customFields={config.formulario.camposExtras || []}
            onFieldsChange={(value) => updateNested(setConfig, 'formulario', 'campos', value)}
            onCustomFieldsChange={(value) => updateNested(setConfig, 'formulario', 'camposExtras', value)}
          />
        </div>
      )
    }

    if (activeTab === 'seo') {
      return (
        <div className="grid gap-4">
          <Field label="Title SEO" value={config.seo.title} onChange={(value) => updateNested(setConfig, 'seo', 'title', value)} />
          <Field label="Description SEO" value={config.seo.description} onChange={(value) => updateNested(setConfig, 'seo', 'description', value)} textarea />
        </div>
      )
    }

    if (activeTab === 'cta') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir CTA intermediario" checked={config.cta.ativo} onChange={(value) => updateNested(setConfig, 'cta', 'ativo', value)} />
          <Field label="Eyebrow" value={config.cta.eyebrow} onChange={(value) => updateNested(setConfig, 'cta', 'eyebrow', value)} />
          <Field label="Titulo" value={config.cta.titulo} onChange={(value) => updateNested(setConfig, 'cta', 'titulo', value)} textarea />
          <Field label="Texto" value={config.cta.texto} onChange={(value) => updateNested(setConfig, 'cta', 'texto', value)} textarea />
          <Field label="Texto do CTA" value={config.cta.ctaTexto} onChange={(value) => updateNested(setConfig, 'cta', 'ctaTexto', value)} />
          <Field label="URL do CTA" value={config.cta.ctaUrl} onChange={(value) => updateNested(setConfig, 'cta', 'ctaUrl', value)} />
          <ImageUploadField label="Background da secao" field="cta-background" slug={slug || name} scope={scope} pageId={id} value={config.cta.backgroundUrl} onChange={(value) => updateNested(setConfig, 'cta', 'backgroundUrl', value)} />
        </div>
      )
    }

    if (activeTab === 'rodape') {
      return (
        <div className="grid gap-4">
          <Toggle label="Exibir rodape" checked={config.rodape.ativo} onChange={(value) => updateNested(setConfig, 'rodape', 'ativo', value)} />

          <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
            <p className="text-sm font-black text-white">Elementos visiveis</p>
            <Toggle label="Mostrar logo/marca" checked={config.rodape.mostrarLogo} onChange={(value) => updateNested(setConfig, 'rodape', 'mostrarLogo', value)} />
            <Toggle label="Mostrar copyright" checked={config.rodape.mostrarCopyright} onChange={(value) => updateNested(setConfig, 'rodape', 'mostrarCopyright', value)} />
            <Field label="Texto do copyright" value={config.rodape.copyright} onChange={(value) => updateNested(setConfig, 'rodape', 'copyright', value)} />
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-black/35 p-4">
            <p className="text-sm font-black text-white">Links do rodape</p>
            <Toggle label="Mostrar Termos de Uso" checked={config.rodape.mostrarTermos} onChange={(value) => updateNested(setConfig, 'rodape', 'mostrarTermos', value)} />
            <Field label="URL dos Termos" value={config.rodape.termosUrl} onChange={(value) => updateNested(setConfig, 'rodape', 'termosUrl', value)} placeholder="https://..." />
            <Toggle label="Mostrar Privacidade" checked={config.rodape.mostrarPrivacidade} onChange={(value) => updateNested(setConfig, 'rodape', 'mostrarPrivacidade', value)} />
            <Field label="URL de Privacidade" value={config.rodape.privacidadeUrl} onChange={(value) => updateNested(setConfig, 'rodape', 'privacidadeUrl', value)} placeholder="https://..." />
            <Toggle label="Mostrar Contato" checked={config.rodape.mostrarContato} onChange={(value) => updateNested(setConfig, 'rodape', 'mostrarContato', value)} />
            <Field label="URL de Contato" value={config.rodape.contatoUrl} onChange={(value) => updateNested(setConfig, 'rodape', 'contatoUrl', value)} placeholder="#formulario" />
            <Toggle label="Mostrar Instagram" checked={config.rodape.mostrarInstagram} onChange={(value) => updateNested(setConfig, 'rodape', 'mostrarInstagram', value)} />
            <Field label="URL do Instagram" value={config.rodape.instagramUrl} onChange={(value) => updateNested(setConfig, 'rodape', 'instagramUrl', value)} placeholder="https://instagram.com/..." />
          </div>

          <div className="grid gap-3 rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/[0.06] p-4">
            <p className="text-sm font-black text-white">WhatsApp flutuante</p>
            <p className="text-sm leading-relaxed text-neutral-300">
              A mensagem enviada usa a marca da LP: Ola [Nome da empresa], vim pelo seu site e queria saber mais informacoes.
            </p>
            <Toggle label="Exibir WhatsApp flutuante" checked={config.rodape.whatsappAtivo} onChange={(value) => updateNested(setConfig, 'rodape', 'whatsappAtivo', value)} />
            <Field label="Numero do WhatsApp" value={config.rodape.whatsappNumero} onChange={(value) => updateNested(setConfig, 'rodape', 'whatsappNumero', value)} placeholder="5577999999999" />
          </div>
        </div>
      )
    }

    if (activeTab === 'ordem') {
      return (
        <SectionOrderEditor
          order={config.layout.sectionOrder || []}
          onChange={(value) => updateNested(setConfig, 'layout', 'sectionOrder', value)}
        />
      )
    }

    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-[#6be12f]/15 bg-[#6be12f]/[0.06] p-4 text-sm leading-relaxed text-neutral-300">
          Informe somente os identificadores das plataformas. O gerador carrega as tags permitidas na LP publicada e registra o envio do formulario como lead.
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-black/35 p-4">
          <p className="text-sm font-black text-white">Dominio personalizado</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            Informe o dominio que sera apontado para esta LP. A ativacao completa ainda depende de DNS e dominio configurado na Vercel.
          </p>
          <div className="mt-4">
            <Field
              label="Dominio ou subdominio"
              value={config.integracoes.customDomain}
              onChange={(value) => updateNested(
                setConfig,
                'integracoes',
                'customDomain',
                value
                  .toLowerCase()
                  .replace(/^https?:\/\//, '')
                  .replace(/\/.*/, '')
                  .replace(/:\d+$/, '')
                  .replace(/^www\./, '')
              )}
              placeholder="lp.cliente.com.br"
            />
          </div>
        </div>
        <Field
          label="Meta Pixel ID"
          value={config.integracoes.metaPixelId}
          onChange={(value) => updateNested(setConfig, 'integracoes', 'metaPixelId', value)}
          placeholder="Ex.: 123456789012345"
        />
        <Field
          label="GA4 Measurement ID"
          value={config.integracoes.ga4MeasurementId}
          onChange={(value) => updateNested(setConfig, 'integracoes', 'ga4MeasurementId', value.toUpperCase())}
          placeholder="Ex.: G-ABC123DEF4"
        />
        <Field
          label="Google Tag Manager ID"
          value={config.integracoes.googleTagManagerId}
          onChange={(value) => updateNested(setConfig, 'integracoes', 'googleTagManagerId', value.toUpperCase())}
          placeholder="Ex.: GTM-ABC1234"
        />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Toaster position="top-right" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href={context.backHref} className="inline-flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white">
              <ArrowLeft size={16} />
              {context.backLabel}
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
              href={context.backHref}
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
        ) : loadError ? (
          <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 p-10 text-center">
            <p className="text-lg font-black text-red-200">Nao foi possivel abrir esta LP.</p>
            <p className="mt-2 text-sm text-red-100/75">{loadError}</p>
            <Link
              href={context.backHref}
              className="mt-6 inline-flex rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black"
            >
              Voltar
            </Link>
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

            <section className="rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 sm:p-5 lg:col-start-2">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">Preview ao vivo</h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Mostra o layout com as alteracoes atuais. Salve para publicar.
                  </p>
                </div>

                <div className="inline-flex rounded-2xl border border-white/[0.08] bg-black/35 p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                      previewDevice === 'desktop' ? 'bg-[#6be12f] text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Monitor size={15} />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                      previewDevice === 'mobile' ? 'bg-[#6be12f] text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Smartphone size={15} />
                    Mobile
                  </button>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/60 p-3">
                <div
                  className={`mx-auto h-[760px] overflow-auto rounded-2xl border border-white/[0.08] bg-black shadow-2xl shadow-black/50 ${
                    previewDevice === 'mobile' ? 'w-full max-w-[390px]' : 'w-full'
                  }`}
                >
                  <GeneratedLandingPage page={previewPage} config={getLpConfig(config)} previewMode />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
