import { supabaseAdmin } from './supabase-admin'
import { normalizeMac } from './routeros-rest'

export const SESSION_MINUTES = Number(process.env.NEXAWI_SESSION_MINUTES || 20)
export const COOLDOWN_MINUTES = Number(process.env.NEXAWI_COOLDOWN_MINUTES || 10)

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
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

  await supabaseAdmin
    .from('leads')
    .update(updatePayload)
    .eq('id', lead.id)

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
  const now = new Date()
  const expiresAt = addMinutes(now, SESSION_MINUTES).toISOString()

  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      session_state: 'authorized',
      authorized_at: now.toISOString(),
      expires_at: expiresAt,
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
  const now = new Date()
  const cooldownUntil = addMinutes(now, COOLDOWN_MINUTES).toISOString()

  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      session_state: 'cooldown',
      revoked_at: now.toISOString(),
      cooldown_until: cooldownUntil,
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
  const { error } = await supabaseAdmin.from('router_action_logs').insert({
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

  return {
    state: session.session_state,
    remainingSeconds: 0,
  }
}