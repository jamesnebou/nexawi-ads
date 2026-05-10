import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import {
  ensureBypassBinding,
  ensureClientBandwidthQueue,
  removeHotspotHostsByMac,
  normalizeMac,
} from '@/lib/routeros-rest'
import {
  resolveHotspotBySlug,
  resolveLeadForAuthorization,
  getLatestSession,
  createPendingSession,
  markSessionAuthorized,
  markSessionExpired,
  markSessionError,
  logRouterAction,
  computeStatusFromSession,
} from '@/lib/session-control'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'

export const runtime = 'nodejs'

export async function POST(request) {
  if (CONTROL_API_MODE === 'proxy') {
  return proxyControlRequest(request, '/api/control/session/authorize', 'POST')
}

  try {
    const body = await request.json()
    const hotspotSlug = String(body.hotspotSlug || '').trim()
    const leadId = String(body.leadId || '').trim()
    const clientMac = normalizeMac(body.clientMac || '')
    const clientIp = String(body.clientIp || '').trim()

    if (!hotspotSlug) {
      return NextResponse.json({ ok: false, error: 'hotspotSlug é obrigatório' }, { status: 400 })
    }

    if (!leadId) {
      return NextResponse.json({ ok: false, error: 'leadId é obrigatório' }, { status: 400 })
    }

    if (!clientMac) {
      return NextResponse.json({ ok: false, error: 'clientMac é obrigatório' }, { status: 400 })
    }

    const hotspot = await resolveHotspotBySlug(hotspotSlug)

    if (!hotspot) {
      return NextResponse.json({ ok: false, error: 'Hotspot não encontrado' }, { status: 404 })
    }

    const lead = await resolveLeadForAuthorization({
      leadId,
      hotspotId: hotspot.id,
      clientMac,
      clientIp,
    })

    if (!lead) {
      return NextResponse.json({ ok: false, error: 'Lead não encontrado para este hotspot' }, { status: 404 })
    }

    const latestSession = await getLatestSession({
      hotspotId: hotspot.id,
      clientMac,
    })

    if (latestSession) {
      const status = computeStatusFromSession(latestSession)

      if (status.state === 'authorized') {
  try {
    await logRouterAction({
      authSessionId: latestSession.id,
      action: 'reauthorize_bypass',
      status: 'success',
      requestPayload: {
        hotspotSlug,
        leadId: lead.id,
        clientMac,
        clientIp,
        reason: 'session_already_authorized_reensure_routeros',
      },
    })

    const binding = await ensureBypassBinding({
      macAddress: clientMac,
      comment: `auth_session:${latestSession.id}`,
    })


    const bandwidthQueue = await ensureClientBandwidthQueue({
  macAddress: clientMac,
  comment: `auth_session:${latestSession.id}`,
})

const hostCleanup = await removeHotspotHostsByMac({
  macAddress: clientMac,
})

    const authorizedSession = await markSessionAuthorized(
      latestSession.id,
      binding?.['.id'] || null
    )

    await logRouterAction({
      authSessionId: latestSession.id,
      action: 'reauthorize_bypass_result',
      status: 'success',
      responsePayload: binding,
    })

    return NextResponse.json({
  ok: true,
  alreadyAuthorized: true,
  reauthorized: true,
  session: authorizedSession,
  binding,
  bandwidthQueue,
  hostCleanup,
  status,
})
  } catch (routerError) {
    await markSessionError(
      latestSession.id,
      routerError.message || 'Falha ao reautorizar no RouterOS'
    )

    await logRouterAction({
      authSessionId: latestSession.id,
      action: 'reauthorize_bypass_result',
      status: 'error',
      errorMessage: routerError.message || 'Falha ao reautorizar no RouterOS',
    })

    return NextResponse.json(
      {
        ok: false,
        error: routerError.message || 'Falha ao reautorizar no MikroTik',
      },
      { status: 500 }
    )
  }
}

      if (status.state === 'cooldown') {
        return NextResponse.json(
          {
            ok: false,
            error: 'Cliente em cooldown',
            status,
          },
          { status: 409 }
        )
      }

      if (status.state === 'authorized_expired' || status.state === 'cooldown_expired') {
        await markSessionExpired(latestSession.id)
      }
    }

    const pendingSession = await createPendingSession({
      hotspotId: hotspot.id,
      hotspotSlug,
      leadId: lead.id,
      clientMac,
      clientIp,
    })

    try {
      await logRouterAction({
        authSessionId: pendingSession.id,
        action: 'authorize_bypass',
        status: 'success',
        requestPayload: {
          hotspotSlug,
          leadId: lead.id,
          clientMac,
          clientIp,
        },
      })

      const binding = await ensureBypassBinding({
        macAddress: clientMac,
        comment: `auth_session:${pendingSession.id}`,
      })

      const bandwidthQueue = await ensureClientBandwidthQueue({
  macAddress: clientMac,
  comment: `auth_session:${pendingSession.id}`,
})

const hostCleanup = await removeHotspotHostsByMac({
  macAddress: clientMac,
})

      const authorizedSession = await markSessionAuthorized(
        pendingSession.id,
        binding?.['.id'] || null
      )

      await logRouterAction({
        authSessionId: pendingSession.id,
        action: 'authorize_bypass_result',
        status: 'success',
        responsePayload: binding,
      })

      return NextResponse.json({
  ok: true,
  session: authorizedSession,
  binding,
  bandwidthQueue,
  hostCleanup,
})
    } catch (routerError) {
      await markSessionError(pendingSession.id, routerError.message || 'Falha no RouterOS')

      await logRouterAction({
        authSessionId: pendingSession.id,
        action: 'authorize_bypass_result',
        status: 'error',
        errorMessage: routerError.message || 'Falha no RouterOS',
      })

      return NextResponse.json(
        {
          ok: false,
          error: routerError.message || 'Falha ao autorizar no MikroTik',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro interno na autorização',
      },
      { status: 500 }
    )
  }
}