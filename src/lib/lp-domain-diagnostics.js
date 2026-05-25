import { resolve4, resolve6, resolveCname } from 'node:dns/promises'
import { isReservedNexawiHost, normalizeLpHost } from '@/lib/lp-custom-domain'

const VERCEL_A_RECORD = '76.76.21.21'
const VERCEL_CNAME_TARGETS = [
  'cname.vercel-dns.com',
  'cname.vercel.com',
]

function normalizeRecord(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '')
}

async function safeResolve(resolver, host) {
  try {
    return {
      ok: true,
      records: await resolver(host),
      error: '',
    }
  } catch (error) {
    const code = String(error?.code || '')

    if (['ENODATA', 'ENOTFOUND', 'ENOTIMP', 'ESERVFAIL', 'ETIMEOUT'].includes(code)) {
      return {
        ok: false,
        records: [],
        error: code || error.message || 'DNS sem resposta',
      }
    }

    return {
      ok: false,
      records: [],
      error: error.message || 'Falha ao consultar DNS',
    }
  }
}

export async function checkLpCustomDomainDns(host = '') {
  const normalizedHost = normalizeLpHost(host)

  if (!normalizedHost) {
    return {
      ok: false,
      status: 'missing',
      label: 'Dominio nao informado',
      host: '',
      message: 'Informe um dominio ou subdominio para verificar o apontamento.',
      records: { cname: [], a: [], aaaa: [] },
      expected: getExpectedDnsInstructions(''),
    }
  }

  if (isReservedNexawiHost(normalizedHost)) {
    return {
      ok: false,
      status: 'reserved',
      label: 'Dominio reservado',
      host: normalizedHost,
      message: 'Este dominio nao deve ser usado como dominio personalizado de cliente.',
      records: { cname: [], a: [], aaaa: [] },
      expected: getExpectedDnsInstructions(normalizedHost),
    }
  }

  const [cnameResult, aResult, aaaaResult] = await Promise.all([
    safeResolve(resolveCname, normalizedHost),
    safeResolve(resolve4, normalizedHost),
    safeResolve(resolve6, normalizedHost),
  ])

  const cnameRecords = (cnameResult.records || []).map(normalizeRecord)
  const aRecords = (aResult.records || []).map(normalizeRecord)
  const aaaaRecords = (aaaaResult.records || []).map(normalizeRecord)

  const hasVercelCname = cnameRecords.some((record) => (
    VERCEL_CNAME_TARGETS.includes(record) || record.endsWith('.vercel-dns.com') || record.endsWith('.vercel.app')
  ))
  const hasVercelA = aRecords.includes(VERCEL_A_RECORD)
  const configured = hasVercelCname || hasVercelA

  return {
    ok: configured,
    status: configured ? 'configured' : 'pending',
    label: configured ? 'DNS apontado' : 'DNS pendente',
    host: normalizedHost,
    message: configured
      ? 'O DNS ja aponta para a infraestrutura esperada. Confirme tambem se o dominio foi adicionado na Vercel.'
      : 'O DNS ainda nao aponta para a Vercel. Ajuste o registro no provedor do dominio e aguarde a propagacao.',
    records: {
      cname: cnameRecords,
      a: aRecords,
      aaaa: aaaaRecords,
    },
    errors: {
      cname: cnameResult.error,
      a: aResult.error,
      aaaa: aaaaResult.error,
    },
    expected: getExpectedDnsInstructions(normalizedHost),
  }
}

export function getExpectedDnsInstructions(host = '') {
  const normalizedHost = normalizeLpHost(host)
  const labels = normalizedHost.split('.').filter(Boolean)
  const isApex = labels.length <= 2

  if (!normalizedHost) {
    return {
      type: 'CNAME',
      name: 'lp',
      value: 'cname.vercel-dns.com',
      note: 'Para subdominios, use CNAME. Para dominio raiz, use A 76.76.21.21.',
    }
  }

  if (isApex) {
    return {
      type: 'A',
      name: '@',
      value: VERCEL_A_RECORD,
      note: 'Dominio raiz deve apontar para o A record da Vercel. Depois adicione o dominio no projeto da Vercel.',
    }
  }

  return {
    type: 'CNAME',
    name: labels[0],
    value: 'cname.vercel-dns.com',
    note: 'Subdominio deve apontar por CNAME para a Vercel. Depois adicione o dominio no projeto da Vercel.',
  }
}
