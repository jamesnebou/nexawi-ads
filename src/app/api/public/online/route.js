// src/app/api/public/online/route.js
// ============================================================
// API pública segura para exibir quantidade de pessoas online.
// Usada na landing page / página de vendas.
//
// Não expõe IP, MAC, e-mail, lead ou detalhes sensíveis.
// Retorna apenas o número agregado.
// ============================================================

import { NextResponse } from 'next/server'
import { countOnlineHotspotClients } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const result = await countOnlineHotspotClients()

    return NextResponse.json(
      {
        ok: true,
        online: result.count || 0,
        source: 'routeros',
        reliable: true,
        checkedAt: result.checkedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        online: 0,
        source: 'routeros',
        reliable: false,
        checkedAt: new Date().toISOString(),
        error: 'Online indisponível no momento',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  }
}