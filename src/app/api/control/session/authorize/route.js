import { proxyControlRequest } from '@/lib/control-proxy'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isTrustedControlRequest } from '@/lib/control-auth'
import {
  ensureBypassBinding,
  ensureClientBandwidthQueue,
  findHotspotHostByMac,
  normalizeMac,
} from '@/lib/routeros-rest'
import {
  resolveHotspotBySlug,
  resolveRouterConfigForHotspot,
  resolveLeadForAuthorization,
  getLatestSession,
  getSessionBySource,
  createPendingSession,
  markSessionAuthorized,
  updateSessionRouterBinding,
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

  if (reason === 'wifi_pix_paid') {
    return {
      sessionSecondsOverride: null,
      uploadLimit: null,
      downloadLimit: null,
      skipLead: false,
      skipAdValidation: true,
      routerCommentPrefix: 'wifi_pix_paid',
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

async function validateWifiPixAuthorizationSource({
  sourceEntityId,
  hotspotId,
  clientMac,
  authorizationReason,
}) {
  if (!['wifi_pix_payment_window', 'wifi_pix_paid'].includes(authorizationReason)) {
    return null
  }

  const vendaId = clean(sourceEntityId)

  if (!vendaId) {
    throw new Error('Venda de origem obrigatória para autorizar Wi-Fi no Pix.')
  }

  const { data: venda, error } = await supabaseAdmin
    .from('wifi_pix_vendas')
    .select(`
      id,
      hotspot_id,
      mac_address,
      status,
      duracao_minutos,
      velocidade_download,
      velocidade_upload,
      expira_em,
      created_at
    `)
    .eq('id', vendaId)
    .maybeSingle()

  if (error) throw error
  if (!venda) throw new Error('Venda de origem não encontrada.')
  if (venda.hotspot_id !== hotspotId) throw new Error('Venda não pertence a este hotspot.')

  const vendaMac = normalizeMac(venda.mac_address || '')

  if (!vendaMac || vendaMac !== clientMac) {
    throw new Error('Venda não pertence a este dispositivo.')
  }

  if (authorizationReason === 'wifi_pix_payment_window') {
    const createdAt = new Date(venda.created_at).getTime()
    const maxAgeMs = 30 * 60 * 1000

    if (venda.status !== 'pendente') {
      throw new Error('A janela de pagamento só pode ser aberta para venda pendente.')
    }

    if (!Number.isFinite(createdAt) || Date.now() - createdAt > maxAgeMs) {
      throw new Error('A janela desta cobrança expirou. Gere um novo pagamento.')
    }
  }

  if (authorizationReason === 'wifi_pix_paid') {
    if (!['pago', 'autorizado'].includes(venda.status)) {
      throw new Error('Pagamento ainda não confirmado.')
    }

    if (venda.expira_em && new Date(venda.expira_em).getTime() <= Date.now()) {
      throw new Error('O acesso desta venda já expirou.')
    }
  }

  return venda
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

  let body

  try {
    body = await request.clone().json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload JSON invalido' }, { status: 400 })
  }

  const requestedAuthorizationReason = clean(
    body.authorizationReason || body.authorization_reason
  )

  if (
    ['wifi_pix_payment_window', 'wifi_pix_paid'].includes(requestedAuthorizationReason) &&
    !isTrustedControlRequest(request)
  ) {
    return NextResponse.json({ ok: false, error: 'Nao autorizado' }, { status: 401 })
  }

  if (CONTROL_API_MODE === 'proxy') {
    return proxyControlRequest(request, '/api/control/session/authorize', 'POST')
  }

  try {
    const hotspotSlug = String(body.hotspotSlug || '').trim()
    const leadId = String(body.leadId || '').trim()
    const clientMac = normalizeMac(body.clientMac || '')
    const clientIp = String(body.clientIp || '').trim()
    const adSessionId = clean(body.adSessionId || body.ad_session_id)
    const authorizationReason = requestedAuthorizationReason
    const authorizationProfile = resolveAuthorizationProfile(authorizationReason)
    const sourceEntityId = clean(body.sourceEntityId || body.source_entity_id)

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

    const routerConfig = await resolveRouterConfigForHotspot(hotspot)

    const hostBeforeAuthorization = await findHotspotHostByMac({
      macAddress: clientMac,
      server: routerConfig.hotspotServer,
      routerConfig,
    })
    const expectedClientIp = privateClientIp(clientIp)

    if (!hostBeforeAuthorization?.address) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Dispositivo nao encontrado no hotspot. Reconecte ao Wi-Fi e tente novamente.',
        },
        { status: 409 }
      )
    }

    const wifiPixVenda = await validateWifiPixAuthorizationSource({
      sourceEntityId,
      hotspotId: hotspot.id,
      clientMac,
      authorizationReason,
    })
    const paidRemainingSeconds = wifiPixVenda?.expira_em
      ? Math.max(0, Math.ceil((new Date(wifiPixVenda.expira_em).getTime() - Date.now()) / 1000))
      : Number(wifiPixVenda?.duracao_minutos || 0) * 60
    const sessionSecondsOverride = authorizationReason === 'wifi_pix_paid'
      ? paidRemainingSeconds
      : authorizationProfile.sessionSecondsOverride
    const uploadLimit = authorizationReason === 'wifi_pix_paid'
      ? cleanBandwidthLimit(wifiPixVenda?.velocidade_upload)
      : authorizationProfile.uploadLimit
    const downloadLimit = authorizationReason === 'wifi_pix_paid'
      ? cleanBandwidthLimit(wifiPixVenda?.velocidade_download)
      : authorizationProfile.downloadLimit

    if (expectedClientIp && hostBeforeAuthorization.address !== expectedClientIp) {
      return NextResponse.json(
        {
          ok: false,
          error: 'IP e MAC nao correspondem ao mesmo dispositivo no hotspot.',
        },
        { status: 409 }
      )
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

    const sourceSession = sourceEntityId
      ? await getSessionBySource({
          hotspotId: hotspot.id,
          clientMac,
          authorizationReason,
          sourceEntityId,
        })
      : null
    const latestSession = sourceEntityId
      ? sourceSession
      : await getLatestSession({
          hotspotId: hotspot.id,
          clientMac,
        })

    if (
      authorizationReason === 'wifi_pix_payment_window' &&
      sourceSession &&
      !['pending', 'authorized'].includes(sourceSession.session_state)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'A janela temporária desta cobrança já foi utilizada. Gere um novo pagamento.',
        },
        { status: 409 }
      )
    }

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

          const bindingAddress =
            hostBeforeAuthorization?.address || privateClientIp(clientIp)

          const binding = await ensureBypassBinding({
            macAddress: clientMac,
            address: bindingAddress,
            comment: `${authorizationProfile.routerCommentPrefix}:${latestSession.id}`,
            server: routerConfig.hotspotServer,
            routerConfig,
          })

          const bandwidthQueue = await ensureClientBandwidthQueue({
            macAddress: clientMac,
            targetAddress: hostBeforeAuthorization?.address || '',
            comment: `${authorizationProfile.routerCommentPrefix}:${latestSession.id}`,
            uploadLimit,
            downloadLimit,
            routerConfig,
          })

          const refreshedSession = await updateSessionRouterBinding(
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
            session: refreshedSession,
            binding,
            bandwidthQueue,
            hostCleanup: { skipped: true, reason: 'host_preserved_after_bypass' },
            status,
          })
        } catch (routerError) {
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
            { status: 502 }
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

        if (
          authorizationReason === 'wifi_pix_payment_window' &&
          sourceSession?.id === latestSession.id
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: 'A janela temporária desta cobrança já expirou e não pode ser renovada.',
            },
            { status: 409 }
          )
        }
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

    const pendingSession = sourceSession || await createPendingSession({
      hotspotId: hotspot.id,
      hotspotSlug,
      leadId: lead?.id || null,
      clientMac,
      clientIp,
      authorizationReason: authorizationReason || null,
      sourceEntityId: sourceEntityId || null,
      routerId: routerConfig.routerId,
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

      const bindingAddress = hostBeforeAuthorization?.address || privateClientIp(clientIp)

      const binding = await ensureBypassBinding({
        macAddress: clientMac,
        address: bindingAddress,
        comment: `${authorizationProfile.routerCommentPrefix}:${pendingSession.id}`,
        server: routerConfig.hotspotServer,
        routerConfig,
      })

      const bandwidthQueue = await ensureClientBandwidthQueue({
        macAddress: clientMac,
        targetAddress: hostBeforeAuthorization?.address || '',
        comment: `${authorizationProfile.routerCommentPrefix}:${pendingSession.id}`,
        uploadLimit,
        downloadLimit,
        routerConfig,
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
