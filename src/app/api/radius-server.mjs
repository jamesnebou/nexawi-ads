import 'dotenv/config'
import dgram from 'node:dgram'
import radius from 'radius'
import { createClient } from '@supabase/supabase-js'

const RADIUS_PORT = Number(process.env.RADIUS_PORT || 1812)
const RADIUS_SECRET = process.env.RADIUS_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!RADIUS_SECRET) {
  throw new Error('RADIUS_SECRET não definido no .env')
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const server = dgram.createSocket('udp4')

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
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

server.on('message', async (msg, rinfo) => {
  let packet

  try {
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

  const rawUsername = packet.attributes['User-Name']
  const rawPassword = packet.attributes['User-Password']
  const callingStationId = packet.attributes['Calling-Station-Id'] || ''
  const nasIp = packet.attributes['NAS-IP-Address'] || ''
  const calledStationId = packet.attributes['Called-Station-Id'] || ''
  const nasIdentifier = packet.attributes['NAS-Identifier'] || ''

  const telefone = onlyDigits(rawUsername)
  const cpf = onlyDigits(rawPassword)
  const mac = String(callingStationId || '').trim()

  console.log('--- Access-Request ---')
  console.log('Origem:', `${rinfo.address}:${rinfo.port}`)
  console.log('Telefone:', telefone)
  console.log('CPF:', cpf ? '[recebido]' : '[vazio]')
  console.log('MAC:', mac || '[não enviado]')
  console.log('NAS-IP:', nasIp || '[não enviado]')
  console.log('Called-Station-Id:', calledStationId || '[não enviado]')
  console.log('NAS-Identifier:', nasIdentifier || '[não enviado]')

  if (!telefone || !cpf) {
    console.log('Access-Reject: telefone ou CPF ausentes')
    sendRadiusResponse(packet, 'Access-Reject', rinfo, [
      ['Reply-Message', 'Credenciais inválidas'],
    ])
    return
  }

  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', telefone)
      .eq('cpf', cpf)
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
      console.log('Access-Reject: lead não encontrado')
      sendRadiusResponse(packet, 'Access-Reject', rinfo, [
        ['Reply-Message', 'Usuário não encontrado'],
      ])
      return
    }

    // Atualiza dados úteis do lead
    const updatePayload = {
      mac_address: mac || lead.mac_address || null,
      radius_last_nas_ip: nasIp || null,
      radius_last_called_station_id: calledStationId || null,
      radius_last_nas_identifier: nasIdentifier || null,
      radius_last_auth_at: new Date().toISOString(),
    }

    await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead.id)

    console.log('Access-Accept: acesso liberado para', telefone)

    sendRadiusResponse(packet, 'Access-Accept', rinfo, [
      ['Reply-Message', 'Acesso liberado'],
      ['Session-Timeout', 1200], // 20 minutos
      ['Idle-Timeout', 300],     // 5 minutos sem uso
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