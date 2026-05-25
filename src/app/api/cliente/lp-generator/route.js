import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLpConfig, slugifyLp } from '@/lib/lp-generator-defaults'
import { summarizeSourceBreakdown } from '@/lib/lp-generator-analytics'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

function isSlugConflict(error) {
  return error?.code === '23505' && String(error?.message || '').includes('lp_generator_pages_slug_key')
}

function isMissingPlanLimitColumn(error) {
  const message = String(error?.message || '')
  return error?.code === '42703' || message.includes('max_lps') || message.includes('max_leads_mes') || message.includes('templates_premium')
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

async function fetchAnalyticsRows(table, { pageId, clienteId, empresaId, limit = 1000 } = {}) {
  let query = supabaseAdmin
    .from(table)
    .select('id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  query = aplicarEscopoCliente(query, { clienteId, empresaId })
  if (pageId && isValidUuid(pageId)) query = query.eq('page_id', pageId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function buscarPaginaDoCliente(pageId, { clienteId, empresaId }) {
  if (!pageId || !isValidUuid(pageId)) return null

  let query = supabaseAdmin
    .from('lp_generator_pages')
    .select('*')
    .eq('id', pageId)
    .neq('status', 'archived')

  query = aplicarEscopoCliente(query, { clienteId, empresaId })

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data || null
}

async function getLpPlanLimits({ clienteId, empresaId }) {
  let query = supabaseAdmin
    .from('clientes')
    .select('id, empresa_id, plano_id, planos(*)')
    .neq('status', 'Cancelado')
    .limit(1)

  if (clienteId) query = query.eq('id', clienteId)
  else if (empresaId) query = query.eq('empresa_id', empresaId)

  let { data, error } = await query.maybeSingle()

  if (isMissingPlanLimitColumn(error)) {
    let fallbackQuery = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id, plano_id, planos(id)')
      .neq('status', 'Cancelado')
      .limit(1)

    if (clienteId) fallbackQuery = fallbackQuery.eq('id', clienteId)
    else if (empresaId) fallbackQuery = fallbackQuery.eq('empresa_id', empresaId)

    const retry = await fallbackQuery.maybeSingle()
    data = retry.data
    error = retry.error
  }

  if (error || !data?.planos) return { maxLps: 0, maxLeadsMes: 0, templatesPremium: true }

  return {
    maxLps: Number(data.planos.max_lps || 0),
    maxLeadsMes: Number(data.planos.max_leads_mes || 0),
    templatesPremium: data.planos.templates_premium !== false,
  }
}

async function assertCanPublish({ clienteId, empresaId, pageId }) {
  const limits = await getLpPlanLimits({ clienteId, empresaId })

  if (!limits.maxLps || limits.maxLps <= 0) return limits

  let query = supabaseAdmin
    .from('lp_generator_pages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  query = aplicarEscopoCliente(query, { clienteId, empresaId })
  if (pageId) query = query.neq('id', pageId)

  const { count, error } = await query
  if (error) throw error

  if ((count || 0) >= limits.maxLps) {
    throw new Error(`Limite do plano atingido: sua conta pode manter ${limits.maxLps} LP(s) publicada(s).`)
  }

  return limits
}

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const pageId = cleanText(searchParams.get('pageId'))
    const editorId = cleanText(searchParams.get('id'))
    const { cliente, empresaId } = auth
    const clienteId = cliente.id

    if (editorId) {
      if (!isValidUuid(editorId)) {
        return NextResponse.json({ ok: false, error: 'ID da LP invalido' }, { status: 400 })
      }

      const page = await buscarPaginaDoCliente(editorId, { clienteId, empresaId })
      if (!page) {
        return NextResponse.json({ ok: false, error: 'LP nao encontrada para este cliente' }, { status: 404 })
      }

      return NextResponse.json({
        ok: true,
        page: {
          ...page,
          config: getLpConfig(page.config || {}),
        },
      })
    }

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
      viewAnalyticsRows,
      leadAnalyticsRows,
    ] = await Promise.all([
      countRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId }),
      countRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId, from: todayStart }),
      countRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId, from: monthStartIso }),
      countRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId }),
      countRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId, from: todayStart }),
      countRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId, from: monthStartIso }),
      fetchAnalyticsRows('lp_generator_views', { pageId: selectedPageId, clienteId, empresaId }),
      fetchAnalyticsRows('lp_generator_leads', { pageId: selectedPageId, clienteId, empresaId }),
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
        origemVisitas: summarizeSourceBreakdown(viewAnalyticsRows),
        origemLeads: summarizeSourceBreakdown(leadAnalyticsRows),
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

export async function POST(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const action = cleanText(body.action || 'update')
    const pageId = cleanText(body.id)
    const { cliente, empresaId, user } = auth

    if (action !== 'update') {
      return NextResponse.json({ ok: false, error: 'Acao invalida' }, { status: 400 })
    }

    if (!isValidUuid(pageId)) {
      return NextResponse.json({ ok: false, error: 'ID da LP invalido' }, { status: 400 })
    }

    const page = await buscarPaginaDoCliente(pageId, { clienteId: cliente.id, empresaId })

    if (!page) {
      return NextResponse.json({ ok: false, error: 'LP nao encontrada para este cliente' }, { status: 404 })
    }

    const name = cleanText(body.name || page.name)
    const slug = slugifyLp(body.slug || page.slug || name)
    const status = ['draft', 'published'].includes(body.status) ? body.status : page.status

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nome da LP e obrigatorio' }, { status: 400 })
    }

    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Slug da LP e obrigatorio' }, { status: 400 })
    }

    if (status === 'published') {
      await assertCanPublish({
        clienteId: cliente.id,
        empresaId,
        pageId: page.id,
      })
    }

    const { data, error } = await supabaseAdmin
      .from('lp_generator_pages')
      .update({
        name,
        slug,
        status,
        config: getLpConfig(body.config || page.config || {}),
        updated_by: user?.id || null,
      })
      .eq('id', page.id)
      .select('*')
      .single()

    if (isSlugConflict(error)) {
      return NextResponse.json({ ok: false, error: 'Este slug ja esta em uso por outra LP.' }, { status: 409 })
    }
    if (error) throw error

    return NextResponse.json({
      ok: true,
      page: {
        ...data,
        config: getLpConfig(data.config || {}),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar LP do cliente' },
      { status: 500 }
    )
  }
}
