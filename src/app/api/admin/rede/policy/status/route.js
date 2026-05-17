import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getNexawiNetworkPolicyStatus } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

async function callControlApi(path, { method = 'POST', body } = {}) {
  const baseUrl = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')
  const secret = process.env.NEXAWI_CONTROL_SECRET || process.env.NEXAWI_CRON_SECRET
  const controlSecret = process.env.NEXAWI_CONTROL_SECRET || secret
  const cronSecret = process.env.NEXAWI_CRON_SECRET || secret

  if (!baseUrl) throw new Error('CONTROL_API_BASE_URL não configurado')
  if (!secret) throw new Error('NEXAWI_CRON_SECRET não configurado')

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-control-secret': controlSecret,
      'x-cron-secret': cronSecret,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Control API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao consultar Control API')
  }

  return data
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isControlUnauthorized(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('nÃ£o autorizado') || message.includes('não autorizado')
}

function createUnavailableStatus(error) {
  const cause = error?.cause
  const causeMessage = cause?.message || cause?.code || cause?.errno || ''
  const detail = [
    error?.message || 'Router unavailable',
    causeMessage ? `Cause: ${causeMessage}` : '',
  ].filter(Boolean).join(' | ')

  return {
    ok: false,
    enabled: false,
    unavailable: true,
    error: detail || 'Router unavailable',
    filterCount: 0,
    natCount: 0,
    dnsCount: 0,
    filters: [],
    natRules: [],
    dnsRules: [],
    checkedAt: new Date().toISOString(),
  }
}

async function resolveNetworkContext({ hotspotId, hotspotSlug }) {
  let query = supabaseAdmin
    .from('hotspots')
    .select('id, nome, slug, status, router_id')

  if (hotspotId) {
    query = query.eq('id', hotspotId)
  } else {
    query = query.eq('slug', hotspotSlug)
  }

  const { data: hotspot, error: hotspotError } = await query.maybeSingle()

  if (hotspotError) throw hotspotError
  if (!hotspot) throw new Error('Hotspot não encontrado')
  if (!hotspot.router_id) throw new Error('Hotspot sem MikroTik vinculado')

  const { data: router, error: routerError } = await supabaseAdmin
    .from('network_routers')
    .select('*')
    .eq('id', hotspot.router_id)
    .maybeSingle()

  if (routerError) throw routerError
  if (!router) throw new Error('MikroTik vinculado não encontrado')

  const { data: policy, error: policyError } = await supabaseAdmin
    .from('network_policies')
    .select('*')
    .eq('hotspot_id', hotspot.id)
    .maybeSingle()

  if (policyError) throw policyError

  const { data: domains, error: domainsError } = await supabaseAdmin
    .from('network_policy_domains')
    .select('id, domain, type, enabled, created_at')
    .eq('policy_id', policy?.id || '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false })

  if (domainsError) throw domainsError

  return {
    hotspot,
    router,
    policy,
    domains: domains || [],
    routerConfig: {
      baseUrl: router.base_url,
      username: router.username,
      password: router.password,
      hotspotServer: router.hotspot_server || 'hotspot1',
    },
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  const canView = Boolean(auth.isMaster || auth.permissions?.hotspots?.view)
  const canUpdate = Boolean(auth.isMaster || auth.permissions?.hotspots?.update)

  if (!canView) {
    return NextResponse.json(
      { ok: false, error: 'Sem permissão para visualizar controle de rede' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const hotspotId = searchParams.get('hotspotId')
    const hotspotSlug = searchParams.get('hotspotSlug')

    if (!hotspotId && !hotspotSlug) {
      throw new Error('hotspotId ou hotspotSlug é obrigatório')
    }

    const context = await resolveNetworkContext({ hotspotId, hotspotSlug })

    let status = null

    try {
      status = await callControlApi('/api/control/router/policy/status', {
        method: 'POST',
        body: {
          routerConfig: context.routerConfig,
        },
      })
    } catch (controlError) {
      try {
        status = await getNexawiNetworkPolicyStatus({
          routerConfig: context.routerConfig,
        })
      } catch (directError) {
        status = createUnavailableStatus(
          new Error(`${directError.message || 'Falha direta no MikroTik'} | Control API: ${controlError.message || 'falhou'}`)
        )
      }
    }

    return NextResponse.json({
      ok: true,
      hotspot: context.hotspot,
      router: {
        id: context.router.id,
        nome: context.router.nome,
        slug: context.router.slug,
        base_url: context.router.base_url,
        hotspot_server: context.router.hotspot_server,
        status: context.router.status,
      },
      policy: context.policy,
      domains: context.domains,
      status,
      permissions: {
        view: canView,
        update: canUpdate,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao consultar política de rede',
        permissions: {
          view: canView,
          update: canUpdate,
        },
      },
      { status: 500 }
    )
  }
}
