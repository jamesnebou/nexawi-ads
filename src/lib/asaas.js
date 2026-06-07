const ASAAS_STATUS_TO_NEXAWI = {
  RECEIVED: 'Pago',
  CONFIRMED: 'Pago',
  RECEIVED_IN_CASH: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
  REFUNDED: 'Estornado',
  REFUND_REQUESTED: 'Estornado',
  CHARGEBACK_REQUESTED: 'Em negociação',
  CHARGEBACK_DISPUTE: 'Em negociação',
  AWAITING_CHARGEBACK_REVERSAL: 'Em negociação',
  DUNNING_REQUESTED: 'Em negociação',
  DUNNING_RECEIVED: 'Pago',
  DELETED: 'Cancelado',
}

const PAYMENT_EVENTS = new Set([
  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_RECEIVED_IN_CASH',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_DUNNING_REQUESTED',
  'PAYMENT_DUNNING_RECEIVED',
])

const SUBSCRIPTION_EVENTS = new Set([
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_DELETED',
])

export function getAsaasConfig() {
  const apiKey = String(process.env.ASAAS_API_KEY || '').replace(/^\\\$/, '$')
  const environment = String(process.env.ASAAS_ENV || 'sandbox').toLowerCase()
  const baseUrl = (
    process.env.ASAAS_BASE_URL ||
    (environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3')
  ).replace(/\/$/, '')

  return {
    apiKey,
    environment,
    baseUrl,
    enabled: Boolean(apiKey),
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN || '',
  }
}

export function isAsaasPaymentEvent(event = '') {
  return PAYMENT_EVENTS.has(String(event || '').toUpperCase())
}

export function isAsaasSubscriptionEvent(event = '') {
  return SUBSCRIPTION_EVENTS.has(String(event || '').toUpperCase())
}

export function normalizeAsaasStatus(status = '') {
  return ASAAS_STATUS_TO_NEXAWI[String(status || '').toUpperCase()] || 'Pendente'
}

export function asaasCycleFromPlano(ciclo = 'mensal') {
  const cycles = {
    diario: 'WEEKLY',
    semanal: 'WEEKLY',
    mensal: 'MONTHLY',
    trimestral: 'QUARTERLY',
    semestral: 'SEMIANNUALLY',
    anual: 'YEARLY',
  }

  return cycles[String(ciclo || '').toLowerCase()] || 'MONTHLY'
}

export function asaasBillingType(metodo = 'PIX') {
  const value = String(metodo || '').toUpperCase()

  if (value.includes('BOLETO')) return 'BOLETO'
  if (value.includes('CART')) return 'CREDIT_CARD'
  if (value.includes('CREDIT')) return 'CREDIT_CARD'
  if (value.includes('UNDEFINED')) return 'UNDEFINED'
  return 'PIX'
}

export function extractNexawiPaymentId(externalReference = '') {
  const match = String(externalReference || '').match(/pagamento:([0-9a-f-]{20,})/i)
  return match?.[1] || ''
}

export async function asaasRequest(path, { method = 'GET', body, searchParams } = {}) {
  const config = getAsaasConfig()

  if (!config.apiKey) {
    const error = new Error('ASAAS_API_KEY nao configurada.')
    error.status = 503
    throw error
  }

  const url = new URL(`${config.baseUrl}${path}`)

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: config.apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const details = Array.isArray(data?.errors)
      ? data.errors.map((item) => item.description || item.message).filter(Boolean).join(' | ')
      : data?.message || data?.error || ''

    const error = new Error(details || `Erro Asaas ${response.status}`)
    error.status = response.status
    error.details = data
    throw error
  }

  return data
}

export async function findAsaasCustomerByExternalReference(externalReference) {
  if (!externalReference) return null

  const data = await asaasRequest('/customers', {
    searchParams: {
      externalReference,
      limit: 1,
    },
  })

  return data?.data?.[0] || null
}

export async function createAsaasCustomer(payload) {
  return asaasRequest('/customers', {
    method: 'POST',
    body: payload,
  })
}

export async function updateAsaasCustomer(customerId, payload) {
  return asaasRequest(`/customers/${customerId}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function createAsaasPayment(payload) {
  return asaasRequest('/payments', {
    method: 'POST',
    body: payload,
  })
}

export async function createAsaasSubscription(payload) {
  return asaasRequest('/subscriptions', {
    method: 'POST',
    body: payload,
  })
}
