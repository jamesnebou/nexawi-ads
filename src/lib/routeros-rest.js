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

  const clientDownloadLimit = process.env.NEXAWI_CLIENT_RATE_DOWNLOAD || '10M'
  const clientUploadLimit = process.env.NEXAWI_CLIENT_RATE_UPLOAD || '2M'

  if (!baseUrl) throw new Error('ROUTEROS_BASE_URL não definido')
  if (!username) throw new Error('ROUTEROS_USERNAME não definido')
  if (!password) throw new Error('ROUTEROS_PASSWORD não definido')

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    username,
    password,
    hotspotServer,
    clientDownloadLimit,
    clientUploadLimit,
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

function queueNameFromMac(macAddress = '') {
  const mac = normalizeMac(macAddress).replace(/:/g, '')
  return `nexawi-client-${mac}`
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
    address: item.address || item['host-address'] || item['to-address'] || '',
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

export async function listSimpleQueues() {
  const data = await routerosFetch('/queue/simple')
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

  hosts.forEach((item) => {
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
        onlineSource: item.bypassed ? 'host_bypassed' : 'host_seen',
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

export async function listCurrentHotspotMacs({ server } = {}) {
  const clients = await listOnlineHotspotClients({ server })

  const macs = new Set()

  clients.forEach((client) => {
    const mac = normalizeMac(client.macAddress)

    if (mac) {
      macs.add(mac)
    }
  })

  return macs
}

export async function findHotspotHostByMac({ macAddress, server } = {}) {
  const mac = normalizeMac(macAddress)

  if (!mac) return null

  const hosts = await listHotspotHosts({ server })

  return (
    hosts.find((item) => normalizeMac(item.macAddress) === mac && item.address) ||
    hosts.find((item) => normalizeMac(item.macAddress) === mac) ||
    null
  )
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

export async function ensureClientBandwidthQueue({
  macAddress,
  targetAddress = '',
  comment = '',
  uploadLimit,
  downloadLimit,
} = {}) {
  const {
    clientUploadLimit,
    clientDownloadLimit,
  } = getRouterConfig()

  const mac = normalizeMac(macAddress)

  if (!mac) {
    throw new Error('MAC inválido para queue')
  }

  let resolvedTargetAddress = String(targetAddress || '').trim()

  if (!resolvedTargetAddress) {
    const host = await findHotspotHostByMac({ macAddress: mac })
    resolvedTargetAddress = String(host?.address || '').trim()
  }

  if (!resolvedTargetAddress) {
    return {
      ok: false,
      skipped: true,
      reason: 'Host/IP local não encontrado para criar queue',
      macAddress: mac,
    }
  }

  const queueName = queueNameFromMac(mac)
  const upload = uploadLimit || clientUploadLimit || '3M'
  const download = downloadLimit || clientDownloadLimit || '10M'

  const payload = {
    name: queueName,
    target: `${resolvedTargetAddress}/32`,
    'max-limit': `${upload}/${download}`,
    comment: comment || `nexawi_client:${mac}`,
    disabled: false,
  }

  const queues = await listSimpleQueues()
  const existing = queues.find((item) => item.name === queueName)

  if (existing?.['.id']) {
    await routerosFetch(`/queue/simple/${encodeURIComponent(existing['.id'])}`, {
      method: 'PATCH',
      body: payload,
    })

    return {
      ok: true,
      created: false,
      targetAddress: resolvedTargetAddress,
      queue: {
        ...existing,
        ...payload,
        '.id': existing['.id'],
      },
    }
  }

  const created = await routerosFetch('/queue/simple', {
    method: 'PUT',
    body: payload,
  })

  return {
    ok: true,
    created: true,
    targetAddress: resolvedTargetAddress,
    queue: created,
  }
}

export async function removeClientBandwidthQueue({ macAddress } = {}) {
  const mac = normalizeMac(macAddress)

  if (!mac) {
    return {
      removedCount: 0,
      reason: 'MAC ausente',
    }
  }

  const queueName = queueNameFromMac(mac)
  const queues = await listSimpleQueues()

  const toRemove = queues.filter((item) => {
    const nameMatch = item.name === queueName
    const commentMatch = String(item.comment || '').includes(mac)

    return nameMatch || commentMatch
  })

  for (const item of toRemove) {
    if (!item['.id']) continue

    await routerosFetch(`/queue/simple/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
    })
  }

  return {
    removedCount: toRemove.length,
  }
}

export async function removeHotspotHostsByMac({ macAddress, server } = {}) {
  const mac = normalizeMac(macAddress)

  if (!mac) {
    return {
      removedCount: 0,
      reason: 'MAC ausente',
    }
  }

  const hosts = await listHotspotHosts({ server })

  const toRemove = hosts.filter(
    (item) => normalizeMac(item.macAddress) === mac
  )

  for (const item of toRemove) {
    if (!item.id) continue

    await routerosFetch(`/ip/hotspot/host/${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
    })
  }

  return {
    removedCount: toRemove.length,
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

export async function cleanupClientAccess({ macAddress } = {}) {
  const mac = normalizeMac(macAddress)

  if (!mac) {
    return {
      ok: false,
      macAddress: '',
      bypass: { removedCount: 0 },
      queue: { removedCount: 0 },
      hosts: { removedCount: 0 },
    }
  }

  const [bypass, queue, hosts] = await Promise.all([
    removeBypassBindings({ macAddress: mac }),
    removeClientBandwidthQueue({ macAddress: mac }),
    removeHotspotHostsByMac({ macAddress: mac }),
  ])

  return {
    ok: true,
    macAddress: mac,
    bypass,
    queue,
    hosts,
  }
}

const NEXAWI_POLICY_PREFIX = 'NEXAWI_'

function getNexawiPolicyConfig(options = {}) {
  return {
    hotspotSubnet:
      options.hotspotSubnet ||
      process.env.NEXAWI_HOTSPOT_SUBNET ||
      '192.168.88.0/24',
    blockQuic: options.blockQuic !== false,
    blockTorrent: options.blockTorrent !== false,
    blockGames: options.blockGames !== false,
    blockTlsGames: options.blockTlsGames !== false,
    forceDns: options.forceDns !== false,
  }
}

function isNexawiPolicyRule(item = {}) {
  return String(item.comment || '').startsWith(NEXAWI_POLICY_PREFIX)
}

async function listFirewallFilters() {
  const data = await routerosFetch('/ip/firewall/filter')
  return Array.isArray(data) ? data : []
}

async function listFirewallNatRules() {
  const data = await routerosFetch('/ip/firewall/nat')
  return Array.isArray(data) ? data : []
}

async function addFirewallFilterRule(payload) {
  return routerosFetch('/ip/firewall/filter', {
    method: 'PUT',
    body: payload,
  })
}

async function addFirewallNatRule(payload) {
  return routerosFetch('/ip/firewall/nat', {
    method: 'PUT',
    body: payload,
  })
}

async function tryEnsureDnsSettings() {
  const attempts = [
    {
      path: '/ip/dns/set',
      method: 'POST',
      body: {
        'allow-remote-requests': 'yes',
        servers: '1.1.1.1,8.8.8.8',
      },
    },
    {
      path: '/ip/dns',
      method: 'PATCH',
      body: {
        'allow-remote-requests': 'yes',
        servers: '1.1.1.1,8.8.8.8',
      },
    },
  ]

  let lastError = null

  for (const attempt of attempts) {
    try {
      const result = await routerosFetch(attempt.path, {
        method: attempt.method,
        body: attempt.body,
      })

      return {
        ok: true,
        path: attempt.path,
        result,
      }
    } catch (error) {
      lastError = error
    }
  }

  return {
    ok: false,
    skipped: true,
    error: lastError?.message || 'Não foi possível ajustar DNS via REST',
  }
}

export async function resetNexawiNetworkPolicy() {
  const [filters, natRules] = await Promise.all([
    listFirewallFilters(),
    listFirewallNatRules(),
  ])

  const filterRules = filters.filter(isNexawiPolicyRule)
  const natPolicyRules = natRules.filter(isNexawiPolicyRule)

  for (const item of filterRules) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/firewall/filter/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
    })
  }

  for (const item of natPolicyRules) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/firewall/nat/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
    })
  }

  return {
    ok: true,
    removedFilters: filterRules.length,
    removedNatRules: natPolicyRules.length,
  }
}

export async function getNexawiNetworkPolicyStatus() {
  const [filters, natRules] = await Promise.all([
    listFirewallFilters(),
    listFirewallNatRules(),
  ])

  const filterRules = filters
    .filter(isNexawiPolicyRule)
    .map((item) => ({
      id: item['.id'] || '',
      chain: item.chain || '',
      action: item.action || '',
      protocol: item.protocol || '',
      srcAddress: item['src-address'] || '',
      dstPort: item['dst-port'] || '',
      tlsHost: item['tls-host'] || '',
      comment: item.comment || '',
      disabled: routerFlag(item.disabled),
      invalid: routerFlag(item.invalid),
      bytes: item.bytes || '',
      packets: item.packets || '',
    }))

  const natPolicyRules = natRules
    .filter(isNexawiPolicyRule)
    .map((item) => ({
      id: item['.id'] || '',
      chain: item.chain || '',
      action: item.action || '',
      protocol: item.protocol || '',
      srcAddress: item['src-address'] || '',
      dstPort: item['dst-port'] || '',
      toPorts: item['to-ports'] || '',
      comment: item.comment || '',
      disabled: routerFlag(item.disabled),
      invalid: routerFlag(item.invalid),
      bytes: item.bytes || '',
      packets: item.packets || '',
    }))

  return {
    ok: true,
    enabled: filterRules.length > 0 || natPolicyRules.length > 0,
    filterCount: filterRules.length,
    natCount: natPolicyRules.length,
    filters: filterRules,
    natRules: natPolicyRules,
    checkedAt: new Date().toISOString(),
  }
}

export async function applyNexawiNetworkPolicy(options = {}) {
  const config = getNexawiPolicyConfig(options)
  const hotspotSubnet = config.hotspotSubnet

  const reset = await resetNexawiNetworkPolicy()
  const dnsSettings = await tryEnsureDnsSettings()

  const createdNatRules = []
  const createdFilterRules = []

  if (config.forceDns) {
    createdNatRules.push(await addFirewallNatRule({
      chain: 'dstnat',
      action: 'redirect',
      'to-ports': '53',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '53',
      comment: 'NEXAWI_FORCE_DNS_UDP',
    }))

    createdNatRules.push(await addFirewallNatRule({
      chain: 'dstnat',
      action: 'redirect',
      'to-ports': '53',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-port': '53',
      comment: 'NEXAWI_FORCE_DNS_TCP',
    }))
  }

  createdFilterRules.push(await addFirewallFilterRule({
    chain: 'forward',
    action: 'drop',
    protocol: 'tcp',
    'src-address': hotspotSubnet,
    'dst-port': '853',
    comment: 'NEXAWI_BLOCK_DOT_TCP',
  }))

  createdFilterRules.push(await addFirewallFilterRule({
    chain: 'forward',
    action: 'drop',
    protocol: 'udp',
    'src-address': hotspotSubnet,
    'dst-port': '853',
    comment: 'NEXAWI_BLOCK_DOT_UDP',
  }))

  if (config.blockQuic) {
    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '443',
      comment: 'NEXAWI_BLOCK_QUIC_UDP_443',
    }))
  }

  if (config.blockTorrent) {
    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-port': '6881-6999,51413,6969',
      comment: 'NEXAWI_BLOCK_TORRENT_TCP',
    }))

    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '6881-6999,51413,6969',
      comment: 'NEXAWI_BLOCK_TORRENT_UDP',
    }))
  }

  if (config.blockGames) {
    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '3074,3478-3480,3659,4380,7777-7790,27000-27200',
      comment: 'NEXAWI_BLOCK_GAMES_UDP',
    }))

    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-port': '3074,27014-27050',
      comment: 'NEXAWI_BLOCK_GAMES_TCP',
    }))
  }

  if (config.blockTlsGames) {
    const tlsHosts = [
      ['*.roblox.com', 'NEXAWI_BLOCK_TLS_ROBLOX'],
      ['*.rbxcdn.com', 'NEXAWI_BLOCK_TLS_RBXCDN'],
      ['*.epicgames.com', 'NEXAWI_BLOCK_TLS_EPICGAMES'],
      ['*.fortnite.com', 'NEXAWI_BLOCK_TLS_FORTNITE'],
      ['*.steampowered.com', 'NEXAWI_BLOCK_TLS_STEAMPOWERED'],
      ['*.steamcommunity.com', 'NEXAWI_BLOCK_TLS_STEAMCOMMUNITY'],
      ['*.steamcontent.com', 'NEXAWI_BLOCK_TLS_STEAMCONTENT'],
      ['*.riotgames.com', 'NEXAWI_BLOCK_TLS_RIOTGAMES'],
      ['*.leagueoflegends.com', 'NEXAWI_BLOCK_TLS_LOL'],
      ['*.valorant.com', 'NEXAWI_BLOCK_TLS_VALORANT'],
      ['*.xboxlive.com', 'NEXAWI_BLOCK_TLS_XBOXLIVE'],
      ['*.playstation.net', 'NEXAWI_BLOCK_TLS_PLAYSTATION'],
    ]

    for (const [tlsHost, comment] of tlsHosts) {
      createdFilterRules.push(await addFirewallFilterRule({
        chain: 'forward',
        action: 'drop',
        protocol: 'tcp',
        'src-address': hotspotSubnet,
        'dst-port': '443',
        'tls-host': tlsHost,
        comment,
      }))
    }
  }

  const status = await getNexawiNetworkPolicyStatus()

  return {
    ok: true,
    hotspotSubnet,
    config,
    reset,
    dnsSettings,
    createdFilterRulesCount: createdFilterRules.length,
    createdNatRulesCount: createdNatRules.length,
    status,
    appliedAt: new Date().toISOString(),
  }
}

export { normalizeMac }