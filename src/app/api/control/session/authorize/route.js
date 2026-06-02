import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  ensureBypassBinding,
  ensureClientBandwidthQueue,
  findHotspotHostByMac,
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
const AD_COMPLETION_MAX_AGE_MS = 15 * 60 * 1000

export const runtime = 'nodejs'

function clean(value = '') {
  return String(value || '').trim()
}

async function validateCompletedAdSession({ lead, hotspotId, adSessionId }) {
  if (!lead?.anuncio_id) {
    return null
  }

  const sessionId = clean(adSessionId)

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: 'Conclusao do anuncio obrigatoria antes da liberacao' },
      { status: 403 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('portal_ad_rotations')
    .select('id, lead_id, hotspot_id, anuncio_id, eligible_at, completed_at')
    .eq('id', sessionId)
    .eq('lead_id', lead.id)
    .eq('hotspot_id', hotspotId)
    .eq('anuncio_id', lead.anuncio_id)
    .maybeSingle()

  if (error) throw error

  if (!data?.completed_at) {
    return NextResponse.json(
      { ok: false, error: 'Anuncio ainda nao foi concluido' },
      { status: 403 }
    )
  }

  const completedAtMs = new Date(data.completed_at).getTime()

  if (!Number.isFinite(completedAtMs) || Date.now() - completedAtMs > AD_COMPLETION_MAX_AGE_MS) {
    return NextResponse.json(
      { ok: false, error: 'Sessao do anuncio expirada. Veja o anuncio novamente para liberar o Wi-Fi.' },
      { status: 403 }
    )
  }

  if (data.eligible_at && new Date(data.eligible_at).getTime() > Date.now()) {
    return NextResponse.json(
      { ok: false, error: 'Tempo obrigatorio do anuncio ainda nao foi cumprido' },
      { status: 403 }
    )
  }

  return null
}

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
    const adSessionId = clean(body.adSessionId || body.ad_session_id)

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


    const hostBeforeAuthorization = await findHotspotHostByMac({
  macAddress: clientMac,
})


    const binding = await ensureBypassBinding({
      macAddress: clientMac,
      comment: `auth_session:${latestSession.id}`,
    })


    const bandwidthQueue = await ensureClientBandwidthQueue({
  macAddress: clientMac,
  targetAddress: hostBeforeAuthorization?.address || '',
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

    const adErrorResponse = await validateCompletedAdSession({
      lead,
      hotspotId: hotspot.id,
      adSessionId,
    })

    if (adErrorResponse) {
      return adErrorResponse
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


      const hostBeforeAuthorization = await findHotspotHostByMac({
  macAddress: clientMac,
})

      const binding = await ensureBypassBinding({
        macAddress: clientMac,
        comment: `auth_session:${pendingSession.id}`,
      })

      const bandwidthQueue = await ensureClientBandwidthQueue({
  macAddress: clientMac,
  targetAddress: hostBeforeAuthorization?.address || '',
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
