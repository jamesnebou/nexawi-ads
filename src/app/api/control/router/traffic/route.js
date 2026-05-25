import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function normalizeRouterBaseUrl(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
  return withProtocol.replace(/\/$/, '')
}

function getRouterConfig(routerConfig = {}) {
  const baseUrl = normalizeRouterBaseUrl(
    routerConfig.baseUrl ||
    routerConfig.base_url ||
    process.env.ROUTEROS_BASE_URL ||
    ''
  )

  const username =
    routerConfig.username ||
    process.env.ROUTEROS_USERNAME ||
    ''

  const password =
    routerConfig.password ||
    process.env.ROUTEROS_PASSWORD ||
    ''

  if (!baseUrl) throw new Error('Base URL do MikroTik não configurada')
  if (!username) throw new Error('Usuário do MikroTik não configurado')
  if (!password) throw new Error('Senha do MikroTik não configurada')

  return { baseUrl, username, password }
}

function assertControlSecret(request) {
  const expected =
    process.env.NEXAWI_CONTROL_SECRET ||
    process.env.NEXAWI_CRON_SECRET ||
    ''

  const received =
    request.headers.get('x-control-secret') ||
    request.headers.get('x-cron-secret') ||
    ''

  if (!expected || received !== expected) {
    throw new Error('Acesso não autorizado à Control API')
  }
}

async function routerosFetch(path, { method = 'GET', body, routerConfig } = {}) {
  const { baseUrl, username, password } = getRouterConfig(routerConfig)

  const response = await fetch(`${baseUrl}/rest${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text || null
  }

  if (!response.ok) {
    throw new Error(`RouterOS REST ${method} ${path} falhou: ${response.status} ${response.statusText} | ${JSON.stringify(data)}`)
  }

  return data
}

function toNumber(value) {
  const n = Number(String(value || '0').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatMbps(bitsPerSecond = 0) {
  const mbps = Number(bitsPerSecond || 0) / 1000000
  if (mbps >= 100) return `${mbps.toFixed(0)} Mbps`
  if (mbps >= 10) return `${mbps.toFixed(1)} Mbps`
  return `${mbps.toFixed(2)} Mbps`
}

function chooseInterface(interfaces = [], preferred = '') {
  const cleanPreferred = String(preferred || '').trim()

  if (cleanPreferred) {
    const exact = interfaces.find((item) => item.name === cleanPreferred)
    if (exact) return exact
  }

  const running = interfaces.filter((item) => String(item.running) === 'true' || item.running === true)

  const candidates = [
    ...running,
    ...interfaces,
  ]

  const priorities = [
    /^pppoe/i,
    /wan/i,
    /^ether1$/i,
    /^ether/i,
    /^bridge/i,
  ]

  for (const pattern of priorities) {
    const found = candidates.find((item) => pattern.test(String(item.name || '')))
    if (found) return found
  }

  return candidates[0] || null
}

async function monitorTraffic({ routerConfig, interfaceName = '' }) {
  const interfacesRaw = await routerosFetch('/interface', {
    routerConfig,
  })

  const interfaces = Array.isArray(interfacesRaw) ? interfacesRaw : []
  const targetInterface = chooseInterface(interfaces, interfaceName)

  if (!targetInterface?.name) {
    throw new Error('Nenhuma interface encontrada para monitorar')
  }

  const result = await routerosFetch('/interface/monitor-traffic', {
    method: 'POST',
    routerConfig,
    body: {
      interface: targetInterface.name,
      once: '',
    },
  })

  const row = Array.isArray(result) ? result[0] : result || {}

  const rxBps = toNumber(row['rx-bits-per-second'] || row.rxBitsPerSecond)
  const txBps = toNumber(row['tx-bits-per-second'] || row.txBitsPerSecond)

  return {
    ok: true,
    interface: {
      id: targetInterface['.id'] || '',
      name: targetInterface.name,
      type: targetInterface.type || '',
      running: targetInterface.running === true || targetInterface.running === 'true',
      disabled: targetInterface.disabled === true || targetInterface.disabled === 'true',
    },
    traffic: {
      rxBitsPerSecond: rxBps,
      txBitsPerSecond: txBps,
      download: formatMbps(rxBps),
      upload: formatMbps(txBps),
      raw: row,
    },
    interfaces: interfaces.map((item) => ({
      id: item['.id'] || '',
      name: item.name || '',
      type: item.type || '',
      running: item.running === true || item.running === 'true',
      disabled: item.disabled === true || item.disabled === 'true',
    })),
    checkedAt: new Date().toISOString(),
  }
}

export async function POST(request) {
  try {
    assertControlSecret(request)

    const body = await request.json().catch(() => ({}))
    const routerConfig = body.routerConfig || {}
    const interfaceName = String(body.interfaceName || body.interface || '').trim()

    const data = await monitorTraffic({
      routerConfig,
      interfaceName,
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao monitorar tráfego do MikroTik',
      },
      { status: 500 }
    )
  }
}
