import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
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
      .select('id,nome,slug,base_url,hotspot_server,status')
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

    await logAdminAction({
      request,
      adminUser: auth.user,
      action: 'link_hotspot',
      entity: 'network_routers',
      entityId: router.id,
      description: 'Vinculou MikroTik a Hotspot',
      metadata: {
        router_id: router.id,
        router_slug: router.slug,
        hotspot_id: hotspot.id,
        hotspot_slug: hotspot.slug,
        previous_router_id: hotspot.router_id || null,
      },
    })

    return NextResponse.json({
      ok: true,
      router,
      hotspot: updatedHotspot,
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
