import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  extractNexawiPaymentId,
  getAsaasConfig,
  isAsaasPaymentEvent,
  isAsaasSubscriptionEvent,
  normalizeAsaasStatus,
} from '@/lib/asaas'
import { logAdminAction } from '@/lib/admin-audit-log'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_WEBHOOK_BODY_BYTES = 256 * 1024
const WEBHOOK_RATE_LIMIT = {
  keyPrefix: 'webhook:asaas',
  limit: 120,
  windowMs: 60_000,
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function onlyDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value || ''))
    ? String(value).slice(0, 10)
    : null
}

function secureCompare(a = '', b = '') {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))

  if (left.length !== right.length) return false

  return timingSafeEqual(left, right)
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

  return {
    synced: true,
    pagamentoId: local.id,
    clienteId: local.cliente_id || null,
    empresaId: local.empresa_id || null,
    previousStatus: local.status || null,
    status,
    statusChanged: local.status !== status,
    dueDate: update.data_vencimento || local.data_vencimento || null,
    paidAt: update.data_pagamento || local.data_pagamento || null,
    value: update.valor || local.valor || null,
  }
}

async function auditAsaasPaymentEvent(request, event, result = {}, payment = {}) {
  const action = result.synced
    ? result.statusChanged
      ? 'asaas_payment_status_changed'
      : 'asaas_payment_synced'
    : 'asaas_payment_unmatched'

  await logAdminAction({
    request,
    adminUser: {
      id: null,
      email: 'asaas-webhook@nexawi.system',
    },
    action,
    entity: 'pagamentos',
    entityId: result.pagamentoId || '',
    description: result.synced
      ? `Webhook Asaas ${event}: pagamento ${result.pagamentoId} sincronizado como ${result.status}.`
      : `Webhook Asaas ${event}: pagamento local nao encontrado.`,
    metadata: {
      provider: 'asaas',
      event,
      synced: Boolean(result.synced),
      reason: result.reason || '',
      pagamento_id: result.pagamentoId || null,
      cliente_id: result.clienteId || null,
      empresa_id: result.empresaId || null,
      previous_status: result.previousStatus || null,
      status: result.status || null,
      status_changed: Boolean(result.statusChanged),
      due_date: result.dueDate || null,
      paid_at: result.paidAt || null,
      value: result.value || null,
      asaas_payment_id: payment.id || null,
      asaas_subscription_id: payment.subscription || null,
    },
  })
}

export async function POST(request) {
  const rate = checkRateLimit(request, WEBHOOK_RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas requisições para o webhook Asaas' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        },
      }
    )
  }

  const config = getAsaasConfig()
  const configuredToken = config.webhookToken
  const receivedToken = request.headers.get('asaas-access-token') || ''

  if (!configuredToken || !receivedToken || !secureCompare(receivedToken, configuredToken)) {
    return NextResponse.json(
      { ok: false, error: 'Webhook Asaas nao autorizado' },
      { status: 401 }
    )
  }

  const contentLength = Number(request.headers.get('content-length') || 0)

  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Payload do webhook Asaas muito grande' },
      { status: 413 }
    )
  }

  try {
    const body = await request.json()
    const event = String(body.event || '').toUpperCase()

    if (isAsaasPaymentEvent(event)) {
      const payment = body.payment || {}
      const result = await syncPayment(payment)
      await auditAsaasPaymentEvent(request, event, result, payment)
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
