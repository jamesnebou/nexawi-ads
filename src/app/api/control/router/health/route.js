import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { routerHealth } from '@/lib/routeros-rest'

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