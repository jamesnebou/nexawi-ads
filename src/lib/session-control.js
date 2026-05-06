import { supabaseAdmin } from './supabase-admin'
import { normalizeMac } from './routeros-rest'

const FALLBACK_SESSION_SECONDS = Number(process.env.NEXAWI_SESSION_MINUTES || 20) * 60
const FALLBACK_COOLDOWN_SECONDS = Number(process.env.NEXAWI_COOLDOWN_MINUTES || 10) * 60

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000)
}

function safeSeconds(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

async function getPortalRuntimeConfig() {
  const { data, error } = await supabaseAdmin
    .from('configuracoes')
    .select('id, portal_tempo_acesso_segundos, portal_tempo_bloqueio_segundos')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return {
    sessionSeconds: safeSeconds(data?.portal_tempo_acesso_segundos, FALLBACK_SESSION_SECONDS),
    cooldownSeconds: safeSeconds(data?.portal_tempo_bloqueio_segundos, FALLBACK_COOLDOWN_SECONDS),
    configId: data?.id || null,
  }
}

export async function resolveHotspotBySlug(slug) {
  let result = await supabaseAdmin
    .from('hotspots')
    .select('id, nome, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (result.data) return result.data

  result = await supabaseAdmin
    .from('hotspots')
    .select('id, nome, slug')
    .eq('nome', slug)
    .maybeSingle()

  if (result.data) return result.data

  return null
}

export async function resolveLeadForAuthorization({ leadId, hotspotId, clientMac, clientIp }) {
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('hotspot_id', hotspotId)
    .maybeSingle()

  if (error) throw error
  if (!lead) return null

  const incomingMac = normalizeMac(clientMac)
  const leadMac = normalizeMac(lead.mac_address || '')

  if (leadMac && incomingMac && leadMac !== incomingMac) {
    throw new Error(`MAC divergente. Lead=${leadMac} | Cliente=${incomingMac}`)
  }

  const updatePayload = {
    mac_address: leadMac || incomingMac || null,
    ip_address: clientIp || lead.ip_address || null,
  }

  const { error: updateError } = await supabaseAdmin
    .from('leads')
    .update(updatePayload)
    .eq('id', lead.id)

  if (updateError) throw updateError

  return {
    ...lead,
    ...updatePayload,
  }
}

export async function getLatestSession({ hotspotId, clientMac }) {
  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .select('*')
    .eq('hotspot_id', hotspotId)
    .eq('client_mac', normalizeMac(clientMac))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function createPendingSession({ hotspotId, hotspotSlug, leadId, clientMac, clientIp }) {
  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .insert({
      hotspot_id: hotspotId,
      hotspot_slug: hotspotSlug,
      lead_id: leadId || null,
      client_mac: normalizeMac(clientMac),
      client_ip: clientIp || null,
      session_state: 'pending',
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function markSessionAuthorized(sessionId, routerBindingId = null) {
  const runtimeConfig = await getPortalRuntimeConfig()
  const now = new Date()
  const expiresAt = addSeconds(now, runtimeConfig.sessionSeconds).toISOString()

  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      session_state: 'authorized',
      authorized_at: now.toISOString(),
      expires_at: expiresAt,
      cooldown_until: null,
      revoked_at: null,
      router_binding_id: routerBindingId,
      error_message: null,
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function markSessionCooldown(sessionId) {
  const runtimeConfig = await getPortalRuntimeConfig()
  const now = new Date()
  const cooldownUntil = addSeconds(now, runtimeConfig.cooldownSeconds).toISOString()

  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      session_state: 'cooldown',
      revoked_at: now.toISOString(),
      cooldown_until: cooldownUntil,
      error_message: null,
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function markSessionExpired(sessionId) {
  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      session_state: 'expired',
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function markSessionError(sessionId, message) {
  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      session_state: 'error',
      error_message: message,
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function logRouterAction({
  authSessionId = null,
  action,
  status,
  requestPayload = null,
  responsePayload = null,
  errorMessage = null,
}) {
  const { error } = await supabaseAdmin
    .from('router_action_logs')
    .insert({
      auth_session_id: authSessionId,
      action,
      status,
      request_payload: requestPayload,
      response_payload: responsePayload,
      error_message: errorMessage,
    })

  if (error) throw error
}

export function computeStatusFromSession(session) {
  if (!session) {
    return { state: 'idle', remainingSeconds: 0 }
  }

  const now = new Date()

  if (session.session_state === 'authorized' && session.expires_at) {
    const diffMs = new Date(session.expires_at).getTime() - now.getTime()

    if (diffMs > 0) {
      return {
        state: 'authorized',
        remainingSeconds: Math.ceil(diffMs / 1000),
        expiresAt: session.expires_at,
      }
    }

    return { state: 'authorized_expired', remainingSeconds: 0 }
  }

  if (session.session_state === 'cooldown' && session.cooldown_until) {
    const diffMs = new Date(session.cooldown_until).getTime() - now.getTime()

    if (diffMs > 0) {
      return {
        state: 'cooldown',
        remainingSeconds: Math.ceil(diffMs / 1000),
        cooldownUntil: session.cooldown_until,
      }
    }

    return { state: 'cooldown_expired', remainingSeconds: 0 }
  }

  if (session.session_state === 'pending') {
    return { state: 'pending', remainingSeconds: 0 }
  }

  if (session.session_state === 'error') {
    return { state: 'error', remainingSeconds: 0 }
  }

  if (session.session_state === 'expired') {
    return { state: 'idle', remainingSeconds: 0 }
  }

  return { state: 'idle', remainingSeconds: 0 }
}