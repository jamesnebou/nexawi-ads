import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildLpAnalyticsMetadata } from '@/lib/lp-generator-analytics'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const LANDING_CLICK_RATE_LIMIT = {
  keyPrefix: 'public:landing-click',
  limit: 80,
  windowMs: 60_000,
}

function cleanText(value = '', maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength)
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
}

function isMissingTableError(error) {
  const message = error?.message || ''
  return error?.code === 'PGRST205' || /landing_native_clicks/i.test(message)
}

export async function POST(request) {
  const rate = checkRateLimit(request, LANDING_CLICK_RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: true, rateLimited: true })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const pageSlug = cleanText(body.pageSlug || body.page_slug || 'home', 120) || 'home'
    const metadata = buildLpAnalyticsMetadata({ request, body })
    const targetLabel = cleanText(body.targetLabel || body.target_label || 'Clique', 180)
    const targetUrl = cleanText(body.targetUrl || body.target_url || '', 1000)

    const { error } = await supabaseAdmin
      .from('landing_native_clicks')
      .insert([{
        page_slug: pageSlug,
        page_url: cleanText(body.pageUrl || metadata.page_url, 1000),
        target_label: targetLabel,
        target_url: targetUrl,
        ip_address: getClientIp(request) || metadata.ip || null,
        user_agent: metadata.user_agent || null,
        referer: metadata.referer || null,
        source_type: metadata.source_type || 'direto',
        metadata: {
          ...metadata,
          target_label: targetLabel,
          target_url: targetUrl,
          element_tag: cleanText(body.elementTag || body.element_tag || '', 40),
        },
      }])

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ ok: true, skipped: true, pendingMigration: true })
    }

    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao registrar clique da landing' },
      { status: 500 }
    )
  }
}
