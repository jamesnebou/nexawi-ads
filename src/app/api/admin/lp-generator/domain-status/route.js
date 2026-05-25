import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { checkLpCustomDomainDns } from '@/lib/lp-domain-diagnostics'
import { getLpConfig } from '@/lib/lp-generator-defaults'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

function canAccessPage(page, auth) {
  if (!page) return false
  if (auth.isMaster) return true
  if (!auth.activeEmpresaId) return false
  return page.empresa_id === auth.activeEmpresaId
}

export async function GET(request) {
  const auth = await requireAdmin(request, { module: 'configuracoes', action: 'view' })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const id = cleanText(searchParams.get('id'))

    if (!isValidUuid(id)) {
      return NextResponse.json({ ok: false, error: 'ID da landing page invalido' }, { status: 400 })
    }

    const { data: page, error } = await supabaseAdmin
      .from('lp_generator_pages')
      .select('id, empresa_id, config')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!page) return NextResponse.json({ ok: false, error: 'Landing page nao encontrada' }, { status: 404 })
    if (!canAccessPage(page, auth)) {
      return NextResponse.json({ ok: false, error: 'Sem permissao para verificar esta landing page' }, { status: 403 })
    }

    const config = getLpConfig(page.config || {})
    const domain = config.integracoes?.customDomain || ''
    const result = await checkLpCustomDomainDns(domain)

    return NextResponse.json({
      ok: true,
      domainStatus: result,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao verificar dominio' },
      { status: 500 }
    )
  }
}
