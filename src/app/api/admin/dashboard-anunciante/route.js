import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function pct(cliques, views) {
  return views > 0 ? Number(((cliques / views) * 100).toFixed(2)) : 0
}

function uniqueCount(rows = [], keyName = 'ip_address') {
  const set = new Set()

  rows.forEach((row) => {
    set.add(row[keyName] || row.id)
  })

  return set.size
}

function getDataInicio(periodo = 'ultimos_30') {
  const agora = new Date()

  if (periodo === 'hoje') {
    agora.setHours(0, 0, 0, 0)
    return agora.toISOString()
  }

  if (periodo === 'ultimos_7') {
    agora.setDate(agora.getDate() - 7)
    return agora.toISOString()
  }

  if (periodo === 'ultimos_30') {
    agora.setDate(agora.getDate() - 30)
    return agora.toISOString()
  }

  if (periodo === 'mes_atual') {
    return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  }

  return null
}

async function buscarEventosDaEmpresa({ tabela, empresaId, periodo, extras = '' }) {
  const dataInicio = getDataInicio(periodo)
  const colunasDeData = ['timestamp', 'created_at']
  let ultimoErro = null

  for (const colunaData of colunasDeData) {
    const selectColumns = [
      'id',
      'empresa_id',
      'anuncio_id',
      'hotspot_id',
      'ip_address',
      extras,
      colunaData,
    ].filter(Boolean).join(', ')

    let query = supabaseAdmin
      .from(tabela)
      .select(selectColumns)
      .eq('empresa_id', empresaId)

    if (dataInicio) {
      query = query.gte(colunaData, dataInicio)
    }

    const { data, error } = await query

    if (!error) {
      return data || []
    }

    ultimoErro = error
  }

  throw ultimoErro
}

async function buscarLeadsDaEmpresa({ empresaId, periodo }) {
  const dataInicio = getDataInicio(periodo)

  let query = supabaseAdmin
    .from('leads')
    .select('id, empresa_id, nome, email, telefone, created_at, hotspot_id, anuncio_id, ip_address')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (dataInicio) {
    query = query.gte('created_at', dataInicio)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'dashboard_anunciante',
    action: 'view',
    requireEmpresa: true,
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'ultimos_30'
    const empresaId = auth.activeEmpresaId

    const [empresaRes, anunciosRes, hotspotsRes, leads, views, clicks] = await Promise.all([
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
      buscarLeadsDaEmpresa({ empresaId, periodo }),
      buscarEventosDaEmpresa({ tabela: 'anuncio_views', empresaId, periodo }),
      buscarEventosDaEmpresa({ tabela: 'anuncio_clicks', empresaId, periodo, extras: 'tipo_acao' }),
    ])

    if (empresaRes.error) throw empresaRes.error
    if (anunciosRes.error) throw anunciosRes.error
    if (hotspotsRes.error) throw hotspotsRes.error

    const anuncios = anunciosRes.data || []
    const hotspots = hotspotsRes.data || []

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
          usuarios_unicos: uniqueCount(views.filter((item) => item.anuncio_id === anuncio.id)),
          ctr: pct(cliques, visualizacoes),
        },
      }
    }).sort((a, b) => Number(b.metricas.visualizacoes || 0) - Number(a.metricas.visualizacoes || 0))

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

    const leadsPorHotspot = leads.reduce((acc, item) => {
      if (!item.hotspot_id) return acc
      acc[item.hotspot_id] = (acc[item.hotspot_id] || 0) + 1
      return acc
    }, {})

    const hotspotsComMetricas = hotspots.map((hotspot) => {
      const visualizacoes = viewsPorHotspot[hotspot.id] || Number(hotspot.visualizacoes || 0)
      const cliques = clicksPorHotspot[hotspot.id] || 0
      const hotspotViews = views.filter((item) => item.hotspot_id === hotspot.id)

      return {
        ...hotspot,
        metricas: {
          visualizacoes,
          cliques,
          leads: leadsPorHotspot[hotspot.id] || 0,
          usuarios_unicos: uniqueCount(hotspotViews),
          ctr: pct(cliques, visualizacoes),
        },
      }
    }).sort((a, b) => Number(b.metricas.visualizacoes || 0) - Number(a.metricas.visualizacoes || 0))

    const visualizacoes = views.length
    const cliques = clicks.length
    const viewsComHotspotReal = views.filter((item) => Boolean(item.hotspot_id)).length
    const clicksComHotspotReal = clicks.filter((item) => Boolean(item.hotspot_id)).length

    return NextResponse.json({
      ok: true,
      periodo,
      empresa: empresaRes.data,
      resumo: {
        campanhas: anuncios.length,
        campanhasAtivas: anuncios.filter((item) => item.ativo !== false).length,
        hotspots: hotspots.length,
        leads: leads.length,
        visualizacoes,
        cliques,
        usuariosUnicos: uniqueCount(views),
        ctr: pct(cliques, visualizacoes),
      },
      campanhas,
      hotspots: hotspotsComMetricas,
      leadsRecentes: leads.slice(0, 20),
      qualidadeDados: {
        viewsComHotspotReal,
        clicksComHotspotReal,
        usaFallbackHistorico: views.some((item) => !item.hotspot_id) || clicks.some((item) => !item.hotspot_id),
      },
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
