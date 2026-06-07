import {
  createAsaasCustomer,
  createAsaasPayment,
  findAsaasCustomerByExternalReference,
  updateAsaasCustomer,
} from '@/lib/asaas'
import { supabaseAdmin } from '@/lib/supabase-admin'

export function cleanPhone(value = '') {
  return String(value || '').replace(/\D/g, '')
}

export function cleanCpfCnpj(value = '') {
  return String(value || '').replace(/\D/g, '')
}

export function normalizeMacAddress(value = '') {
  const raw = String(value || '').trim().toUpperCase()
  const hex = raw.replace(/[^0-9A-F]/g, '')

  if (hex.length !== 12) return ''

  return hex.match(/.{1,2}/g).join(':')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + Number(minutes || 0) * 60 * 1000)
}

export function wifiPixExternalReference(vendaId) {
  return `wifi_pix:${vendaId}`
}

export function extractWifiPixVendaId(externalReference = '') {
  const match = String(externalReference || '').match(/wifi_pix:([0-9a-f-]{20,})/i)
  return match?.[1] || ''
}

export function publicWifiPixPlano(plano = {}) {
  return {
    id: plano.id,
    nome: plano.nome,
    descricao: plano.descricao || '',
    valor: Number(plano.valor || 0),
    duracao_minutos: Number(plano.duracao_minutos || 0),
    velocidade_download: plano.velocidade_download || '15M',
    velocidade_upload: plano.velocidade_upload || '15M',
  }
}

export function normalizeWifiPixBillingType(value = '') {
  const method = String(value || '').trim().toUpperCase()

  if (method === 'CREDIT_CARD' || method.includes('CART')) return 'CREDIT_CARD'

  return 'PIX'
}

export async function getWifiPixPlanosForHotspot(hotspotId) {
  if (!hotspotId) return []

  const { data, error } = await supabaseAdmin
    .from('wifi_pix_planos')
    .select('id, nome, descricao, valor, duracao_minutos, velocidade_download, velocidade_upload, ordem')
    .eq('hotspot_id', hotspotId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('valor', { ascending: true })

  if (error) {
    const message = String(error.message || '')
    if (message.includes('wifi_pix_planos') || message.includes('schema cache')) return []
    throw error
  }

  return data || []
}

export async function createWifiPixCheckout({
  hotspot,
  plano,
  telefone,
  nome = '',
  cpfCnpj = '',
  macAddress = '',
  ipAddress = '',
  metodoPagamento = 'PIX',
}) {
  const telefoneLimpo = cleanPhone(telefone)
  const documento = cleanCpfCnpj(cpfCnpj)
  const mac = normalizeMacAddress(macAddress)
  const billingType = normalizeWifiPixBillingType(metodoPagamento)

  if (!hotspot?.id) throw new Error('Hotspot invalido para Wi-Fi no Pix.')
  if (!plano?.id) throw new Error('Plano Wi-Fi no Pix invalido.')
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
    throw new Error('Informe um celular valido com DDD.')
  }
  if (![11, 14].includes(documento.length)) {
    throw new Error('Informe CPF ou CNPJ valido para gerar o pagamento.')
  }

  const vendaPayload = {
    hotspot_id: hotspot.id,
    plano_id: plano.id,
    empresa_id: hotspot.empresa_id || plano.empresa_id || null,
    cliente_id: hotspot.cliente_id || plano.cliente_id || null,
    telefone: telefoneLimpo,
    cpf_cnpj: documento,
    nome: String(nome || '').trim() || null,
    mac_address: mac || null,
    ip_address: String(ipAddress || '').trim() || null,
    metodo_pagamento: billingType,
    valor: Number(plano.valor || 0),
    duracao_minutos: Number(plano.duracao_minutos || 0),
    velocidade_download: plano.velocidade_download || '15M',
    velocidade_upload: plano.velocidade_upload || '15M',
    status: 'pendente',
  }

  const { data: venda, error: vendaError } = await supabaseAdmin
    .from('wifi_pix_vendas')
    .insert([vendaPayload])
    .select('*')
    .single()

  if (vendaError) throw vendaError

  const externalReference = wifiPixExternalReference(venda.id)
  const customerExternalReference = `wifi_pix_cliente:${documento || telefoneLimpo}`
  let customer = await findAsaasCustomerByExternalReference(customerExternalReference)

  if (!customer) {
    customer = await createAsaasCustomer({
      name: vendaPayload.nome || `Cliente Wi-Fi ${telefoneLimpo}`,
      cpfCnpj: documento,
      mobilePhone: telefoneLimpo,
      externalReference: customerExternalReference,
      notificationDisabled: true,
    })
  } else if (!customer.cpfCnpj && documento) {
    customer = await updateAsaasCustomer(customer.id, {
      name: vendaPayload.nome || customer.name || `Cliente Wi-Fi ${telefoneLimpo}`,
      cpfCnpj: documento,
      mobilePhone: telefoneLimpo,
      externalReference: customerExternalReference,
      notificationDisabled: true,
    })
  }

  const payment = await createAsaasPayment({
    customer: customer.id,
    billingType: billingType === 'CREDIT_CARD' ? 'UNDEFINED' : 'PIX',
    value: vendaPayload.valor,
    dueDate: todayISO(),
    description: `Wi-Fi ${hotspot.nome || ''} - ${plano.nome}`,
    externalReference,
  })

  const { data: updatedVenda, error: updateError } = await supabaseAdmin
    .from('wifi_pix_vendas')
    .update({
      asaas_customer_id: customer.id || null,
      asaas_payment_id: payment.id || null,
      asaas_invoice_url: payment.invoiceUrl || null,
      asaas_payload: payment || {},
      external_reference: externalReference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', venda.id)
    .select('*')
    .single()

  if (updateError) throw updateError

  return {
    venda: updatedVenda,
    payment,
    checkout: {
      vendaId: updatedVenda.id,
      status: updatedVenda.status,
      metodoPagamento: billingType,
      invoiceUrl: payment.invoiceUrl || '',
      bankSlipUrl: payment.bankSlipUrl || '',
      pixQrCode: payment.encodedImage || payment.pixQrCode || '',
      pixCopyPaste: payment.payload || payment.pixCopyPaste || '',
    },
  }
}

export async function markWifiPixPaymentStatus(payment = {}) {
  const vendaId = extractWifiPixVendaId(payment.externalReference)

  if (!vendaId && !payment.id) return { matched: false, reason: 'not_wifi_pix' }

  let query = supabaseAdmin.from('wifi_pix_vendas').select('*')

  if (vendaId) {
    query = query.eq('id', vendaId)
  } else {
    query = query.eq('asaas_payment_id', payment.id)
  }

  const { data: venda, error } = await query.maybeSingle()

  if (error) throw error
  if (!venda?.id) return { matched: false, reason: 'wifi_pix_venda_not_found' }

  const statusAsaas = String(payment.status || '').toUpperCase()
  const paid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(statusAsaas)
  const cancelled = ['DELETED', 'REFUNDED'].includes(statusAsaas)
  const now = new Date()

  const update = {
    asaas_payment_id: payment.id || venda.asaas_payment_id || null,
    asaas_invoice_url: payment.invoiceUrl || venda.asaas_invoice_url || null,
    asaas_payload: payment || {},
    updated_at: now.toISOString(),
  }

  if (paid && !['autorizado', 'pago'].includes(venda.status)) {
    update.status = 'pago'
    update.pago_em = now.toISOString()
    update.expira_em = addMinutes(now, venda.duracao_minutos).toISOString()
  } else if (cancelled) {
    update.status = 'cancelado'
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('wifi_pix_vendas')
    .update(update)
    .eq('id', venda.id)
    .select('*')
    .single()

  if (updateError) throw updateError

  return {
    matched: true,
    venda: updated,
    paid,
    cancelled,
  }
}
