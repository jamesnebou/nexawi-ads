import { NextResponse } from 'next/server'
import { normalizeShortLinkSlug, normalizeShortLinkTarget } from '@/lib/short-links'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegrambot|slackbot/i
const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
}

async function resolve(request, params, countVisit) {
  const { slug: rawSlug } = await params
  const slug = normalizeShortLinkSlug(rawSlug)
  if (!slug) {
    return NextResponse.redirect(new URL('/l/inativo', request.url), {
      status: 307,
      headers: RESPONSE_HEADERS,
    })
  }

  const userAgent = request.headers.get('user-agent') || ''
  const isPrefetch = request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('sec-purpose')?.includes('prefetch') ||
    request.headers.has('next-router-prefetch')
  const shouldCount = countVisit && !BOT_PATTERN.test(userAgent) && !isPrefetch

  const { data, error } = await supabaseAdmin.rpc('resolve_short_link', {
    p_slug: slug,
    p_count: shouldCount,
  })

  if (error) {
    console.error('Erro ao resolver link curto:', error)
    return NextResponse.json({ error: 'Link temporariamente indisponível.' }, {
      status: 503,
      headers: RESPONSE_HEADERS,
    })
  }

  const target = normalizeShortLinkTarget(data)
  if (!target) {
    return NextResponse.redirect(new URL('/l/inativo', request.url), {
      status: 307,
      headers: RESPONSE_HEADERS,
    })
  }

  return NextResponse.redirect(target, { status: 307, headers: RESPONSE_HEADERS })
}

export async function GET(request, { params }) {
  return resolve(request, params, true)
}

export async function HEAD(request, { params }) {
  return resolve(request, params, false)
}
