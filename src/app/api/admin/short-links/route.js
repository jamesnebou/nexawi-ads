import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { checkRateLimit } from '@/lib/rate-limit'
import { shortLinkBaseUrl, shortLinkUrl, normalizeShortLinkSlug, normalizeShortLinkTarget } from '@/lib/short-links'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const RATE_LIMIT = { keyPrefix: 'admin:short-links', limit: 90, windowMs: 60_000 }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function failure(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function actor(auth) {
  return { id: auth.user.id, email: auth.adminProfile?.email || auth.user.email || '' }
}

export async function GET(request) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) return failure('Muitas requisições.', 429)
  const auth = await requireAdmin(request, { module: 'qrcodes', action: 'view' })
  if (auth.errorResponse) return auth.errorResponse

  try {
    const url = new URL(request.url)
    const rawSearch = String(url.searchParams.get('search') || '').trim().slice(0, 80)
    const search = rawSearch.replace(/[^\p{L}\p{N} _-]/gu, ' ').trim()
    const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50
    const requestedOffset = Number.parseInt(url.searchParams.get('offset') || '0', 10)
    const offset = Number.isFinite(requestedOffset) ? Math.min(Math.max(requestedOffset, 0), 100_000) : 0
    const empresaId = String(url.searchParams.get('empresa_id') || '').trim()
    if (empresaId && !UUID_PATTERN.test(empresaId)) return failure('Empresa inválida.')
    if (empresaId && !auth.isMaster && !auth.allowedEmpresaIds.includes(empresaId)) {
      return failure('Empresa fora do seu escopo.', 403)
    }

    let linksQuery = supabaseAdmin
      .from('short_links')
      .select('id, empresa_id, title, slug, target_url, status, click_count, last_clicked_at, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    linksQuery = auth.applyEmpresaScope(linksQuery)
    if (empresaId) linksQuery = linksQuery.eq('empresa_id', empresaId)
    if (search) linksQuery = linksQuery.or(`title.ilike.%${search}%,slug.ilike.%${search}%`)

    let companiesQuery = supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa')
      .order('nome_empresa', { ascending: true })
      .limit(500)
    if (!auth.isMaster) {
      companiesQuery = auth.allowedEmpresaIds.length
        ? companiesQuery.in('id', auth.allowedEmpresaIds)
        : companiesQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }

    const [linksResult, companiesResult] = await Promise.all([linksQuery, companiesQuery])
    if (linksResult.error || companiesResult.error) throw linksResult.error || companiesResult.error

    return NextResponse.json({
      ok: true,
      items: (linksResult.data || []).map((item) => ({ ...item, short_url: shortLinkUrl(item.slug) })),
      total: linksResult.count || 0,
      companies: companiesResult.data || [],
      base_url: shortLinkBaseUrl(),
      scope: {
        activeEmpresaId: auth.activeEmpresaId || null,
        canCreate: auth.canCreate('qrcodes'),
        canUpdate: auth.canUpdate('qrcodes'),
      },
    })
  } catch (error) {
    console.error('Erro ao listar links curtos:', error)
    return failure('Não foi possível carregar os links curtos. Verifique se a migration foi aplicada.', 500)
  }
}

export async function POST(request) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) return failure('Muitas requisições.', 429)
  const auth = await requireAdmin(request, { module: 'qrcodes', action: 'create' })
  if (auth.errorResponse) return auth.errorResponse

  let body
  try {
    body = await request.json()
  } catch {
    return failure('Dados inválidos.')
  }

  const title = String(body?.title || '').trim()
  const targetUrl = normalizeShortLinkTarget(body?.target_url)
  const requestedSlug = String(body?.slug || '').trim()
  const customSlug = requestedSlug ? normalizeShortLinkSlug(requestedSlug) : null
  const empresaId = String(body?.empresa_id || auth.activeEmpresaId || '').trim()

  if (!title || title.length > 160) return failure('Informe um nome de até 160 caracteres.')
  if (!targetUrl) return failure('Informe uma URL HTTP ou HTTPS válida, com até 2048 caracteres e sem credenciais.')
  if (requestedSlug && !customSlug) return failure('O código deve ter 3 a 40 letras minúsculas, números ou hifens, sem hifen nas pontas.')
  if (!UUID_PATTERN.test(empresaId)) return failure('Selecione uma empresa para este link.')
  if (!auth.isMaster && !auth.allowedEmpresaIds.includes(empresaId)) return failure('Empresa fora do seu escopo.', 403)

  try {
    const { data: company, error: companyError } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa')
      .eq('id', empresaId)
      .maybeSingle()
    if (companyError) throw companyError
    if (!company) return failure('Empresa não encontrada.', 404)

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const slug = customSlug || randomBytes(5).toString('hex')
      const { data, error } = await supabaseAdmin
        .from('short_links')
        .insert({
          empresa_id: empresaId,
          title,
          slug,
          target_url: targetUrl,
          created_by: auth.user.id,
          updated_by: auth.user.id,
        })
        .select('id, empresa_id, title, slug, target_url, status, click_count, last_clicked_at, created_at, updated_at')
        .single()

      if (error?.code === '23505') {
        if (customSlug) return failure('Este código já está em uso. Escolha outro.', 409)
        continue
      }
      if (error) throw error

      await logAdminAction({
        request,
        adminUser: actor(auth),
        action: 'create',
        entity: 'short_link',
        entityId: data.id,
        description: `Link curto ${slug} criado para ${company.nome_empresa}.`,
        metadata: { empresa_id: empresaId },
      })

      return NextResponse.json({ ok: true, item: { ...data, short_url: shortLinkUrl(slug) } }, { status: 201 })
    }

    return failure('Não foi possível reservar um código. Tente novamente.', 409)
  } catch (error) {
    console.error('Erro ao criar link curto:', error)
    return failure('Não foi possível criar o link curto.', 500)
  }
}
