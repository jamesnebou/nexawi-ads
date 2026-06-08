import { readFileSync } from 'node:fs'
import { request as httpsRequest, Agent } from 'node:https'
import { Buffer } from 'node:buffer'

let cachedToken = null
let cachedAgent = null
let cachedCertKey = ''

function cleanEnv(value = '') {
  return String(value || '').trim()
}

function getEfiBaseUrl(environment) {
  if (process.env.EFI_BASE_URL) return process.env.EFI_BASE_URL.replace(/\/$/, '')
  return environment === 'production'
    ? 'https://pix.api.efipay.com.br'
    : 'https://pix-h.api.efipay.com.br'
}

export function getEfiPixConfig() {
  const environment = cleanEnv(process.env.EFI_ENV || 'sandbox').toLowerCase()
  const clientId = cleanEnv(process.env.EFI_CLIENT_ID)
  const clientSecret = cleanEnv(process.env.EFI_CLIENT_SECRET)
  const pixKey = cleanEnv(process.env.EFI_PIX_KEY)
  const certBase64 = cleanEnv(process.env.EFI_CERT_BASE64)
  const certPath = cleanEnv(process.env.EFI_CERT_PATH)
  const certPassphrase = process.env.EFI_CERT_PASSPHRASE || process.env.EFI_CERT_PASSWORD || undefined

  return {
    environment,
    clientId,
    clientSecret,
    pixKey,
    certBase64,
    certPath,
    certPassphrase,
    baseUrl: getEfiBaseUrl(environment),
    webhookUrl: cleanEnv(process.env.EFI_PIX_WEBHOOK_URL),
    enabled: Boolean(clientId && clientSecret && pixKey && (certBase64 || certPath)),
  }
}

function readCertificate(config) {
  if (config.certBase64) return Buffer.from(config.certBase64.replace(/\s/g, ''), 'base64')
  if (config.certPath) return readFileSync(config.certPath)
  throw new Error('Certificado Efi nao configurado. Use EFI_CERT_BASE64 ou EFI_CERT_PATH.')
}

function getEfiAgent(config) {
  const certKey = `${config.certBase64 ? 'base64' : config.certPath}:${config.certBase64?.length || 0}`
  if (cachedAgent && cachedCertKey === certKey) return cachedAgent

  cachedAgent = new Agent({
    pfx: readCertificate(config),
    passphrase: config.certPassphrase,
    keepAlive: true,
  })
  cachedCertKey = certKey
  return cachedAgent
}

function parseJson(text = '') {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return { raw: text }
  }
}

function efiErrorMessage(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.mensagem) return data.mensagem
  if (data.message) return data.message
  if (data.nome && data.detalhe) return `${data.nome}: ${data.detalhe}`
  if (data.error_description) return data.error_description
  if (data.error) return data.error
  if (Array.isArray(data.violacoes)) {
    return data.violacoes
      .map((item) => [item.razao, item.propriedade].filter(Boolean).join(' em '))
      .filter(Boolean)
      .join(' | ') || fallback
  }
  return fallback
}

export async function efiPixRequest(path, { method = 'GET', body, token, basicAuth } = {}) {
  const config = getEfiPixConfig()

  if (!config.clientId || !config.clientSecret) {
    throw new Error('EFI_CLIENT_ID ou EFI_CLIENT_SECRET nao configurado.')
  }

  const url = new URL(`${config.baseUrl}${path}`)
  const payload = body ? JSON.stringify(body) : ''
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Encoding': 'identity',
  }

  if (payload) headers['Content-Length'] = Buffer.byteLength(payload)
  if (basicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
  } else if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method,
        agent: getEfiAgent(config),
        headers,
        timeout: 15000,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          const data = parseJson(text)

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(efiErrorMessage(data, `Erro Efi ${res.statusCode}`))
            error.status = res.statusCode
            error.details = data
            reject(error)
            return
          }

          resolve(data || {})
        })
      }
    )

    req.on('timeout', () => req.destroy(new Error('Timeout ao conectar na Efi.')))
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

export async function getEfiPixAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) return cachedToken.accessToken

  const data = await efiPixRequest('/oauth/token', {
    method: 'POST',
    basicAuth: true,
    body: { grant_type: 'client_credentials' },
  })

  if (!data?.access_token) throw new Error('Efi nao retornou access_token.')

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 300) * 1000,
  }

  return cachedToken.accessToken
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

export function createWifiPixTxid(vendaId = '') {
  const hex = String(vendaId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
  const txid = `NXW${hex}`.slice(0, 35)
  if (txid.length >= 26) return txid.toUpperCase()
  return `NXW${Date.now()}${Math.random().toString(36).slice(2, 14)}`.slice(0, 35).toUpperCase()
}

function buildDevedor({ documento, nome }) {
  const doc = String(documento || '').replace(/\D/g, '')
  const nomeLimpo = String(nome || 'Cliente Wi-Fi').trim().slice(0, 200)
  if (doc.length === 11) return { cpf: doc, nome: nomeLimpo }
  if (doc.length === 14) return { cnpj: doc, nome: nomeLimpo }
  return null
}

export async function createEfiPixCharge({ venda, hotspot, plano, documento, nome }) {
  const config = getEfiPixConfig()
  if (!config.enabled) {
    throw new Error('Credenciais Efi incompletas. Confira EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_PIX_KEY e certificado.')
  }

  const token = await getEfiPixAccessToken()
  const txid = createWifiPixTxid(venda.id)
  const devedor = buildDevedor({ documento, nome })
  const body = {
    calendario: { expiracao: 900 },
    valor: { original: formatMoney(venda.valor || plano.valor) },
    chave: config.pixKey,
    solicitacaoPagador: `Wi-Fi ${hotspot?.nome || 'NexaWi'} - ${plano?.nome || 'Plano'}`.slice(0, 140),
    infoAdicionais: [
      { nome: 'vendaId', valor: String(venda.id).slice(0, 72) },
      { nome: 'hotspot', valor: String(hotspot?.slug || hotspot?.nome || '').slice(0, 72) },
    ],
  }

  if (devedor) body.devedor = devedor

  const charge = await efiPixRequest(`/v2/cob/${txid}`, { method: 'PUT', token, body })
  let qrcode = null
  const locId = charge?.loc?.id

  if (locId) {
    try {
      qrcode = await efiPixRequest(`/v2/loc/${locId}/qrcode`, { token })
    } catch (error) {
      qrcode = { error: error.message || 'Nao foi possivel gerar QR Code visual.' }
    }
  }

  return {
    txid,
    charge,
    qrcode,
    locId: locId || null,
    pixCopyPaste: qrcode?.qrcode || charge?.pixCopiaECola || charge?.pixCopyPaste || '',
    pixQrCode: qrcode?.imagemQrcode || '',
    invoiceUrl: qrcode?.linkVisualizacao || charge?.location || '',
  }
}

export async function getEfiPixCharge(txid) {
  if (!txid) throw new Error('txid Efi e obrigatorio.')
  const token = await getEfiPixAccessToken()
  return efiPixRequest(`/v2/cob/${encodeURIComponent(txid)}`, { token })
}

export function isEfiPixPaidStatus(status = '') {
  return String(status || '').toUpperCase() === 'CONCLUIDA'
}
