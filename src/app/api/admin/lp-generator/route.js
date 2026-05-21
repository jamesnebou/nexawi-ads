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

    if (id) {
      if (!isValidUuid(id)) return errorJson('ID da landing page invalido', 400)

      const page = await getPage(id)
      if (!page) return errorJson('Landing page nao encontrada', 404)

      return NextResponse.json({
        ok: true,
        page: {
          ...page,
          config: getLpConfig(page.config || {}),
        },
      })
    }

    let query = supabaseAdmin
      .from('lp_generator_pages')
      .select('id, name, slug, status, created_at, updated_at')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })

    if (busca) {
      const safeBusca = busca.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim()
      query = query.or(`name.ilike.%${safeBusca}%,slug.ilike.%${safeBusca}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({
      ok: true,
      pages: data || [],
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

      if (!name) return errorJson('Nome da landing page e obrigatorio')
      if (!slug) return errorJson('Slug da landing page e obrigatorio')

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .insert([{
          name,
          slug,
          status: 'draft',
          config: getLpConfig({
            ...getLpTemplateConfig(template?.id),
            identidade: {
              ...(getLpTemplateConfig(template?.id).identidade || {}),
              marca: name,
            },
            seo: {
              ...(getLpTemplateConfig(template?.id).seo || {}),
              title: name,
            },
          }),
          created_by: auth.user?.id || null,
          updated_by: auth.user?.id || null,
        }])
        .select('*')
        .single()

      if (error) throw error

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

      const name = cleanText(body.name || before.name)
      const slug = slugifyLp(body.slug || before.slug || name)
      const status = ['draft', 'published'].includes(body.status) ? body.status : before.status
      const config = getLpConfig(body.config || before.config || {})

      if (!name) return errorJson('Nome da landing page e obrigatorio')
      if (!slug) return errorJson('Slug da landing page e obrigatorio')

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .update({
          name,
          slug,
          status,
          config,
          updated_by: auth.user?.id || null,
        })
        .eq('id', id)
        .select('*')
        .single()

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

      const status = before.status === 'published' ? 'draft' : 'published'

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

      const name = `${source.name} - copia`
      const slug = `${source.slug}-${Date.now().toString(36)}`

      const { data, error } = await supabaseAdmin
        .from('lp_generator_pages')
        .insert([{
          name,
          slug,
          status: 'draft',
          config: getLpConfig(source.config || {}),
          created_by: auth.user?.id || null,
          updated_by: auth.user?.id || null,
        }])
        .select('*')
        .single()

      if (error) throw error

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

    return errorJson('Acao invalida')
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar landing page' },
      { status: 500 }
    )
  }
}
