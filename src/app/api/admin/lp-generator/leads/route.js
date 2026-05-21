import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

function getDateStart(daysAgo = 0) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

export async function GET(request) {
  const auth = await requireAdmin(request, { module: 'leads', action: 'view' })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const busca = cleanText(searchParams.get('busca'))
    const pageId = cleanText(searchParams.get('pageId'))
    const pageSlug = cleanText(searchParams.get('pageSlug'))
    const limit = Math.min(Number(searchParams.get('limit') || 200), 500)

    const { data: pagesData, error: pagesError } = await supabaseAdmin
      .from('lp_generator_pages')
      .select('id, name, slug, status')
      .neq('status', 'archived')
      .order('name', { ascending: true })

    if (pagesError) throw pagesError

    let query = supabaseAdmin
      .from('lp_generator_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (pageId && isValidUuid(pageId)) {
      query = query.eq('page_id', pageId)
    } else if (pageSlug) {
      query = query.eq('page_slug', pageSlug)
    }

    if (busca) {
      const safeBusca = busca.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim()
      query = query.or(`nome.ilike.%${safeBusca}%,email.ilike.%${safeBusca}%,telefone.ilike.%${safeBusca}%,page_slug.ilike.%${safeBusca}%`)
    }

    const { data: leadsData, error: leadsError, count } = await query
    if (leadsError) throw leadsError

    const pagesById = new Map((pagesData || []).map((page) => [page.id, page]))
    const pagesBySlug = new Map((pagesData || []).map((page) => [page.slug, page]))
    const todayStart = getDateStart(0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const leads = (leadsData || []).map((lead) => {
      const page = pagesById.get(lead.page_id) || pagesBySlug.get(lead.page_slug) || null
      return {
        ...lead,
        page_name: page?.name || lead.page_slug || 'LP removida',
        page_public_slug: page?.slug || lead.page_slug || '',
      }
    })

    return NextResponse.json({
      ok: true,
      leads,
      pages: pagesData || [],
      total: count || leads.length,
      resumo: {
        total: count || leads.length,
        hoje: leads.filter((lead) => lead.created_at >= todayStart).length,
        mes: leads.filter((lead) => new Date(lead.created_at) >= monthStart).length,
      },
      permissions: auth.permissions?.leads || {},
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar leads das LPs' },
      { status: 500 }
    )
  }
}
