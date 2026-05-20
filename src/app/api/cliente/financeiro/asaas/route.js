import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  asaasBillingType,
  createAsaasCustomer,
  createAsaasPayment,
  findAsaasCustomerByExternalReference,
  normalizeAsaasStatus,
} from '@/lib/asaas'

export const runtime = 'nodejs'

const DEFAULT_FINE_PERCENT = 3
const DEFAULT_INTEREST_PERCENT = 2

function onlyDigits(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDueDate(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : todayISO()
  return date < todayISO() ? todayISO() : date
}

function percentFromEnv(name, fallback) {
  const value = Number(String(process.env[name] || '').replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function asaasLateFeeConfig() {
  return {
    interest: {
      value: percentFromEnv('ASAAS_INTEREST_PERCENT', DEFAULT_INTEREST_PERCENT),
    },
    fine: {
      value: percentFromEnv('ASAAS_FINE_PERCENT', DEFAULT_FINE_PERCENT),
      type: 'PERCENTAGE',
    },
  }
}

function externalCustomerReference(clienteId) {
  return `nexawi:cliente:${clienteId}`
}

function externalPaymentReference(pagamentoId) {
  return `nexawi:pagamento:${pagamentoId}`
}

function clientName(cliente = {}) {
  return cliente.nome_empresa || cliente.nome || 'Cliente NexaWi'
}

async function getClienteCompleto(clienteId) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id, empresa_id, nome, nome_empresa, email, telefone, cpf_cnpj, asaas_customer_id')
    .eq('id', clienteId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function ensureAsaasCustomer(cliente) {
  if (cliente.asaas_customer_id) return cliente.asaas_customer_id

  const externalReference = externalCustomerReference(cliente.id)
  const existing = await findAsaasCustomerByExternalReference(externalReference)

  if (existing?.id) {
    await supabaseAdmin
      .from('clientes')
      .update({ asaas_customer_id: existing.id })
      .eq('id', cliente.id)

    return existing.id
  }

  const customer = await createAsaasCustomer({
    name: clientName(cliente),
    email: cliente.email || undefined,
    mobilePhone: onlyDigits(cliente.telefone) || undefined,
    cpfCnpj: onlyDigits(cliente.cpf_cnpj) || undefined,
    externalReference,
    notificationDisabled: false,
  })

  await supabaseAdmin
    .from('clientes')
    .update({ asaas_customer_id: customer.id })
    .eq('id', cliente.id)

  return customer.id
}

function paymentLink(pagamento = {}) {
  return pagamento.gateway_invoice_url || pagamento.gateway_bank_slip_url || ''
}

function normalizeLocalPayment(pagamento = {}) {
  return {
    id: pagamento.id,
    valor: Number(pagamento.valor || 0),
    status: pagamento.status || '',
    data_vencimento: pagamento.data_vencimento || null,
    data_pagamento: pagamento.data_pagamento || null,
    metodo_pagamento: pagamento.metodo_pagamento || '',
    gateway_pagamento: pagamento.gateway_pagamento || '',
    gateway_payment_id: pagamento.gateway_payment_id || '',
    gateway_subscription_id: pagamento.gateway_subscription_id || '',
    gateway_invoice_url: pagamento.gateway_invoice_url || '',
    gateway_bank_slip_url: pagamento.gateway_bank_slip_url || '',
    gateway_status: pagamento.gateway_status || '',
    link_pagamento: paymentLink(pagamento),
  }
}

export async function POST(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const pagamentoId = String(body.pagamento_id || '').trim()

    if (!pagamentoId) {
      return NextResponse.json(
        { ok: false, error: 'Pagamento obrigatorio.' },
        { status: 400 }
      )
    }

    const { cliente, empresaId } = auth
    const clienteCompleto = await getClienteCompleto(cliente.id)

    if (!clienteCompleto) {
      return NextResponse.json(
        { ok: false, error: 'Cliente nao encontrado.' },
        { status: 404 }
      )
    }

    let query = supabaseAdmin
      .from('pagamentos')
      .select('*, planos(id, nome)')
      .eq('id', pagamentoId)

    if (empresaId) {
      query = query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${cliente.id}`)
    } else {
      query = query.eq('cliente_id', cliente.id)
    }

    const { data: pagamento, error: pagamentoError } = await query.maybeSingle()

    if (pagamentoError) throw pagamentoError

    if (!pagamento) {
      return NextResponse.json(
        { ok: false, error: 'Pagamento nao encontrado para este cliente.' },
        { status: 404 }
      )
    }

    if (pagamento.status === 'Pago') {
      return NextResponse.json(
        { ok: false, error: 'Este pagamento ja foi marcado como pago.' },
        { status: 409 }
      )
    }

    const existingLink = paymentLink(pagamento)
    if (existingLink) {
      return NextResponse.json({
        ok: true,
        pagamento: normalizeLocalPayment(pagamento),
        link: existingLink,
        message: 'Cobranca online ja disponivel.',
      })
    }

    const valor = Number(pagamento.valor || 0)

    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Pagamento sem valor valido para gerar cobranca.' },
        { status: 400 }
      )
    }

    const customerId = await ensureAsaasCustomer(clienteCompleto)
    const billingType = asaasBillingType(pagamento.metodo_pagamento || 'PIX')
    const asaasPayment = await createAsaasPayment({
      customer: customerId,
      billingType,
      value: valor,
      dueDate: normalizeDueDate(pagamento.data_vencimento),
      description: `NexaWi Ads - ${pagamento.planos?.nome || 'Regularizacao financeira'}`,
      externalReference: externalPaymentReference(pagamento.id),
      ...asaasLateFeeConfig(),
    })

    const update = {
      gateway_pagamento: 'asaas',
      gateway_payment_id: asaasPayment.id || null,
      gateway_subscription_id: asaasPayment.subscription || null,
      gateway_status: asaasPayment.status || null,
      gateway_invoice_url: asaasPayment.invoiceUrl || null,
      gateway_bank_slip_url: asaasPayment.bankSlipUrl || null,
      gateway_payload: asaasPayment || null,
      external_reference: asaasPayment.externalReference || externalPaymentReference(pagamento.id),
      status: normalizeAsaasStatus(asaasPayment.status),
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pagamentos')
      .update(update)
      .eq('id', pagamento.id)
      .select('*, planos(id, nome)')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      pagamento: normalizeLocalPayment(updated),
      link: paymentLink(updated),
      message: 'Cobranca online gerada com sucesso.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao gerar link de pagamento.',
        details: error.details || null,
      },
      { status: error.status || 500 }
    )
  }
}
