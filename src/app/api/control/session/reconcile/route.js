import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { removeBypassBindings } from '@/lib/routeros-rest'
import { markSessionCooldown, markSessionExpired, logRouterAction } from '@/lib/session-control'

export const runtime = 'nodejs'

export async function POST(request) {
  const cronSecret = request.headers.get('x-cron-secret')

  if (!process.env.NEXAWI_CRON_SECRET || cronSecret !== process.env.NEXAWI_CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()

    const { data: sessionsToCooldown, error: err1 } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('session_state', 'authorized')
      .lte('expires_at', nowIso)
      .limit(100)

    if (err1) throw err1

    const cooledDown = []

    for (const session of sessionsToCooldown || []) {
      const result = await removeBypassBindings({ macAddress: session.client_mac })
      const updated = await markSessionCooldown(session.id)

      await logRouterAction({
        authSessionId: session.id,
        action: 'reconcile_revoke_bypass',
        status: 'success',
        responsePayload: result,
      })

      cooledDown.push(updated.id)
    }

    const { data: sessionsToExpire, error: err2 } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('session_state', 'cooldown')
      .lte('cooldown_until', nowIso)
      .limit(100)

    if (err2) throw err2

    const expired = []

    for (const session of sessionsToExpire || []) {
      const updated = await markSessionExpired(session.id)
      expired.push(updated.id)
    }

    return NextResponse.json({
      ok: true,
      cooledDownCount: cooledDown.length,
      expiredCount: expired.length,
      cooledDown,
      expired,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro no reconcile' },
      { status: 500 }
    )
  }
}




