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

  const supabase = await checkSupabase()

  const checks = [
    supabase,
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
