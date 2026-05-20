import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import {
  asaasBillingType,
  asaasCycleFromPlano,
  createAsaasCustomer,
  createAsaasPayment,
  createAsaasSubscription,
  findAsaasCustomerByExternalReference,
  getAsaasConfig,
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

function addDaysISO(days = 7) {
  const date = new Date()
  date.setDate(date.getDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

function sanitizeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : addDaysISO(7)
}

function clientName(cliente = {}) {
  return cliente.nome_empresa || cliente.nome || 'Cliente NexaWi'
}

function externalCustomerReference(clienteId) {
  return `nexawi:cliente:${clienteId}`
}

function externalPaymentReference(pagamentoId) {
  return `nexawi:pagamento:${pagamentoId}`
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

async function getCliente(clienteId) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id, empresa_id, nome, nome_empresa, email, telefone, cpf_cnpj, plano_id, cidade, estado, asaas_customer_id, planos(id, nome, preco, ciclo_cobranca)')
    .eq('id', clienteId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getPlano(planoId) {
  if (!planoId) return null

  const { data, error } = await supabaseAdmin
    .from('planos')
    .select('id, nome, preco, ciclo_cobranca')
    .eq('id', planoId)
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

  const phone = onlyDigits(cliente.telefone)
  const cpfCnpj = onlyDigits(cliente.cpf_cnpj)

  const customer = await createAsaasCustomer({
    name: clientName(cliente),
    email: cliente.email || undefined,
    mobilePhone: phone || undefined,
    cpfCnpj: cpfCnpj || undefined,
    externalReference,
    notificationDisabled: false,
  })

  await supabaseAdmin
    .from('clientes')
    .update({ asaas_customer_id: customer.id })
    .eq('id', cliente.id)

  return customer.id
}

async function createLocalPayment({ cliente, plano, valor, dataVencimento, metodo, observacao }) {
  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .insert([
      {
        cliente_id: cliente.id,
        empresa_id: cliente.empresa_id || null,
        plano_id: plano?.id || cliente.plano_id || null,
        valor,
        data_vencimento: dataVencimento,
        data_pagamento: null,
        metodo_pagamento: metodo,
        status: 'Pendente',
        gateway_pagamento: 'asaas',
        observacao: observacao || null,
      },
    ])
    .select('*, clientes(id, nome), planos(id, nome, preco)')
    .single()

  if (error) throw error
  return data
}

async function updateLocalPaymentFromAsaas(pagamentoId, asaasPayment, asaasSubscriptionId = '') {
  const update = {
    gateway_pagamento: 'asaas',
    gateway_payment_id: asaasPayment.id || null,
    gateway_subscription_id: asaasSubscriptionId || asaasPayment.subscription || null,
    gateway_status: asaasPayment.status || null,
    gateway_invoice_url: asaasPayment.invoiceUrl || null,
    gateway_bank_slip_url: asaasPayment.bankSlipUrl || null,
    gateway_payload: asaasPayment || null,
    external_reference: asaasPayment.externalReference || externalPaymentReference(pagamentoId),
    status: normalizeAsaasStatus(asaasPayment.status),
  }

  if (update.status === 'Pago') {
    update.data_pagamento = asaasPayment.paymentDate || asaasPayment.clientPaymentDate || todayISO()
  }

  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .update(update)
    .eq('id', pagamentoId)
    .select('*, clientes(id, nome), planos(id, nome, preco)')
    .single()

  if (error) throw error
  return data
}

async function updateLocalSubscriptionPlaceholder(pagamentoId, subscription) {
  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .update({
      gateway_pagamento: 'asaas',
      gateway_payment_id: null,
      gateway_subscription_id: subscription.id,
      gateway_status: subscription.status || 'ACTIVE',
      gateway_invoice_url: null,
      gateway_bank_slip_url: null,
      gateway_payload: subscription || null,
      external_reference: externalPaymentReference(pagamentoId),
      status: 'Pendente',
    })
    .eq('id', pagamentoId)
    .select('*, clientes(id, nome), planos(id, nome, preco)')
    .single()

  if (error) throw error
  return data
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'financeiro',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  const config = getAsaasConfig()

  return NextResponse.json({
    ok: true,
    provider: 'asaas',
    enabled: config.enabled,
    environment: config.environment,
    baseUrl: config.baseUrl,
    webhookConfigured: Boolean(config.webhookToken),
    lateFees: asaasLateFeeConfig(),
  })
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) return auth.errorResponse

  if (!auth.canAccess('financeiro', 'create')) {
    return NextResponse.json(
      { ok: false, error: 'Sem permissao para criar cobrancas no financeiro' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (!['create_payment', 'create_subscription'].includes(action)) {
      return NextResponse.json(
        { ok: false, error: 'Acao Asaas invalida' },
        { status: 400 }
      )
    }

    const clienteId = String(body.cliente_id || '').trim()
    const planoId = String(body.plano_id || '').trim()

    if (!clienteId) {
      return NextResponse.json(
        { ok: false, error: 'Cliente e obrigatorio' },
        { status: 400 }
      )
    }

    const cliente = await getCliente(clienteId)
    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: 'Cliente nao encontrado' },
        { status: 404 }
      )
    }

    const plano = await getPlano(planoId || cliente.plano_id)
    const valor = Number(String(body.valor || plano?.preco || cliente.planos?.preco || '').replace(',', '.'))
    const dataVencimento = sanitizeDate(body.data_vencimento)
    const metodo = asaasBillingType(body.metodo_pagamento || 'PIX')

    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Valor precisa ser maior que zero' },
        { status: 400 }
      )
    }

    const asaasCustomerId = await ensureAsaasCustomer(cliente)
    const lateFees = asaasLateFeeConfig()
    const localPayment = await createLocalPayment({
      cliente,
      plano,
      valor,
      dataVencimento,
      metodo: metodo === 'BOLETO' ? 'Boleto' : metodo === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'PIX',
      observacao: action === 'create_subscription'
        ? 'Assinatura recorrente criada via Asaas.'
        : 'Cobranca criada via Asaas.',
    })

    if (action === 'create_subscription') {
      const subscription = await createAsaasSubscription({
        customer: asaasCustomerId,
        billingType: metodo,
        value: valor,
        nextDueDate: dataVencimento,
        cycle: asaasCycleFromPlano(plano?.ciclo_cobranca || cliente.planos?.ciclo_cobranca || 'mensal'),
        description: `NexaWi Ads - ${plano?.nome || cliente.planos?.nome || 'Plano SaaS'}`,
        externalReference: externalPaymentReference(localPayment.id),
        ...lateFees,
      })

      const updated = await updateLocalSubscriptionPlaceholder(localPayment.id, subscription)

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'pagamentos',
        entityId: updated.id,
        description: 'Criou assinatura recorrente no Asaas',
        metadata: {
          cliente_id: cliente.id,
          plano_id: plano?.id || null,
          valor,
          gateway: 'asaas',
          asaas_subscription_id: subscription.id,
        },
      })

      return NextResponse.json({
        ok: true,
        tipo: 'subscription',
        pagamento: updated,
        asaas: subscription,
        message: 'Assinatura recorrente criada no Asaas',
      })
    }

    const payment = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: metodo,
      value: valor,
      dueDate: dataVencimento,
      description: `NexaWi Ads - ${plano?.nome || cliente.planos?.nome || 'Cobranca'}`,
      externalReference: externalPaymentReference(localPayment.id),
      ...lateFees,
    })

    const updated = await updateLocalPaymentFromAsaas(localPayment.id, payment)

    await logAdminAction({
      request,
      adminUser: auth.user,
      action: 'create',
      entity: 'pagamentos',
      entityId: updated.id,
      description: 'Criou cobranca no Asaas',
      metadata: {
        cliente_id: cliente.id,
        plano_id: plano?.id || null,
        valor,
        gateway: 'asaas',
        asaas_payment_id: payment.id,
      },
    })

    return NextResponse.json({
      ok: true,
      tipo: 'payment',
      pagamento: updated,
      asaas: payment,
      message: 'Cobranca criada no Asaas',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao integrar com Asaas',
        details: error.details || null,
      },
      { status: error.status || 500 }
    )
  }
}
