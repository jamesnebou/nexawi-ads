import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'
import { applyNexawiNetworkPolicy } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

const DEFAULT_POLICY = {
  hotspotSubnet: '192.168.88.0/24',
  forceDns: true,
  blockQuic: true,
  blockTorrent: true,
  blockGames: true,
  blockTlsGames: true,
  downloadLimit: '10M',
  uploadLimit: '3M',
  customBlockedDomains: [],
  customAllowedDomains: [],
}

function limparTexto(value = '') {
  return String(value || '').trim()
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return value === true || value === 'true' || value === '1' || value === 1
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
    throw new Error(data?.error || 'Erro ao chamar Control API')
  }

  return data
}

async function upsertNetworkPolicy({ hotspotId, policy }) {
  const payload = {
    hotspot_id: hotspotId,
    hotspot_subnet: policy.hotspotSubnet,
    force_dns: policy.forceDns,
    block_quic: policy.blockQuic,
    block_torrent: policy.blockTorrent,
    block_games: policy.blockGames,
    block_tls_games: policy.blockTlsGames,
    download_limit: policy.downloadLimit,
    upload_limit: policy.uploadLimit,
    active: true,
    updated_at: new Date().toISOString(),
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('network_policies')
    .select('id')
    .eq('hotspot_id', hotspotId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from('network_policies')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabaseAdmin
    .from('network_policies')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data
}

function sanitizeRouter(router) {
  return {
    id: router.id,
    nome: router.nome,
    slug: router.slug,
    base_url: router.base_url,
    username: router.username,
    hotspot_server: router.hotspot_server,
    status: router.status,
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'update',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json().catch(() => ({}))

    const routerId = limparTexto(body.routerId || body.router_id)
    const hotspotId = limparTexto(body.hotspotId || body.hotspot_id)
    const applyBasePolicy = boolValue(body.applyBasePolicy || body.apply_base_policy, false)

    if (!routerId) {
      return NextResponse.json(
        { ok: false, error: 'ID do MikroTik é obrigatório' },
        { status: 400 }
      )
    }

    if (!hotspotId) {
      return NextResponse.json(
        { ok: false, error: 'ID do Hotspot é obrigatório' },
        { status: 400 }
      )
    }

    const { data: router, error: routerError } = await supabaseAdmin
      .from('network_routers')
      .select('id,nome,slug,base_url,username,password,hotspot_server,status')
      .eq('id', routerId)
      .maybeSingle()

    if (routerError) throw routerError

    if (!router) {
      return NextResponse.json(
        { ok: false, error: 'MikroTik não encontrado' },
        { status: 404 }
      )
    }

    const { data: hotspot, error: hotspotError } = await supabaseAdmin
      .from('hotspots')
      .select('id,nome,slug,router_id,status')
      .eq('id', hotspotId)
      .maybeSingle()

    if (hotspotError) throw hotspotError

    if (!hotspot) {
      return NextResponse.json(
        { ok: false, error: 'Hotspot não encontrado' },
        { status: 404 }
      )
    }

    const { data: updatedHotspot, error: updateError } = await supabaseAdmin
      .from('hotspots')
      .update({
        router_id: router.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hotspot.id)
      .select('id,nome,slug,router_id,status')
      .single()

    if (updateError) throw updateError

    let policy = null
    let policyApply = null

    if (applyBasePolicy) {
      if (!router.password) {
        policyApply = {
          ok: false,
          error: 'Senha do MikroTik não configurada. Vínculo feito, mas política não aplicada.',
        }
      } else {
        const policyPayload = {
          ...DEFAULT_POLICY,
          hotspotSubnet: limparTexto(body.hotspotSubnet || body.hotspot_subnet) || DEFAULT_POLICY.hotspotSubnet,
          downloadLimit: limparTexto(body.downloadLimit || body.download_limit) || DEFAULT_POLICY.downloadLimit,
          uploadLimit: limparTexto(body.uploadLimit || body.upload_limit) || DEFAULT_POLICY.uploadLimit,
          forceDns: boolValue(body.forceDns ?? body.force_dns, DEFAULT_POLICY.forceDns),
          blockQuic: boolValue(body.blockQuic ?? body.block_quic, DEFAULT_POLICY.blockQuic),
          blockTorrent: boolValue(body.blockTorrent ?? body.block_torrent, DEFAULT_POLICY.blockTorrent),
          blockGames: boolValue(body.blockGames ?? body.block_games, DEFAULT_POLICY.blockGames),
          blockTlsGames: boolValue(body.blockTlsGames ?? body.block_tls_games, DEFAULT_POLICY.blockTlsGames),
        }

        policy = await upsertNetworkPolicy({
          hotspotId: hotspot.id,
          policy: policyPayload,
        })

        const routerConfig = {
          baseUrl: router.base_url,
          username: router.username,
          password: router.password,
          hotspotServer: router.hotspot_server || 'hotspot1',
        }

        const applyPayload = {
          ...policyPayload,
          routerConfig,
        }

        try {
          policyApply = await callControlApi('/api/control/router/policy/apply', {
            method: 'POST',
            body: applyPayload,
          })
        } catch (controlError) {
          try {
            policyApply = await applyNexawiNetworkPolicy(applyPayload)
          } catch (directError) {
            policyApply = {
              ok: false,
              error: `${directError.message || 'Falha direta no MikroTik'} | Control API: ${controlError.message || 'falhou'}`,
            }
          }
        }

        if (!policyApply) {
          policyApply = {
            ok: false,
            error: 'Erro ao aplicar politica base',
          }
        }
      }
    }

    await logAdminAction({
      request,
      adminUser: auth.user,
      action: 'link_hotspot',
      entity: 'network_routers',
      entityId: router.id,
      description: applyBasePolicy
        ? 'Vinculou MikroTik a Hotspot e tentou aplicar política base'
        : 'Vinculou MikroTik a Hotspot',
      metadata: {
        router_id: router.id,
        router_slug: router.slug,
        hotspot_id: hotspot.id,
        hotspot_slug: hotspot.slug,
        previous_router_id: hotspot.router_id || null,
        apply_base_policy: applyBasePolicy,
        policy_apply_ok: policyApply?.ok ?? null,
      },
    })

    return NextResponse.json({
      ok: true,
      router: sanitizeRouter(router),
      hotspot: updatedHotspot,
      policy,
      policyApply,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao vincular MikroTik ao Hotspot',
      },
      { status: 500 }
    )
  }
}
