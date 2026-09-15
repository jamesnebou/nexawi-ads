import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  cleanupClientAccess,
  listHotspotHosts,
} from '@/lib/routeros-rest'
import { markSessionExpired, logRouterAction } from '@/lib/session-control'
import { logAdminAction } from '@/lib/admin-audit-log'
import { isTrustedCronRequest } from '@/lib/control-auth'

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

  const regex = /(\d+)(ms|w|d|h|m|s)/g
  let match

  while ((match = regex.exec(raw)) !== null) {
    const amount = Number(match[1])
    const unit = match[2]

    if (unit === 'ms') total += amount / 1000
    if (unit === 'w') total += amount * 7 * 24 * 60 * 60
    if (unit === 'd') total += amount * 24 * 60 * 60
    if (unit === 'h') total += amount * 60 * 60
    if (unit === 'm') total += amount * 60
    if (unit === 's') total += amount
  }

  return Number.isFinite(total) ? total : null
}

export async function POST(request) {
  if (!isTrustedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()
    const offlineIdleSeconds = Number(process.env.NEXAWI_OFFLINE_IDLE_SECONDS || 900)

    const { data: authorizedSessions, error: authorizedError } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('session_state', 'authorized')
      .limit(500)

    if (authorizedError) throw authorizedError

    const { data: expiredPixAccesses, error: expiredPixError } = await supabaseAdmin
      .from('wifi_pix_acessos')
      .select('id, venda_id, hotspot_id, router_id, mac_address, ip_address, expira_em, status, metadata')
      .eq('status', 'ativo')
      .lte('expira_em', nowIso)
      .limit(200)

    if (expiredPixError) throw expiredPixError

    const hotspotIds = Array.from(new Set([
      ...(authorizedSessions || []).map((session) => session.hotspot_id),
      ...(expiredPixAccesses || []).map((access) => access.hotspot_id),
    ].filter(Boolean)))

    const { data: hotspots, error: hotspotsError } = hotspotIds.length
      ? await supabaseAdmin
          .from('hotspots')
          .select('id, router_id')
          .in('id', hotspotIds)
      : { data: [], error: null }

    if (hotspotsError) throw hotspotsError

    const routerByHotspot = new Map(
      (hotspots || []).map((hotspot) => [hotspot.id, hotspot.router_id || null])
    )
    const sessionById = new Map(
      (authorizedSessions || []).map((session) => [session.id, session])
    )
    const routerIds = Array.from(new Set([
      ...(authorizedSessions || []).map((session) => session.router_id),
      ...(expiredPixAccesses || []).map((access) => access.router_id),
      ...(hotspots || []).map((hotspot) => hotspot.router_id),
    ].filter(Boolean)))

    const { data: routers, error: routersError } = routerIds.length
      ? await supabaseAdmin
          .from('network_routers')
          .select('id, base_url, username, password, hotspot_server, status')
          .in('id', routerIds)
      : { data: [], error: null }

    if (routersError) throw routersError

    const routerContexts = new Map(
      (routers || [])
        .filter((router) => !router.status || router.status === 'Ativo')
        .map((router) => [router.id, {
          routerId: router.id,
          baseUrl: router.base_url,
          username: router.username,
          password: router.password,
          hotspotServer: router.hotspot_server || 'hotspot1',
        }])
    )
    const hostsByRouterAndMac = new Map()
    const routerErrors = []
    const failedRouterIds = new Set()
    let hostsCount = 0
    const routerContextList = Array.from(routerContexts.values())

    const routerHostResults = await Promise.allSettled(
      routerContextList.map(async (routerConfig) => {
        const hosts = await listHotspotHosts({
          server: routerConfig.hotspotServer,
          routerConfig,
        })

        return { routerConfig, hosts }
      })
    )

    for (const [index, result] of routerHostResults.entries()) {
      const attemptedRouter = routerContextList[index]

      if (result.status === 'rejected') {
        failedRouterIds.add(attemptedRouter.routerId)
        routerErrors.push({
          routerId: attemptedRouter.routerId,
          error: result.reason?.message || 'Falha ao consultar MikroTik.',
        })
        continue
      }

      const { routerConfig, hosts } = result.value
      hostsCount += hosts.length

      for (const host of hosts) {
        const mac = normalizeMacLocal(host.macAddress)
        if (mac) hostsByRouterAndMac.set(`${routerConfig.routerId}:${mac}`, host)
      }
    }

    const cleaned = []
    const kept = []
    const expiredWifiPix = []

    for (const session of authorizedSessions || []) {
      const mac = normalizeMacLocal(session.client_mac)

      if (!mac) continue

      const routerId = session.router_id || routerByHotspot.get(session.hotspot_id)
      const routerConfig = routerContexts.get(routerId)

      if (!routerConfig) {
        kept.push({ id: session.id, mac, reason: 'router_not_configured' })
        continue
      }

      if (failedRouterIds.has(routerId)) {
        kept.push({ id: session.id, mac, routerId, reason: 'router_unreachable' })
        continue
      }

      const host = hostsByRouterAndMac.get(`${routerId}:${mac}`)
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

      let cleanup

      try {
        cleanup = await cleanupClientAccess({
          macAddress: mac,
          server: routerConfig.hotspotServer,
          routerConfig,
        })
      } catch (error) {
        kept.push({
          id: session.id,
          mac,
          routerId,
          reason: 'router_cleanup_failed',
          error: error.message || 'Falha ao limpar acesso.',
        })
        continue
      }

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
          routerId,
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
        routerId,
      })
    }

    for (const acesso of expiredPixAccesses || []) {
      const mac = normalizeMacLocal(acesso.mac_address)
      const sourceSession = sessionById.get(acesso.metadata?.sessionId)
      const routerId =
        acesso.router_id ||
        sourceSession?.router_id ||
        routerByHotspot.get(acesso.hotspot_id)
      const routerConfig = routerContexts.get(routerId)
      let cleanup = null

      if (!routerConfig) {
        expiredWifiPix.push({
          acessoId: acesso.id,
          vendaId: acesso.venda_id || null,
          mac,
          skipped: true,
          reason: 'router_not_configured',
        })
        continue
      }

      if (failedRouterIds.has(routerId)) {
        expiredWifiPix.push({
          acessoId: acesso.id,
          vendaId: acesso.venda_id || null,
          mac,
          routerId,
          skipped: true,
          reason: 'router_unreachable',
        })
        continue
      }

      try {
        if (mac) {
          cleanup = await cleanupClientAccess({
            macAddress: mac,
            server: routerConfig.hotspotServer,
            routerConfig,
          })
        }
      } catch (error) {
        expiredWifiPix.push({
          acessoId: acesso.id,
          vendaId: acesso.venda_id || null,
          mac,
          routerId,
          skipped: true,
          reason: 'router_cleanup_failed',
          error: error.message || 'Falha ao limpar acesso.',
        })
        continue
      }

      const { error: accessUpdateError } = await supabaseAdmin
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

      if (accessUpdateError) throw accessUpdateError

      if (acesso.venda_id) {
        const { error: saleUpdateError } = await supabaseAdmin
          .from('wifi_pix_vendas')
          .update({
            status: 'expirado',
            expira_em: acesso.expira_em || nowIso,
            updated_at: nowIso,
          })
          .eq('id', acesso.venda_id)

        if (saleUpdateError) throw saleUpdateError
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
          routerId,
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
        routerId,
      })
    }

    return NextResponse.json({
      ok: true,
      checkedAt: nowIso,
      offlineIdleSeconds,
      routersCount: routerContexts.size,
      routerErrors,
      hostsCount,
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
