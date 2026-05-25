import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
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

function aplicarEscopoCliente(query, { clienteId, empresaId }) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) return query.eq('empresa_id', empresaId)
  return query.eq('cliente_id', clienteId)
}

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const id = cleanText(searchParams.get('id'))
    const { cliente, empresaId } = auth

    if (!isValidUuid(id)) {
      return NextResponse.json({ ok: false, error: 'ID da LP invalido' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('lp_generator_pages')
      .select('id, cliente_id, empresa_id, config')
      .eq('id', id)
      .neq('status', 'archived')

    query = aplicarEscopoCliente(query, { clienteId: cliente.id, empresaId })

    const { data: page, error } = await query.maybeSingle()

    if (error) throw error
    if (!page) return NextResponse.json({ ok: false, error: 'LP nao encontrada para este cliente' }, { status: 404 })

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
