import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function isMissingAssetsTable(error) {
  const message = String(error?.message || '')
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('lp_generator_assets')
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
    const pageId = cleanText(searchParams.get('pageId'))
    const limit = Math.min(Number(searchParams.get('limit') || 80), 200)

    let query = supabaseAdmin
      .from('lp_generator_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    query = aplicarEscopoCliente(query, {
      clienteId: auth.cliente.id,
      empresaId: auth.empresaId,
    })

    if (pageId) query = query.eq('page_id', pageId)

    const { data, error } = await query

    if (isMissingAssetsTable(error)) {
      return NextResponse.json({
        ok: true,
        assets: [],
        warning: 'Tabela lp_generator_assets ainda nao criada.',
      })
    }

    if (error) throw error

    return NextResponse.json({ ok: true, assets: data || [] })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar biblioteca de imagens' },
      { status: 500 }
    )
  }
}
