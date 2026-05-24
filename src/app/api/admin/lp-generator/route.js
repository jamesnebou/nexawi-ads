import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'
import { getLpConfig, getLpTemplate, getLpTemplateConfig, slugifyLp } from '@/lib/lp-generator-defaults'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function canManage(auth) {
  return auth.canAccess('configuracoes', 'update') || auth.isMaster
}

function errorJson(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isSlugConflict(error) {
  return error?.code === '23505' && String(error?.message || '').includes('lp_generator_pages_slug_key')
}

function nextSlugCandidate(baseSlug, attempt) {
  return attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
}

async function insertPageWithUniqueSlug(baseSlug, page) {
  let lastConflict = null

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = nextSlugCandidate(baseSlug, attempt)
    const { data, error } = await supabaseAdmin
      .from('lp_generator_pages')
      .insert([{ ...page, slug }])
      .select('*')
      .single()

    if (!error) return data
    if (!isSlugConflict(error)) throw error
    lastConflict = error
  }

  throw lastConflict || new Error('Nao foi possivel gerar um slug livre para esta landing page')
}

async function resolveOwner({ clienteId, empresaId, auth }) {
  const cleanClienteId = cleanText(clienteId)

  if (cleanClienteId) {
    if (!isValidUuid(cleanClienteId)) throw new Error('ID do cliente invalido')

    let query = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id')
      .eq('id', cleanClienteId)

    query = auth.applyEmpresaScope(query)

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Cliente fora do escopo ou nao encontrado')

    return {
      clienteId: data.id,
      empresaId: data.empresa_id || empresaId || null,
    }
  }

  return {
    clienteId: null,
    empresaId: empresaId || null,
  }
}

async function getPage(id) {
  if (!isValidUuid(id)) return null

  const { data, error } = await supabaseAdmin
    .from('lp_generator_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getOwnerClients(auth) {
  let query = supabaseAdmin
    .from('clientes')
    .select('id, nome, nome_empresa, email, empresa_id, status')
    .neq('status', 'Cancelado')
    .order('nome_empresa', { ascending: true })

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function getStatusSummary(auth) {
  let query = supabaseAdmin
    .from('lp_generator_pages')
    .select('status')

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query
  if (error) throw error

  const pages = data || []

  return {
    total: pages.filter((page) => page.status !== 'archived').length,
    published: pages.filter((page) => page.status === 'published').length,
    draft: pages.filter((page) => page.status === 'draft').length,
    archived: pages.filter((page) => page.status === 'archived').length,
  }
}

async function getLpPlanLimits({ clienteId, empresaId }) {
  if (!clienteId && !empresaId) return { maxLps: 0, maxLeadsMes: 0, templatesPremium: true }

  let query = supabaseAdmin
    .from('clientes')
    .select('id, empresa_id, plano_id, planos(*)')
    .neq('status', 'Cancelado')
    .limit(1)

  if (clienteId) query = query.eq('id', clienteId)
  else query = query.eq('empresa_id', empresaId)

  const { data, error } = await query.maybeSingle()
  if (error || !data?.planos) return { maxLps: 0, maxLeadsMes: 0, templatesPremium: true }

  return {
    maxLps: Number(data.planos.max_lps || 0),
    maxLeadsMes: Number(data.planos.max_leads_mes || 0),
    templatesPremium: data.planos.templates_premium !== false,
  }
}

async function countPublishedPages({ clienteId, empresaId, excludeId, auth }) {
  let query = supabaseAdmin
    .from('lp_generator_pages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  query = auth.applyEmpresaScope(query)

  if (clienteId) query = query.eq('cliente_id', clienteId)
  else if (empresaId) query = query.eq('empresa_id', empresaId)
  if (excludeId) query = query.neq('id', excludeId)

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

async function assertCanPublish({ owner, pageId, auth }) {
  const limits = await getLpPlanLimits(owner)

  if (!limits.maxLps || limits.maxLps <= 0) return limits

  const publishedCount = await countPublishedPages({
    clienteId: owner.clienteId,
    empresaId: owner.empresaId,
    excludeId: pageId,
    auth,
  })

  if (publishedCount >= limits.maxLps) {
    throw new Error(`Limite do plano atingido: este cliente pode manter ${limits.maxLps} LP(s) publicada(s).`)
  }

  return limits
}

function canAccessPage(page, auth) {
  if (!page) return false
  if (auth.isMaster) return true
  if (!auth.activeEmpresaId) return false
  return page.empresa_id === auth.activeEmpresaId
}

async function logAction({ request, auth, action, page, description, metadata = {} }) {
  await logAdminAction({
    request,
    adminUser: auth.user,
    action,
    entity: 'lp_generator_pages',
    entityId: page?.id || null,
    description,
    metadata: {
      page_id: page?.id || null,
      slug: page?.slug || null,
      name: page?.name || null,
      ...metadata,
    },
  })
}

export async function GET(request) {
  const auth = await requireAdmin(request, { module: 'configuracoes', action: 'view' })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const id = cleanText(searchParams.get('id'))
    const busca = cleanText(searchParams.get('busca'))
    const statusFilter = cleanText(searchParams.get('status'))

    if (id) {
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido', 400)

      const page = await getPage(id)
      if (!page) return errorJson('Landing page nao encontrada', 404)
      if (!canAccessPage(page, auth)) return errorJson('Sem permissao para acessar esta landing page', 403)

      return NextResponse.json({
        ok: true,
        clientes: await getOwnerClients(auth),
        page: {
          ...page,
          config: getLpConfig(page.config || {}),
        },
      })
    }

    let query = supabaseAdmin
      .from('lp_generator_pages')
      .select('id, name, slug, status, cliente_id, empresa_id, created_at, updated_at')
      .order('updated_at', { ascending: false })

    query = auth.applyEmpresaScope(query)

    if (['draft', 'published', 'archived'].includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    } else {
      query = query.neq('status', 'archived')
    }

    if (busca) {
      const safeBusca = busca.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim()
      query = query.or(`name.ilike.%${safeBusca}%,slug.ilike.%${safeBusca}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({
      ok: true,
      pages: data || [],
      statusSummary: await getStatusSummary(auth),
      clientes: await getOwnerClients(auth),
      permissions: auth.permissions?.configuracoes || {},
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar landing pages' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) return auth.errorResponse
  if (!canManage(auth)) return errorJson('Sem permissao para gerenciar landing pages', 403)

  try {
    const body = await request.json()
    const action = cleanText(body.action || 'create')

    if (action === 'create') {
      const template = getLpTemplate(cleanText(body.template))
      const name = cleanText(body.name || template?.defaultName || 'Nova landing page')
      const slug = slugifyLp(body.slug || name)
      const owner = await resolveOwner({
        clienteId: body.cliente_id,
        empresaId: auth.activeEmpresaId || null,
        auth,
      })

      if (!name) return errorJson('Nome da landing page e obrigatorio')
      if (!slug) return errorJson('Slug da landing page e obrigatorio')

      const templateConfig = getLpTemplateConfig(template?.id)
      const data = await insertPageWithUniqueSlug(slug, {
        name,
        cliente_id: owner.clienteId,
        empresa_id: owner.empresaId,
        status: 'draft',
        config: getLpConfig({
          ...templateConfig,
          identidade: {
            ...(templateConfig.identidade || {}),
            marca: name,
          },
          seo: {
            ...(templateConfig.seo || {}),
            title: name,
          },
        }),
        created_by: auth.user?.id || null,
        updated_by: auth.user?.id || null,
      })

      await logAction({
        request,
        auth,
        action: 'create',
        page: data,
        description: 'Criou landing page no gerador',
        metadata: { template: template?.id || 'default' },
      })

      return NextResponse.json({ ok: true, page: data })
    }

    if (action === 'update') {
      const id = cleanText(body.id)
      if (!id) return errorJson('ID da landing page e obrigatorio')
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido')

      const before = await getPage(id)
      if (!before) return errorJson('Landing page nao encontrada', 404)
      if (!canAccessPage(before, auth)) return errorJson('Sem permissao para editar esta landing page', 403)

      const name = cleanText(body.name || before.name)
      const slug = slugifyLp(body.slug || before.slug || name)
      const status = ['draft', 'published'].includes(body.status) ? body.status : before.status
      const config = getLpConfig(body.config || before.config || {})
      const owner = body.cliente_id !== undefined
        ? await resolveOwner({
            clienteId: body.cliente_id,
            empresaId: before.empresa_id || auth.activeEmpresaId || null,
            auth,
          })
        : {
            clienteId: before.cliente_id || null,
            empresaId: before.empresa_id || auth.activeEmpresaId || null,
          }

      if (!name) return errorJson('Nome da landing page e obrigatorio')
      if (!slug) return errorJson('Slug da landing page e obrigatorio')
      if (status === 'published') {
        await assertCanPublish({ owner, pageId: before.id, auth })
      }

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .update({
          name,
          slug,
          cliente_id: owner.clienteId,
          empresa_id: owner.empresaId,
          status,
          config,
          updated_by: auth.user?.id || null,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (isSlugConflict(error)) return errorJson('Este slug ja esta em uso por outra landing page.', 409)
      if (error) throw error

      await logAction({
        request,
        auth,
        action: 'update',
        page: data,
        description: 'Atualizou landing page no gerador',
        metadata: {
          previous_slug: before.slug,
          previous_status: before.status,
          status,
        },
      })

      return NextResponse.json({ ok: true, page: data })
    }

    if (action === 'toggle') {
      const id = cleanText(body.id)
      if (!id) return errorJson('ID da landing page e obrigatorio')
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido')

      const before = await getPage(id)
      if (!before) return errorJson('Landing page nao encontrada', 404)
      if (!canAccessPage(before, auth)) return errorJson('Sem permissao para alterar esta landing page', 403)

      const status = before.status === 'published' ? 'draft' : 'published'

      if (status === 'published') {
        await assertCanPublish({
          owner: {
            clienteId: before.cliente_id || null,
            empresaId: before.empresa_id || auth.activeEmpresaId || null,
          },
          pageId: before.id,
          auth,
        })
      }

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .update({ status, updated_by: auth.user?.id || null })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await logAction({
        request,
        auth,
        action: 'update',
        page: data,
        description: status === 'published' ? 'Publicou landing page' : 'Despublicou landing page',
        metadata: { previous_status: before.status, status },
      })

      return NextResponse.json({ ok: true, page: data })
    }

    if (action === 'duplicate') {
      const id = cleanText(body.id)
      if (!id) return errorJson('ID da landing page e obrigatorio')
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido')

      const source = await getPage(id)
      if (!source) return errorJson('Landing page nao encontrada', 404)
      if (!canAccessPage(source, auth)) return errorJson('Sem permissao para duplicar esta landing page', 403)

      const name = `${source.name} - copia`
      const slug = `${source.slug}-${Date.now().toString(36)}`

      const data = await insertPageWithUniqueSlug(slug, {
        name,
        cliente_id: source.cliente_id || null,
        empresa_id: source.empresa_id || auth.activeEmpresaId || null,
        status: 'draft',
        config: getLpConfig(source.config || {}),
        created_by: auth.user?.id || null,
        updated_by: auth.user?.id || null,
      })

      await logAction({
        request,
        auth,
        action: 'create',
        page: data,
        description: 'Duplicou landing page no gerador',
        metadata: { source_id: source.id },
      })

      return NextResponse.json({ ok: true, page: data })
    }

    if (action === 'archive') {
      const id = cleanText(body.id)
      if (!id) return errorJson('ID da landing page e obrigatorio')
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido')

      const before = await getPage(id)
      if (!before) return errorJson('Landing page nao encontrada', 404)
      if (!canAccessPage(before, auth)) return errorJson('Sem permissao para arquivar esta landing page', 403)

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .update({ status: 'archived', updated_by: auth.user?.id || null })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await logAction({
        request,
        auth,
        action: 'delete',
        page: data,
        description: 'Arquivou landing page no gerador',
      })

      return NextResponse.json({ ok: true, page: data })
    }

    if (action === 'restore') {
      const id = cleanText(body.id)
      if (!id) return errorJson('ID da landing page e obrigatorio')
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido')

      const before = await getPage(id)
      if (!before) return errorJson('Landing page nao encontrada', 404)
      if (!canAccessPage(before, auth)) return errorJson('Sem permissao para restaurar esta landing page', 403)

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .update({ status: 'draft', updated_by: auth.user?.id || null })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await logAction({
        request,
        auth,
        action: 'update',
        page: data,
        description: 'Restaurou landing page arquivada',
        metadata: { previous_status: before.status, status: 'draft' },
      })

      return NextResponse.json({ ok: true, page: data })
    }

    return errorJson('Acao invalida')
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar landing page' },
      { status: 500 }
    )
  }
}
