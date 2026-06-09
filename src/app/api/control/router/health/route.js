import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { routerHealth } from '@/lib/routeros-rest'
import { createAdminNotification } from '@/lib/admin-notifications'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'
const CONTROL_API_BASE_URL = process.env.CONTROL_API_BASE_URL || ''

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    if (CONTROL_API_MODE === 'proxy') {
      return proxyControlRequest(request, '/api/control/router/health', 'GET')
    }

    const data = await routerHealth()

    return NextResponse.json({
      ok: true,
      mode: CONTROL_API_MODE,
      baseUrl: CONTROL_API_BASE_URL,
      router: data,
    })
  } catch (error) {
    await createAdminNotification({
      type: 'control_api_router_health_down',
      title: 'Control API ou MikroTik sem resposta',
      message: error.message || 'Falha ao consultar a saude do RouterOS pela Control API.',
      severity: 'critical',
      entity: 'mikrotik',
      actionUrl: '/dashboard/operacao',
      dedupKey: 'control-api-router-health-down',
      metadata: {
        mode: CONTROL_API_MODE,
        base_url: CONTROL_API_BASE_URL,
        error: error.message || '',
      },
    })

    return NextResponse.json(
      {
        ok: false,
        mode: CONTROL_API_MODE,
        baseUrl: CONTROL_API_BASE_URL,
        error: error.message || 'Falha no health do RouterOS',
      },
      { status: 500 }
    )
  }
}