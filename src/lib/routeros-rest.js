function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function normalizeRouterBaseUrl(value = '') {
  const raw = String(value || '').trim()

  if (!raw) return ''

  const withProtocol = /^https?:\/\//i.test(raw)
    ? raw
    : `http://${raw}`

  return withProtocol.replace(/\/$/, '')
}

function getRouterConfig(routerConfig = {}) {
  const baseUrl =
    routerConfig.baseUrl ||
    routerConfig.base_url ||
    process.env.ROUTEROS_BASE_URL

  const username =
    routerConfig.username ||
    process.env.ROUTEROS_USERNAME

  const password =
    routerConfig.password ||
    process.env.ROUTEROS_PASSWORD

  const hotspotServer =
    routerConfig.hotspotServer ||
    routerConfig.hotspot_server ||
    process.env.ROUTEROS_HOTSPOT_SERVER ||
    'hotspot1'

  const clientDownloadLimit =
    routerConfig.clientDownloadLimit ||
    routerConfig.downloadLimit ||
    routerConfig.download_limit ||
    process.env.NEXAWI_CLIENT_RATE_DOWNLOAD ||
    '10M'

  const clientUploadLimit =
    routerConfig.clientUploadLimit ||
    routerConfig.uploadLimit ||
    routerConfig.upload_limit ||
    process.env.NEXAWI_CLIENT_RATE_UPLOAD ||
    '2M'

  if (!baseUrl) throw new Error('ROUTEROS_BASE_URL não definido')
  if (!username) throw new Error('ROUTEROS_USERNAME não definido')
  if (!password) throw new Error('ROUTEROS_PASSWORD não definido')

  return {
    baseUrl: normalizeRouterBaseUrl(baseUrl),
    username,
    password,
    hotspotServer,
    clientDownloadLimit,
    clientUploadLimit,
  }
}

async function routerosFetch(path, { method = 'GET', body, routerConfig } = {}) {
  const { baseUrl, username, password } = getRouterConfig(routerConfig || {})

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

function sanitizePolicyComment(value = '') {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 45)
}

function normalizeDomain(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .trim()
}

function uniqueDomains(list = []) {
  return [...new Set(
    (list || [])
      .map(normalizeDomain)
      .filter((item) => item && item.includes('.'))
  )]
}

function escapeRegexDomain(domain = '') {
  return normalizeDomain(domain).replace(/\./g, '\\.')
}

function getDomainTlsHosts(domain = '') {
  const clean = normalizeDomain(domain)

  if (!clean) return []

  return [
    clean,
    `*.${clean}`,
  ]
}

function isNexawiPolicyRule(item = {}) {
  return String(item.comment || '').startsWith(NEXAWI_POLICY_PREFIX)
}

async function listFirewallFilters({ routerConfig } = {}) {
  const data = await routerosFetch('/ip/firewall/filter', { routerConfig })
  return Array.isArray(data) ? data : []
}

async function listFirewallNatRules({ routerConfig } = {}) {
  const data = await routerosFetch('/ip/firewall/nat', { routerConfig })
  return Array.isArray(data) ? data : []
}

async function listDnsStaticRules({ routerConfig } = {}) {
  const data = await routerosFetch('/ip/dns/static', { routerConfig })
  return Array.isArray(data) ? data : []
}

async function listFirewallAddressList({ routerConfig } = {}) {
  const data = await routerosFetch('/ip/firewall/address-list', { routerConfig })
  return Array.isArray(data) ? data : []
}

async function addFirewallAddressListEntry(payload, { routerConfig } = {}) {
  return routerosFetch('/ip/firewall/address-list', {
    method: 'PUT',
    body: payload,
    routerConfig,
  })
}

async function addFirewallFilterRule(payload, { routerConfig } = {}) {
  return routerosFetch('/ip/firewall/filter', {
    method: 'PUT',
    body: payload,
    routerConfig,
  })
}

async function addFirewallNatRule(payload, { routerConfig } = {}) {
  return routerosFetch('/ip/firewall/nat', {
    method: 'PUT',
    body: payload,
    routerConfig,
  })
}

async function addDnsStaticRule(payload, { routerConfig } = {}) {
  return routerosFetch('/ip/dns/static', {
    method: 'PUT',
    body: payload,
    routerConfig,
  })
}

async function tryEnsureDnsSettings({ routerConfig } = {}) {
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
        routerConfig,
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

async function addDnsBlockForDomain(domain, { routerConfig } = {}) {
  const clean = normalizeDomain(domain)
  const commentSafe = sanitizePolicyComment(clean)

  if (!clean) {
    return []
  }

  const created = []

  const regexpPayload = {
    regexp: `(^|.*\\.)${escapeRegexDomain(clean)}$`,
    type: 'NXDOMAIN',
    comment: `NEXAWI_DNS_BLOCK_CUSTOM_${commentSafe}`,
    disabled: false,
  }

  try {
    created.push(await addDnsStaticRule(regexpPayload, { routerConfig }))
    return created
  } catch {
    // Alguns RouterOS/REST podem rejeitar regexp+NXDOMAIN.
    // Nesse caso, aplica fallback por registros A.
  }

  const fallbackRules = [
    {
      name: clean,
      type: 'A',
      address: '0.0.0.0',
      comment: `NEXAWI_DNS_BLOCK_CUSTOM_${commentSafe}`,
      disabled: false,
    },
    {
      name: `www.${clean}`,
      type: 'A',
      address: '0.0.0.0',
      comment: `NEXAWI_DNS_BLOCK_CUSTOM_WWW_${commentSafe}`,
      disabled: false,
    },
  ]

  for (const payload of fallbackRules) {
    created.push(await addDnsStaticRule(payload, { routerConfig }))
  }

  return created
}

const META_PRESET_DOMAINS = [
  'facebook.com',
  'fbcdn.net',
  'fbsbx.com',
  'messenger.com',
  'fb.com',
  'connect.facebook.net',
  'graph.facebook.com',
  'm.facebook.com',
]

const INSTAGRAM_PRESET_DOMAINS = [
  'instagram.com',
  'cdninstagram.com',
  'ig.me',
  'threads.net',
]

const TIKTOK_PRESET_DOMAINS = [
  'tiktok.com',
  'tiktokcdn.com',
  'tiktokv.com',
  'tiktokcdn-us.com',
  'byteoversea.com',
  'ibyteimg.com',
  'ibytedtos.com',
  'muscdn.com',
  'snssdk.com',
]

const YOUTUBE_PRESET_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'm.youtube.com',
  'youtube-nocookie.com',
  'ytimg.com',
  'googlevideo.com',
  'ytstatic.l.google.com',
  'youtubei.googleapis.com',
]

const STREAMING_PRESET_DOMAINS = [
  'netflix.com',
  'nflxext.com',
  'nflximg.net',
  'nflximg.com',
  'nflxsearch.net',
  'nflxso.net',
  'nflxvideo.net',
]

const HEAVY_GAMES_PRESET_DOMAINS = [
  'roblox.com',
  'rbxcdn.com',
  'epicgames.com',
  'fortnite.com',
  'steampowered.com',
  'steamcommunity.com',
  'steamcontent.com',
  'riotgames.com',
  'leagueoflegends.com',
  'valorant.com',
  'xboxlive.com',
  'playstation.net',
]

const STRONG_PRESETS = [
  {
    id: 'instagram',
    triggerDomains: INSTAGRAM_PRESET_DOMAINS,
    domains: INSTAGRAM_PRESET_DOMAINS,
    usesMetaInfrastructure: true,
  },
  {
    id: 'tiktok',
    triggerDomains: ['tiktok.com', 'tiktokcdn.com'],
    domains: TIKTOK_PRESET_DOMAINS,
    usesMetaInfrastructure: false,
  },
  {
    id: 'youtube',
    triggerDomains: ['youtube.com', 'youtu.be', 'googlevideo.com'],
    domains: YOUTUBE_PRESET_DOMAINS,
    usesMetaInfrastructure: false,
  },
  {
    id: 'streaming',
    triggerDomains: ['netflix.com', 'nflxvideo.net'],
    domains: STREAMING_PRESET_DOMAINS,
    usesMetaInfrastructure: false,
  },
  {
    id: 'heavy_games',
    triggerDomains: ['roblox.com', 'epicgames.com', 'fortnite.com', 'steampowered.com', 'riotgames.com', 'valorant.com'],
    domains: HEAVY_GAMES_PRESET_DOMAINS,
    usesMetaInfrastructure: false,
  },
]

function domainMatchesPreset(domain = '', preset = {}) {
  const clean = normalizeDomain(domain)

  if (!clean) return false

  return (preset.triggerDomains || []).some((trigger) => {
    const normalizedTrigger = normalizeDomain(trigger)

    return (
      clean === normalizedTrigger ||
      clean.endsWith(`.${normalizedTrigger}`) ||
      normalizedTrigger.endsWith(`.${clean}`)
    )
  })
}

function getActiveStrongPresets(customBlockedDomains = [], options = {}) {
  const requested = uniqueDomains(customBlockedDomains)

  return STRONG_PRESETS.filter((preset) => {
    const optionName = `blockPreset_${preset.id}`

    if (options[optionName] === true) return true

    return requested.some((domain) => domainMatchesPreset(domain, preset))
  })
}

const META_PRESET_ADDRESS_LIST = [
  { address: '31.13.91.0/24', comment: 'NEXAWI_META_OBSERVED_31_13_91' },
  { address: '57.144.0.0/16', comment: 'NEXAWI_META_OBSERVED_57_144' },
  { address: '157.240.0.0/16', comment: 'NEXAWI_META_COMMON_157_240' },
  { address: '129.134.0.0/17', comment: 'NEXAWI_META_COMMON_129_134' },
  { address: '173.252.64.0/18', comment: 'NEXAWI_META_COMMON_173_252' },
  { address: '69.171.224.0/19', comment: 'NEXAWI_META_COMMON_69_171' },
]

const DOH_BLOCK_TARGETS = [
  { address: '8.8.8.8', comment: 'NEXAWI_BLOCK_DOH_GOOGLE_8_8_8_8' },
  { address: '8.8.4.4', comment: 'NEXAWI_BLOCK_DOH_GOOGLE_8_8_4_4' },
  { address: '1.1.1.1', comment: 'NEXAWI_BLOCK_DOH_CLOUDFLARE_1_1_1_1' },
  { address: '1.0.0.1', comment: 'NEXAWI_BLOCK_DOH_CLOUDFLARE_1_0_0_1' },
  { address: '9.9.9.9', comment: 'NEXAWI_BLOCK_DOH_QUAD9_9_9_9' },
]

function shouldApplyMetaPreset(customBlockedDomains = [], options = {}) {
  if (options.blockMeta === true) return true

  const normalized = uniqueDomains(customBlockedDomains)

  return normalized.some((domain) =>
    META_PRESET_DOMAINS.some(
      (presetDomain) =>
        domain === presetDomain ||
        domain.endsWith(`.${presetDomain}`) ||
        presetDomain.endsWith(`.${domain}`)
    )
  )
}

async function addDohBlockRules({ hotspotSubnet, routerConfig } = {}) {
  const created = []

  for (const target of DOH_BLOCK_TARGETS) {
    created.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-address': target.address,
      'dst-port': '443',
      comment: target.comment,
    }, { routerConfig }))
  }

  return created
}

async function addMetaPresetRules({ hotspotSubnet, routerConfig } = {}) {
  const createdAddressListRules = []
  const createdFilterRules = []

  for (const item of META_PRESET_ADDRESS_LIST) {
    createdAddressListRules.push(await addFirewallAddressListEntry({
      list: 'NEXAWI_BLOCK_META',
      address: item.address,
      comment: item.comment,
      disabled: false,
    }, { routerConfig }))
  }

  createdFilterRules.push(await addFirewallFilterRule({
    chain: 'forward',
    action: 'drop',
    'src-address': hotspotSubnet,
    'dst-address-list': 'NEXAWI_BLOCK_META',
    comment: 'NEXAWI_BLOCK_META_IP',
  }, { routerConfig }))

  createdFilterRules.push(await addFirewallFilterRule({
    chain: 'forward',
    action: 'drop',
    protocol: 'tcp',
    'src-address': hotspotSubnet,
    'dst-address-list': 'NEXAWI_BLOCK_META',
    'dst-port': '5222',
    comment: 'NEXAWI_BLOCK_META_5222',
  }, { routerConfig }))

  return {
    createdAddressListRules,
    createdFilterRules,
  }
}

export async function resetNexawiNetworkPolicy({ routerConfig } = {}) {
  const [filters, natRules, dnsStaticRules, addressListRulesRaw] = await Promise.all([
    listFirewallFilters({ routerConfig }),
    listFirewallNatRules({ routerConfig }),
    listDnsStaticRules({ routerConfig }),
    listFirewallAddressList({ routerConfig }),
  ])

  const filterRules = filters.filter(isNexawiPolicyRule)
  const natPolicyRules = natRules.filter(isNexawiPolicyRule)
  const dnsPolicyRules = dnsStaticRules.filter(isNexawiPolicyRule)

  const addressListRules = addressListRulesRaw.filter((item) => {
    const comment = String(item.comment || '')
    const list = String(item.list || '')

    return comment.startsWith(NEXAWI_POLICY_PREFIX) || list.startsWith(NEXAWI_POLICY_PREFIX)
  })

  for (const item of filterRules) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/firewall/filter/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
      routerConfig,
    })
  }

  for (const item of natPolicyRules) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/firewall/nat/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
      routerConfig,
    })
  }

  for (const item of dnsPolicyRules) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/dns/static/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
      routerConfig,
    })
  }

  for (const item of addressListRules) {
    if (!item['.id']) continue

    await routerosFetch(`/ip/firewall/address-list/${encodeURIComponent(item['.id'])}`, {
      method: 'DELETE',
      routerConfig,
    })
  }

  return {
    ok: true,
    removedFilters: filterRules.length,
    removedNatRules: natPolicyRules.length,
    removedDnsRules: dnsPolicyRules.length,
    removedAddressListRules: addressListRules.length,
  }
}

export async function getNexawiNetworkPolicyStatus({ routerConfig } = {}) {
  const [filters, natRules, dnsStaticRules] = await Promise.all([
    listFirewallFilters({ routerConfig }),
    listFirewallNatRules({ routerConfig }),
    listDnsStaticRules({ routerConfig }),
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

  const dnsPolicyRules = dnsStaticRules
    .filter(isNexawiPolicyRule)
    .map((item) => ({
      id: item['.id'] || '',
      name: item.name || '',
      regexp: item.regexp || '',
      type: item.type || '',
      address: item.address || '',
      comment: item.comment || '',
      disabled: routerFlag(item.disabled),
      invalid: routerFlag(item.invalid),
    }))

  return {
    ok: true,
    enabled: filterRules.length > 0 || natPolicyRules.length > 0 || dnsPolicyRules.length > 0,
    filterCount: filterRules.length,
    natCount: natPolicyRules.length,
    dnsCount: dnsPolicyRules.length,
    filters: filterRules,
    natRules: natPolicyRules,
    dnsRules: dnsPolicyRules,
    checkedAt: new Date().toISOString(),
  }
}

export async function applyNexawiNetworkPolicy(options = {}) {
  const routerConfig = options.routerConfig || null

  const hotspotSubnet =
    options.hotspotSubnet ||
    process.env.NEXAWI_HOTSPOT_SUBNET ||
    '192.168.88.0/24'

  const blockQuic = options.blockQuic !== false
  const blockTorrent = options.blockTorrent !== false
  const blockGames = options.blockGames !== false
  const blockTlsGames = options.blockTlsGames !== false
  const forceDns = options.forceDns !== false

  const requestedBlockedDomains = uniqueDomains(options.customBlockedDomains || [])
  const activeStrongPresets = getActiveStrongPresets(requestedBlockedDomains, options)

  const applyMetaPreset =
    shouldApplyMetaPreset(requestedBlockedDomains, options) ||
    activeStrongPresets.some((preset) => preset.usesMetaInfrastructure)

  const expandedPresetDomains = activeStrongPresets.flatMap((preset) => preset.domains || [])

  const customBlockedDomains = uniqueDomains([
    ...requestedBlockedDomains,
    ...(applyMetaPreset ? META_PRESET_DOMAINS : []),
    ...expandedPresetDomains,
  ])

  const customAllowedDomains = uniqueDomains(options.customAllowedDomains || [])
  const blockDoh = options.blockDoh !== false && forceDns

  const reset = await resetNexawiNetworkPolicy({ routerConfig })
  const dnsSettings = await tryEnsureDnsSettings({ routerConfig })

  const createdNatRules = []
  const createdFilterRules = []
  const createdDnsRules = []
  const createdAddressListRules = []

  if (forceDns) {
    createdNatRules.push(await addFirewallNatRule({
      chain: 'dstnat',
      action: 'redirect',
      'to-ports': '53',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '53',
      comment: 'NEXAWI_FORCE_DNS_UDP',
    }, { routerConfig }))

    createdNatRules.push(await addFirewallNatRule({
      chain: 'dstnat',
      action: 'redirect',
      'to-ports': '53',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-port': '53',
      comment: 'NEXAWI_FORCE_DNS_TCP',
    }, { routerConfig }))
  }

  if (blockDoh) {
    const dohRules = await addDohBlockRules({
      hotspotSubnet,
      routerConfig,
    })

    createdFilterRules.push(...dohRules)
  }

  if (applyMetaPreset) {
    const metaRules = await addMetaPresetRules({
      hotspotSubnet,
      routerConfig,
    })

    createdAddressListRules.push(...metaRules.createdAddressListRules)
    createdFilterRules.push(...metaRules.createdFilterRules)
  }

  for (const domain of customAllowedDomains) {
    const tlsHosts = getDomainTlsHosts(domain)

    for (const tlsHost of tlsHosts) {
      createdFilterRules.push(await addFirewallFilterRule({
        chain: 'forward',
        action: 'accept',
        protocol: 'tcp',
        'src-address': hotspotSubnet,
        'dst-port': '443',
        'tls-host': tlsHost,
        comment: `NEXAWI_ALLOW_CUSTOM_${sanitizePolicyComment(domain)}`,
      }, { routerConfig }))
    }
  }

  createdFilterRules.push(await addFirewallFilterRule({
    chain: 'forward',
    action: 'drop',
    protocol: 'tcp',
    'src-address': hotspotSubnet,
    'dst-port': '853',
    comment: 'NEXAWI_BLOCK_DOT_TCP',
  }, { routerConfig }))

  createdFilterRules.push(await addFirewallFilterRule({
    chain: 'forward',
    action: 'drop',
    protocol: 'udp',
    'src-address': hotspotSubnet,
    'dst-port': '853',
    comment: 'NEXAWI_BLOCK_DOT_UDP',
  }, { routerConfig }))

  if (blockQuic) {
    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '443',
      comment: 'NEXAWI_BLOCK_QUIC_UDP_443',
    }, { routerConfig }))
  }

  if (blockTorrent) {
    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-port': '6881-6999,51413,6969',
      comment: 'NEXAWI_BLOCK_TORRENT_TCP',
    }, { routerConfig }))

    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '6881-6999,51413,6969',
      comment: 'NEXAWI_BLOCK_TORRENT_UDP',
    }, { routerConfig }))
  }

  if (blockGames) {
    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'udp',
      'src-address': hotspotSubnet,
      'dst-port': '3074,3478-3480,3659,4380,7777-7790,27000-27200',
      comment: 'NEXAWI_BLOCK_GAMES_UDP',
    }, { routerConfig }))

    createdFilterRules.push(await addFirewallFilterRule({
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'src-address': hotspotSubnet,
      'dst-port': '3074,27014-27050',
      comment: 'NEXAWI_BLOCK_GAMES_TCP',
    }, { routerConfig }))
  }

  if (blockTlsGames) {
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
      }, { routerConfig }))
    }
  }

  for (const domain of customBlockedDomains) {
    const tlsHosts = getDomainTlsHosts(domain)

    for (const tlsHost of tlsHosts) {
      createdFilterRules.push(await addFirewallFilterRule({
        chain: 'forward',
        action: 'drop',
        protocol: 'tcp',
        'src-address': hotspotSubnet,
        'dst-port': '443',
        'tls-host': tlsHost,
        comment: `NEXAWI_BLOCK_CUSTOM_${sanitizePolicyComment(domain)}`,
      }, { routerConfig }))
    }

    const dnsRules = await addDnsBlockForDomain(domain, { routerConfig })
    createdDnsRules.push(...dnsRules)
  }

  const status = await getNexawiNetworkPolicyStatus({ routerConfig })

  return {
    ok: true,
    hotspotSubnet,
    config: {
      hotspotSubnet,
      blockQuic,
      blockTorrent,
      blockGames,
      blockTlsGames,
      forceDns,
      blockDoh,
      applyMetaPreset,
      activeStrongPresetIds: activeStrongPresets.map((preset) => preset.id),
      customBlockedDomains,
      customAllowedDomains,
    },
    reset,
    dnsSettings,
    createdFilterRulesCount: createdFilterRules.length,
    createdNatRulesCount: createdNatRules.length,
    createdDnsRulesCount: createdDnsRules.length,
    createdAddressListRulesCount: createdAddressListRules.length,
    status,
    appliedAt: new Date().toISOString(),
  }
}


function settledValue(result, fallback = null) {
  return result.status === 'fulfilled' ? result.value : fallback
}

function settledError(result) {
  if (result.status !== 'rejected') return ''
  return result.reason?.message || String(result.reason || '')
}

function serviceIsEnabled(service = {}) {
  return !routerFlag(service.disabled)
}

function normalizeService(service = {}) {
  return {
    id: service['.id'] || '',
    name: service.name || '',
    port: service.port || '',
    address: service.address || '',
    disabled: routerFlag(service.disabled),
    enabled: serviceIsEnabled(service),
  }
}

function normalizeHotspotServer(server = {}) {
  return {
    id: server['.id'] || '',
    name: server.name || '',
    interface: server.interface || '',
    addressPool: server['address-pool'] || '',
    profile: server.profile || '',
    disabled: routerFlag(server.disabled),
    enabled: !routerFlag(server.disabled),
  }
}

function makeDiagnosticCheck({ id, label, ok, severity = 'info', message = '', recommendation = '' }) {
  return {
    id,
    label,
    ok: Boolean(ok),
    severity,
    message,
    recommendation,
  }
}

export async function routerDiagnostics({ routerConfig } = {}) {
  const { hotspotServer } = getRouterConfig(routerConfig || {})
  const targetHotspotServer = routerConfig?.hotspotServer || hotspotServer || 'hotspot1'

  const [
    resourceResult,
    servicesResult,
    hotspotServersResult,
    hotspotProfilesResult,
    policyStatusResult,
  ] = await Promise.allSettled([
    routerosFetch('/system/resource', { routerConfig }),
    routerosFetch('/ip/service', { routerConfig }),
    routerosFetch('/ip/hotspot', { routerConfig }),
    routerosFetch('/ip/hotspot/profile', { routerConfig }),
    getNexawiNetworkPolicyStatus({ routerConfig }),
  ])

  const resource = settledValue(resourceResult, null)
  const servicesRaw = settledValue(servicesResult, [])
  const hotspotServersRaw = settledValue(hotspotServersResult, [])
  const hotspotProfilesRaw = settledValue(hotspotProfilesResult, [])
  const policyStatus = settledValue(policyStatusResult, null)

  const services = Array.isArray(servicesRaw) ? servicesRaw.map(normalizeService) : []
  const hotspotServers = Array.isArray(hotspotServersRaw)
    ? hotspotServersRaw.map(normalizeHotspotServer)
    : []

  const hotspotProfiles = Array.isArray(hotspotProfilesRaw)
    ? hotspotProfilesRaw.map((profile) => ({
        id: profile['.id'] || '',
        name: profile.name || '',
        hotspotAddress: profile['hotspot-address'] || '',
        dnsName: profile['dns-name'] || '',
        htmlDirectory: profile['html-directory'] || '',
        loginBy: profile['login-by'] || '',
        useRadius: profile['use-radius'] || '',
      }))
    : []

  const serviceWww = services.find((service) => service.name === 'www')
  const serviceApi = services.find((service) => service.name === 'api')
  const serviceApiSsl = services.find((service) => service.name === 'api-ssl')

  const selectedHotspotServer =
    hotspotServers.find((server) => server.name === targetHotspotServer) || null

  const checks = [
    makeDiagnosticCheck({
      id: 'router_reachable',
      label: 'MikroTik respondeu',
      ok: Boolean(resource),
      severity: resource ? 'success' : 'critical',
      message: resource
        ? `RouterOS ${resource.version || 'desconhecido'} em ${resource['board-name'] || 'MikroTik'}`
        : 'Não foi possível consultar /system/resource.',
      recommendation: resource
        ? ''
        : 'Verifique VPN/WireGuard, base URL, usuário, senha e serviço www no MikroTik.',
    }),

    makeDiagnosticCheck({
      id: 'rest_www_enabled',
      label: 'REST/API via serviço www',
      ok: Boolean(serviceWww?.enabled),
      severity: serviceWww?.enabled ? 'success' : 'critical',
      message: serviceWww
        ? `Serviço www está ${serviceWww.enabled ? 'ativo' : 'desativado'} na porta ${serviceWww.port || '80'}.`
        : 'Serviço www não encontrado.',
      recommendation: serviceWww?.enabled
        ? ''
        : 'Ative /ip service www e limite o acesso à rede segura da VPS/VPN.',
    }),

    makeDiagnosticCheck({
      id: 'api_service_available',
      label: 'Serviço API tradicional',
      ok: Boolean(serviceApi?.enabled || serviceApiSsl?.enabled),
      severity: serviceApi?.enabled || serviceApiSsl?.enabled ? 'success' : 'warning',
      message: serviceApi?.enabled || serviceApiSsl?.enabled
        ? 'API tradicional encontrada ativa.'
        : 'API tradicional não está ativa. Para a NexaWi atual, REST via www já é suficiente.',
      recommendation: serviceApi?.enabled || serviceApiSsl?.enabled
        ? ''
        : 'Opcional: ativar api/api-ssl se futuramente for usar integração não REST.',
    }),

    makeDiagnosticCheck({
      id: 'hotspot_servers_found',
      label: 'Hotspot servers encontrados',
      ok: hotspotServers.length > 0,
      severity: hotspotServers.length > 0 ? 'success' : 'critical',
      message: hotspotServers.length > 0
        ? `${hotspotServers.length} hotspot server(s) encontrado(s).`
        : 'Nenhum hotspot server encontrado.',
      recommendation: hotspotServers.length > 0
        ? ''
        : 'Crie/configure o Hotspot no MikroTik antes de vincular ao portal NexaWi.',
    }),

    makeDiagnosticCheck({
      id: 'target_hotspot_server',
      label: 'Hotspot server configurado',
      ok: Boolean(selectedHotspotServer?.enabled),
      severity: selectedHotspotServer?.enabled ? 'success' : 'critical',
      message: selectedHotspotServer
        ? `Servidor ${targetHotspotServer} encontrado e ${selectedHotspotServer.enabled ? 'ativo' : 'desativado'}.`
        : `Servidor ${targetHotspotServer} não encontrado.`,
      recommendation: selectedHotspotServer?.enabled
        ? ''
        : 'Ajuste o campo Hotspot Server no cadastro do MikroTik ou renomeie o server no RouterOS.',
    }),

    makeDiagnosticCheck({
      id: 'policy_status',
      label: 'Política NexaWi legível',
      ok: Boolean(policyStatus?.ok),
      severity: policyStatus?.ok ? 'success' : 'warning',
      message: policyStatus?.ok
        ? `Política NexaWi: ${policyStatus.enabled ? 'ativa' : 'sem regras ativas'} | filter=${policyStatus.filterCount || 0}, nat=${policyStatus.natCount || 0}, dns=${policyStatus.dnsCount || 0}`
        : 'Não foi possível ler a política NexaWi.',
      recommendation: policyStatus?.ok
        ? ''
        : 'Aplique a política de rede pelo painel Controle de Rede.',
    }),
  ]

  const criticalIssues = checks.filter((check) => !check.ok && check.severity === 'critical')
  const warnings = checks.filter((check) => !check.ok && check.severity === 'warning')

  return {
    ok: criticalIssues.length === 0,
    ready: criticalIssues.length === 0,
    checkedAt: new Date().toISOString(),
    targetHotspotServer,
    summary: {
      criticalIssues: criticalIssues.length,
      warnings: warnings.length,
      checks: checks.length,
    },
    router: resource
      ? {
          boardName: resource['board-name'] || '',
          architectureName: resource['architecture-name'] || '',
          version: resource.version || '',
          uptime: resource.uptime || '',
          cpuLoad: resource['cpu-load'] || '',
          freeMemory: resource['free-memory'] || '',
          totalMemory: resource['total-memory'] || '',
          freeHddSpace: resource['free-hdd-space'] || '',
          totalHddSpace: resource['total-hdd-space'] || '',
        }
      : null,
    services,
    hotspotServers,
    hotspotProfiles,
    selectedHotspotServer,
    policyStatus,
    checks,
    errors: {
      resource: settledError(resourceResult),
      services: settledError(servicesResult),
      hotspotServers: settledError(hotspotServersResult),
      hotspotProfiles: settledError(hotspotProfilesResult),
      policyStatus: settledError(policyStatusResult),
    },
  }
}

export { normalizeMac }