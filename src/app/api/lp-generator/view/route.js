import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildLpAnalyticsMetadata } from '@/lib/lp-generator-analytics'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

export async function POST(request) {
  try {
    const body = await request.json()
    const pageSlug = cleanText(body.pageSlug)

    if (!pageSlug) {
      return NextResponse.json({ ok: false, error: 'LP nao identificada' }, { status: 400 })
    }

    const { data: page, error: pageError } = await supabaseAdmin
      .from('lp_generator_pages')
      .select('id, slug, status, cliente_id, empresa_id')
      .eq('slug', pageSlug)
      .eq('status', 'published')
      .maybeSingle()

    if (pageError) throw pageError
    if (!page) {
      return NextResponse.json({ ok: false, error: 'LP nao encontrada ou indisponivel' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('lp_generator_views')
      .insert([{
        page_id: page.id,
        cliente_id: page.cliente_id || null,
        empresa_id: page.empresa_id || null,
        page_slug: page.slug,
        metadata: buildLpAnalyticsMetadata({ request, body }),
      }])

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao registrar visita' },
      { status: 500 }
    )
  }
}
