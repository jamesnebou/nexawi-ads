import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { monitorRouterTraffic, runRouterInternetTest } from '@/lib/routeros-traffic'

export const runtime = 'nodejs'

function clean(value = '') {
  return String(value || '').trim()
}

async function getRouterById(id) {
  const { data, error } = await supabaseAdmin
    .from('network_routers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('MikroTik não encontrado')

  return data
}

async function callControlApi(path, { method = 'POST', body } = {}) {
  const baseUrl = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')
  const secret = process.env.NEXAWI_CONTROL_SECRET || process.env.NEXAWI_CRON_SECRET

  if (!baseUrl) throw new Error('CONTROL_API_BASE_URL não configurado')
  if (!secret) throw new Error('NEXAWI_CONTROL_SECRET não configurado')

  let response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-control-secret': secret,
        'x-cron-secret': secret,
      },
      cache: 'no-store',
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    throw new Error(`Control API indisponivel em ${baseUrl}. ${error.message || 'fetch failed'}`)
  }

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Control API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao chamar Control API')
  }

  return data
}

function isInternetTestMode(mode = '') {
  return mode === 'speed-test' || mode === 'internet-test'
}

function getRouterHost(baseUrl = '') {
  try {
    return new URL(/^https?:\/\//i.test(baseUrl) ? baseUrl : `http://${baseUrl}`).hostname
  } catch {
    return ''
  }
}

function isPrivateOrVpnHost(host = '') {
  return (
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^127\./.test(host) ||
    /^localhost$/i.test(host)
  )
}

function assertValidInternetTestResult(result) {
  const internetTest = result?.internetTest || {}
  const peak = Number(internetTest.peakDownloadBitsPerSecond || 0)
  const average = Number(internetTest.downloadBitsPerSecond || 0)
  const samples = Number(internetTest.samplesCount || 0)

  if (peak > 0 && average > 0 && samples > 0) return

  throw new Error('Control API retornou teste de internet sem medicao valida')
}

async function runDirectRouterTest({ mode, routerConfig, interfaceName, body }) {
  if (isInternetTestMode(mode)) {
    return runRouterInternetTest({
      routerConfig,
      interfaceName,
      bytes: body.bytes,
      downloadUrl: body.downloadUrl,
      pingHost: body.pingHost || '1.1.1.1',
    })
  }

  return monitorRouterTraffic({
    routerConfig,
    interfaceName,
  })
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const routerId = clean(body.routerId || body.id)
    const interfaceName = clean(body.interfaceName || body.interface)
    const mode = clean(body.mode || body.type || 'traffic')

    if (!routerId) {
      return NextResponse.json(
        { ok: false, error: 'ID do MikroTik é obrigatório' },
        { status: 400 }
      )
    }

    const router = await getRouterById(routerId)

    const routerConfig = {
      baseUrl: router.base_url,
      username: router.username,
      password: router.password,
      hotspotServer: router.hotspot_server || 'hotspot1',
    }

    const controlPayload = {
      routerConfig,
      interfaceName,
      mode,
      bytes: body.bytes,
      downloadUrl: body.downloadUrl,
      pingHost: body.pingHost,
    }

    let result
    let source = 'control-api'
    let controlApiError = ''
    const routerHost = getRouterHost(routerConfig.baseUrl)
    const shouldPreferDirect = Boolean(body.preferDirect) && !isPrivateOrVpnHost(routerHost)

    try {
      if (shouldPreferDirect) {
        source = 'direct-routeros'
        result = await runDirectRouterTest({
          mode,
          routerConfig,
          interfaceName,
          body,
        })
      } else {
        result = await callControlApi('/api/control/router/traffic', {
          method: 'POST',
          body: controlPayload,
        })

        if (isInternetTestMode(mode)) {
          assertValidInternetTestResult(result)
        }
      }
    } catch (error) {
      controlApiError = error.message || 'Control API indisponivel'
      if (isPrivateOrVpnHost(routerHost)) {
        throw new Error(
          `${controlApiError}. Este MikroTik usa IP privado/VPN (${routerHost}); o painel precisa passar pela Control API da VPS para acessar o roteador.`
        )
      }

      source = 'direct-routeros'
      result = await runDirectRouterTest({
        mode,
        routerConfig,
        interfaceName,
        body,
      })
    }

    return NextResponse.json({
      ok: true,
      source,
      controlApiError,
      router: {
        id: router.id,
        nome: router.nome,
        slug: router.slug,
      },
      monitor: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao monitorar MikroTik',
      },
      { status: 500 }
    )
  }
}
