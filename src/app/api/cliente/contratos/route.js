import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireCliente } from '@/lib/cliente-api-auth'

export const runtime = 'nodejs'

function erro(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function aplicarEscopoContrato(query, { clienteId, empresaId }) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) return query.eq('empresa_id', empresaId)
  return query.eq('cliente_id', clienteId)
}

async function registrarEvento({ contratoId, eventType, auth, metadata = {} }) {
  try {
    await supabaseAdmin
      .from('empresa_contrato_events')
      .insert({
        contrato_id: contratoId,
        event_type: eventType,
        actor_id: auth.user?.id || null,
        actor_email: auth.user?.email || auth.cliente?.email || null,
        metadata,
      })
  } catch (error) {
    console.warn('Evento de contrato não registrado:', error.message)
  }
}

export async function GET(request) {
  const auth = await requireCliente(request)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { cliente, empresaId } = auth
    const clienteId = cliente.id

    let query = supabaseAdmin
      .from('empresa_contratos')
      .select('id, empresa_id, cliente_id, status, titulo, cliente_email, sent_to_cliente_at, accepted_at, accepted_by_email, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(50)

    query = aplicarEscopoContrato(query, { clienteId, empresaId })

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true, contratos: data || [] })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar contratos.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireCliente(request)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const contratoId = String(body.id || '').trim()

    if (!contratoId) return erro('ID do contrato é obrigatório.')

    const { cliente, empresaId } = auth
    const clienteId = cliente.id

    let query = supabaseAdmin
      .from('empresa_contratos')
      .select('*')
      .eq('id', contratoId)

    query = aplicarEscopoContrato(query, { clienteId, empresaId })

    const { data: contrato, error } = await query.maybeSingle()
    if (error) throw error
    if (!contrato) return erro('Contrato não encontrado para este cliente.', 404)

    const now = new Date().toISOString()

    const { data: atualizado, error: updateError } = await supabaseAdmin
      .from('empresa_contratos')
      .update({
        status: 'assinado',
        accepted_at: now,
        accepted_by_email: auth.user?.email || cliente.email || contrato.cliente_email || null,
        updated_by: auth.user?.id || null,
      })
      .eq('id', contrato.id)
      .select('id, empresa_id, cliente_id, status, titulo, cliente_email, sent_to_cliente_at, accepted_at, accepted_by_email, created_at, updated_at')
      .maybeSingle()

    if (updateError) throw updateError

    await registrarEvento({
      contratoId: contrato.id,
      eventType: 'contrato_aceito_cliente',
      auth,
      metadata: { accepted_at: now },
    })

    return NextResponse.json({
      ok: true,
      contrato: atualizado,
      message: 'Contrato aceito com sucesso.',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao aceitar contrato.' },
      { status: 500 }
    )
  }
}
