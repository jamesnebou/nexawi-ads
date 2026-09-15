import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { normalizeMac } from '@/lib/routeros-rest'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  resolveHotspotBySlug,
  getLatestSession,
  markSessionExpired,
  computeStatusFromSession,
} from '@/lib/session-control'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'
const RATE_LIMIT = {
  keyPrefix: 'control:session:status',
  limit: 60,
  windowMs: 60_000,
}

export const runtime = 'nodejs'

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas consultas de sessao. Aguarde um instante.' },
      { status: 429 }
    )
  }

  if (CONTROL_API_MODE === 'proxy') {
    return proxyControlRequest(request, '/api/control/session/status', 'POST')
  }

  try {
    const body = await request.json()
    const hotspotSlug = String(body.hotspotSlug || '').trim()
    const clientMac = normalizeMac(body.clientMac || '')

    if (!hotspotSlug || !clientMac) {
      return NextResponse.json(
        { ok: false, error: 'hotspotSlug e clientMac são obrigatórios' },
        { status: 400 }
      )
    }

    const hotspot = await resolveHotspotBySlug(hotspotSlug)

    if (!hotspot) {
      return NextResponse.json(
        { ok: false, error: 'Hotspot não encontrado' },
        { status: 404 }
      )
    }

    const latestSession = await getLatestSession({
      hotspotId: hotspot.id,
      clientMac,
    })

    if (!latestSession) {
      return NextResponse.json({
        ok: true,
        status: { state: 'idle', remainingSeconds: 0 },
      })
    }

    const status = computeStatusFromSession(latestSession)

    if (status.state === 'authorized_expired' || status.state === 'cooldown_expired') {
      await markSessionExpired(latestSession.id)
      return NextResponse.json({
        ok: true,
        status: { state: 'idle', remainingSeconds: 0 },
      })
    }

    return NextResponse.json({
      ok: true,
      status,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno no status' },
      { status: 500 }
    )
  }
}
