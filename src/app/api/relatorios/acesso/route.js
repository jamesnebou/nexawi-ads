// src/app/api/admin/relatorios/acesso/route.js
// ============================================================
// API administrativa segura para Relatório de Acesso.
// Substitui a view antiga hotspot_access_report acessada direto
// pelo navegador.
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
//
// Métricas:
// - Visualizações por hotspot
// - Cliques por hotspot
// - Links copiados
// - Tentativas de abrir CTA
// - Taxa de clique aproximada
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

  // "todos" não aplica filtro de data.
  return null
}

function uniqueCount(rows = [], keyName = 'ip_address') {
  const set = new Set()

  rows.forEach((row) => {
    // Preferimos IP para evitar contar várias ações do mesmo visitante.
    // Se não houver IP, usa o id do evento como fallback.
    set.add(row[keyName] || row.id)
  })

  return set.size
}

async function buscarEventosComData({ tabela, anuncioIds, periodo, extras = '' }) {
  const dataInicio = getDataInicio(periodo)

  if (!anuncioIds || anuncioIds.length === 0) {
    return []
  }

  // Algumas tabelas antigas usam "timestamp".
  // Algumas tabelas novas podem usar "created_at".
  // Tentamos timestamp primeiro e, se falhar, tentamos created_at.
  const colunasDeData = ['timestamp', 'created_at']
  let ultimoErro = null

  for (const colunaData of colunasDeData) {
    const selectColumns = [
      'id',
      'anuncio_id',
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

export async function GET(request) {
  const auth = await requireAdmin(request)

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

    const anuncioIds = [...new Set((vinculos || []).map((v) => v.anuncio_id).filter(Boolean))]

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
        idsAnunciosDoHotspot.includes(view.anuncio_id)
      )

      const clicksDoHotspot = clicks.filter((click) =>
        idsAnunciosDoHotspot.includes(click.anuncio_id)
      )

      const copiasDoHotspot = clicksDoHotspot.filter((click) =>
        click.tipo_acao === 'copy'
      )

      const aberturasDoHotspot = clicksDoHotspot.filter((click) =>
        ['open', 'open_attempt'].includes(click.tipo_acao)
      )

      const totalViews = uniqueCount(viewsDoHotspot)
      const totalClicks = uniqueCount(clicksDoHotspot)
      const taxaClique = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0

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
        taxa_clique: Number(taxaClique.toFixed(2)),
      }
    })

    const relatorioOrdenado = relatorio
      .sort((a, b) => b.total_unique_views - a.total_unique_views)

    const resumo = {
      totalHotspots: relatorio.length,
      hotspotsComAcesso: relatorio.filter((item) => item.total_unique_views > 0).length,
      totalViews: relatorio.reduce((acc, item) => acc + item.total_unique_views, 0),
      totalClicks: relatorio.reduce((acc, item) => acc + item.total_unique_clicks, 0),
      totalCopias: relatorio.reduce((acc, item) => acc + item.total_links_copiados, 0),
      totalTentativasAbrir: relatorio.reduce((acc, item) => acc + item.total_tentativas_abrir, 0),
    }

    return NextResponse.json({
      ok: true,
      periodo,
      resumo,
      relatorio: relatorioOrdenado,
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