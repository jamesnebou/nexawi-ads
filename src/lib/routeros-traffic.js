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

  if (!baseUrl) throw new Error('Base URL do MikroTik nao configurada')
  if (!username) throw new Error('Usuario do MikroTik nao configurado')
  if (!password) throw new Error('Senha do MikroTik nao configurada')

  return { baseUrl, username, password }
}

async function routerosFetch(path, { method = 'GET', body, routerConfig } = {}) {
  const { baseUrl, username, password } = getRouterConfig(routerConfig)

  let response

  try {
    response = await fetch(`${baseUrl}/rest${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
  } catch (error) {
    throw new Error(`RouterOS REST ${method} ${path} sem conexao: ${baseUrl}: ${error.message || 'fetch failed'}`)
  }

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

function formatMs(value = 0) {
  const ms = Number(value || 0)
  if (!Number.isFinite(ms) || ms <= 0) return '-'
  return `${ms.toFixed(0)} ms`
}

function getSpeedTestBytes(value = 0) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return 1000000000
  return Math.max(10000000, Math.min(bytes, 2000000000))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parsePingRows(data) {
  const rows = Array.isArray(data) ? data : data ? [data] : []
  const receivedRows = rows.filter((row) => {
    const received = String(row.received || row.status || '').toLowerCase()
    return received === '1' || received === 'true' || String(row.time || '').trim()
  })

  const times = receivedRows
    .map((row) => toNumber(row.time || row['avg-rtt'] || row.avgRtt))
    .filter((value) => value > 0)

  const sent = rows.length || 0
  const received = receivedRows.length
  const lossPercent = sent > 0 ? Math.max(0, Math.min(100, ((sent - received) / sent) * 100)) : null
  const averageMs = times.length
    ? times.reduce((total, value) => total + value, 0) / times.length
    : 0

  return {
    sent,
    received,
    lossPercent,
    averageMs,
    average: formatMs(averageMs),
    raw: data,
  }
}

function chooseInterface(interfaces = [], preferred = '') {
  const cleanPreferred = String(preferred || '').trim()

  if (cleanPreferred) {
    const exact = interfaces.find((item) => item.name === cleanPreferred)
    if (exact) return exact
  }

  const running = interfaces.filter((item) => String(item.running) === 'true' || item.running === true)
  const candidates = [...running, ...interfaces]
  const priorities = [/^pppoe/i, /wan/i, /^ether1$/i, /^ether/i, /^bridge/i]

  for (const pattern of priorities) {
    const found = candidates.find((item) => pattern.test(String(item.name || '')))
    if (found) return found
  }

  return candidates[0] || null
}

async function getInterfaces(routerConfig) {
  const interfacesRaw = await routerosFetch('/interface', { routerConfig })
  return Array.isArray(interfacesRaw) ? interfacesRaw : []
}

export async function monitorRouterTraffic({ routerConfig, interfaceName = '' }) {
  const interfaces = await getInterfaces(routerConfig)
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

function applySpeedTestBytes(url = '', bytes = 1000000000) {
  const cleanUrl = String(url || '').trim()
  if (!cleanUrl) return ''

  try {
    const parsedUrl = new URL(cleanUrl)
    if (parsedUrl.searchParams.has('bytes')) {
      parsedUrl.searchParams.set('bytes', String(bytes))
      return parsedUrl.toString()
    }
  } catch {
    return cleanUrl
  }

  return cleanUrl
}

function buildSpeedTestUrls(downloadUrl = '', bytes = 1000000000) {
  const size = getSpeedTestBytes(bytes)
  const configuredUrl =
    String(downloadUrl || '').trim() ||
    String(process.env.NEXAWI_SPEEDTEST_DOWNLOAD_URL || '').trim()

  if (configuredUrl) return [applySpeedTestBytes(configuredUrl, size)]

  const publicAppUrl = String(
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ''
  ).replace(/\/$/, '')
  const controlApiUrl = String(process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')
  const appUrl = publicAppUrl && !/localhost|127\.0\.0\.1/i.test(publicAppUrl)
    ? publicAppUrl
    : controlApiUrl && !/localhost|127\.0\.0\.1/i.test(controlApiUrl)
      ? controlApiUrl
      : 'https://www.nexawi.com.br'

  return [
    `${appUrl}/api/speedtest/download?bytes=${size}`,
    `http://speedtest.tele2.net/${size >= 1000000000 ? '1GB' : '100MB'}.zip`,
    `http://ipv4.download.thinkbroadband.com/${size >= 1000000000 ? '1GB' : '100MB'}.zip`,
    `https://speed.cloudflare.com/__down?bytes=${size}`,
  ]
}

async function getTargetInterface({ routerConfig, interfaceName = '' }) {
  const interfaces = await getInterfaces(routerConfig)
  const targetInterface = chooseInterface(interfaces, interfaceName)

  if (!targetInterface?.name) {
    throw new Error('Nenhuma interface encontrada para medir velocidade')
  }

  return targetInterface
}

function summarizeSamples(samples = []) {
  const validSamples = samples.filter((sample) => sample.rxBitsPerSecond > 0 || sample.txBitsPerSecond > 0)
  const rxValues = validSamples.map((sample) => sample.rxBitsPerSecond)
  const txValues = validSamples.map((sample) => sample.txBitsPerSecond)
  const peakRx = rxValues.length ? Math.max(...rxValues) : 0
  const peakTx = txValues.length ? Math.max(...txValues) : 0
  const avgRx = rxValues.length
    ? rxValues.reduce((total, value) => total + value, 0) / rxValues.length
    : 0
  const avgTx = txValues.length
    ? txValues.reduce((total, value) => total + value, 0) / txValues.length
    : 0

  return {
    samples: validSamples,
    samplesCount: validSamples.length,
    peakRxBitsPerSecond: peakRx,
    peakTxBitsPerSecond: peakTx,
    averageRxBitsPerSecond: avgRx,
    averageTxBitsPerSecond: avgTx,
    peakDownload: formatMbps(peakRx),
    averageDownload: formatMbps(avgRx),
    peakUpload: formatMbps(peakTx),
    averageUpload: formatMbps(avgTx),
  }
}

async function runFetchWithTrafficSampling({ routerConfig, interfaceName, url }) {
  const samples = []
  const startedAt = Date.now()
  let fetchResult = null
  let fetchError = null
  let finished = false

  const fetchPromise = routerosFetch('/tool/fetch', {
    method: 'POST',
    routerConfig,
    body: {
      url,
      output: 'none',
    },
  })
    .then((result) => {
      fetchResult = result
    })
    .catch((error) => {
      fetchError = error
    })
    .finally(() => {
      finished = true
    })

  for (let index = 0; index < 45; index += 1) {
    try {
      const sample = await monitorRouterTraffic({ routerConfig, interfaceName })
      samples.push({
        rxBitsPerSecond: sample.traffic.rxBitsPerSecond,
        txBitsPerSecond: sample.traffic.txBitsPerSecond,
        download: sample.traffic.download,
        upload: sample.traffic.upload,
        checkedAt: sample.checkedAt,
      })
    } catch (error) {
      samples.push({
        rxBitsPerSecond: 0,
        txBitsPerSecond: 0,
        error: error.message || 'Amostra indisponivel',
        checkedAt: new Date().toISOString(),
      })
    }

    if (finished) break
    await sleep(750)
  }

  await fetchPromise

  if (fetchError) throw fetchError

  const durationMs = Math.max(1, Date.now() - startedAt)
  const summary = summarizeSamples(samples)

  return {
    fetchResult,
    durationMs,
    ...summary,
  }
}

export async function runRouterInternetTest({
  routerConfig,
  interfaceName = '',
  downloadUrl = '',
  bytes = 1000000000,
  pingHost = '1.1.1.1',
}) {
  const testUrls = buildSpeedTestUrls(downloadUrl, bytes)

  let ping = null

  try {
    const pingResult = await routerosFetch('/ping', {
      method: 'POST',
      routerConfig,
      body: {
        address: pingHost,
        count: '5',
      },
    })

    ping = parsePingRows(pingResult)
  } catch (error) {
    ping = {
      sent: 0,
      received: 0,
      lossPercent: null,
      averageMs: 0,
      average: '-',
      error: error.message || 'Ping indisponivel',
    }
  }

  const attempts = []
  let successfulAttempt = null

  const targetInterface = await getTargetInterface({ routerConfig, interfaceName })

  for (const testUrl of testUrls) {
    try {
      const attemptResult = await runFetchWithTrafficSampling({
        routerConfig,
        interfaceName: targetInterface.name,
        url: testUrl,
      })

      successfulAttempt = {
        ok: attemptResult.peakRxBitsPerSecond > 0,
        url: testUrl,
        fetchResult: attemptResult.fetchResult,
        interface: {
          id: targetInterface['.id'] || '',
          name: targetInterface.name,
          type: targetInterface.type || '',
          running: targetInterface.running === true || targetInterface.running === 'true',
          disabled: targetInterface.disabled === true || targetInterface.disabled === 'true',
        },
        durationMs: attemptResult.durationMs,
        samplesCount: attemptResult.samplesCount,
        samples: attemptResult.samples,
        downloadBitsPerSecond: attemptResult.averageRxBitsPerSecond,
        peakDownloadBitsPerSecond: attemptResult.peakRxBitsPerSecond,
        uploadBitsPerSecond: attemptResult.averageTxBitsPerSecond,
        peakUploadBitsPerSecond: attemptResult.peakTxBitsPerSecond,
        download: attemptResult.averageDownload,
        peakDownload: attemptResult.peakDownload,
        upload: attemptResult.averageUpload,
        peakUpload: attemptResult.peakUpload,
      }

      attempts.push(successfulAttempt)

      if (successfulAttempt.ok) break
    } catch (error) {
      attempts.push({
        ok: false,
        url: testUrl,
        error: error.message || 'Falha no download de teste',
      })
    }
  }

  if (!successfulAttempt?.ok) {
    const details = attempts
      .map((attempt) => `${attempt.url}: ${attempt.error || 'sem trafego medido durante o download'}`)
      .join(' | ')

    throw new Error(`Teste de internet sem medicao valida. ${details}`)
  }

  return {
    ok: true,
    mode: 'internet-test',
    interface: successfulAttempt.interface,
    internetTest: {
      downloadBitsPerSecond: successfulAttempt.downloadBitsPerSecond,
      peakDownloadBitsPerSecond: successfulAttempt.peakDownloadBitsPerSecond,
      uploadBitsPerSecond: successfulAttempt.uploadBitsPerSecond,
      peakUploadBitsPerSecond: successfulAttempt.peakUploadBitsPerSecond,
      download: successfulAttempt.download,
      peakDownload: successfulAttempt.peakDownload,
      upload: successfulAttempt.upload,
      peakUpload: successfulAttempt.peakUpload,
      downloadUrl: successfulAttempt.url,
      durationMs: successfulAttempt.durationMs,
      durationSeconds: Number((successfulAttempt.durationMs / 1000).toFixed(2)),
      samplesCount: successfulAttempt.samplesCount,
      samples: successfulAttempt.samples,
      pingHost,
      ping,
      attempts,
      note: 'Medicao feita por amostras de monitor-traffic durante download controlado. Use roteador sem outros trafegos concorrentes para cobrar fornecedor.',
    },
    checkedAt: new Date().toISOString(),
  }
}
