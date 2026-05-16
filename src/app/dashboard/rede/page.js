'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  Globe,
  Loader2,
  MapPin,
  Network,
  Plus,
  RefreshCcw,
  Router,
  Server,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react'

const supabase = createBrowserSupabaseClient()

const DEFAULT_POLICY = {
  hotspotSubnet: '192.168.88.0/24',
  forceDns: true,
  blockQuic: true,
  blockTorrent: true,
  blockGames: true,
  blockTlsGames: true,
  downloadLimit: '10M',
  uploadLimit: '3M',
  customBlockedDomains: [],
  customAllowedDomains: [],
}

const QUICK_PRESETS = [
  {
    id: 'meta',
    title: 'Facebook / Meta',
    description: 'Bloqueia Facebook, Messenger e domínios essenciais da Meta com DNS, TLS, IP e DoH.',
    domains: ['facebook.com'],
    badge: 'Preset forte',
  },
  {
    id: 'instagram',
    title: 'Instagram',
    description: 'Adiciona domínios principais do Instagram para bloqueio por DNS e TLS.',
    domains: ['instagram.com', 'cdninstagram.com'],
    badge: 'Básico',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    description: 'Adiciona domínios comuns do TikTok para bloqueio por DNS e TLS.',
    domains: ['tiktok.com', 'tiktokcdn.com', 'byteoversea.com'],
    badge: 'Básico',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    description: 'Adiciona domínios principais do YouTube e Google Video.',
    domains: ['youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com'],
    badge: 'Básico',
  },
  {
    id: 'netflix',
    title: 'Netflix / Streaming',
    description: 'Adiciona domínios principais de streaming para reduzir consumo de banda.',
    domains: ['netflix.com', 'nflxvideo.net', 'nflximg.net'],
    badge: 'Básico',
  },
  {
    id: 'apostas',
    title: 'Apostas',
    description: 'Adiciona domínios comuns de apostas para bloqueio inicial.',
    domains: ['bet365.com', 'betano.com', 'kto.com', 'superbet.com'],
    badge: 'Básico',
  },
]

function normalizeDomain(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .trim()
}

function isValidDomain(value = '') {
  const domain = normalizeDomain(value)
  return domain.includes('.') && domain.length >= 4 && !domain.includes(' ')
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

function ToggleCard({ title, description, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-full text-left rounded-[1.75rem] border p-5 transition-all ${
        checked
          ? 'bg-[#6be12f]/10 border-[#6be12f]/25'
          : 'bg-white/[0.02] border-white/[0.06]'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#6be12f]/30'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-white">{title}</p>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{description}</p>
        </div>

        <div
          className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors ${
            checked ? 'bg-[#6be12f]' : 'bg-neutral-800'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              checked ? 'left-7' : 'left-1'
            }`}
          />
        </div>
      </div>
    </button>
  )
}

function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0a0a] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            {label}
          </p>
          <p className={`text-2xl font-black mt-2 ${accent ? 'text-[#6be12f]' : 'text-white'}`}>
            {value}
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <Icon size={20} className="text-[#6be12f]" />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[#6be12f]" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600">
          {label}
        </p>
      </div>

      <p className="text-sm font-black text-white break-all">
        {value || '—'}
      </p>

      {description && (
        <p className="text-xs text-neutral-600 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

function RuleRow({ rule }) {
  const invalid = Boolean(rule.invalid)
  const disabled = Boolean(rule.disabled)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
      <div>
        <p className="text-sm font-extrabold text-white break-all">
          {rule.comment || 'Regra sem comentário'}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          {rule.chain || '-'} · {rule.action || '-'} · {rule.protocol || '-'}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600">
          Origem
        </p>
        <p className="text-xs font-bold text-neutral-300 mt-1">
          {rule.srcAddress || '-'}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-600">
          Destino
        </p>
        <p className="text-xs font-bold text-neutral-300 mt-1 break-all">
          {rule.tlsHost || rule.dstPort || rule.toPorts || '-'}
        </p>
      </div>

      <div className="flex lg:justify-end items-center">
        {invalid ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-xs font-bold text-yellow-400">
            <AlertTriangle size={13} /> Inválida
          </span>
        ) : disabled ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-500/10 border border-neutral-500/20 px-3 py-1.5 text-xs font-bold text-neutral-400">
            <CircleOff size={13} /> Desativada
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 px-3 py-1.5 text-xs font-bold text-[#8cf059]">
            <CheckCircle2 size={13} /> Ativa
          </span>
        )}
      </div>
    </div>
  )
}

function DomainManager({
  title,
  description,
  value,
  inputValue,
  setInputValue,
  onAdd,
  onRemove,
  disabled,
  variant = 'blocked',
}) {
  const isAllowed = variant === 'allowed'

  return (
    <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#050505] p-5">
      <div className="mb-4">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={inputValue}
          disabled={disabled}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAdd()
            }
          }}
          placeholder={isAllowed ? 'ex: gov.br' : 'ex: tiktok.com'}
          className="flex-1 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/30 disabled:opacity-60"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className="inline-flex items-center justify-center rounded-2xl bg-[#6be12f] px-4 py-3 text-black hover:bg-[#8cf059] disabled:opacity-50 transition-all"
          title="Adicionar domínio"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {value.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-bold text-neutral-500">
              Nenhum domínio cadastrado.
            </p>
          </div>
        ) : (
          value.map((domain) => (
            <div
              key={domain}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                isAllowed
                  ? 'border-[#6be12f]/15 bg-[#6be12f]/5'
                  : 'border-red-500/15 bg-red-500/5'
              }`}
            >
              <p className="text-sm font-bold text-white break-all">
                {domain}
              </p>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(domain)}
                className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-all"
                title="Remover domínio"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function ControleRedePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const hotspotIdFromUrl = searchParams.get('hotspotId')
  const hotspotSlugFromUrl = searchParams.get('hotspotSlug')

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [status, setStatus] = useState(null)
  const [permissions, setPermissions] = useState({ view: false, update: false })

  const [hotspot, setHotspot] = useState(null)
  const [mikrotik, setMikrotik] = useState(null)

  const [policy, setPolicy] = useState(DEFAULT_POLICY)

  const [blockedInput, setBlockedInput] = useState('')
  const [allowedInput, setAllowedInput] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const allRules = useMemo(() => {
    const filters = status?.filters || []
    const natRules = status?.natRules || []
    return [...filters, ...natRules]
  }, [status])

  const invalidRules = useMemo(() => {
    return allRules.filter((rule) => rule.invalid)
  }, [allRules])

  const canUpdate = Boolean(permissions.update)

  async function carregarStatus() {
    setError('')
    setMessage('')

    const query = new URLSearchParams()

    if (hotspotIdFromUrl) {
      query.set('hotspotId', hotspotIdFromUrl)
    }

    if (hotspotSlugFromUrl) {
      query.set('hotspotSlug', hotspotSlugFromUrl)
    }

    if (!hotspotIdFromUrl && !hotspotSlugFromUrl) {
      setLoading(false)
      setError('Selecione um hotspot para gerenciar a rede.')
      return
    }

    try {
      setLoading(true)

      const data = await adminApiFetch(`/api/admin/rede/policy/status?${query.toString()}`)

      setStatus(data.status)
      setPermissions(data.permissions || { view: true, update: false })
      setHotspot(data.hotspot || null)
      setMikrotik(data.router || null)

      const blockedDomains =
        data.domains
          ?.filter((domain) => domain.type === 'blocked' && domain.enabled !== false)
          .map((domain) => domain.domain) || []

      const allowedDomains =
        data.domains
          ?.filter((domain) => domain.type === 'allowed' && domain.enabled !== false)
          .map((domain) => domain.domain) || []

      if (data.policy) {
        setPolicy({
          hotspotSubnet: data.policy.hotspot_subnet || '192.168.88.0/24',
          forceDns: data.policy.force_dns !== false,
          blockQuic: data.policy.block_quic !== false,
          blockTorrent: data.policy.block_torrent !== false,
          blockGames: data.policy.block_games !== false,
          blockTlsGames: data.policy.block_tls_games !== false,
          downloadLimit: data.policy.download_limit || '10M',
          uploadLimit: data.policy.upload_limit || '3M',
          customBlockedDomains: cleanDomainList(blockedDomains),
          customAllowedDomains: cleanDomainList(allowedDomains),
        })
      } else {
        setPolicy({
          ...DEFAULT_POLICY,
          customBlockedDomains: cleanDomainList(blockedDomains),
customAllowedDomains: cleanDomainList(allowedDomains),
        })
      }
    } catch (err) {
      console.error('Erro ao carregar status da rede:', err)
      setError(err.message || 'Erro ao carregar status da rede')
    } finally {
      setLoading(false)
    }
  }

function getPresetDomains(preset) {
  return (preset.domains || [])
    .map((domain) => normalizeDomain(domain))
    .filter(Boolean)
}

function cleanDomainList(list = []) {
  return [...new Set(
    (list || [])
      .map((domain) => normalizeDomain(domain))
      .filter((domain) => domain && domain.includes('.'))
  )]
}

function isPresetActive(preset) {
  const blocked = new Set(cleanDomainList(policy.customBlockedDomains || []))
  const domains = getPresetDomains(preset)

  if (domains.length === 0) return false

  return domains.every((domain) => blocked.has(domain))
}

function togglePreset(preset) {
  setError('')

  setPolicy((current) => {
    const blocked = new Set(cleanDomainList(current.customBlockedDomains || []))
    const allowed = new Set(cleanDomainList(current.customAllowedDomains || []))

    const domains = getPresetDomains(preset)
    const active = domains.length > 0 && domains.every((domain) => blocked.has(domain))

    if (active) {
      domains.forEach((domain) => blocked.delete(domain))
    } else {
      domains.forEach((domain) => {
        blocked.add(domain)
        allowed.delete(domain)
      })
    }

    return {
      ...current,
      customBlockedDomains: Array.from(blocked),
      customAllowedDomains: Array.from(allowed),
    }
  })
}

  function addBlockedDomain() {
    const domain = normalizeDomain(blockedInput)

    if (!isValidDomain(domain)) {
      setError('Informe um domínio válido para bloquear. Exemplo: tiktok.com')
      return
    }

    setError('')

    setPolicy((current) => {
      const blocked = new Set(current.customBlockedDomains || [])
      blocked.add(domain)

      const allowed = new Set(current.customAllowedDomains || [])
      allowed.delete(domain)

      return {
        ...current,
        customBlockedDomains: Array.from(blocked),
        customAllowedDomains: Array.from(allowed),
      }
    })

    setBlockedInput('')
  }

  function addAllowedDomain() {
    const domain = normalizeDomain(allowedInput)

    if (!isValidDomain(domain)) {
      setError('Informe um domínio válido para liberar. Exemplo: gov.br')
      return
    }

    setError('')

    setPolicy((current) => {
      const allowed = new Set(current.customAllowedDomains || [])
      allowed.add(domain)

      const blocked = new Set(current.customBlockedDomains || [])
      blocked.delete(domain)

      return {
        ...current,
        customAllowedDomains: Array.from(allowed),
        customBlockedDomains: Array.from(blocked),
      }
    })

    setAllowedInput('')
  }

 

  function removeBlockedDomain(domain) {
    setPolicy((current) => ({
      ...current,
      customBlockedDomains: (current.customBlockedDomains || []).filter((item) => item !== domain),
    }))
  }



  function removeAllowedDomain(domain) {
    setPolicy((current) => ({
      ...current,
      customAllowedDomains: (current.customAllowedDomains || []).filter((item) => item !== domain),
    }))
  }

  async function aplicarPolitica() {
    setError('')
    setMessage('')

    if (!hotspotIdFromUrl && !hotspotSlugFromUrl) {
      setError('Selecione um hotspot antes de aplicar a política.')
      return
    }

    try {
      setProcessing(true)

      const data = await adminApiFetch('/api/admin/rede/policy/apply', {
        method: 'POST',
        body: {
          hotspotId: hotspotIdFromUrl,
          hotspotSlug: hotspotSlugFromUrl,
          hotspotSubnet: policy.hotspotSubnet,
          forceDns: policy.forceDns,
          blockQuic: policy.blockQuic,
          blockTorrent: policy.blockTorrent,
          blockGames: policy.blockGames,
          blockTlsGames: policy.blockTlsGames,
          downloadLimit: policy.downloadLimit || '10M',
          uploadLimit: policy.uploadLimit || '3M',
          customBlockedDomains: policy.customBlockedDomains || [],
          customAllowedDomains: policy.customAllowedDomains || [],
        },
      })

      setStatus(data.result?.status || null)
      setHotspot(data.hotspot || hotspot)
      setMikrotik(data.router || mikrotik)

      setMessage('Política de rede aplicada com sucesso neste hotspot.')
      await carregarStatus()
    } catch (err) {
      console.error('Erro ao aplicar política:', err)
      setError(err.message || 'Erro ao aplicar política')
    } finally {
      setProcessing(false)
    }
  }

  async function resetarPolitica() {
    const confirmar = window.confirm(
      'Tem certeza que deseja remover todas as regras NexaWi deste hotspot? Use apenas para manutenção.'
    )

    if (!confirmar) return

    setError('')
    setMessage('')

    if (!hotspotIdFromUrl && !hotspotSlugFromUrl) {
      setError('Selecione um hotspot antes de resetar a política.')
      return
    }

    try {
      setProcessing(true)

      await adminApiFetch('/api/admin/rede/policy/reset', {
        method: 'POST',
        body: {
          hotspotId: hotspotIdFromUrl,
          hotspotSlug: hotspotSlugFromUrl,
        },
      })

      setMessage('Política removida com sucesso deste hotspot.')
      await carregarStatus()
    } catch (err) {
      console.error('Erro ao resetar política:', err)
      setError(err.message || 'Erro ao resetar política')
    } finally {
      setProcessing(false)
    }
  }

  

  useEffect(() => {
    carregarStatus()
  }, [hotspotIdFromUrl, hotspotSlugFromUrl])

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#6be12f]" size={34} />
          <p className="text-sm font-bold text-neutral-400">
            Carregando controle de rede...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative z-10 animate-fade-in-up">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none" />

      <header className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/hotspots')}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all mb-4"
          >
            <ArrowLeft size={14} />
            Voltar para Hotspots
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-extrabold text-[#8cf059] mb-4 ml-0 lg:ml-3">
            <Network size={14} />
            Controle operacional do hotspot
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Controle de Rede
          </h1>

          <p className="text-sm text-neutral-500 mt-2 max-w-2xl leading-relaxed">
            Configure bloqueios, velocidade, DNS e domínios diretamente no MikroTik vinculado ao hotspot selecionado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={carregarStatus}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06] disabled:opacity-50 transition-all"
          >
            <RefreshCcw size={16} />
            Atualizar Status
          </button>

          {canUpdate && (
            <button
              onClick={aplicarPolitica}
              disabled={processing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-3 text-sm font-black text-black hover:bg-[#8cf059] disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(107,225,47,0.18)]"
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Aplicar Política
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="relative z-10 mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="relative z-10 mb-6 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-sm font-bold text-[#8cf059]">
          {message}
        </div>
      )}

      {!canUpdate && (
        <div className="relative z-10 mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-bold text-neutral-400">
          Modo leitura: você pode visualizar a política, mas não pode aplicar ou resetar regras.
        </div>
      )}

      <section className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={status?.enabled ? ShieldCheck : ShieldOff}
          label="Status"
          value={status?.enabled ? 'Ativa' : 'Inativa'}
          accent={status?.enabled}
        />
        <StatCard
          icon={Router}
          label="Regras Filter"
          value={status?.filterCount ?? 0}
        />
        <StatCard
          icon={Globe}
          label="Regras NAT"
          value={status?.natCount ?? 0}
        />
        <StatCard
          icon={AlertTriangle}
          label="Inválidas"
          value={invalidRules.length}
          accent={invalidRules.length === 0}
        />
      </section>

      <section className="relative z-10 grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/[0.06] bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                <Wifi size={19} className="text-[#6be12f]" />
              </div>

              <div>
                <h2 className="text-lg font-black text-white">Hotspot selecionado</h2>
                <p className="text-xs text-neutral-500 font-medium">
                  Política aplicada somente neste ponto
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <InfoCard
                icon={Wifi}
                label="Hotspot"
                value={hotspot?.nome || hotspot?.slug || 'Não identificado'}
                description={hotspot?.slug ? `/portal/${hotspot.slug}` : ''}
              />
              <InfoCard
                icon={MapPin}
                label="Status"
                value={hotspot?.status || '—'}
                description="Status cadastral do hotspot"
              />
              <InfoCard
                icon={Server}
                label="MikroTik"
                value={mikrotik?.nome || 'Sem MikroTik vinculado'}
                description={mikrotik?.base_url || ''}
              />
              <InfoCard
                icon={Router}
                label="Hotspot Server"
                value={mikrotik?.hotspot_server || 'hotspot1'}
                description="Servidor hotspot usado no RouterOS"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.06] bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                <Zap size={19} className="text-[#6be12f]" />
              </div>

              <div>
                <h2 className="text-lg font-black text-white">Política NexaWi</h2>
                <p className="text-xs text-neutral-500 font-medium">
                  Configuração enviada para o MikroTik
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold text-neutral-500 mb-2">
                  Sub-rede dos clientes
                </label>
                <input
                  value={policy.hotspotSubnet}
                  disabled={!canUpdate}
                  onChange={(e) => setPolicy({ ...policy, hotspotSubnet: e.target.value })}
                  className="w-full rounded-2xl border border-white/[0.06] bg-[#050505] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/30 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-neutral-500 mb-2">
                    Download
                  </label>
                  <input
                    value={policy.downloadLimit}
                    disabled={!canUpdate}
                    onChange={(e) => setPolicy({ ...policy, downloadLimit: e.target.value })}
                    placeholder="10M"
                    className="w-full rounded-2xl border border-white/[0.06] bg-[#050505] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/30 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-neutral-500 mb-2">
                    Upload
                  </label>
                  <input
                    value={policy.uploadLimit}
                    disabled={!canUpdate}
                    onChange={(e) => setPolicy({ ...policy, uploadLimit: e.target.value })}
                    placeholder="3M"
                    className="w-full rounded-2xl border border-white/[0.06] bg-[#050505] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/30 disabled:opacity-60"
                  />
                </div>
              </div>

              <ToggleCard
                title="Forçar DNS pelo MikroTik"
                description="Redireciona consultas DNS dos clientes para o roteador."
                checked={policy.forceDns}
                disabled={!canUpdate || processing}
                onChange={(value) => setPolicy({ ...policy, forceDns: value })}
              />

              <ToggleCard
                title="Bloquear QUIC / HTTP3"
                description="Bloqueia UDP 443 para melhorar o controle por HTTPS."
                checked={policy.blockQuic}
                disabled={!canUpdate || processing}
                onChange={(value) => setPolicy({ ...policy, blockQuic: value })}
              />

              <ToggleCard
                title="Bloquear torrent"
                description="Bloqueia portas comuns de P2P e torrent."
                checked={policy.blockTorrent}
                disabled={!canUpdate || processing}
                onChange={(value) => setPolicy({ ...policy, blockTorrent: value })}
              />

              <ToggleCard
                title="Bloquear jogos"
                description="Bloqueia portas comuns usadas por jogos online."
                checked={policy.blockGames}
                disabled={!canUpdate || processing}
                onChange={(value) => setPolicy({ ...policy, blockGames: value })}
              />

              <ToggleCard
                title="Bloquear domínios de jogos"
                description="Adiciona regras TLS Host para plataformas conhecidas."
                checked={policy.blockTlsGames}
                disabled={!canUpdate || processing}
                onChange={(value) => setPolicy({ ...policy, blockTlsGames: value })}
              />
            </div>

            {canUpdate && (
              <button
                onClick={resetarPolitica}
                disabled={processing}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 hover:bg-red-500/15 disabled:opacity-50 transition-all"
              >
                <ShieldOff size={16} />
                Resetar Política
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/[0.06] bg-[#0a0a0a] p-6">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
    <div>
      <h2 className="text-lg font-black text-white">
        Presets rápidos
      </h2>
      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
        Bloqueios inteligentes para apps grandes. O painel adiciona um domínio simples e a Control API expande para regras avançadas no MikroTik.
      </p>
    </div>

    <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-bold text-[#8cf059]">
      <ShieldCheck size={14} />
      Automático
    </div>
  </div>

<div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
    {QUICK_PRESETS.map((preset) => {
      const active = isPresetActive(preset)

      return (
        <button
          key={preset.id}
          type="button"
          disabled={!canUpdate || processing}
          onClick={() => togglePreset(preset)}
          className={`text-left rounded-[1.5rem] border p-5 transition-all ${
            active
              ? 'border-[#6be12f]/30 bg-[#6be12f]/10'
              : 'border-white/[0.06] bg-[#050505] hover:border-white/[0.12]'
          } ${!canUpdate || processing ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-sm font-black text-white">
                  {preset.title}
                </p>

                <span className="rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#8cf059]">
                  {preset.badge}
                </span>
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed">
                {preset.description}
              </p>

              <p className="text-xs text-neutral-600 mt-3">
                Gatilhos: <span className="font-bold text-neutral-300">{getPresetDomains(preset).join(', ')}</span>
              </p>
            </div>

            <div
              className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors ${
                active ? 'bg-[#6be12f]' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  active ? 'left-7' : 'left-1'
                }`}
              />
            </div>
          </div>
        </button>
      )
    })}
  </div>
</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DomainManager
              title="Sites bloqueados"
              description="Domínios que devem ser bloqueados neste hotspot. Ex: tiktok.com, bet365.com, netflix.com"
              value={policy.customBlockedDomains || []}
              inputValue={blockedInput}
              setInputValue={setBlockedInput}
              disabled={!canUpdate || processing}
              onAdd={addBlockedDomain}
              onRemove={removeBlockedDomain}
              variant="blocked"
            />

            <DomainManager
              title="Sites liberados"
              description="Domínios que devem ser priorizados/liberados antes das regras de bloqueio. Ex: gov.br, banco.com.br"
              value={policy.customAllowedDomains || []}
              inputValue={allowedInput}
              setInputValue={setAllowedInput}
              disabled={!canUpdate || processing}
              onAdd={addAllowedDomain}
              onRemove={removeAllowedDomain}
              variant="allowed"
            />
          </div>

          <div className="rounded-[2rem] border border-white/[0.06] bg-[#0a0a0a] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-black text-white">Regras ativas</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Lista lida diretamente do MikroTik via Control API.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-bold text-neutral-400">
                <Activity size={14} />
                {allRules.length} regras
              </div>
            </div>

            {allRules.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#050505] p-8 text-center">
                <Wifi className="mx-auto text-neutral-600 mb-3" size={32} />
                <p className="text-sm font-bold text-neutral-400">
                  Nenhuma regra NexaWi ativa no MikroTik.
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  Clique em “Aplicar Política” para ativar o controle de rede.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
                {allRules.map((rule) => (
                  <RuleRow key={`${rule.comment}-${rule.id}`} rule={rule} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107,225,47,0.4); }
            .animate-fade-in-up { animation: fadeInUp .45s ease-out both; }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `,
        }}
      />
    </main>
  )
}