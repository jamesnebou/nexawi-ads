import { NextResponse } from 'next/server'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const ENV_GROUPS = [
  {
    id: 'core',
    title: 'Aplicacao e Supabase',
    keys: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXAWI_CRON_SECRET',
    ],
  },
  {
    id: 'email',
    title: 'E-mail transacional',
    keys: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'ADMIN_ALERT_EMAIL'],
  },
  {
    id: 'asaas',
    title: 'Asaas',
    keys: [
      'ASAAS_ENV',
      'ASAAS_API_KEY',
      'ASAAS_WEBHOOK_TOKEN',
      {
        key: 'ASAAS_FINE_PERCENT',
        fallback: '3',
        fallbackLabel: 'padrao 3%',
      },
      {
        key: 'ASAAS_INTEREST_PERCENT',
        fallback: '2',
        fallbackLabel: 'padrao 2%',
      },
    ],
  },
  {
    id: 'control',
    title: 'Control API e MikroTik',
    keys: [
      'CONTROL_API_MODE',
      'CONTROL_API_BASE_URL',
      {
        key: 'NEXAWI_CONTROL_SECRET',
        fallbackKey: 'NEXAWI_CRON_SECRET',
        fallbackLabel: 'fallback NEXAWI_CRON_SECRET',
      },
      'ROUTEROS_BASE_URL',
      'ROUTEROS_USERNAME',
      'ROUTEROS_PASSWORD',
      'ROUTEROS_HOTSPOT_SERVER',
    ],
  },
  {
    id: 'conversions',
    title: 'Conversoes server-side',
    keys: [
      { key: 'META_CONVERSIONS_PIXEL_ID', fallbackKey: 'LP_META_CONVERSIONS_PIXEL_ID', fallbackLabel: 'fallback LP_META_CONVERSIONS_PIXEL_ID' },
      { key: 'META_CONVERSIONS_ACCESS_TOKEN', fallbackKey: 'LP_META_CONVERSIONS_ACCESS_TOKEN', fallbackLabel: 'fallback LP_META_CONVERSIONS_ACCESS_TOKEN' },
      { key: 'META_CONVERSIONS_API_VERSION', fallback: 'v20.0', fallbackLabel: 'padrao v20.0' },
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_OAUTH_ACCESS_TOKEN',
      'GOOGLE_ADS_CUSTOMER_ID',
      'GOOGLE_ADS_CONVERSION_ACTION_ID',
      { key: 'GOOGLE_ADS_API_VERSION', fallback: 'v19', fallbackLabel: 'padrao v19' },
    ],
  },
]

const SCRIPT_CHECKS = [
  {
    id: 'session_reconcile',
    title: 'Reconcile de sessoes',
    file: 'reconcile.sh',
    cron: '*/5 * * * *',
  },
  {
    id: 'finance_reconcile',
    title: 'Reconcile financeiro',
    file: 'financeiro-reconcile.sh',
    cron: '0 8 * * *',
  },
  {
    id: 'monthly_report',
    title: 'Relatorio mensal',
    file: 'monthly-commercial-report.sh',
    cron: '10 8 1 * *',
  },
  {
    id: 'supabase_backup',
    title: 'Backup Supabase',
    file: 'backup-supabase.sh',
    cron: '20 3 * * *',
  },
  {
    id: 'audit',
    title: 'Auditoria rapida',
    file: 'audit.sh',
    cron: 'manual',
  },
]

function envConfigured(key) {
  return Boolean(String(process.env[key] || '').trim())
}

function normalizeEnvRule(rule) {
  return typeof rule === 'string' ? { key: rule } : rule
}

function resolveEnvRule(rule) {
  const envRule = normalizeEnvRule(rule)
  const configured = envConfigured(envRule.key)
  const fallbackConfigured = envRule.fallbackKey ? envConfigured(envRule.fallbackKey) : false
  const hasDefault = Object.prototype.hasOwnProperty.call(envRule, 'fallback')
  const effective = configured || fallbackConfigured || hasDefault

  let mode = 'missing'

  if (configured) {
    mode = 'configured'
  } else if (fallbackConfigured) {
    mode = 'fallback'
  } else if (hasDefault) {
    mode = 'default'
  }

  return {
    key: envRule.key,
    configured,
    effective,
    mode,
    fallbackKey: envRule.fallbackKey || '',
    fallbackLabel: envRule.fallbackLabel || '',
  }
}

function statusFromKeys(keys) {
  return keys.every((item) => item.effective) ? 'ok' : 'warning'
}

function scriptExists(file) {
  return existsSync(join(process.cwd(), 'scripts', file))
}

function summarize(items) {
  const errors = items.filter((item) => item.status === 'error').length
  const warnings = items.filter((item) => item.status === 'warning').length

  if (errors > 0) return 'error'
  if (warnings > 0) return 'warning'
  return 'ok'
}

function envValue(key) {
  return String(process.env[key] || '').trim()
}

async function checkControlApi() {
  const mode = envValue('CONTROL_API_MODE') || 'direct'
  const baseUrl = envValue('CONTROL_API_BASE_URL').replace(/\/$/, '')
  const secret = envValue('NEXAWI_CONTROL_SECRET') || envValue('NEXAWI_CRON_SECRET')

  if (mode === 'proxy' && !baseUrl) {
    return {
      id: 'control_api_health',
      title: 'Control API remota',
      status: 'error',
      detail: 'CONTROL_API_MODE=proxy exige CONTROL_API_BASE_URL configurada.',
    }
  }

  if (!baseUrl) {
    return {
      id: 'control_api_health',
      title: 'Control API remota',
      status: 'warning',
      detail: 'Sem CONTROL_API_BASE_URL. Ambiente em modo direto/local ou ainda nao configurado para VPS.',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: secret ? { 'x-control-secret': secret } : {},
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return {
      id: 'control_api_health',
      title: 'Control API remota',
      status: 'ok',
      detail: `Control API respondeu em ${baseUrl}.`,
    }
  } catch (error) {
    return {
      id: 'control_api_health',
      title: 'Control API remota',
      status: 'error',
      detail: `Control API indisponivel em ${baseUrl}: ${error.message || 'falha de conexao'}.`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkWifiPixPlanos(auth) {
  try {
    let hotspotsQuery = supabaseAdmin
      .from('hotspots')
      .select('id, nome, slug, status, portal_modo_acesso, wifi_pix_ativo')
      .eq('status', 'Ativo')
      .in('portal_modo_acesso', ['pix', 'hibrido'])

    hotspotsQuery = auth.applyEmpresaScope(hotspotsQuery)

    const { data: hotspots, error: hotspotsError } = await hotspotsQuery
    if (hotspotsError) throw hotspotsError

    const paidHotspots = hotspots || []

    if (paidHotspots.length === 0) {
      return {
        id: 'wifi_pix_paid_plans',
        title: 'Pix/Hibrido com planos ativos',
        status: 'ok',
        detail: 'Nenhum hotspot ativo esta em modo Pix ou Hibrido.',
      }
    }

    const hotspotIds = paidHotspots.map((hotspot) => hotspot.id).filter(Boolean)
    let planosQuery = supabaseAdmin
      .from('wifi_pix_planos')
      .select('id, hotspot_id')
      .in('hotspot_id', hotspotIds)
      .eq('ativo', true)

    planosQuery = auth.applyEmpresaScope(planosQuery)

    const { data: planos, error: planosError } = await planosQuery
    if (planosError) throw planosError

    const planosPorHotspot = new Set((planos || []).map((plano) => plano.hotspot_id))
    const semPlano = paidHotspots.filter((hotspot) => !planosPorHotspot.has(hotspot.id))

    if (semPlano.length > 0) {
      return {
        id: 'wifi_pix_paid_plans',
        title: 'Pix/Hibrido com planos ativos',
        status: 'error',
        detail: `Hotspot pago sem plano ativo: ${semPlano.map((hotspot) => hotspot.nome || hotspot.slug).join(', ')}.`,
      }
    }

    return {
      id: 'wifi_pix_paid_plans',
      title: 'Pix/Hibrido com planos ativos',
      status: 'ok',
      detail: `${paidHotspots.length} hotspot(s) em modo Pix/Hibrido possuem plano ativo.`,
    }
  } catch (error) {
    const message = String(error?.message || '')
    return {
      id: 'wifi_pix_paid_plans',
      title: 'Pix/Hibrido com planos ativos',
      status: message.includes('wifi_pix_planos') || message.includes('schema cache') ? 'warning' : 'error',
      detail: error.message || 'Nao foi possivel validar planos Wi-Fi no Pix.',
    }
  }
}
async function checkSupabase() {
  try {
    const { error } = await supabaseAdmin
      .from('admin_users')
      .select('user_id', { head: true, count: 'exact' })
      .limit(1)

    if (error) throw error

    return {
      id: 'supabase',
      title: 'Supabase administrativo',
      status: 'ok',
      detail: 'Service role configurada e consulta administrativa respondendo.',
    }
  } catch (error) {
    return {
      id: 'supabase',
      title: 'Supabase administrativo',
      status: 'error',
      detail: error.message || 'Falha ao consultar Supabase.',
    }
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request, { module: 'auditoria', action: 'view' })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  const envGroups = ENV_GROUPS.map((group) => {
    const keys = group.keys.map(resolveEnvRule)
    const missing = keys.filter((item) => !item.effective).map((item) => item.key)
    const defaults = keys.filter((item) => ['default', 'fallback'].includes(item.mode))

    return {
      ...group,
      status: statusFromKeys(keys),
      keys,
      missing,
      defaults,
    }
  })

  const scripts = SCRIPT_CHECKS.map((script) => {
    const exists = scriptExists(script.file)
    const path = `scripts/${script.file}`

    return {
      ...script,
      path,
      exists,
      status: exists ? 'ok' : 'warning',
    }
  })

  const [supabase, controlApi, wifiPixPlanos] = await Promise.all([
    checkSupabase(),
    checkControlApi(),
    checkWifiPixPlanos(auth),
  ])

  const checks = [
    supabase,
    controlApi,
    wifiPixPlanos,
    ...envGroups.map((group) => ({
      id: `env_${group.id}`,
      title: group.title,
      status: group.status,
      detail: group.missing.length
        ? `Variaveis pendentes: ${group.missing.join(', ')}`
        : group.defaults.length
          ? `Configurado com padroes/fallbacks: ${group.defaults.map((item) => `${item.key} (${item.fallbackLabel || item.mode})`).join(', ')}`
        : 'Variaveis obrigatorias presentes neste ambiente.',
    })),
    ...scripts.map((script) => ({
      id: `script_${script.id}`,
      title: script.title,
      status: script.status,
      detail: script.exists
        ? `Script encontrado em ${script.path}. Cron sugerido: ${script.cron}.`
        : `Script nao encontrado em ${script.path}.`,
    })),
  ]

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    summary: {
      status: summarize(checks),
      total: checks.length,
      ok: checks.filter((item) => item.status === 'ok').length,
      warning: checks.filter((item) => item.status === 'warning').length,
      error: checks.filter((item) => item.status === 'error').length,
    },
    checks,
    envGroups,
    scripts,
  })
}
