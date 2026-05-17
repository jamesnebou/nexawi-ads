import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function pct(cliques, views) {
  return views > 0 ? Number(((cliques / views) * 100).toFixed(2)) : 0
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'dashboard_anunciante',
    action: 'view',
    requireEmpresa: true,
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const empresaId = auth.activeEmpresaId

    let [empresaRes, anunciosRes, hotspotsRes, leadsRes, viewsRes, clicksRes] = await Promise.all([
      supabaseAdmin
        .from('empresas')
        .select('id, nome_empresa, nome_responsavel, email, telefone, cidade, estado, status')
        .eq('id', empresaId)
        .maybeSingle(),
      supabaseAdmin
        .from('anuncios')
        .select('id, titulo, descricao, url_destino, media_url, duracao_segundos, ativo, created_at, cliente_id, empresa_id')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('hotspots')
        .select('id, nome, slug, cidade, estado, status, visualizacoes, router_id, empresa_id')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('leads')
        .select('id, nome, email, telefone, created_at, hotspot_id, anuncio_id, empresa_id')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('anuncio_views')
        .select('id, anuncio_id, hotspot_id, timestamp, empresa_id')
        .eq('empresa_id', empresaId),
      supabaseAdmin
        .from('anuncio_clicks')
        .select('id, anuncio_id, hotspot_id, timestamp, tipo_acao, empresa_id')
        .eq('empresa_id', empresaId),
    ])

    for (const result of [empresaRes, anunciosRes, hotspotsRes, leadsRes, viewsRes, clicksRes]) {
      if (result.error) throw result.error
    }

    const anuncios = anunciosRes.data || []
    const hotspots = hotspotsRes.data || []
    const leads = leadsRes.data || []
    const views = viewsRes.data || []
    const clicks = clicksRes.data || []

    const viewsPorAnuncio = views.reduce((acc, item) => {
      if (!item.anuncio_id) return acc
      acc[item.anuncio_id] = (acc[item.anuncio_id] || 0) + 1
      return acc
    }, {})

    const clicksPorAnuncio = clicks.reduce((acc, item) => {
      if (!item.anuncio_id) return acc
      acc[item.anuncio_id] = (acc[item.anuncio_id] || 0) + 1
      return acc
    }, {})

    const leadsPorAnuncio = leads.reduce((acc, item) => {
      if (!item.anuncio_id) return acc
      acc[item.anuncio_id] = (acc[item.anuncio_id] || 0) + 1
      return acc
    }, {})

    const campanhas = anuncios.map((anuncio) => {
      const visualizacoes = viewsPorAnuncio[anuncio.id] || 0
      const cliques = clicksPorAnuncio[anuncio.id] || 0

      return {
        ...anuncio,
        metricas: {
          visualizacoes,
          cliques,
          leads: leadsPorAnuncio[anuncio.id] || 0,
          ctr: pct(cliques, visualizacoes),
        },
      }
    })

    const viewsPorHotspot = views.reduce((acc, item) => {
      if (!item.hotspot_id) return acc
      acc[item.hotspot_id] = (acc[item.hotspot_id] || 0) + 1
      return acc
    }, {})

    const clicksPorHotspot = clicks.reduce((acc, item) => {
      if (!item.hotspot_id) return acc
      acc[item.hotspot_id] = (acc[item.hotspot_id] || 0) + 1
      return acc
    }, {})

    const hotspotsComMetricas = hotspots.map((hotspot) => {
      const visualizacoes = viewsPorHotspot[hotspot.id] || Number(hotspot.visualizacoes || 0)
      const cliques = clicksPorHotspot[hotspot.id] || 0

      return {
        ...hotspot,
        metricas: {
          visualizacoes,
          cliques,
          ctr: pct(cliques, visualizacoes),
        },
      }
    })

    const visualizacoes = views.length
    const cliques = clicks.length

    return NextResponse.json({
      ok: true,
      empresa: empresaRes.data,
      resumo: {
        campanhas: anuncios.length,
        campanhasAtivas: anuncios.filter((item) => item.ativo !== false).length,
        hotspots: hotspots.length,
        leads: leads.length,
        visualizacoes,
        cliques,
        ctr: pct(cliques, visualizacoes),
      },
      campanhas,
      hotspots: hotspotsComMetricas,
      leadsRecentes: leads,
      empresaScope: auth.empresaScope,
      permissions: auth.empresaPermissions?.dashboard_anunciante || auth.permissions?.dashboard_anunciante || {},
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar dashboard do anunciante.' },
      { status: 500 }
    )
  }
}
