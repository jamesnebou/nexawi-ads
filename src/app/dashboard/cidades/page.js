'use client'

// src/app/dashboard/cidades/page.js
// ============================================================
// Aba Cidades da dashboard NexaWi ADS.
//
// Agora esta tela respeita as permissões retornadas pela API:
// - configuracoes.view: permite visualizar cidades
// - configuracoes.update: mostra Nova cidade, Editar, Ativar/Inativar,
//   upload de imagem e Salvar cidade
//
// Importante:
// - A segurança real fica nas APIs:
//   /api/admin/cidades
//   /api/admin/cidades/upload-hero-url
// - Esta tela não consulta mais landing_pages_cidades direto pelo navegador.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  MapPin,
  Search,
  Plus,
  Pencil,
  Power,
  Save,
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  BadgeDollarSign,
  Globe,
  Megaphone,
  Type,
  CheckCircle2,
  Loader2,
  Lock,
  ClipboardCheck,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

const HERO_IMAGE_BUCKET = 'landing-assets'

const permissoesIniciais = {
  view: false,
  update: false,
}

const EMPTY_FORM = {
  id: null,
  slug: '',
  cidade_nome: '',
  ativa: true,

  badge_topo: '',
  headline: '',
  subheadline: '',
  cta_primaria: '',
  cta_secundaria: '',
  whatsapp_destino: '',
  observacao_precos: '',

  preco_basico_mensal: '',
  preco_basico_anual: '',
  preco_comercial_mensal: '',
  preco_comercial_anual: '',
  preco_vip_mensal: '',
  preco_vip_anual: '',

  mostrar_preco_ancora: false,
  preco_ancora_basico_mensal: '',
  preco_ancora_basico_anual: '',
  preco_ancora_comercial_mensal: '',
  preco_ancora_comercial_anual: '',
  preco_ancora_vip_mensal: '',
  preco_ancora_vip_anual: '',

  hero_imagem_url: '',

  hero_titulo_linha_1: '',
  hero_titulo_linha_2: '',
  hero_titulo_linha_3: '',
  hero_subtitulo_linha_1: '',
  hero_subtitulo_linha_2: '',

  hero_titulo_linha_2_estilo: 'gradiente',
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function moneyToString(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function moneyToNullableNumber(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim()

  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null

  return parsed
}

function formatMoney(value) {
  const parsed = Number(value || 0)

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsed)
}

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
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
    throw new Error(`A API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

function SectionCard({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-[#6be12f]" />
          </div>

          <div>
            <p className="text-sm sm:text-[15px] font-bold text-white tracking-tight">
              {title}
            </p>

            {subtitle ? (
              <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

function PriceInputs({ label, mensalKey, anualKey, form, setForm, disabled }) {
  return (
    <div className="rounded-[1.25rem] border border-white/[0.05] bg-[#0a0a0a] p-4">
      <p className="text-sm font-bold text-white mb-4">{label}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Mensal
          </label>

          <input
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={form[mensalKey]}
            onChange={(e) => setForm({ ...form, [mensalKey]: e.target.value })}
            className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Anual
          </label>

          <input
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={form[anualKey]}
            onChange={(e) => setForm({ ...form, [anualKey]: e.target.value })}
            className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  icon: Icon = null,
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
        {label}
      </label>

      <div className="relative">
        {Icon ? (
          <Icon
            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
            size={16}
          />
        ) : null}

        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl ${
            Icon ? 'pl-11' : 'px-4'
          } pr-4 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
        />
      </div>
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 4,
  disabled = false,
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  )
}

export default function DashboardCidadesPage() {
  const [cidades, setCidades] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [mounted, setMounted] = useState(false)
  const [permissions, setPermissions] = useState(permissoesIniciais)

  const canUpdate = Boolean(permissions.update)

  async function carregarCidades() {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (busca.trim()) params.set('busca', busca.trim())

      const data = await adminApiFetch(`/api/admin/cidades?${params.toString()}`)

      setCidades(data.cidades || [])
      setPermissions({
        ...permissoesIniciais,
        ...(data.permissions || {}),
      })
    } catch (error) {
      console.error('Erro ao carregar cidades:', error)

      setFeedback({
        type: 'error',
        message: `Erro ao carregar cidades: ${error.message || 'erro desconhecido'}`,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCidades()
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const cidadesFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase()

    if (!term) return cidades

    return cidades.filter((cidade) => {
      const nome = String(cidade.cidade_nome || '').toLowerCase()
      const slug = String(cidade.slug || '').toLowerCase()
      const headline = String(cidade.headline || '').toLowerCase()

      return nome.includes(term) || slug.includes(term) || headline.includes(term)
    })
  }, [cidades, busca])

  function abrirNovaCidade() {
    if (!canUpdate) {
      setFeedback({
        type: 'error',
        message: 'Você não tem permissão para criar cidades.',
      })
      return
    }

    setForm({
      ...EMPTY_FORM,
      ativa: true,
      mostrar_preco_ancora: false,
    })

    setFeedback({ type: '', message: '' })
    setDrawerOpen(true)
  }

  function abrirEdicao(cidade) {
    if (!canUpdate) {
      setFeedback({
        type: 'error',
        message: 'Você não tem permissão para editar cidades.',
      })
      return
    }

    setForm({
      id: cidade.id,
      slug: cidade.slug || '',
      cidade_nome: cidade.cidade_nome || '',
      ativa: cidade.ativa ?? true,

      badge_topo: cidade.badge_topo || '',
      headline: cidade.headline || '',
      subheadline: cidade.subheadline || '',
      cta_primaria: cidade.cta_primaria || '',
      cta_secundaria: cidade.cta_secundaria || '',
      whatsapp_destino: cidade.whatsapp_destino || '',
      observacao_precos: cidade.observacao_precos || '',

      preco_basico_mensal: moneyToString(cidade.preco_basico_mensal),
      preco_basico_anual: moneyToString(cidade.preco_basico_anual),
      preco_comercial_mensal: moneyToString(cidade.preco_comercial_mensal),
      preco_comercial_anual: moneyToString(cidade.preco_comercial_anual),
      preco_vip_mensal: moneyToString(cidade.preco_vip_mensal),
      preco_vip_anual: moneyToString(cidade.preco_vip_anual),

      mostrar_preco_ancora: cidade.mostrar_preco_ancora ?? false,
      preco_ancora_basico_mensal: moneyToString(cidade.preco_ancora_basico_mensal),
      preco_ancora_basico_anual: moneyToString(cidade.preco_ancora_basico_anual),
      preco_ancora_comercial_mensal: moneyToString(cidade.preco_ancora_comercial_mensal),
      preco_ancora_comercial_anual: moneyToString(cidade.preco_ancora_comercial_anual),
      preco_ancora_vip_mensal: moneyToString(cidade.preco_ancora_vip_mensal),
      preco_ancora_vip_anual: moneyToString(cidade.preco_ancora_vip_anual),

      hero_imagem_url: cidade.hero_imagem_url || '',

      hero_titulo_linha_1: cidade.hero_titulo_linha_1 || '',
      hero_titulo_linha_2: cidade.hero_titulo_linha_2 || '',
      hero_titulo_linha_3: cidade.hero_titulo_linha_3 || '',
      hero_subtitulo_linha_1: cidade.hero_subtitulo_linha_1 || '',
      hero_subtitulo_linha_2: cidade.hero_subtitulo_linha_2 || '',

      hero_titulo_linha_2_estilo: cidade.hero_titulo_linha_2_estilo || 'gradiente',
    })

    setFeedback({ type: '', message: '' })
    setDrawerOpen(true)
  }

  async function alternarStatus(cidade) {
    if (!canUpdate) {
      setFeedback({
        type: 'error',
        message: 'Você não tem permissão para ativar ou inativar cidades.',
      })
      return
    }

    try {
      const novoStatus = !(cidade.ativa ?? true)

      await adminApiFetch('/api/admin/cidades', {
        method: 'POST',
        body: {
          action: 'toggle',
          id: cidade.id,
          ativa: novoStatus,
        },
      })

      setCidades((prev) =>
        prev.map((item) =>
          item.id === cidade.id ? { ...item, ativa: novoStatus } : item
        )
      )

      setFeedback({
        type: 'success',
        message: `${cidade.cidade_nome} ${novoStatus ? 'ativada' : 'inativada'} com sucesso.`,
      })
    } catch (error) {
      console.error('Erro ao alterar status:', error)

      setFeedback({
        type: 'error',
        message: `Erro ao alterar status: ${error.message || 'erro desconhecido'}`,
      })
    }
  }

  async function uploadHeroCidade(file) {
    if (!file) return

    if (!canUpdate) {
      setFeedback({
        type: 'error',
        message: 'Você não tem permissão para enviar imagem de cidade.',
      })
      return
    }

    try {
      setUploadingHero(true)

      const uploadInfo = await adminApiFetch('/api/admin/cidades/upload-hero-url', {
        method: 'POST',
        body: {
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          slug: form.slug,
          cidade_nome: form.cidade_nome,
        },
      })

      const { error: uploadError } = await supabase
        .storage
        .from(HERO_IMAGE_BUCKET)
        .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
          contentType: file.type || undefined,
          upsert: false,
        })

      if (uploadError) throw uploadError

      setForm((prev) => ({
        ...prev,
        hero_imagem_url: uploadInfo.publicUrl,
      }))

      setFeedback({
        type: 'success',
        message: 'Imagem enviada com sucesso. Clique em salvar para gravar a cidade.',
      })
    } catch (error) {
      console.error('Erro ao enviar imagem:', error)

      setFeedback({
        type: 'error',
        message: `Erro ao enviar imagem: ${error.message || 'erro desconhecido'}`,
      })
    } finally {
      setUploadingHero(false)
    }
  }

  async function salvarCidade() {
    if (!canUpdate) {
      setFeedback({
        type: 'error',
        message: 'Você não tem permissão para salvar cidades.',
      })
      return
    }

    try {
      setSaving(true)
      setFeedback({ type: '', message: '' })

      const cidadeNome = String(form.cidade_nome || '').trim()
      const slug = slugify(form.slug || cidadeNome)

      if (!cidadeNome) throw new Error('Nome da cidade é obrigatório.')
      if (!slug) throw new Error('Slug inválido.')

      const payload = {
        slug,
        cidade_nome: cidadeNome,
        ativa: Boolean(form.ativa),

        badge_topo: form.badge_topo || null,
        headline: form.headline || null,
        subheadline: form.subheadline || null,
        cta_primaria: form.cta_primaria || null,
        cta_secundaria: form.cta_secundaria || null,
        whatsapp_destino: form.whatsapp_destino || null,
        observacao_precos: form.observacao_precos || null,

        preco_basico_mensal: moneyToNullableNumber(form.preco_basico_mensal),
        preco_basico_anual: moneyToNullableNumber(form.preco_basico_anual),
        preco_comercial_mensal: moneyToNullableNumber(form.preco_comercial_mensal),
        preco_comercial_anual: moneyToNullableNumber(form.preco_comercial_anual),
        preco_vip_mensal: moneyToNullableNumber(form.preco_vip_mensal),
        preco_vip_anual: moneyToNullableNumber(form.preco_vip_anual),

        mostrar_preco_ancora: Boolean(form.mostrar_preco_ancora),
        preco_ancora_basico_mensal: moneyToNullableNumber(form.preco_ancora_basico_mensal),
        preco_ancora_basico_anual: moneyToNullableNumber(form.preco_ancora_basico_anual),
        preco_ancora_comercial_mensal: moneyToNullableNumber(form.preco_ancora_comercial_mensal),
        preco_ancora_comercial_anual: moneyToNullableNumber(form.preco_ancora_comercial_anual),
        preco_ancora_vip_mensal: moneyToNullableNumber(form.preco_ancora_vip_mensal),
        preco_ancora_vip_anual: moneyToNullableNumber(form.preco_ancora_vip_anual),

        hero_imagem_url: form.hero_imagem_url || null,

        hero_titulo_linha_1: form.hero_titulo_linha_1 || null,
        hero_titulo_linha_2: form.hero_titulo_linha_2 || null,
        hero_titulo_linha_3: form.hero_titulo_linha_3 || null,
        hero_subtitulo_linha_1: form.hero_subtitulo_linha_1 || null,
        hero_subtitulo_linha_2: form.hero_subtitulo_linha_2 || null,

        hero_titulo_linha_2_estilo: form.hero_titulo_linha_2_estilo || 'gradiente',
      }

      await adminApiFetch('/api/admin/cidades', {
        method: 'POST',
        body: {
          action: 'save',
          id: form.id || null,
          cidade: payload,
        },
      })

      await carregarCidades()
      setDrawerOpen(false)

      setFeedback({
        type: 'success',
        message: `Cidade ${form.id ? 'atualizada' : 'criada'} com sucesso.`,
      })
    } catch (error) {
      console.error('Erro ao salvar cidade:', error)

      setFeedback({
        type: 'error',
        message: `Erro ao salvar cidade: ${error.message || 'erro desconhecido'}`,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 animate-fade-in-up">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#6be12f]/5 rounded-full blur-[150px] pointer-events-none z-0" />

        <div className="relative z-10 flex flex-col gap-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight">
                Cidades
              </h1>

              <p className="text-sm text-neutral-500 mt-2 font-medium">
                Gerencie landing pages por cidade, preços, CTAs e imagem do Hero.
              </p>

              {!canUpdate && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
                  <Lock size={14} className="text-neutral-500" />
                  Modo leitura: você pode visualizar, mas não alterar cidades.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/cidades/checklist"
                className="w-full sm:w-auto bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold px-6 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ClipboardCheck size={18} />
                Checklist cidade
              </Link>

              {canUpdate && (
                <button
                  type="button"
                  onClick={abrirNovaCidade}
                  className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold px-6 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
                >
                  <Plus size={18} />
                  Nova cidade
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] backdrop-blur-xl p-4 sm:p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                size={18}
              />

              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome da cidade, slug ou headline..."
                className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
              />
            </div>
          </div>

          {feedback.message ? (
            <div
              className={`rounded-2xl px-4 py-4 border ${
                feedback.type === 'success'
                  ? 'bg-[#6be12f]/10 border-[#6be12f]/20 text-[#9cf76b]'
                  : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                ) : (
                  <X size={18} className="mt-0.5 flex-shrink-0" />
                )}

                <p className="text-sm font-medium">{feedback.message}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.35)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
                <Loader2 className="text-[#6be12f] animate-pulse" size={24} />
              </div>
            </div>
          ) : cidadesFiltradas.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <MapPin className="mx-auto text-neutral-600 mb-4" size={36} />

              <h2 className="text-xl font-bold text-white mb-2">
                Nenhuma cidade encontrada
              </h2>

              <p className="text-sm text-neutral-500 mb-6">
                Crie sua primeira cidade ou ajuste a busca.
              </p>

              {canUpdate && (
                <button
                  type="button"
                  onClick={abrirNovaCidade}
                  className="inline-flex items-center gap-2 bg-[#6be12f] text-black font-bold px-5 py-3 rounded-2xl hover:bg-[#8cf059] transition-all"
                >
                  <Plus size={16} />
                  Nova cidade
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <div className={canUpdate ? 'min-w-[980px]' : 'min-w-[760px]'}>
                <div
                  className={`grid ${
                    canUpdate
                      ? 'grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_120px_140px_170px]'
                      : 'grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_120px_140px]'
                  } gap-3 px-5 py-4 border-b border-white/[0.05] text-[11px] uppercase tracking-widest text-neutral-500 font-bold`}
                >
                  <div>Cidade</div>
                  <div>Slug</div>
                  <div>Status</div>
                  <div>Plano Comercial</div>
                  {canUpdate && <div>Ações</div>}
                </div>

                <div className="divide-y divide-white/[0.05]">
                  {cidadesFiltradas.map((cidade) => (
                    <div
                      key={cidade.id}
                      className={`px-5 py-5 grid ${
                        canUpdate
                          ? 'grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_120px_140px_170px]'
                          : 'grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_120px_140px]'
                      } gap-3 items-center`}
                    >
                      <div>
                        <p className="text-white font-bold text-base">
                          {cidade.cidade_nome}
                        </p>

                        <p className="text-sm text-neutral-500 mt-1">
                          {cidade.headline || 'Sem headline customizada'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-neutral-300">
                        <Globe size={15} className="text-[#6be12f] flex-shrink-0" />
                        <span className="break-all">/{cidade.slug}</span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${
                            cidade.ativa
                              ? 'bg-[#6be12f]/10 text-[#9cf76b] border border-[#6be12f]/20'
                              : 'bg-white/[0.04] text-neutral-400 border border-white/[0.08]'
                          }`}
                        >
                          {cidade.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>

                      <div className="text-sm text-neutral-300 whitespace-nowrap">
                        {cidade.preco_comercial_mensal
                          ? formatMoney(cidade.preco_comercial_mensal)
                          : 'Fallback global'}
                      </div>

                      {canUpdate && (
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(cidade)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white hover:bg-white/[0.05] transition-all whitespace-nowrap"
                          >
                            <Pencil size={15} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => alternarStatus(cidade)}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all whitespace-nowrap ${
                              cidade.ativa
                                ? 'bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15'
                                : 'bg-[#6be12f]/10 border border-[#6be12f]/20 text-[#9cf76b] hover:bg-[#6be12f]/15'
                            }`}
                          >
                            <Power size={15} />
                            {cidade.ativa ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {mounted && drawerOpen
        ? createPortal(
            <div className="fixed inset-0 z-[999]">
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={() => !saving && setDrawerOpen(false)}
              />

              <div className="absolute inset-0 lg:pl-[240px] p-3 sm:p-5 lg:p-8 flex items-center justify-center">
                <div className="w-full max-w-[1280px] h-[92vh] rounded-[2rem] border border-white/[0.06] bg-[#080808] shadow-[0_0_80px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
                  <div className="shrink-0 border-b border-white/[0.06] bg-[#080808]/95 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        {form.id ? 'Editar cidade' : 'Nova cidade'}
                      </h2>

                      <p className="text-sm text-neutral-500 mt-1">
                        Central premium para configurar páginas por cidade.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => !saving && setDrawerOpen(false)}
                      className="w-12 h-12 rounded-2xl border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.03] transition-all flex items-center justify-center"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 sm:p-6 lg:p-8">
                      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
                        <div className="space-y-6">
                          <SectionCard
                            icon={MapPin}
                            title="Identificação da cidade"
                            subtitle="Nome, slug e status"
                          >
                            <div className="grid grid-cols-1 gap-4">
                              <TextInput
                                label="Nome da cidade"
                                value={form.cidade_nome}
                                disabled={!canUpdate}
                                onChange={(value) => {
                                  setForm((prev) => ({
                                    ...prev,
                                    cidade_nome: value,
                                    slug: prev.id ? prev.slug : slugify(value),
                                  }))
                                }}
                              />

                              <TextInput
                                label="Slug"
                                value={form.slug}
                                disabled={!canUpdate}
                                onChange={(value) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    slug: slugify(value),
                                  }))
                                }
                              />

                              <div>
                                <button
                                  type="button"
                                  disabled={!canUpdate}
                                  onClick={() =>
                                    setForm((prev) => ({ ...prev, ativa: !prev.ativa }))
                                  }
                                  className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                    form.ativa
                                      ? 'bg-[#6be12f]/10 border-[#6be12f]/20 text-[#9cf76b]'
                                      : 'bg-white/[0.03] border-white/[0.08] text-neutral-400'
                                  }`}
                                >
                                  <Power size={16} />
                                  {form.ativa ? 'Cidade ativa' : 'Cidade inativa'}
                                </button>
                              </div>
                            </div>
                          </SectionCard>

                          <SectionCard
                            icon={Megaphone}
                            title="Contato e observação"
                            subtitle="WhatsApp da cidade e observação de preço"
                          >
                            <div className="grid grid-cols-1 gap-4">
                              <TextInput
                                label="WhatsApp destino"
                                icon={LinkIcon}
                                value={form.whatsapp_destino}
                                disabled={!canUpdate}
                                placeholder="https://wa.me/..."
                                onChange={(value) =>
                                  setForm({ ...form, whatsapp_destino: value })
                                }
                              />

                              <TextArea
                                label="Observação dos preços"
                                value={form.observacao_precos}
                                disabled={!canUpdate}
                                onChange={(value) =>
                                  setForm({ ...form, observacao_precos: value })
                                }
                              />
                            </div>
                          </SectionCard>

                          <SectionCard
                            icon={ImageIcon}
                            title="Imagem do Hero"
                            subtitle="Upload e preview da imagem lateral"
                          >
                            <div className="space-y-5">
                              <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] p-4 flex items-center justify-center min-h-[280px]">
                                <img
                                  src={form.hero_imagem_url || '/mockup-celular.png'}
                                  alt="Preview cidade"
                                  className="w-full max-w-[190px] h-auto object-contain drop-shadow-2xl"
                                />
                              </div>

                              <TextInput
                                label="URL da imagem"
                                value={form.hero_imagem_url}
                                disabled={!canUpdate}
                                placeholder="https://..."
                                onChange={(value) =>
                                  setForm({ ...form, hero_imagem_url: value })
                                }
                              />

                              {canUpdate && (
                                <div className="flex flex-col gap-3">
                                  <label className="inline-flex items-center justify-center px-5 py-4 rounded-2xl bg-[#6be12f] text-black font-bold cursor-pointer hover:bg-[#8cf059] transition-all">
                                    {uploadingHero ? 'Enviando imagem...' : 'Enviar nova imagem'}

                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) uploadHeroCidade(file)
                                      }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => setForm({ ...form, hero_imagem_url: '' })}
                                    className="px-5 py-4 rounded-2xl border border-white/[0.08] text-white font-bold hover:bg-white/[0.03] transition-all"
                                  >
                                    Remover imagem customizada
                                  </button>
                                </div>
                              )}
                            </div>
                          </SectionCard>
                        </div>

                        <div className="space-y-6">
                          <SectionCard
                            icon={Type}
                            title="Textos da landing"
                            subtitle="Badge, headline, subheadline e CTAs"
                          >
                            <div className="grid grid-cols-1 gap-4">
                              <TextInput
                                label="Título 01"
                                value={form.hero_titulo_linha_1}
                                disabled={!canUpdate}
                                placeholder="Linha branca"
                                onChange={(value) =>
                                  setForm({ ...form, hero_titulo_linha_1: value })
                                }
                              />

                              <TextInput
                                label="Título 02"
                                value={form.hero_titulo_linha_2}
                                disabled={!canUpdate}
                                placeholder="Linha com destaque verde"
                                onChange={(value) =>
                                  setForm({ ...form, hero_titulo_linha_2: value })
                                }
                              />

                              <div>
                                <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
                                  Estilo do Título 02
                                </label>

                                <select
                                  value={form.hero_titulo_linha_2_estilo}
                                  disabled={!canUpdate}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      hero_titulo_linha_2_estilo: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <option value="gradiente">Verde com gradiente</option>
                                  <option value="faixa">Texto preto com faixa verde</option>
                                </select>
                              </div>

                              <TextInput
                                label="Título 03"
                                value={form.hero_titulo_linha_3}
                                disabled={!canUpdate}
                                placeholder="Linha branca"
                                onChange={(value) =>
                                  setForm({ ...form, hero_titulo_linha_3: value })
                                }
                              />

                              <TextArea
                                label="Subtítulo 01"
                                value={form.hero_subtitulo_linha_1}
                                disabled={!canUpdate}
                                rows={3}
                                onChange={(value) =>
                                  setForm({ ...form, hero_subtitulo_linha_1: value })
                                }
                              />

                              <TextArea
                                label="Subtítulo 02"
                                value={form.hero_subtitulo_linha_2}
                                disabled={!canUpdate}
                                rows={3}
                                onChange={(value) =>
                                  setForm({ ...form, hero_subtitulo_linha_2: value })
                                }
                              />

                              <TextInput
                                label="Badge topo"
                                value={form.badge_topo}
                                disabled={!canUpdate}
                                onChange={(value) =>
                                  setForm({ ...form, badge_topo: value })
                                }
                              />

                              <TextArea
                                label="Headline"
                                value={form.headline}
                                disabled={!canUpdate}
                                rows={3}
                                onChange={(value) =>
                                  setForm({ ...form, headline: value })
                                }
                              />

                              <TextArea
                                label="Subheadline"
                                value={form.subheadline}
                                disabled={!canUpdate}
                                rows={3}
                                onChange={(value) =>
                                  setForm({ ...form, subheadline: value })
                                }
                              />

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextInput
                                  label="CTA primária"
                                  value={form.cta_primaria}
                                  disabled={!canUpdate}
                                  onChange={(value) =>
                                    setForm({ ...form, cta_primaria: value })
                                  }
                                />

                                <TextInput
                                  label="CTA secundária"
                                  value={form.cta_secundaria}
                                  disabled={!canUpdate}
                                  onChange={(value) =>
                                    setForm({ ...form, cta_secundaria: value })
                                  }
                                />
                              </div>
                            </div>
                          </SectionCard>

                          <SectionCard
                            icon={BadgeDollarSign}
                            title="Preços da cidade"
                            subtitle="Mensal, anual e âncora"
                          >
                            <div className="grid grid-cols-1 gap-4">
                              <PriceInputs
                                label="Plano Básico"
                                mensalKey="preco_basico_mensal"
                                anualKey="preco_basico_anual"
                                form={form}
                                setForm={setForm}
                                disabled={!canUpdate}
                              />

                              <PriceInputs
                                label="Plano Comercial"
                                mensalKey="preco_comercial_mensal"
                                anualKey="preco_comercial_anual"
                                form={form}
                                setForm={setForm}
                                disabled={!canUpdate}
                              />

                              <PriceInputs
                                label="Plano VIP / Exclusividade"
                                mensalKey="preco_vip_mensal"
                                anualKey="preco_vip_anual"
                                form={form}
                                setForm={setForm}
                                disabled={!canUpdate}
                              />

                              <button
                                type="button"
                                disabled={!canUpdate}
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    mostrar_preco_ancora: !prev.mostrar_preco_ancora,
                                  }))
                                }
                                className="flex items-center justify-between p-5 bg-[#0a0a0a] border border-white/[0.05] rounded-2xl cursor-pointer hover:border-white/[0.1] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-left"
                              >
                                <div>
                                  <p className="text-base font-bold text-white">
                                    Preço âncora
                                  </p>

                                  <p className="text-sm text-neutral-500 mt-1">
                                    Ative para mostrar o preço riscado nessa cidade.
                                  </p>
                                </div>

                                <div
                                  className={`w-14 h-7 rounded-full transition-colors duration-300 relative shadow-inner ${
                                    form.mostrar_preco_ancora
                                      ? 'bg-[#6be12f]'
                                      : 'bg-neutral-800'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${
                                      form.mostrar_preco_ancora ? 'left-8' : 'left-1'
                                    }`}
                                  />
                                </div>
                              </button>

                              <PriceInputs
                                label="Âncora Plano Básico"
                                mensalKey="preco_ancora_basico_mensal"
                                anualKey="preco_ancora_basico_anual"
                                form={form}
                                setForm={setForm}
                                disabled={!canUpdate}
                              />

                              <PriceInputs
                                label="Âncora Plano Comercial"
                                mensalKey="preco_ancora_comercial_mensal"
                                anualKey="preco_ancora_comercial_anual"
                                form={form}
                                setForm={setForm}
                                disabled={!canUpdate}
                              />

                              <PriceInputs
                                label="Âncora Plano VIP / Exclusividade"
                                mensalKey="preco_ancora_vip_mensal"
                                anualKey="preco_ancora_vip_anual"
                                form={form}
                                setForm={setForm}
                                disabled={!canUpdate}
                              />
                            </div>
                          </SectionCard>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] bg-[#080808]/95 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => !saving && setDrawerOpen(false)}
                      className="w-full sm:w-auto px-5 py-4 rounded-2xl border border-white/[0.08] text-white font-bold hover:bg-white/[0.03] transition-all"
                    >
                      Cancelar
                    </button>

                    {canUpdate && (
                      <button
                        type="button"
                        onClick={salvarCidade}
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#6be12f] text-black font-bold hover:bg-[#8cf059] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Salvar cidade
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .animate-fade-in-up {
              animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
            }
          `,
        }}
      />
    </>
  )
}
