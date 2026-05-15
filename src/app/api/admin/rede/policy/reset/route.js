import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function callControlApi(path, { method = 'POST', body } = {}) {
  const baseUrl = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')
  const secret = process.env.NEXAWI_CRON_SECRET

  if (!baseUrl) throw new Error('CONTROL_API_BASE_URL não configurado')
  if (!secret) throw new Error('NEXAWI_CRON_SECRET não configurado')

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-control-secret': secret,
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
      { ok: false, error: 'Sem permissão para resetar controle de rede' },
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

    const result = await callControlApi('/api/control/router/policy/reset', {
      method: 'POST',
      body: {
        routerConfig: context.routerConfig,
      },
    })

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
      result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao resetar política de rede',
      },
      { status: 500 }
    )
  }
}