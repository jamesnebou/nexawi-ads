import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderNexawiContractHtml } from '@/lib/nexawi-contract-generator'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function limparUuid(value = '') {
  const text = limparTexto(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

function erro(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function getTitulo(fields = {}) {
  const nome = fields?.contratante?.nome_razao_social || 'Cliente'
  const plano = fields?.plano?.nome || 'Plano NexaWi'
  return `Contrato NexaWi — ${nome} — ${plano}`
}

function getClienteEmail(fields = {}) {
  return fields?.contratante?.email || ''
}

async function validarEscopo({ auth, empresaId = '', clienteId = '' }) {
  if (auth.isMaster) return true

  if (empresaId && auth.allowedEmpresaIds?.includes(empresaId)) return true

  if (clienteId) {
    let query = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id')
      .eq('id', clienteId)

    query = auth.applyEmpresaScope(query)

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (data?.id) return true
  }

  return false
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const empresaId = limparUuid(searchParams.get('empresa_id'))
    const clienteId = limparUuid(searchParams.get('cliente_id'))
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)

    let query = supabaseAdmin
      .from('empresa_contratos')
      .select('id, empresa_id, cliente_id, source, status, titulo, contrato_numero, cliente_email, nexawi_email, sent_to_cliente_at, sent_to_nexawi_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (empresaId) query = query.eq('empresa_id', empresaId)
    if (clienteId) query = query.eq('cliente_id', clienteId)

    if (!auth.isMaster) {
      if (auth.allowedEmpresaIds?.length) {
        query = query.in('empresa_id', auth.allowedEmpresaIds)
      } else {
        query = query.eq('empresa_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true, contratos: data || [] })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao listar contratos.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'update',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const fields = body.fields

    if (!fields || typeof fields !== 'object') {
      return erro('fields_json é obrigatório para salvar o contrato.')
    }

    const empresaId = limparUuid(body.empresa_id || fields?.meta?.empresa_id)
    const clienteId = limparUuid(body.cliente_id || fields?.meta?.cliente_id)

    const permitido = await validarEscopo({ auth, empresaId, clienteId })

    if (!permitido) {
      return erro('Contrato fora do escopo permitido para este usuário.', 403)
    }

    const html = renderNexawiContractHtml(fields)
    const payload = {
      empresa_id: empresaId || null,
      cliente_id: clienteId || null,
      source: limparTexto(body.source || fields?.meta?.source || 'empresa'),
      status: limparTexto(body.status || 'rascunho'),
      titulo: limparTexto(body.titulo || getTitulo(fields)),
      template_version: limparTexto(fields?.meta?.template_version || 'nexawi-contract-v1'),
      contrato_numero: limparTexto(body.contrato_numero || ''),
      fields_json: fields,
      html_rendered: html,
      cliente_email: getClienteEmail(fields),
      nexawi_email: 'contato@nexawi.com.br',
      updated_by: auth.user?.id || null,
    }

    if (auth.user?.id) payload.created_by = auth.user.id

    let result

    if (body.id) {
      const contratoId = limparUuid(body.id)
      if (!contratoId) return erro('ID do contrato inválido.')

      const { data, error } = await supabaseAdmin
        .from('empresa_contratos')
        .update(payload)
        .eq('id', contratoId)
        .select('id, empresa_id, cliente_id, source, status, titulo, contrato_numero, cliente_email, created_at, updated_at')
        .maybeSingle()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('empresa_contratos')
        .insert(payload)
        .select('id, empresa_id, cliente_id, source, status, titulo, contrato_numero, cliente_email, created_at, updated_at')
        .maybeSingle()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      ok: true,
      contrato: result,
      message: 'Contrato salvo como rascunho.',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar contrato.' },
      { status: 500 }
    )
  }
}
