console.log('=== ARQUIVO NOVO DO RADIUS CARREGADO ===')
console.log('CWD:', process.cwd())
console.log('INICIANDO RADIUS...')

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dgram from 'node:dgram'
import dotenv from 'dotenv'
import radius from 'radius'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../../..')

// Lê EXPLICITAMENTE o .env da raiz do projeto
dotenv.config({ path: path.join(projectRoot, '.env') })

console.log('ENV PATH:', path.join(projectRoot, '.env'))
console.log(
  'RADIUS_SECRET:',
  process.env.RADIUS_SECRET
    ? `configurado, len=${process.env.RADIUS_SECRET.length}`
    : 'VAZIO'
)

const RADIUS_PORT = Number(process.env.RADIUS_PORT || 1812)
const RADIUS_SECRET = String(process.env.RADIUS_SECRET || '').trim()
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim()
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const RADIUS_ALLOWED_CLIENTS = String(process.env.RADIUS_ALLOWED_CLIENTS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const RADIUS_MAX_PACKET_BYTES = Number(process.env.RADIUS_MAX_PACKET_BYTES || 4096)
const RADIUS_RATE_LIMIT_PER_MINUTE = Number(process.env.RADIUS_RATE_LIMIT_PER_MINUTE || 120)
const radiusRateBuckets = new Map()

if (!RADIUS_SECRET) {
  throw new Error('RADIUS_SECRET não definido no .env')
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env')
}

console.log(`RADIUS rodando com secret configurado (len=${RADIUS_SECRET.length})`)
console.log(
  'RADIUS allowed clients:',
  RADIUS_ALLOWED_CLIENTS.length ? RADIUS_ALLOWED_CLIENTS.join(', ') : 'qualquer origem UDP'
)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const server = dgram.createSocket('udp4')

function normalizeMac(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function sendRadiusResponse(packet, code, rinfo, extraAttributes = []) {
  const response = radius.encode_response({
    packet,
    code,
    secret: RADIUS_SECRET,
    attributes: extraAttributes,
  })

  server.send(response, 0, response.length, rinfo.port, rinfo.address)
}

function isAllowedRadiusClient(address = '') {
  if (RADIUS_ALLOWED_CLIENTS.length === 0) return true
  return RADIUS_ALLOWED_CLIENTS.includes(address)
}

function isRateLimited(address = '') {
  const now = Date.now()
  const key = address || 'unknown'
  const current = radiusRateBuckets.get(key)

  if (!current || current.resetAt <= now) {
    radiusRateBuckets.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }

  current.count += 1
  radiusRateBuckets.set(key, current)

  return current.count > RADIUS_RATE_LIMIT_PER_MINUTE
}

server.on('message', async (msg, rinfo) => {
  let packet

  try {
    if (!isAllowedRadiusClient(rinfo.address)) {
      console.warn(`Pacote RADIUS ignorado: origem nao autorizada ${rinfo.address}`)
      return
    }

    if (isRateLimited(rinfo.address)) {
      console.warn(`Pacote RADIUS ignorado: rate limit excedido para ${rinfo.address}`)
      return
    }

    if (msg.length > RADIUS_MAX_PACKET_BYTES) {
      console.warn(`Pacote RADIUS ignorado: tamanho invalido ${msg.length} bytes`)
      return
    }

    packet = radius.decode({
      packet: msg,
      secret: RADIUS_SECRET,
    })
  } catch (error) {
    console.error('Erro ao decodificar pacote RADIUS:', error)
    return
  }

  if (packet.code !== 'Access-Request') {
    console.log(`Pacote ignorado: ${packet.code}`)
    return
  }

  const radiusUsername = String(packet.attributes['User-Name'] || '').trim()
  const radiusPassword = String(packet.attributes['User-Password'] || '').trim()
  const incomingMac = normalizeMac(packet.attributes['Calling-Station-Id'] || '')
  const nasIp = String(packet.attributes['NAS-IP-Address'] || '').trim()
  const calledStationId = String(packet.attributes['Called-Station-Id'] || '').trim()
  const nasIdentifier = String(packet.attributes['NAS-Identifier'] || '').trim()

  console.log('--- Access-Request ---')
  console.log('Origem:', `${rinfo.address}:${rinfo.port}`)
  console.log('radius_username:', radiusUsername || '[vazio]')
  console.log('radius_password:', radiusPassword ? '[recebido]' : '[vazio]')
  console.log('MAC:', incomingMac || '[não enviado]')
  console.log('NAS-IP:', nasIp || '[não enviado]')
  console.log('Called-Station-Id:', calledStationId || '[não enviado]')
  console.log('NAS-Identifier:', nasIdentifier || '[não enviado]')

  if (!radiusUsername || !radiusPassword) {
    console.log('Access-Reject: credenciais vazias')
    sendRadiusResponse(packet, 'Access-Reject', rinfo, [
      ['Reply-Message', 'Credenciais inválidas'],
    ])
    return
  }

  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('radius_username', radiusUsername)
      .eq('radius_password', radiusPassword)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Erro no Supabase:', error)
      sendRadiusResponse(packet, 'Access-Reject', rinfo, [
        ['Reply-Message', 'Erro interno'],
      ])
      return
    }

    if (!lead) {
      console.log('Access-Reject: credencial não encontrada')
      sendRadiusResponse(packet, 'Access-Reject', rinfo, [
        ['Reply-Message', 'Credencial não encontrada'],
      ])
      return
    }

    const leadMac = normalizeMac(lead.mac_address || '')

    if (leadMac && incomingMac && leadMac !== incomingMac) {
      console.log(`Access-Reject: MAC divergente. Esperado ${leadMac}, recebido ${incomingMac}`)
      sendRadiusResponse(packet, 'Access-Reject', rinfo, [
        ['Reply-Message', 'Dispositivo não autorizado'],
      ])
      return
    }

    const updatePayload = {
      mac_address: leadMac || incomingMac || null,
      radius_used: true,
      radius_last_auth_at: new Date().toISOString(),
      radius_last_nas_ip: nasIp || null,
      radius_last_called_station_id: calledStationId || null,
      radius_last_nas_identifier: nasIdentifier || null,
    }

    await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead.id)

    console.log('Access-Accept: acesso liberado para', radiusUsername)

    sendRadiusResponse(packet, 'Access-Accept', rinfo, [
      ['Reply-Message', 'Acesso liberado'],
      ['Session-Timeout', 1200],
      ['Idle-Timeout', 300],
    ])
  } catch (error) {
    console.error('Erro inesperado no RADIUS:', error)
    sendRadiusResponse(packet, 'Access-Reject', rinfo, [
      ['Reply-Message', 'Erro interno'],
    ])
  }
})

server.on('listening', () => {
  const address = server.address()
  console.log(`RADIUS rodando em UDP ${address.address}:${address.port}`)
})

server.on('error', (error) => {
  console.error('Erro no servidor RADIUS:', error)
})

server.bind(RADIUS_PORT, '0.0.0.0')
