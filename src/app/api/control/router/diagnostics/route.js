import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { routerDiagnostics } from '@/lib/routeros-rest'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'

export const runtime = 'nodejs'

function validateControlSecret(request) {
  const received =
    request.headers.get('x-control-secret') ||
    request.headers.get('x-cron-secret')

  const expected = process.env.NEXAWI_CRON_SECRET

  return Boolean(expected && received && received === expected)
}

async function handleDiagnostics(request, body = {}) {
  if (!validateControlSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Não autorizado' },
      { status: 401 }
    )
  }

  try {
    const result = await routerDiagnostics({
      routerConfig: body.routerConfig || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        error: error.message || 'Erro ao diagnosticar MikroTik',
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  if (CONTROL_API_MODE === 'proxy') {
    return proxyControlRequest(request, '/api/control/router/diagnostics', 'GET')
  }

  return handleDiagnostics(request, {})
}

export async function POST(request) {
  if (CONTROL_API_MODE === 'proxy') {
    return proxyControlRequest(request, '/api/control/router/diagnostics', 'POST')
  }

  const body = await request.json().catch(() => ({}))
  return handleDiagnostics(request, body || {})
}
