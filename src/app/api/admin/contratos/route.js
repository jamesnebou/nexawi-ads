import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderNexawiContractHtml } from '@/lib/nexawi-contract-generator'
import { validateContractFields } from '@/lib/nexawi-contract-ops'

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

function erro(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
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

async function registrarEvento({ contratoId, eventType, auth, metadata = {} }) {
  try {
    await supabaseAdmin
      .from('empresa_contrato_events')
      .insert({
        contrato_id: contratoId,
        event_type: eventType,
        actor_id: auth.user?.id || null,
        actor_email: auth.user?.email || null,
        metadata,
      })
  } catch (error) {
    console.warn('Evento de contrato não registrado:', error.message)
  }
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
    const status = limparTexto(searchParams.get('status'))
    const busca = limparTexto(searchParams.get('busca'))
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

    let query = supabaseAdmin
      .from('empresa_contratos')
      .select('id, empresa_id, cliente_id, source, status, titulo, contrato_numero, cliente_email, nexawi_email, sent_to_cliente_at, sent_to_nexawi_at, accepted_at, accepted_by_email, canceled_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (empresaId) query = query.eq('empresa_id', empresaId)
    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (status) query = query.eq('status', status)
    if (busca) query = query.or(`titulo.ilike.%${busca}%,cliente_email.ilike.%${busca}%,contrato_numero.ilike.%${busca}%`)

    if (!auth.isMaster) {
      if (auth.allowedEmpresaIds?.length) {
        query = query.in('empresa_id', auth.allowedEmpresaIds)
      } else {
        query = query.eq('empresa_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const { data, error } = await query
    if (error) throw error

    const contratos = data || []
    const resumo = contratos.reduce((acc, contrato) => {
      acc.total += 1
      acc[contrato.status] = (acc[contrato.status] || 0) + 1
      return acc
    }, { total: 0 })

    return NextResponse.json({ ok: true, contratos, resumo })
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

    const validation = validateContractFields(fields)
    if (!validation.ok && body.status !== 'rascunho') {
      return erro('Corrija os campos obrigatórios antes de salvar este contrato.', 422, { validationErrors: validation.errors })
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
    let eventType = 'contrato_rascunho_criado'

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
      eventType = 'contrato_rascunho_atualizado'
    } else {
      const { data, error } = await supabaseAdmin
        .from('empresa_contratos')
        .insert(payload)
        .select('id, empresa_id, cliente_id, source, status, titulo, contrato_numero, cliente_email, created_at, updated_at')
        .maybeSingle()

      if (error) throw error
      result = data
    }

    await registrarEvento({
      contratoId: result.id,
      eventType,
      auth,
      metadata: { status: payload.status },
    })

    return NextResponse.json({
      ok: true,
      contrato: result,
      validation,
      message: 'Contrato salvo como rascunho.',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar contrato.' },
      { status: 500 }
    )
  }
}
