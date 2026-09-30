import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizeShortLinkTarget, shortLinkUrl } from '@/lib/short-links'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const RATE_LIMIT = { keyPrefix: 'admin:short-links:update', limit: 40, windowMs: 60_000 }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function failure(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function PATCH(request, { params }) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) return failure('Muitas requisições.', 429)
  const auth = await requireAdmin(request, { module: 'qrcodes', action: 'update' })
  if (auth.errorResponse) return auth.errorResponse

  const { id } = await params
  if (!UUID_PATTERN.test(id)) return failure('Identificador inválido.')

  let body
  try {
    body = await request.json()
  } catch {
    return failure('Dados inválidos.')
  }

  const updates = { updated_by: auth.user.id }
  if (body?.title !== undefined) {
    const title = String(body.title || '').trim()
    if (!title || title.length > 160) return failure('Informe um nome de até 160 caracteres.')
    updates.title = title
  }
  if (body?.target_url !== undefined) {
    const targetUrl = normalizeShortLinkTarget(body.target_url)
    if (!targetUrl) return failure('Informe uma URL HTTP ou HTTPS válida, com até 2048 caracteres e sem credenciais.')
    updates.target_url = targetUrl
  }
  if (body?.status !== undefined) {
    if (!['active', 'inactive'].includes(body.status)) return failure('Status inválido.')
    updates.status = body.status
  }
  if (Object.keys(updates).length === 1) return failure('Nenhuma alteração informada.')

  try {
    let existingQuery = supabaseAdmin
      .from('short_links')
      .select('id, empresa_id, slug')
      .eq('id', id)
    existingQuery = auth.applyEmpresaScope(existingQuery)
    const { data: existing, error: existingError } = await existingQuery.maybeSingle()
    if (existingError) throw existingError
    if (!existing) return failure('Link não encontrado no escopo da empresa.', 404)

    const { data, error } = await supabaseAdmin
      .from('short_links')
      .update(updates)
      .eq('id', id)
      .eq('empresa_id', existing.empresa_id)
      .select('id, empresa_id, title, slug, target_url, status, click_count, last_clicked_at, created_at, updated_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return failure('Link não encontrado.', 404)

    await logAdminAction({
      request,
      adminUser: { id: auth.user.id, email: auth.adminProfile?.email || auth.user.email || '' },
      action: 'update',
      entity: 'short_link',
      entityId: data.id,
      description: `Link curto ${data.slug} atualizado.`,
      metadata: { empresa_id: data.empresa_id, fields: Object.keys(updates).filter((key) => key !== 'updated_by') },
    })

    return NextResponse.json({ ok: true, item: { ...data, short_url: shortLinkUrl(data.slug) } })
  } catch (error) {
    console.error('Erro ao atualizar link curto:', error)
    return failure('Não foi possível atualizar o link curto.', 500)
  }
}
