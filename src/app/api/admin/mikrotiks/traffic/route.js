import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-control-secret': secret,
      'x-cron-secret': secret,
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
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

    const result = await callControlApi('/api/control/router/traffic', {
      method: 'POST',
      body: {
        routerConfig,
        interfaceName,
      },
    })

    return NextResponse.json({
      ok: true,
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
