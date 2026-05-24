import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function isMissingAssetsTable(error) {
  const message = String(error?.message || '')
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('lp_generator_assets')
}

export async function GET(request) {
  const auth = await requireAdmin(request, { module: 'configuracoes', action: 'view' })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const pageId = cleanText(searchParams.get('pageId'))
    const clienteId = cleanText(searchParams.get('clienteId'))
    const limit = Math.min(Number(searchParams.get('limit') || 80), 200)

    let query = supabaseAdmin
      .from('lp_generator_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    query = auth.applyEmpresaScope(query)

    if (pageId) query = query.eq('page_id', pageId)
    if (clienteId) query = query.eq('cliente_id', clienteId)

    const { data, error } = await query

    if (isMissingAssetsTable(error)) {
      return NextResponse.json({
        ok: true,
        assets: [],
        warning: 'Tabela lp_generator_assets ainda nao criada. Rode o SQL de profissionalizacao do gerador.',
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
