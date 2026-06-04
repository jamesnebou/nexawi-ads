import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildLpAnalyticsMetadata } from '@/lib/lp-generator-analytics'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const LANDING_VIEW_RATE_LIMIT = {
  keyPrefix: 'public:landing-view',
  limit: 30,
  windowMs: 60_000,
}

function cleanText(value = '') {
  return String(value || '').trim()
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
}

export async function POST(request) {
  const rate = checkRateLimit(request, LANDING_VIEW_RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: true, rateLimited: true })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const pageSlug = cleanText(body.pageSlug || body.page_slug || 'home') || 'home'
    const metadata = buildLpAnalyticsMetadata({ request, body })

    const { error } = await supabaseAdmin
      .from('landing_native_views')
      .insert([{
        page_slug: pageSlug,
        page_url: cleanText(body.pageUrl || metadata.page_url),
        ip_address: getClientIp(request) || metadata.ip || null,
        user_agent: metadata.user_agent || null,
        referer: metadata.referer || null,
        source_type: metadata.source_type || 'direto',
        metadata,
      }])

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao registrar visita da landing' },
      { status: 500 }
    )
  }
}
