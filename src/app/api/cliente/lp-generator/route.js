import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
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

function aplicarEscopoCliente(query, { clienteId, empresaId }) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) return query.eq('empresa_id', empresaId)
  return query.eq('cliente_id', clienteId)
}

async function countRows(table, { pageId, clienteId, empresaId, from } = {}) {
  let query = supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })

  query = aplicarEscopoCliente(query, { clienteId, empresaId })

  if (pageId && isValidUuid(pageId)) query = query.eq('page_id', pageId)
  if (from) query = query.gte('created_at', from)

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const pageId = cleanText(searchParams.get('pageId'))
    const { cliente, empresaId } = auth
    const clienteId = cliente.id

    let pagesQuery = supabaseAdmin
      .from('lp_generator_pages')
      .select('id, name, slug, status, cliente_id, empresa_id, created_at, updated_at')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })

    pagesQuery = aplicarEscopoCliente(pagesQuery, { clienteId, empresaId })

    const { data: pagesData, error: pagesError } = await pagesQuery
    if (pagesError) throw pagesError

    const pages = pagesData || []
    const allowedPageIds = new Set(pages.map((page) => page.id))
    const selectedPageId = pageId && allowedPageIds.has(pageId) ? pageId : ''

    let leadsQuery = supabaseAdmin
      .from('lp_generator_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    leadsQuery = aplicarEscopoCliente(leadsQuery, { clienteId, empresaId })

    if (selectedPageId) leadsQuery = leadsQuery.eq('page_id', selectedPageId)

    const { data: leadsData, error: leadsError } = await leadsQuery
    if (leadsError) throw leadsError

    const pagesById = new Map(pages.map((page) => [page.id, page]))
    const leads = (leadsData || []).map((lead) => {
      const page = pagesById.get(lead.page_id) || null

      return {
        ...lead,
        page_name: page?.name || lead.page_slug || 'LP removida',
        page_public_slug: page?.slug || lead.page_slug || '',
      }
    })

    const todayStart = getDateStart(0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthStartIso = monthStart.toISOString()

    const [
      totalViews,
      todayViews,
      monthViews,
      totalLeads,
      todayLeads,
      monthLeads,
    ] = await Promise.all([
      countRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId }),
      countRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId, from: todayStart }),
      countRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId, from: monthStartIso }),
      countRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId }),
      countRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId, from: todayStart }),
      countRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId, from: monthStartIso }),
    ])

    return NextResponse.json({
      ok: true,
      pages,
      leads,
      selectedPageId,
      resumo: {
        paginas: pages.length,
        publicadas: pages.filter((page) => page.status === 'published').length,
        visitas: totalViews,
        visitasHoje: todayViews,
        visitasMes: monthViews,
        leads: totalLeads,
        leadsHoje: todayLeads,
        leadsMes: monthLeads,
        conversao: totalViews > 0 ? Number(((totalLeads / totalViews) * 100).toFixed(2)) : 0,
      },
      multiempresa: {
        empresa_id: empresaId || cliente.empresa_id || null,
        fallbackClienteId: clienteId,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar landing pages do cliente' },
      { status: 500 }
    )
  }
}
