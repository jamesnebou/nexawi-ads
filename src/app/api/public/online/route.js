// src/app/api/public/online/route.js
// ============================================================
// API pública segura para exibir quantidade de pessoas online.
// Usada na landing page.
//
// Não expõe IP, MAC, e-mail, lead ou detalhes sensíveis.
// Busca o dado real via /api/control/router/online.
// ============================================================

import { NextResponse } from 'next/server'
import { countOnlineHotspotClients } from '@/lib/routeros-rest'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'
const CONTROL_API_BASE_URL = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')

export const runtime = 'nodejs'

async function buscarOnlineViaControlApi() {
  if (CONTROL_API_MODE === 'proxy') {
    if (!CONTROL_API_BASE_URL) {
      throw new Error('CONTROL_API_BASE_URL não configurado')
    }

    const response = await fetch(`${CONTROL_API_BASE_URL}/api/control/router/online`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || 'Control API não retornou online real')
    }

    return {
      online: Number(data.online || 0),
      source: 'control-api-routeros',
      reliable: Boolean(data.reliable),
      checkedAt: data.checkedAt || new Date().toISOString(),
    }
  }

  const result = await countOnlineHotspotClients()

  return {
    online: Number(result.count || 0),
    source: 'routeros',
    reliable: true,
    checkedAt: result.checkedAt || new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const result = await buscarOnlineViaControlApi()

    return NextResponse.json(
      {
        ok: true,
        online: result.online,
        source: result.source,
        reliable: result.reliable,
        checkedAt: result.checkedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      }
    )
  } catch (error) {
    console.error('Erro no contador público online:', error)

    return NextResponse.json(
      {
        ok: true,
        online: 0,
        source: 'routeros',
        reliable: false,
        checkedAt: new Date().toISOString(),
        status: 'unavailable',
        message: 'Monitoramento em tempo real ativo',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  }
}