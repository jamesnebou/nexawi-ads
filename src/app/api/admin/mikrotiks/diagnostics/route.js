import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

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
    throw new Error(data?.error || 'Erro ao chamar Control API')
  }

  return data
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

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json().catch(() => ({}))
    const id = limparTexto(body.id)
    const manualRouter = body.router || body.routerConfig || null

    let router = null
    let routerConfig = null
    let entityId = id || null

    if (id) {
      router = await getRouterById(id)

      if (!router.password) {
        return NextResponse.json(
          { ok: false, error: 'Senha do MikroTik não configurada' },
          { status: 400 }
        )
      }

      routerConfig = {
        baseUrl: router.base_url,
        username: router.username,
        password: router.password,
        hotspotServer: router.hotspot_server || 'hotspot1',
      }
    } else if (manualRouter) {
      const baseUrl = limparTexto(manualRouter.base_url || manualRouter.baseUrl)
      const username = limparTexto(manualRouter.username)
      const password = limparTexto(manualRouter.password)
      const hotspotServer = limparTexto(manualRouter.hotspot_server || manualRouter.hotspotServer) || 'hotspot1'

      if (!baseUrl) {
        return NextResponse.json(
          { ok: false, error: 'Base URL é obrigatória para diagnosticar' },
          { status: 400 }
        )
      }

      if (!username) {
        return NextResponse.json(
          { ok: false, error: 'Usuário é obrigatório para diagnosticar' },
          { status: 400 }
        )
      }

      if (!password) {
        return NextResponse.json(
          { ok: false, error: 'Senha é obrigatória para diagnosticar' },
          { status: 400 }
        )
      }

      router = {
        id: null,
        nome: limparTexto(manualRouter.nome) || 'MikroTik não salvo',
        slug: limparTexto(manualRouter.slug) || '',
        base_url: baseUrl,
        username,
        hotspot_server: hotspotServer,
        status: 'Preview',
      }

      routerConfig = {
        baseUrl,
        username,
        password,
        hotspotServer,
      }
    } else {
      return NextResponse.json(
        { ok: false, error: 'Informe o ID do MikroTik ou os dados manuais para diagnóstico' },
        { status: 400 }
      )
    }

    const result = await callControlApi('/api/control/router/diagnostics', {
      method: 'POST',
      body: {
        routerConfig,
      },
    })

    await logAdminAction({
      request,
      adminUser: auth.user,
      action: 'diagnostics',
      entity: 'network_routers',
      entityId,
      description: 'Executou diagnóstico de MikroTik',
      metadata: {
        router_id: router.id || null,
        router_slug: router.slug || '',
        ready: Boolean(result?.ready),
        criticalIssues: result?.summary?.criticalIssues || 0,
        warnings: result?.summary?.warnings || 0,
      },
    })

    return NextResponse.json({
      ok: true,
      router: {
        id: router.id || null,
        nome: router.nome,
        slug: router.slug,
        base_url: router.base_url,
        username: router.username,
        hotspot_server: router.hotspot_server,
        status: router.status,
      },
      diagnostics: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao diagnosticar MikroTik',
      },
      { status: 500 }
    )
  }
}
