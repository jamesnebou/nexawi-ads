function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function getRouterConfig() {
  const baseUrl = process.env.ROUTEROS_BASE_URL
  const username = process.env.ROUTEROS_USERNAME
  const password = process.env.ROUTEROS_PASSWORD
  const hotspotServer = process.env.ROUTEROS_HOTSPOT_SERVER || 'hotspot1'

  if (!baseUrl) throw new Error('ROUTEROS_BASE_URL não definido')
  if (!username) throw new Error('ROUTEROS_USERNAME não definido')
  if (!password) throw new Error('ROUTEROS_PASSWORD não definido')

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    username,
    password,
    hotspotServer,
  }
}

async function routerosFetch(path, { method = 'GET', body } = {}) {
  const { baseUrl, username, password } = getRouterConfig()

  const headers = {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    'Content-Type': 'application/json',
  }

  const response = await fetch(`${baseUrl}/rest${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  let data = null
  const text = await response.text()

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text || null
  }

  if (!response.ok) {
    throw new Error(
      `RouterOS REST ${method} ${path} falhou: ${response.status} ${response.statusText} | ${JSON.stringify(data)}`
    )
  }

  return data
}

function routerFlag(value) {
  return value === true || value === 'true' || value === 'yes' || value === 'enabled'
}

function getClientKey(item = {}) {
  const mac = normalizeMac(item['mac-address'] || item.macAddress || '')
  const address = String(item.address || item['host-address'] || item['to-address'] || '').trim()

  return mac || address || item['.id'] || ''
}

function normalizarOnlineClient(item = {}, source = 'unknown') {
  return {
    id: item['.id'] || '',
    source,
    server: item.server || '',
    user: item.user || '',
    address: item.address || item['host-address'] || '',
    macAddress: normalizeMac(item['mac-address'] || ''),
    uptime: item.uptime || '',
    idleTime: item['idle-time'] || '',
    authorized: routerFlag(item.authorized),
    bypassed: routerFlag(item.bypassed),
  }
}

export async function routerHealth() {
  return routerosFetch('/system/resource')
}

export async function listHotspotBindings() {
  const data = await routerosFetch('/ip/hotspot/ip-binding')
  return Array.isArray(data) ? data : []
}

export async function listHotspotActiveUsers({ server } = {}) {
  const { hotspotServer } = getRouterConfig()
  const targetServer = server || hotspotServer

  const data = await routerosFetch('/ip/hotspot/active')
  const list = Array.isArray(data) ? data : []

  return list
    .filter((item) => {
      if (!targetServer) return true
      if (!item.server) return true
      return item.server === targetServer
    })
    .map((item) => normalizarOnlineClient(item, 'active'))
}

export async function listHotspotHosts({ server } = {}) {
  const { hotspotServer } = getRouterConfig()
  const targetServer = server || hotspotServer

  const data = await routerosFetch('/ip/hotspot/host')
  const list = Array.isArray(data) ? data : []

  return list
    .filter((item) => {
      if (!targetServer) return true
      if (!item.server) return true
      return item.server === targetServer
    })
    .map((item) => normalizarOnlineClient(item, 'host'))
}

export async function listOnlineHotspotClients({ server } = {}) {
  const [activeUsers, hosts] = await Promise.all([
    listHotspotActiveUsers({ server }),
    listHotspotHosts({ server }),
  ])

  const map = new Map()

  activeUsers.forEach((item) => {
    const key = getClientKey({
      '.id': item.id,
      server: item.server,
      user: item.user,
      address: item.address,
      'mac-address': item.macAddress,
    })

    if (key) {
      map.set(key, {
        ...item,
        onlineSource: 'active',
        online: true,
      })
    }
  })

  hosts
    .filter((item) => item.authorized || item.bypassed)
    .forEach((item) => {
      const key = getClientKey({
        '.id': item.id,
        server: item.server,
        user: item.user,
        address: item.address,
        'mac-address': item.macAddress,
      })

      if (!key) return

      if (map.has(key)) {
        map.set(key, {
          ...map.get(key),
          ...item,
          onlineSource: 'active_host',
          online: true,
        })
      } else {
        map.set(key, {
          ...item,
          onlineSource: item.bypassed ? 'host_bypassed' : 'host_authorized',
          online: true,
        })
      }
    })

  return Array.from(map.values())
}

export async function countOnlineHotspotClients({ server } = {}) {
  const clients = await listOnlineHotspotClients({ server })

  return {
    ok: true,
    count: clients.length,
    server: server || getRouterConfig().hotspotServer,
    checkedAt: new Date().toISOString(),
  }
}

export async function ensureBypassBinding({ macAddress, comment }) {
  const { hotspotServer } = getRouterConfig()
  const mac = normalizeMac(macAddress)

  if (!mac) {
    throw new Error('MAC inválido para binding')
  }

  const payload = {
    'mac-address': mac,
    server: hotspotServer,
    type: 'bypassed',
    disabled: false,
    comment: comment || '',
  }

  const bindings = await listHotspotBindings()

  const existing = bindings.find(
    (item) => normalizeMac(item['mac-address']) === mac
  )

  if (existing?.['.id']) {
    await routerosFetch(`/ip/hotspot/ip-binding/${encodeURIComponent(existing['.id'])}`, {
      method: 'PATCH',
      body: payload,
    })

    return {
      ...existing,
      ...payload,
      '.id': existing['.id'],
    }
  }

  try {
    return await routerosFetch('/ip/hotspot/ip-binding', {
      method: 'PUT',
      body: payload,
    })
  } catch (error) {
    const message = String(error?.message || '')

    if (!message.includes('such client already exists')) {
      throw error
    }

    const retryBindings = await listHotspotBindings()
    const retryExisting = retryBindings.find(
      (item) => normalizeMac(item['mac-address']) === mac
    )

    if (!retryExisting?.['.id']) {
      throw error
    }

    await routerosFetch(`/ip/hotspot/ip-binding/${encodeURIComponent(retryExisting['.id'])}`, {
      method: 'PATCH',
      body: payload,
    })

    return {
      ...retryExisting,
      ...payload,
      '.id': retryExisting['.id'],
    }
  }
}

export async function removeBypassBindings({ macAddress }) {
  const { hotspotServer } = getRouterConfig()
  const mac = normalizeMac(macAddress)

  const bindings = await listHotspotBindings()

  const toRemove = bindings.filter(
    (item) =>
      normalizeMac(item['mac-address']) === mac &&
      item.server === hotspotServer &&
      item.type === 'bypassed'
  )

  for (const item of toRemove) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/hotspot/ip-binding/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
    })
  }

  return {
    removedCount: toRemove.length,
  }
}

export { normalizeMac }