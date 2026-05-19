import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  extractNexawiPaymentId,
  getAsaasConfig,
  isAsaasPaymentEvent,
  isAsaasSubscriptionEvent,
  normalizeAsaasStatus,
} from '@/lib/asaas'

export const runtime = 'nodejs'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function onlyDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value || ''))
    ? String(value).slice(0, 10)
    : null
}

async function findLocalPayment(payment = {}) {
  if (payment.id) {
    const { data, error } = await supabaseAdmin
      .from('pagamentos')
      .select('*')
      .eq('gateway_payment_id', payment.id)
      .maybeSingle()

    if (error) throw error
    if (data) return data
  }

  const paymentId = extractNexawiPaymentId(payment.externalReference)

  if (paymentId) {
    const { data, error } = await supabaseAdmin
      .from('pagamentos')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()

    if (error) throw error
    if (data && (!data.gateway_payment_id || data.gateway_payment_id === payment.id)) return data
  }

  return null
}

async function createPaymentFromSubscription(payment = {}) {
  if (!payment.subscription) return null

  const { data: reference, error: referenceError } = await supabaseAdmin
    .from('pagamentos')
    .select('cliente_id, empresa_id, plano_id, valor, metodo_pagamento')
    .eq('gateway_subscription_id', payment.subscription)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (referenceError) throw referenceError
  if (!reference?.cliente_id) return null

  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .insert([
      {
        cliente_id: reference.cliente_id,
        empresa_id: reference.empresa_id || null,
        plano_id: reference.plano_id || null,
        valor: Number(payment.value || reference.valor || 0),
        data_vencimento: onlyDate(payment.dueDate) || todayISO(),
        data_pagamento: null,
        metodo_pagamento: payment.billingType === 'BOLETO'
          ? 'Boleto'
          : payment.billingType === 'CREDIT_CARD'
            ? 'Cartão de Crédito'
            : 'PIX',
        status: 'Pendente',
        gateway_pagamento: 'asaas',
        gateway_subscription_id: payment.subscription,
        observacao: 'Cobranca recorrente criada automaticamente pelo webhook Asaas.',
      },
    ])
    .select('*')
    .single()

  if (error) throw error
  return data
}

async function syncPayment(payment = {}) {
  const existing = await findLocalPayment(payment)
  const local = existing || await createPaymentFromSubscription(payment)

  if (!local?.id) {
    return { synced: false, reason: 'Pagamento local nao encontrado para o evento Asaas.' }
  }

  const status = normalizeAsaasStatus(payment.status)
  const update = {
    gateway_pagamento: 'asaas',
    gateway_payment_id: payment.id || local.gateway_payment_id || null,
    gateway_subscription_id: payment.subscription || local.gateway_subscription_id || null,
    gateway_status: payment.status || null,
    gateway_invoice_url: payment.invoiceUrl || local.gateway_invoice_url || null,
    gateway_bank_slip_url: payment.bankSlipUrl || local.gateway_bank_slip_url || null,
    gateway_payload: payment || null,
    external_reference: payment.externalReference || local.external_reference || null,
    status,
  }

  if (status === 'Pago') {
    update.data_pagamento = onlyDate(payment.paymentDate) || onlyDate(payment.clientPaymentDate) || todayISO()
  }

  if (payment.dueDate) {
    update.data_vencimento = onlyDate(payment.dueDate)
  }

  if (payment.value) {
    update.valor = Number(payment.value)
  }

  const { error } = await supabaseAdmin
    .from('pagamentos')
    .update(update)
    .eq('id', local.id)

  if (error) throw error

  return { synced: true, pagamentoId: local.id, status }
}

export async function POST(request) {
  const config = getAsaasConfig()
  const configuredToken = config.webhookToken
  const receivedToken = request.headers.get('asaas-access-token') || ''

  if (configuredToken && receivedToken !== configuredToken) {
    return NextResponse.json(
      { ok: false, error: 'Webhook Asaas nao autorizado' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const event = String(body.event || '').toUpperCase()

    if (isAsaasPaymentEvent(event)) {
      const result = await syncPayment(body.payment || {})
      return NextResponse.json({ ok: true, event, ...result })
    }

    if (isAsaasSubscriptionEvent(event)) {
      return NextResponse.json({
        ok: true,
        event,
        synced: false,
        reason: 'Evento de assinatura recebido. As cobrancas sao sincronizadas pelos eventos PAYMENT_*.',
      })
    }

    return NextResponse.json({
      ok: true,
      event,
      ignored: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao processar webhook Asaas',
      },
      { status: 500 }
    )
  }
}
