import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { getNexawiNetworkPolicyStatus } from '@/lib/routeros-rest'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'

export const runtime = 'nodejs'

function validateControlSecret(request) {
  const received =
    request.headers.get('x-control-secret') ||
    request.headers.get('x-cron-secret')

  const expected = process.env.NEXAWI_CRON_SECRET

  return Boolean(expected && received && received === expected)
}

export async function GET(request) {
  if (CONTROL_API_MODE === 'proxy') {
    return proxyControlRequest(request, '/api/control/router/policy/status', 'GET')
  }

  if (!validateControlSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Não autorizado' },
      { status: 401 }
    )
  }

  try {
    const result = await getNexawiNetworkPolicyStatus()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao consultar política de rede',
      },
      { status: 500 }
    )
  }
}