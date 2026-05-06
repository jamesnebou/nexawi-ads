import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { removeBypassBindings, normalizeMac } from '@/lib/routeros-rest'
import {
  resolveHotspotBySlug,
  getLatestSession,
  markSessionCooldown,
  logRouterAction,
} from '@/lib/session-control'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'

export const runtime = 'nodejs'

export async function POST(request) {
if (CONTROL_API_MODE === 'proxy') {
  return proxyControlRequest(request, '/api/control/session/revoke', 'POST')
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
      return NextResponse.json({ ok: false, error: 'Hotspot não encontrado' }, { status: 404 })
    }

    const latestSession = await getLatestSession({
      hotspotId: hotspot.id,
      clientMac,
    })

    if (!latestSession || latestSession.session_state !== 'authorized') {
      return NextResponse.json({
        ok: true,
        message: 'Nenhuma sessão autorizada ativa para revogar',
      })
    }

    const result = await removeBypassBindings({ macAddress: clientMac })
    const cooledDownSession = await markSessionCooldown(latestSession.id)

    await logRouterAction({
      authSessionId: latestSession.id,
      action: 'revoke_bypass',
      status: 'success',
      responsePayload: result,
    })

    return NextResponse.json({
      ok: true,
      session: cooledDownSession,
      router: result,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno na revogação' },
      { status: 500 }
    )
  }
}