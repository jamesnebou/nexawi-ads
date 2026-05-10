import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  cleanupClientAccess,
  listCurrentHotspotMacs,
} from '@/lib/routeros-rest'
import { markSessionExpired, logRouterAction } from '@/lib/session-control'

export const runtime = 'nodejs'

export async function POST(request) {
  const cronSecret = request.headers.get('x-cron-secret')

  if (!process.env.NEXAWI_CRON_SECRET || cronSecret !== process.env.NEXAWI_CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()

    const onlineMacs = await listCurrentHotspotMacs()

    const { data: authorizedSessions, error: authorizedError } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('session_state', 'authorized')
      .limit(500)

    if (authorizedError) throw authorizedError

    const cleanedOffline = []
    const cleanedExpired = []
    const keptOnline = []

    for (const session of authorizedSessions || []) {
      const mac = String(session.client_mac || '').trim().toUpperCase()

      if (!mac) continue

      const isOnline = onlineMacs.has(mac)
      const isExpiredByTime = session.expires_at && session.expires_at <= nowIso

      if (isOnline && !isExpiredByTime) {
        keptOnline.push(session.id)
        continue
      }

      const cleanup = await cleanupClientAccess({
        macAddress: mac,
      })

      const updated = await markSessionExpired(session.id)

      await logRouterAction({
        authSessionId: session.id,
        action: isExpiredByTime
          ? 'reconcile_expire_timed_bypass'
          : 'reconcile_expire_offline_bypass',
        status: 'success',
        responsePayload: {
          cleanup,
          online: isOnline,
          expiredByTime: isExpiredByTime,
        },
      })

      if (isExpiredByTime) {
        cleanedExpired.push(updated.id)
      } else {
        cleanedOffline.push(updated.id)
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: nowIso,
      onlineMacsCount: onlineMacs.size,
      keptOnlineCount: keptOnline.length,
      cleanedOfflineCount: cleanedOffline.length,
      cleanedExpiredCount: cleanedExpired.length,
      keptOnline,
      cleanedOffline,
      cleanedExpired,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro no reconcile' },
      { status: 500 }
    )
  }
}