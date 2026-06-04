import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

const statusPermitidos = ['rascunho', 'gerado', 'enviado', 'assinado', 'cancelado', 'vencido', 'renovado', 'envio_pendente']

function erro(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

async function getParamId(params) {
  const resolved = typeof params?.then === 'function' ? await params : params
  return Array.isArray(resolved?.id) ? resolved.id[0] : resolved?.id
}

async function contratoPermitidoParaAdmin(contrato, auth) {
  if (!contrato?.id) return false
  if (auth.isMaster) return true

  if (contrato.empresa_id && auth.allowedEmpresaIds?.includes(contrato.empresa_id)) {
    return true
  }

  if (contrato.cliente_id) {
    let clienteQuery = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id')
      .eq('id', contrato.cliente_id)

    clienteQuery = auth.applyEmpresaScope(clienteQuery)

    const { data, error } = await clienteQuery.maybeSingle()
    if (error) throw error
    if (data?.id) return true
  }

  return false
}

async function carregarContrato(id, auth) {
  const contratoId = limparUuid(id)
  if (!contratoId) return null

  const { data, error } = await supabaseAdmin
    .from('empresa_contratos')
    .select('*')
    .eq('id', contratoId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const permitido = await contratoPermitidoParaAdmin(data, auth)
  return permitido ? data : null
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

export async function GET(request, context) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const id = await getParamId(context?.params)
    const contrato = await carregarContrato(id, auth)

    if (!contrato) {
      return erro('Contrato não encontrado ou fora do escopo permitido.', 404)
    }

    let eventos = []

    try {
      const { data } = await supabaseAdmin
        .from('empresa_contrato_events')
        .select('*')
        .eq('contrato_id', contrato.id)
        .order('created_at', { ascending: false })
        .limit(50)

      eventos = data || []
    } catch {
      eventos = []
    }

    return NextResponse.json({
      ok: true,
      contrato,
      eventos,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar contrato.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, context) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'update',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const id = await getParamId(context?.params)
    const contrato = await carregarContrato(id, auth)

    if (!contrato) {
      return erro('Contrato não encontrado ou fora do escopo permitido.', 404)
    }

    const novoStatus = limparTexto(body.status || contrato.status)

    if (!statusPermitidos.includes(novoStatus)) {
      return erro('Status de contrato inválido.')
    }

    const payload = {
      status: novoStatus,
      updated_by: auth.user?.id || null,
    }

    if (novoStatus === 'cancelado') payload.canceled_at = new Date().toISOString()
    if (novoStatus === 'assinado') {
      payload.accepted_at = new Date().toISOString()
      payload.accepted_by_email = contrato.cliente_email || contrato.fields_json?.contratante?.email || null
    }

    const { data, error } = await supabaseAdmin
      .from('empresa_contratos')
      .update(payload)
      .eq('id', contrato.id)
      .select('*')
      .maybeSingle()

    if (error) throw error

    await registrarEvento({
      contratoId: contrato.id,
      eventType: `status_${novoStatus}`,
      auth,
      metadata: { from: contrato.status, to: novoStatus },
    })

    return NextResponse.json({
      ok: true,
      contrato: data,
      message: 'Status do contrato atualizado.',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar contrato.' },
      { status: 500 }
    )
  }
}
