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

export async function routerHealth() {
  return routerosFetch('/system/resource')
}

export async function listHotspotBindings() {
  const data = await routerosFetch('/ip/hotspot/ip-binding')
  return Array.isArray(data) ? data : []
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

  // procura qualquer binding existente para o MAC,
  // independentemente do server atual
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