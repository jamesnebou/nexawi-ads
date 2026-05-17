import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { applyNexawiNetworkPolicy } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

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

function domainsConflict(domainA = '', domainB = '') {
  const cleanA = normalizeDomain(domainA)
  const cleanB = normalizeDomain(domainB)

  if (!cleanA || !cleanB) return false

  return (
    cleanA === cleanB ||
    cleanA.endsWith(`.${cleanB}`) ||
    cleanB.endsWith(`.${cleanA}`)
  )
}

function domainMatchesAny(domain = '', domains = []) {
  return uniqueDomains(domains).some((candidate) => domainsConflict(domain, candidate))
}

function filterDomainsAgainstAllowed(domains = [], allowedDomains = []) {
  const allowed = uniqueDomains(allowedDomains)

  return uniqueDomains(domains).filter((domain) => !domainMatchesAny(domain, allowed))
}

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
    throw new Error(data?.error || 'Erro na Control API')
  }

  return data
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

  return {
    hotspot,
    router,
    routerConfig: {
      baseUrl: router.base_url,
      username: router.username,
      password: router.password,
      hotspotServer: router.hotspot_server || 'hotspot1',
    },
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  if (!auth.isMaster && !auth.permissions?.hotspots?.update) {
    return NextResponse.json(
      { ok: false, error: 'Sem permissão para alterar controle de rede' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const hotspotId = body.hotspotId
    const hotspotSlug = body.hotspotSlug

    if (!hotspotId && !hotspotSlug) {
      throw new Error('hotspotId ou hotspotSlug é obrigatório')
    }

    const context = await resolveNetworkContext({ hotspotId, hotspotSlug })

    const policyPayload = {
      hotspot_id: context.hotspot.id,
      router_id: context.router.id,
      hotspot_subnet: body.hotspotSubnet || '192.168.88.0/24',
      force_dns: body.forceDns !== false,
      block_quic: body.blockQuic !== false,
      block_torrent: body.blockTorrent !== false,
      block_games: body.blockGames !== false,
      block_tls_games: body.blockTlsGames !== false,
      download_limit: body.downloadLimit || '10M',
      upload_limit: body.uploadLimit || '3M',
      active: true,
      updated_at: new Date().toISOString(),
    }

    const { data: policy, error: policyError } = await supabaseAdmin
      .from('network_policies')
      .upsert([policyPayload], {
        onConflict: 'hotspot_id',
      })
      .select('*')
      .single()

    if (policyError) throw policyError

    const requestedBlockedDomains = uniqueDomains(body.customBlockedDomains || [])
    const allowedDomains = uniqueDomains(body.customAllowedDomains || [])

    // Segurança backend:
    // Sites Permitidos têm prioridade máxima, mesmo se a API for chamada direto.
    const blockedDomains = filterDomainsAgainstAllowed(
      requestedBlockedDomains,
      allowedDomains
    )

    const allowedOverridesBlockedDomains = requestedBlockedDomains.filter((domain) =>
      domainMatchesAny(domain, allowedDomains)
    )

    await supabaseAdmin
      .from('network_policy_domains')
      .delete()
      .eq('policy_id', policy.id)

    const domainRows = [
      ...blockedDomains.map((domain) => ({
        policy_id: policy.id,
        domain,
        type: 'blocked',
        enabled: true,
      })),
      ...allowedDomains.map((domain) => ({
        policy_id: policy.id,
        domain,
        type: 'allowed',
        enabled: true,
      })),
    ]

    if (domainRows.length > 0) {
      const { error: domainsInsertError } = await supabaseAdmin
        .from('network_policy_domains')
        .insert(domainRows)

      if (domainsInsertError) throw domainsInsertError
    }

    const controlPayload = {
      routerConfig: context.routerConfig,
      hotspotSubnet: policy.hotspot_subnet,
      forceDns: policy.force_dns,
      blockQuic: policy.block_quic,
      blockTorrent: policy.block_torrent,
      blockGames: policy.block_games,
      blockTlsGames: policy.block_tls_games,
      customBlockedDomains: blockedDomains,
      customAllowedDomains: allowedDomains,
    }

    let result = null

    try {
      result = await callControlApi('/api/control/router/policy/apply', {
        method: 'POST',
        body: controlPayload,
      })
    } catch (controlError) {
      try {
        result = await applyNexawiNetworkPolicy(controlPayload)
      } catch (directError) {
        throw new Error(`${directError.message || 'Falha direta no MikroTik'} | Control API: ${controlError.message || 'falhou'}`)
      }
    }

    const resultWithBackendPolicyMeta = {
      ...(result || {}),
      allowedOverridesBlockedDomains: uniqueDomains([
        ...(result?.allowedOverridesBlockedDomains || []),
        ...allowedOverridesBlockedDomains,
      ]),
      backendRemovedBlockedByAllowed: allowedOverridesBlockedDomains,
      backendSanitizedDomains: allowedOverridesBlockedDomains.length > 0,
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
      policy,
      domains: domainRows,
      result: resultWithBackendPolicyMeta,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao aplicar política de rede',
      },
      { status: 500 }
    )
  }
}
