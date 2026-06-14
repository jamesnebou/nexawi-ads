'use client'

import { Poppins } from 'next/font/google'
import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const fluxoPontaAPonta = [
  {
    title: 'Landing e CRM',
    items: [
      'Abrir a landing page e selecionar um plano real.',
      'Enviar o formulário de interesse pela página /anunciar.',
      'Confirmar que o lead caiu no CRM com plano e valor potencial.',
    ],
  },
  {
    title: 'Cliente e financeiro',
    items: [
      'Converter o lead em cliente/anunciante.',
      'Criar plano ou assinatura recorrente pelo financeiro.',
      'Confirmar cobranca no Asaas e link de pagamento na área do cliente.',
      'Pagar uma cobrança teste e validar status Pago no painel.',
    ],
  },
  {
    title: 'Campanha e portal',
    items: [
      'Criar anúncio ativo vinculado ao cliente.',
      'Vincular campanha ao hotspot/local correto.',
      'Acessar o portal no celular e preencher nome, e-mail, telefone, CPF e LGPD.',
      'Confirmar anúncio obrigatório, timer, CTA e liberação apos regra cumprida.',
    ],
  },
  {
    title: 'Métricas e operação',
    items: [
      'Confirmar impressão, clique e lead no relatório comercial.',
      'Enviar relatório por e-mail e validar anexos PDF/CSV.',
      'Rodar auditoria da VPS e confirmar crons sem erro crítico.',
      'Testar bloqueio/desbloqueio no MikroTik quando o roteador estiver online.',
    ],
  },
]

async function adminApiFetch(path) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
  }

  const response = await fetch(path, {
    method: 'GET',
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
    throw new Error(`A API nao retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

function statusConfig(status) {
  const configs = {
    ok: {
      label: 'OK',
      icon: CheckCircle2,
      className: 'border-[#6be12f]/20 bg-[#6be12f]/10 text-[#8cf059]',
      iconClassName: 'text-[#8cf059]',
    },
    warning: {
      label: 'Atenção',
      icon: AlertTriangle,
      className: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
      iconClassName: 'text-yellow-300',
    },
    error: {
      label: 'Erro',
      icon: XCircle,
      className: 'border-red-500/20 bg-red-500/10 text-red-300',
      iconClassName: 'text-red-300',
    },
  }

  return configs[status] || configs.warning
}

function formatarData(value) {
  if (!value) return '-'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SummaryCard({ title, value, status, icon: Icon }) {
  const config = statusConfig(status)

  return (
    <div className="min-w-0 rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 sm:p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 font-extrabold">
            {title}
          </p>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {value}
          </p>
        </div>

        <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${config.className}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function CheckRow({ item }) {
  const config = statusConfig(item.status)
  const Icon = config.icon

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/35 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Icon size={18} className={config.iconClassName} />
            <h3 className="text-sm font-extrabold text-white">
              {item.title}
            </h3>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            {item.detail}
          </p>
        </div>

        <span className={`inline-flex w-fit items-center rounded-xl border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest ${config.className}`}>
          {config.label}
        </span>
      </div>
    </div>
  )
}

function EnvGroup({ group }) {
  const config = statusConfig(group.status)

  function envLabel(item) {
    const labels = {
      configured: 'configurada',
      fallback: item.fallbackLabel || 'fallback',
      default: item.fallbackLabel || 'padrao',
      missing: 'pendente',
    }

    return labels[item.mode] || (item.effective ? 'ok' : 'pendente')
  }

  function envClass(item) {
    if (item.mode === 'configured') return 'text-[#8cf059]'
    if (['fallback', 'default'].includes(item.mode)) return 'text-cyan-300'
    return 'text-yellow-300'
  }

  return (
    <div className="min-w-0 rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-white">
            {group.title}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Mostra apenas presenca da variável, nunca o valor.
          </p>
        </div>

        <span className={`rounded-xl border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest ${config.className}`}>
          {config.label}
        </span>
      </div>

      <div className="mt-5 grid gap-2">
        {(group.keys || []).map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-black/35 px-3 py-2">
            <span className="truncate text-xs font-bold text-neutral-300">
              {item.key}
            </span>
            <span className={`text-[10px] font-extrabold uppercase tracking-widest ${envClass(item)}`}>
              {envLabel(item)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScriptGroup({ scripts }) {
  return (
    <div className="min-w-0 rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <TerminalSquare size={20} className="text-[#8cf059]" />
        <div>
          <h3 className="text-base font-extrabold text-white">
            Scripts operacionais
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Arquivos versionados que devem existir na VPS apos o deploy.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {(scripts || []).map((script) => (
          <div key={script.id} className="rounded-xl border border-white/[0.06] bg-black/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-white">
                  {script.title}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {script.path}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-neutral-300">
                  {script.cron}
                </span>
                <span className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest ${script.exists ? 'bg-[#6be12f]/10 text-[#8cf059]' : 'bg-yellow-500/10 text-yellow-300'}`}>
                  {script.exists ? 'encontrado' : 'pendente'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EndToEndChecklist() {
  return (
    <div className="min-w-0 rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <ClipboardCheck size={20} className="text-[#8cf059]" />
        <div>
          <h3 className="text-base font-extrabold text-white">
            Teste ponta a ponta
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Roteiro final para validar o SaaS como se fosse uma venda real.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {fluxoPontaAPonta.map((group, groupIndex) => (
          <div key={group.title} className="rounded-2xl border border-white/[0.06] bg-black/35 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 text-xs font-extrabold text-[#8cf059]">
                {groupIndex + 1}
              </span>
              <h4 className="text-sm font-extrabold text-white">
                {group.title}
              </h4>
            </div>

            <div className="mt-4 space-y-3">
              {group.items.map((item, itemIndex) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] font-extrabold text-neutral-400">
                    {itemIndex + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-neutral-300">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OperacaoPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const summary = data?.summary || {}

  const checksOrdenados = useMemo(() => {
    const checks = data?.checks || []
    const peso = { error: 0, warning: 1, ok: 2 }
    return [...checks].sort((a, b) => (peso[a.status] ?? 9) - (peso[b.status] ?? 9))
  }, [data])

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    try {
      const result = await adminApiFetch('/api/admin/operacao')
      setData(result)
    } catch (error) {
      console.error('Erro ao carregar operação:', error)
      toast.error(error.message || 'Erro ao carregar operação.')
    } finally {
      setLoading(false)
    }
  }

  const resumoStatus = summary.status || 'warning'

  return (
    <div className={`${poppins.className} space-y-8 pb-10`}>
      <Toaster position="top-right" />

      <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 p-3 text-[#8cf059]">
            <ServerCog size={28} />
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Operação
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
              Checklist vivo de produção: variáveis, Supabase, scripts, crons e pontos que precisam estar prontos para o SaaS operar sem depender de memória.
            </p>
            {data?.checkedAt && (
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-neutral-500">
                <Clock3 size={14} />
                Atualizado em {formatarData(data.checkedAt)}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Status geral" value={statusConfig(resumoStatus).label} status={resumoStatus} icon={ShieldCheck} />
        <SummaryCard title="OK" value={summary.ok ?? 0} status="ok" icon={CheckCircle2} />
        <SummaryCard title="Atenções" value={summary.warning ?? 0} status="warning" icon={AlertTriangle} />
        <SummaryCard title="Erros" value={summary.error ?? 0} status="error" icon={XCircle} />
      </section>

      {loading ? (
        <div className="rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-5 sm:p-8 text-center">
          <RefreshCw className="mx-auto animate-spin text-[#8cf059]" size={28} />
          <p className="mt-4 text-sm font-bold text-neutral-400">
            Carregando checklist operacional...
          </p>
        </div>
      ) : (
        <>
          <section className="min-w-0 rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.06] bg-[#0b0b0b] p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-3">
              <Activity size={20} className="text-[#8cf059]" />
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  Checks principais
                </h2>
                <p className="text-xs text-neutral-500">
                  Erros e atenções aparecem primeiro.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {checksOrdenados.map((item) => (
                <CheckRow key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {(data?.envGroups || []).map((group) => (
              <EnvGroup key={group.id} group={group} />
            ))}
          </section>

          <ScriptGroup scripts={data?.scripts || []} />

          <EndToEndChecklist />
        </>
      )}
    </div>
  )
}
