import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  cleanupClientAccess,
  listHotspotHosts,
} from '@/lib/routeros-rest'
import { markSessionExpired, logRouterAction } from '@/lib/session-control'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

function normalizeMacLocal(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function parseRouterDurationToSeconds(value = '') {
  const raw = String(value || '').trim()

  if (!raw) return null

  let total = 0

  const regex = /(\d+)(w|d|h|m|s|ms)/g
  let match

  while ((match = regex.exec(raw)) !== null) {
    const amount = Number(match[1])
    const unit = match[2]

    if (unit === 'w') total += amount * 7 * 24 * 60 * 60
    if (unit === 'd') total += amount * 24 * 60 * 60
    if (unit === 'h') total += amount * 60 * 60
    if (unit === 'm') total += amount * 60
    if (unit === 's') total += amount
  }

  return Number.isFinite(total) ? total : null
}

export async function POST(request) {
  const cronSecret = request.headers.get('x-cron-secret')

  if (!process.env.NEXAWI_CRON_SECRET || cronSecret !== process.env.NEXAWI_CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()
    const offlineIdleSeconds = Number(process.env.NEXAWI_OFFLINE_IDLE_SECONDS || 900)

    const hosts = await listHotspotHosts()

    const hostByMac = new Map()

    for (const host of hosts || []) {
      const mac = normalizeMacLocal(host.macAddress)

      if (mac) {
        hostByMac.set(mac, host)
      }
    }

    const { data: authorizedSessions, error: authorizedError } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('session_state', 'authorized')
      .limit(500)

    if (authorizedError) throw authorizedError

    const cleaned = []
    const kept = []
    const expiredWifiPix = []

    for (const session of authorizedSessions || []) {
      const mac = normalizeMacLocal(session.client_mac)

      if (!mac) continue

      const host = hostByMac.get(mac)
      const idleSeconds = parseRouterDurationToSeconds(host?.idleTime || '')
      const expiredByTime = session.expires_at && session.expires_at <= nowIso

      const shouldCleanBecauseOffline = !host
      const shouldCleanBecauseIdle =
        idleSeconds !== null && idleSeconds >= offlineIdleSeconds

      if (!expiredByTime && !shouldCleanBecauseOffline && !shouldCleanBecauseIdle) {
        kept.push({
          id: session.id,
          mac,
          idleSeconds,
        })
        continue
      }

      const cleanup = await cleanupClientAccess({
        macAddress: mac,
      })

      const updated = await markSessionExpired(session.id)

      await logRouterAction({
        authSessionId: session.id,
        action: expiredByTime
          ? 'reconcile_expire_timed_access'
          : shouldCleanBecauseIdle
            ? 'reconcile_expire_idle_access'
            : 'reconcile_expire_offline_access',
        status: 'success',
        responsePayload: {
          mac,
          idleSeconds,
          offlineIdleSeconds,
          expiredByTime,
          cleanup,
        },
      })

      cleaned.push({
        id: updated.id,
        mac,
        idleSeconds,
        reason: expiredByTime
          ? 'expired_by_time'
          : shouldCleanBecauseIdle
            ? 'idle'
            : 'offline',
      })
    }


    const { data: expiredPixAccesses, error: expiredPixError } = await supabaseAdmin
      .from('wifi_pix_acessos')
      .select('id, venda_id, hotspot_id, mac_address, ip_address, expira_em, status')
      .eq('status', 'ativo')
      .lte('expira_em', nowIso)
      .limit(200)

    if (expiredPixError) throw expiredPixError

    for (const acesso of expiredPixAccesses || []) {
      const mac = normalizeMacLocal(acesso.mac_address)
      let cleanup = null

      if (mac) {
        cleanup = await cleanupClientAccess({ macAddress: mac })
      }

      await supabaseAdmin
        .from('wifi_pix_acessos')
        .update({
          status: 'expirado',
          revogado_em: nowIso,
          updated_at: nowIso,
          metadata: {
            expiredByReconcile: true,
            previousExpiraEm: acesso.expira_em,
            cleanup,
          },
        })
        .eq('id', acesso.id)

      if (acesso.venda_id) {
        await supabaseAdmin
          .from('wifi_pix_vendas')
          .update({
            status: 'expirado',
            expira_em: acesso.expira_em || nowIso,
            updated_at: nowIso,
          })
          .eq('id', acesso.venda_id)
      }

      await logAdminAction({
        request,
        adminUser: { id: null, email: 'reconcile@nexawi.system' },
        action: 'wifi_pix_venda_expirada_reconcile',
        entity: 'wifi_pix_vendas',
        entityId: acesso.venda_id || '',
        description: 'Venda/acesso Wi-Fi no Pix expirado automaticamente pelo reconcile.',
        metadata: {
          acessoId: acesso.id,
          hotspotId: acesso.hotspot_id,
          mac,
          ipAddress: acesso.ip_address || null,
          expiraEm: acesso.expira_em,
          cleanup,
        },
      })

      expiredWifiPix.push({
        acessoId: acesso.id,
        vendaId: acesso.venda_id || null,
        mac,
      })
    }

    return NextResponse.json({
      ok: true,
      checkedAt: nowIso,
      offlineIdleSeconds,
      hostsCount: hosts.length,
      keptCount: kept.length,
      cleanedCount: cleaned.length,
      expiredWifiPixCount: expiredWifiPix.length,
      kept,
      cleaned,
      expiredWifiPix,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro no reconcile' },
      { status: 500 }
    )
  }
}
