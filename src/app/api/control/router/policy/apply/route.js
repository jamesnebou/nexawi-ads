import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { applyNexawiNetworkPolicy } from '@/lib/routeros-rest'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'

export const runtime = 'nodejs'

function validateControlSecret(request) {
  const received =
    request.headers.get('x-control-secret') ||
    request.headers.get('x-cron-secret')

  const expectedSecrets = [
    process.env.NEXAWI_CONTROL_SECRET,
    process.env.NEXAWI_CRON_SECRET,
  ].filter(Boolean)

  return Boolean(received && expectedSecrets.includes(received))
}

export async function POST(request) {
  if (CONTROL_API_MODE === 'proxy') {
    return proxyControlRequest(request, '/api/control/router/policy/apply', 'POST')
  }

  if (!validateControlSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Não autorizado' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = await applyNexawiNetworkPolicy(body || {})

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao aplicar política de rede',
      },
      { status: 500 }
    )
  }
}
