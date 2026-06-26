import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  ensureBypassBinding,
  ensureClientBandwidthQueue,
  findHotspotHostByMac,
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
const WIFI_PIX_PAYMENT_WINDOW_SECONDS = boundedSeconds(
  process.env.NEXAWI_WIFI_PIX_PAYMENT_WINDOW_SECONDS,
  5 * 60,
  60,
  15 * 60
)
const WIFI_PIX_PAYMENT_WINDOW_UPLOAD =
  cleanBandwidthLimit(process.env.NEXAWI_WIFI_PIX_PAYMENT_WINDOW_UPLOAD || '512k')
const WIFI_PIX_PAYMENT_WINDOW_DOWNLOAD =
  cleanBandwidthLimit(process.env.NEXAWI_WIFI_PIX_PAYMENT_WINDOW_DOWNLOAD || '2M')
const RATE_LIMIT = {
  keyPrefix: 'control:session:authorize',
  limit: 80,
  windowMs: 60_000,
}

export const runtime = 'nodejs'

function clean(value = '') {
  return String(value || '').trim()
}

function boundedSeconds(value, fallback, min, max) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return fallback

  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function cleanBandwidthLimit(value = '') {
  const limit = clean(value)

  return /^[0-9]+[kKmMgG]?$/.test(limit) ? limit : ''
}

function resolveAuthorizationProfile(reason = '') {
  if (reason === 'hybrid_ad_30m') {
    return {
      sessionSecondsOverride: 30 * 60,
      uploadLimit: null,
      downloadLimit: null,
      skipLead: false,
      skipAdValidation: false,
      routerCommentPrefix: 'auth_session',
    }
  }

  if (reason === 'wifi_pix_payment_window') {
    return {
      sessionSecondsOverride: WIFI_PIX_PAYMENT_WINDOW_SECONDS,
      uploadLimit: WIFI_PIX_PAYMENT_WINDOW_UPLOAD,
      downloadLimit: WIFI_PIX_PAYMENT_WINDOW_DOWNLOAD,
      skipLead: true,
      skipAdValidation: true,
      routerCommentPrefix: 'wifi_pix_payment_window',
    }
  }

  return {
    sessionSecondsOverride: null,
    uploadLimit: null,
    downloadLimit: null,
    skipLead: false,
    skipAdValidation: false,
    routerCommentPrefix: 'auth_session',
  }
}

function privateClientIp(value = '') {
  const ip = clean(value)
  const parts = ip.split('.').map((part) => Number(part))

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return ''
  }

  const [a, b] = parts

  if (a === 10) return ip
  if (a === 172 && b >= 16 && b <= 31) return ip
  if (a === 192 && b === 168) return ip

  return ''
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
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas de liberacao. Aguarde um instante.' }, { status: 429 })
  }

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
    const authorizationReason = clean(body.authorizationReason || body.authorization_reason)
    const authorizationProfile = resolveAuthorizationProfile(authorizationReason)
    const sessionSecondsOverride = authorizationProfile.sessionSecondsOverride

    if (!hotspotSlug) {
      return NextResponse.json({ ok: false, error: 'hotspotSlug é obrigatório' }, { status: 400 })
    }

    if (!leadId && !authorizationProfile.skipLead) {
      return NextResponse.json({ ok: false, error: 'leadId e obrigatorio' }, { status: 400 })
    }

    if (!clientMac) {
      return NextResponse.json({ ok: false, error: 'clientMac é obrigatório' }, { status: 400 })
    }

    const hotspot = await resolveHotspotBySlug(hotspotSlug)

    if (!hotspot) {
      return NextResponse.json({ ok: false, error: 'Hotspot não encontrado' }, { status: 404 })
    }

    const lead = authorizationProfile.skipLead
      ? null
      : await resolveLeadForAuthorization({
        leadId,
        hotspotId: hotspot.id,
        clientMac,
        clientIp,
      })

    if (!lead && !authorizationProfile.skipLead) {
      return NextResponse.json({ ok: false, error: 'Lead nao encontrado para este hotspot' }, { status: 404 })
    }

    const latestSession = await getLatestSession({
      hotspotId: hotspot.id,
      clientMac,
    })

    if (latestSession) {
      const status = computeStatusFromSession(latestSession)

      if (status.state === 'authorized') {
        if (
          authorizationReason === 'wifi_pix_payment_window' &&
          Number(status.remainingSeconds || 0) > WIFI_PIX_PAYMENT_WINDOW_SECONDS
        ) {
          return NextResponse.json({
            ok: true,
            alreadyAuthorized: true,
            paymentWindowSkipped: true,
            session: latestSession,
            status,
          })
        }

  try {
    await logRouterAction({
      authSessionId: latestSession.id,
      action: 'reauthorize_bypass',
      status: 'success',
      requestPayload: {
        hotspotSlug,
        leadId: lead?.id || null,
        clientMac,
        clientIp,
        reason: 'session_already_authorized_reensure_routeros',
        authorizationReason: authorizationReason || null,
      },
    })


    const hostBeforeAuthorization = await findHotspotHostByMac({
  macAddress: clientMac,
})

    const bindingAddress = hostBeforeAuthorization?.address || privateClientIp(clientIp)

    const binding = await ensureBypassBinding({
      macAddress: clientMac,
      address: bindingAddress,
      comment: `${authorizationProfile.routerCommentPrefix}:${latestSession.id}`,
    })


    const bandwidthQueue = await ensureClientBandwidthQueue({
  macAddress: clientMac,
  targetAddress: hostBeforeAuthorization?.address || '',
  comment: `${authorizationProfile.routerCommentPrefix}:${latestSession.id}`,
  uploadLimit: authorizationProfile.uploadLimit,
  downloadLimit: authorizationProfile.downloadLimit,
})

    const authorizedSession = await markSessionAuthorized(
      latestSession.id,
      binding?.['.id'] || null,
      { sessionSecondsOverride }
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
  hostCleanup: { skipped: true, reason: 'host_preserved_after_bypass' },
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

    if (!authorizationProfile.skipAdValidation) {
      const adErrorResponse = await validateCompletedAdSession({
        lead,
        hotspotId: hotspot.id,
        adSessionId,
      })

      if (adErrorResponse) {
        return adErrorResponse
      }
    }

    const pendingSession = await createPendingSession({
      hotspotId: hotspot.id,
      hotspotSlug,
      leadId: lead?.id || null,
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
          leadId: lead?.id || null,
          clientMac,
          clientIp,
          authorizationReason: authorizationReason || null,
        },
      })


      const hostBeforeAuthorization = await findHotspotHostByMac({
  macAddress: clientMac,
})

      const bindingAddress = hostBeforeAuthorization?.address || privateClientIp(clientIp)

      const binding = await ensureBypassBinding({
        macAddress: clientMac,
        address: bindingAddress,
        comment: `${authorizationProfile.routerCommentPrefix}:${pendingSession.id}`,
      })

      const bandwidthQueue = await ensureClientBandwidthQueue({
  macAddress: clientMac,
  targetAddress: hostBeforeAuthorization?.address || '',
  comment: `${authorizationProfile.routerCommentPrefix}:${pendingSession.id}`,
  uploadLimit: authorizationProfile.uploadLimit,
  downloadLimit: authorizationProfile.downloadLimit,
})

      const authorizedSession = await markSessionAuthorized(
        pendingSession.id,
        binding?.['.id'] || null,
        { sessionSecondsOverride }
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
  hostCleanup: { skipped: true, reason: 'host_preserved_after_bypass' },
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
