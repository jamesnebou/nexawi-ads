import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLpConfig } from '@/lib/lp-generator-defaults'

const RESERVED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'nexawi.com.br',
  'www.nexawi.com.br',
  'wifi.nexawi.com.br',
])

function cleanText(value = '') {
  return String(value || '').trim()
}

export function normalizeLpHost(host = '') {
  return cleanText(host)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
}

export function isReservedNexawiHost(host = '') {
  const normalized = normalizeLpHost(host)

  if (!normalized) return true
  if (RESERVED_HOSTS.has(normalized)) return true
  if (normalized.endsWith('.localhost')) return true
  if (normalized.endsWith('.vercel.app')) return true

  return false
}

export async function getLpByCustomDomain(host = '') {
  const normalizedHost = normalizeLpHost(host)

  if (!normalizedHost || isReservedNexawiHost(normalizedHost)) return null

  const { data, error } = await supabaseAdmin
    .from('lp_generator_pages')
    .select('*')
    .eq('status', 'published')
    .eq('config->integracoes->>customDomain', normalizedHost)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    ...data,
    config: getLpConfig(data.config || {}),
  }
}
