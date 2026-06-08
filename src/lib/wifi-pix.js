import {
  createAsaasCustomer,
  createAsaasPayment,
  findAsaasCustomerByExternalReference,
  updateAsaasCustomer,
} from '@/lib/asaas'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createEfiPixCharge, getEfiPixCharge, isEfiPixPaidStatus } from '@/lib/efi-pix'

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

function getWifiPixGateway() {
  return String(process.env.WIFI_PIX_GATEWAY || 'asaas').trim().toLowerCase()
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
    recomendado: Boolean(plano.recomendado),
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
    .select('id, nome, descricao, valor, duracao_minutos, velocidade_download, velocidade_upload, ordem, recomendado')
    .eq('hotspot_id', hotspotId)
    .eq('ativo', true)
    .order('recomendado', { ascending: false })
    .order('ordem', { ascending: true })
    .order('valor', { ascending: true })

  if (error) {
    const message = String(error.message || '')
    const missingRecommended = /recomendado/i.test(message) && (/schema cache/i.test(message) || /column/i.test(message))

    if (missingRecommended) {
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('wifi_pix_planos')
        .select('id, nome, descricao, valor, duracao_minutos, velocidade_download, velocidade_upload, ordem')
        .eq('hotspot_id', hotspotId)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('valor', { ascending: true })

      if (fallbackError) return []

      return (fallbackData || []).map((plano) => ({ ...plano, recomendado: false }))
    }

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

  if (billingType === 'PIX' && getWifiPixGateway() === 'efi') {
    const efi = await createEfiPixCharge({
      venda,
      hotspot,
      plano,
      documento,
      nome: vendaPayload.nome || `Cliente Wi-Fi ${telefoneLimpo}`,
    })

    const efiPayload = {
      provider: 'efi',
      txid: efi.txid,
      locId: efi.locId,
      charge: efi.charge,
      qrcode: efi.qrcode,
    }

    const { data: updatedVenda, error: updateError } = await supabaseAdmin
      .from('wifi_pix_vendas')
      .update({
        asaas_payment_id: efi.txid,
        asaas_invoice_url: efi.invoiceUrl || null,
        asaas_payload: efiPayload,
        external_reference: externalReference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venda.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    await persistEfiVendaFields(updatedVenda.id, {
      gateway_pagamento: 'efi',
      efi_txid: efi.txid,
      efi_location_id: efi.locId ? String(efi.locId) : null,
      efi_payload: efiPayload,
    })

    return {
      venda: { ...updatedVenda, gateway_pagamento: 'efi', efi_txid: efi.txid },
      payment: efi.charge,
      checkout: {
        vendaId: updatedVenda.id,
        status: updatedVenda.status,
        metodoPagamento: billingType,
        invoiceUrl: efi.invoiceUrl || '',
        bankSlipUrl: '',
        pixQrCode: efi.pixQrCode || '',
        pixCopyPaste: efi.pixCopyPaste || '',
      },
    }
  }

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
async function persistEfiVendaFields(vendaId, update = {}) {
  if (!vendaId) return null

  const { data, error } = await supabaseAdmin
    .from('wifi_pix_vendas')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', vendaId)
    .select('*')
    .maybeSingle()

  if (error) {
    const message = String(error.message || '')
    const missingColumn = /schema cache|column|efi_|gateway_pagamento/i.test(message)
    if (missingColumn) return null
    throw error
  }

  return data
}

export async function markWifiPixEfiPaymentStatus({ txid = '', endToEndId = '', payload = {} } = {}) {
  const cleanTxid = String(txid || '').trim()
  const cleanEndToEndId = String(endToEndId || '').trim()

  if (!cleanTxid && !cleanEndToEndId) return { matched: false, reason: 'missing_efi_identifiers' }

  let query = supabaseAdmin.from('wifi_pix_vendas').select('*')

  if (cleanTxid) {
    query = query.or(`asaas_payment_id.eq.${cleanTxid},efi_txid.eq.${cleanTxid}`)
  } else {
    query = query.eq('efi_end_to_end_id', cleanEndToEndId)
  }

  let venda = null
  const { data, error } = await query.maybeSingle()

  if (error) {
    const message = String(error.message || '')
    const missingColumn = /efi_|schema cache|column/i.test(message)
    if (!missingColumn) throw error

    const fallback = await supabaseAdmin
      .from('wifi_pix_vendas')
      .select('*')
      .eq('asaas_payment_id', cleanTxid)
      .maybeSingle()

    if (fallback.error) throw fallback.error
    venda = fallback.data
  } else {
    venda = data
  }

  if (!venda?.id) return { matched: false, reason: 'wifi_pix_venda_not_found', txid: cleanTxid, endToEndId: cleanEndToEndId }

  const now = new Date()
  const efiPayload = {
    ...(venda.asaas_payload || {}),
    provider: 'efi',
    webhook: payload || {},
    paidAt: now.toISOString(),
  }
  const update = {
    asaas_payment_id: cleanTxid || venda.asaas_payment_id || null,
    asaas_payload: efiPayload,
    status: ['autorizado', 'pago'].includes(venda.status) ? venda.status : 'pago',
    pago_em: venda.pago_em || now.toISOString(),
    expira_em: venda.expira_em || addMinutes(now, venda.duracao_minutos).toISOString(),
    updated_at: now.toISOString(),
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('wifi_pix_vendas')
    .update(update)
    .eq('id', venda.id)
    .select('*')
    .single()

  if (updateError) throw updateError

  await persistEfiVendaFields(updated.id, {
    gateway_pagamento: 'efi',
    efi_txid: cleanTxid || updated.asaas_payment_id || null,
    efi_end_to_end_id: cleanEndToEndId || null,
    efi_payload: efiPayload,
  })

  return {
    matched: true,
    venda: updated,
    paid: true,
    txid: cleanTxid || updated.asaas_payment_id || null,
    endToEndId: cleanEndToEndId || null,
  }
}

export async function refreshWifiPixEfiPaymentStatus(venda = {}) {
  const txid = venda.efi_txid || venda.asaas_payment_id || venda.asaas_payload?.txid || ''
  const provider = venda.gateway_pagamento || venda.asaas_payload?.provider || ''

  if (!txid || String(provider).toLowerCase() !== 'efi') {
    return { venda, refreshed: false, paid: ['pago', 'autorizado'].includes(venda.status) }
  }

  const charge = await getEfiPixCharge(txid)
  const paid = isEfiPixPaidStatus(charge?.status)

  if (!paid) {
    await persistEfiVendaFields(venda.id, {
      gateway_pagamento: 'efi',
      efi_txid: txid,
      efi_payload: {
        ...(venda.asaas_payload || {}),
        provider: 'efi',
        charge,
      },
    })

    return { venda, refreshed: true, paid: false, charge }
  }

  const result = await markWifiPixEfiPaymentStatus({
    txid,
    payload: { charge },
  })

  return { venda: result.venda || venda, refreshed: true, paid: Boolean(result.paid), charge }
}

