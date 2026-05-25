import { NextResponse } from 'next/server'
import { monitorRouterTraffic, runRouterInternetTest } from '@/lib/routeros-traffic'

export const runtime = 'nodejs'

function assertControlSecret(request) {
  const expected =
    process.env.NEXAWI_CONTROL_SECRET ||
    process.env.NEXAWI_CRON_SECRET ||
    ''

  const received =
    request.headers.get('x-control-secret') ||
    request.headers.get('x-cron-secret') ||
    ''

  if (!expected || received !== expected) {
    throw new Error('Acesso nao autorizado a Control API')
  }
}

function isInternetTestMode(mode = '') {
  return mode === 'speed-test' || mode === 'internet-test'
}

export async function POST(request) {
  try {
    assertControlSecret(request)

    const body = await request.json().catch(() => ({}))
    const routerConfig = body.routerConfig || {}
    const interfaceName = String(body.interfaceName || body.interface || '').trim()
    const mode = String(body.mode || body.type || 'traffic').trim()

    const data = isInternetTestMode(mode)
      ? await runRouterInternetTest({
        routerConfig,
        interfaceName,
        bytes: body.bytes,
        downloadUrl: body.downloadUrl,
        pingHost: body.pingHost || '1.1.1.1',
      })
      : await monitorRouterTraffic({
        routerConfig,
        interfaceName,
      })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao monitorar trafego do MikroTik',
      },
      { status: 500 }
    )
  }
}
