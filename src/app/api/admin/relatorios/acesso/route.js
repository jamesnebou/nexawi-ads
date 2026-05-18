// src/app/api/admin/relatorios/acesso/route.js
// ============================================================
// API administrativa segura para Relatório de Acesso.
// Sprint 5 Multiempresa:
// - Filtra hotspots, clientes e eventos por empresa
// - Mantém fallback histórico por vínculo anuncio_hotspots
// - Eventos novos usam empresa_id + hotspot_id real
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

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
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    return inicioMes.toISOString()
  }

  return null
}

function uniqueCount(rows = [], keyName = 'ip_address') {
  const set = new Set()

  rows.forEach((row) => {
    set.add(row[keyName] || row.id)
  })

  return set.size
}

function calcularTaxa(cliques, views) {
  if (!views || views <= 0) return 0
  return Number(((cliques / views) * 100).toFixed(2))
}

async function buscarEventosComData({ tabela, anuncioIds, periodo, auth, extras = '' }) {
  const dataInicio = getDataInicio(periodo)

  if (!anuncioIds || anuncioIds.length === 0) {
    return []
  }

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
    ]
      .filter(Boolean)
      .join(', ')

    let query = supabaseAdmin
      .from(tabela)
      .select(selectColumns)
      .in('anuncio_id', anuncioIds)

    query = auth.applyEmpresaScope(query)

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

function eventoPertenceAoHotspot(evento, hotspotId, idsAnunciosDoHotspot = []) {
  if (evento.hotspot_id) {
    return evento.hotspot_id === hotspotId
  }

  return idsAnunciosDoHotspot.includes(evento.anuncio_id)
}

function contarEventosComHotspotReal(rows = []) {
  return rows.filter((row) => Boolean(row.hotspot_id)).length
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'relatorios',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'ultimos_30'

    let hotspotsQuery = supabaseAdmin
      .from('hotspots')
      .select('id, empresa_id, nome, cliente_id, status, cidade')
      .order('nome', { ascending: true })

    let clientesQuery = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id, nome')

    hotspotsQuery = auth.applyEmpresaScope(hotspotsQuery)
    clientesQuery = auth.applyEmpresaScope(clientesQuery)

    const [
      { data: hotspots, error: hotspotsError },
      { data: clientes, error: clientesError },
    ] = await Promise.all([
      hotspotsQuery,
      clientesQuery,
    ])

    if (hotspotsError) throw hotspotsError
    if (clientesError) throw clientesError

    const hotspotIds = (hotspots || []).map((hotspot) => hotspot.id)

    let vinculos = []

    if (hotspotIds.length > 0) {
      const { data: vinculosData, error: vinculosError } = await supabaseAdmin
        .from('anuncio_hotspots')
        .select('anuncio_id, hotspot_id')
        .in('hotspot_id', hotspotIds)

      if (vinculosError) throw vinculosError
      vinculos = vinculosData || []
    }

    const anuncioIds = [
      ...new Set((vinculos || []).map((v) => v.anuncio_id).filter(Boolean)),
    ]

    const [views, clicks] = await Promise.all([
      buscarEventosComData({
        tabela: 'anuncio_views',
        anuncioIds,
        periodo,
        auth,
      }),

      buscarEventosComData({
        tabela: 'anuncio_clicks',
        anuncioIds,
        periodo,
        auth,
        extras: 'tipo_acao',
      }),
    ])

    const clientePorId = new Map((clientes || []).map((cliente) => [cliente.id, cliente]))
    const vinculosPorHotspot = new Map()

    ;(vinculos || []).forEach((vinculo) => {
      if (!vinculosPorHotspot.has(vinculo.hotspot_id)) {
        vinculosPorHotspot.set(vinculo.hotspot_id, [])
      }

      vinculosPorHotspot.get(vinculo.hotspot_id).push(vinculo.anuncio_id)
    })

    const relatorio = (hotspots || []).map((hotspot) => {
      const idsAnunciosDoHotspot = vinculosPorHotspot.get(hotspot.id) || []

      const viewsDoHotspot = views.filter((view) =>
        eventoPertenceAoHotspot(view, hotspot.id, idsAnunciosDoHotspot)
      )

      const clicksDoHotspot = clicks.filter((click) =>
        eventoPertenceAoHotspot(click, hotspot.id, idsAnunciosDoHotspot)
      )

      const copiasDoHotspot = clicksDoHotspot.filter((click) =>
        click.tipo_acao === 'copy'
      )

      const aberturasDoHotspot = clicksDoHotspot.filter((click) =>
        ['open', 'open_attempt'].includes(click.tipo_acao)
      )

      const totalViews = uniqueCount(viewsDoHotspot)
      const totalClicks = uniqueCount(clicksDoHotspot)
      const taxaClique = calcularTaxa(totalClicks, totalViews)

      const viewsComHotspotReal = contarEventosComHotspotReal(viewsDoHotspot)
      const clicksComHotspotReal = contarEventosComHotspotReal(clicksDoHotspot)

      const cliente = clientePorId.get(hotspot.cliente_id)

      return {
        empresa_id: hotspot.empresa_id || null,
        hotspot_id: hotspot.id,
        hotspot_nome: hotspot.nome || 'Sem nome',
        cliente_nome: cliente?.nome || '',
        cidade: hotspot.cidade || '',
        status: hotspot.status || '',
        total_unique_views: totalViews,
        total_unique_clicks: totalClicks,
        total_links_copiados: uniqueCount(copiasDoHotspot),
        total_tentativas_abrir: uniqueCount(aberturasDoHotspot),
        taxa_clique: taxaClique,
        views_com_hotspot_real: viewsComHotspotReal,
        clicks_com_hotspot_real: clicksComHotspotReal,
        usa_fallback_historico:
          viewsDoHotspot.some((view) => !view.hotspot_id) ||
          clicksDoHotspot.some((click) => !click.hotspot_id),
      }
    })

    const relatorioOrdenado = relatorio.sort(
      (a, b) => b.total_unique_views - a.total_unique_views
    )

    const totalViews = relatorio.reduce((acc, item) => acc + item.total_unique_views, 0)
    const totalClicks = relatorio.reduce((acc, item) => acc + item.total_unique_clicks, 0)

    const resumo = {
      totalHotspots: relatorio.length,
      hotspotsComAcesso: relatorio.filter((item) => item.total_unique_views > 0).length,
      totalViews,
      totalClicks,
      totalCopias: relatorio.reduce((acc, item) => acc + item.total_links_copiados, 0),
      totalTentativasAbrir: relatorio.reduce((acc, item) => acc + item.total_tentativas_abrir, 0),
      totalViewsComHotspotReal: relatorio.reduce((acc, item) => acc + item.views_com_hotspot_real, 0),
      totalClicksComHotspotReal: relatorio.reduce((acc, item) => acc + item.clicks_com_hotspot_real, 0),
      taxaCliqueGeral: calcularTaxa(totalClicks, totalViews),
    }

    return NextResponse.json({
      ok: true,
      periodo,
      resumo,
      relatorio: relatorioOrdenado,
      empresaScope: auth.empresaScope,
      permissions: auth.permissions?.relatorios || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar relatório de acesso',
      },
      { status: 500 }
    )
  }
}
