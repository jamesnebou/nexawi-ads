// src/app/api/admin/relatorios/acesso/route.js
// ============================================================
// API administrativa segura para Relatório de Acesso.
//
// Métricas:
// - Visualizações por hotspot
// - Cliques por hotspot
// - Links copiados
// - Tentativas de abrir CTA
// - Taxa de clique aproximada
//
// Importante:
// - Eventos novos usam hotspot_id real em anuncio_views/anuncio_clicks.
// - Eventos antigos sem hotspot_id usam fallback pelo vínculo anuncio_hotspots.
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

async function buscarEventosComData({ tabela, anuncioIds, periodo, extras = '' }) {
  const dataInicio = getDataInicio(periodo)

  if (!anuncioIds || anuncioIds.length === 0) {
    return []
  }

  const colunasDeData = ['timestamp', 'created_at']
  let ultimoErro = null

  for (const colunaData of colunasDeData) {
    const selectColumns = [
      'id',
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

    const [
      { data: hotspots, error: hotspotsError },
      { data: clientes, error: clientesError },
      { data: vinculos, error: vinculosError },
    ] = await Promise.all([
      supabaseAdmin
        .from('hotspots')
        .select('id, nome, cliente_id, status, cidade')
        .order('nome', { ascending: true }),

      supabaseAdmin
        .from('clientes')
        .select('id, nome'),

      supabaseAdmin
        .from('anuncio_hotspots')
        .select('anuncio_id, hotspot_id'),
    ])

    if (hotspotsError) throw hotspotsError
    if (clientesError) throw clientesError
    if (vinculosError) throw vinculosError

    const anuncioIds = [
      ...new Set((vinculos || []).map((v) => v.anuncio_id).filter(Boolean)),
    ]

    const [views, clicks] = await Promise.all([
      buscarEventosComData({
        tabela: 'anuncio_views',
        anuncioIds,
        periodo,
      }),

      buscarEventosComData({
        tabela: 'anuncio_clicks',
        anuncioIds,
        periodo,
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
