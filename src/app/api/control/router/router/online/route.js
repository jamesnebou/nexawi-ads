// src/app/api/control/router/online/route.js
// ============================================================
// Retorna a quantidade real de clientes online no MikroTik.
// Suporta dois modos:
//
// direct:
//   A própria aplicação consulta o MikroTik via RouterOS REST.
//
// proxy:
//   A aplicação na Vercel repassa para a VPS/control-api,
//   e a VPS consulta o MikroTik.
// ============================================================

import { NextResponse } from 'next/server'
import { proxyControlRequest } from '@/lib/control-proxy'
import { countOnlineHotspotClients } from '@/lib/routeros-rest'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'
const CONTROL_API_BASE_URL = process.env.CONTROL_API_BASE_URL || ''

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    if (CONTROL_API_MODE === 'proxy') {
      return proxyControlRequest(request, '/api/control/router/online', 'GET')
    }

    const result = await countOnlineHotspotClients()

    return NextResponse.json({
      ok: true,
      mode: CONTROL_API_MODE,
      baseUrl: CONTROL_API_BASE_URL,
      online: result.count || 0,
      source: 'routeros',
      reliable: true,
      checkedAt: result.checkedAt,
      server: result.server || '',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: CONTROL_API_MODE,
        baseUrl: CONTROL_API_BASE_URL,
        online: 0,
        source: 'routeros',
        reliable: false,
        checkedAt: new Date().toISOString(),
        error: error.message || 'Falha ao consultar usuários online no RouterOS',
      },
      { status: 500 }
    )
  }
}