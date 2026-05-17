import { supabaseAdmin } from '@/lib/supabase-admin'

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

function calcularCtr(cliques, views) {
  if (!views || views <= 0) return 0
  return Number(((cliques / views) * 100).toFixed(2))
}

function uniqueCount(rows = [], keyName = 'ip_address') {
  const set = new Set()

  rows.forEach((row) => {
    set.add(row[keyName] || row.id)
  })

  return set.size
}

async function buscarEventos({ tabela, anuncioIds, periodo, extras = [] }) {
  if (!anuncioIds.length) return []

  const dataInicio = getDataInicio(periodo)
  const colunasDeData = ['timestamp', 'created_at']
  let ultimoErro = null

  for (const colunaData of colunasDeData) {
    const selectColumns = [
      'id',
      'anuncio_id',
      'hotspot_id',
      'ip_address',
      ...extras,
      colunaData,
    ].join(', ')

    let query = supabaseAdmin
      .from(tabela)
      .select(selectColumns)
      .in('anuncio_id', anuncioIds)

    if (dataInicio) {
      query = query.gte(colunaData, dataInicio)
    }

    const { data, error } = await query

    if (!error) return data || []

    ultimoErro = error
  }

  throw ultimoErro
}

async function buscarLeads({ anuncioIds, periodo }) {
  if (!anuncioIds.length) return []

  const dataInicio = getDataInicio(periodo)

  let query = supabaseAdmin
    .from('leads')
    .select('id, nome, email, telefone, anuncio_id, hotspot_id, created_at')
    .in('anuncio_id', anuncioIds)

  if (dataInicio) {
    query = query.gte('created_at', dataInicio)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

function criarMapaVinculos(vinculos = []) {
  const porHotspot = new Map()
  const porAnuncio = new Map()

  vinculos.forEach((vinculo) => {
    if (!vinculo.hotspot_id || !vinculo.anuncio_id) return

    if (!porHotspot.has(vinculo.hotspot_id)) {
      porHotspot.set(vinculo.hotspot_id, [])
    }

    if (!porAnuncio.has(vinculo.anuncio_id)) {
      porAnuncio.set(vinculo.anuncio_id, [])
    }

    porHotspot.get(vinculo.hotspot_id).push(vinculo.anuncio_id)
    porAnuncio.get(vinculo.anuncio_id).push(vinculo.hotspot_id)
  })

  return { porHotspot, porAnuncio }
}

function pertenceAoHotspot(row, hotspotId, vinculosPorHotspot) {
  if (!hotspotId) return true

  if (row.hotspot_id) {
    return row.hotspot_id === hotspotId
  }

  const anunciosDoHotspot = vinculosPorHotspot.get(hotspotId) || []
  return anunciosDoHotspot.includes(row.anuncio_id)
}

function contarComHotspotReal(rows = []) {
  return rows.filter((row) => Boolean(row.hotspot_id)).length
}

function ordenarPorViews(a, b) {
  return Number(b.visualizacoes || 0) - Number(a.visualizacoes || 0)
}

export async function buildCommercialReport({
  periodo = 'ultimos_30',
  clienteId = '',
  hotspotId = '',
} = {}) {
  let anunciosQuery = supabaseAdmin
    .from('anuncios')
    .select('id, titulo, ativo, cliente_id, url_destino, tipo_media, created_at')
    .order('created_at', { ascending: false })

  if (clienteId) {
    anunciosQuery = anunciosQuery.eq('cliente_id', clienteId)
  }

  const { data: anunciosData, error: anunciosError } = await anunciosQuery

  if (anunciosError) throw anunciosError

  const anuncios = anunciosData || []
  const anuncioIds = anuncios.map((ad) => ad.id).filter(Boolean)

  if (!anuncioIds.length) {
    return {
      ok: true,
      periodo,
      filtros: { clienteId, hotspotId },
      resumo: {
        totalVisualizacoes: 0,
        totalCliques: 0,
        totalLeads: 0,
        ctrGeral: 0,
        usuariosUnicos: 0,
        anunciosAtivos: 0,
        totalAnuncios: 0,
        hotspotsComCampanha: 0,
      },
      rankings: {
        anuncios: [],
        hotspots: [],
      },
      qualidadeDados: {
        viewsComHotspotReal: 0,
        clicksComHotspotReal: 0,
        usaFallbackHistorico: false,
      },
      generatedAt: new Date().toISOString(),
    }
  }

  const [
    { data: vinculosData, error: vinculosError },
    views,
    clicks,
    leads,
  ] = await Promise.all([
    supabaseAdmin
      .from('anuncio_hotspots')
      .select('anuncio_id, hotspot_id')
      .in('anuncio_id', anuncioIds),

    buscarEventos({
      tabela: 'anuncio_views',
      anuncioIds,
      periodo,
    }),

    buscarEventos({
      tabela: 'anuncio_clicks',
      anuncioIds,
      periodo,
      extras: ['tipo_acao'],
    }),

    buscarLeads({
      anuncioIds,
      periodo,
    }),
  ])

  if (vinculosError) throw vinculosError

  const vinculos = vinculosData || []
  const { porHotspot: vinculosPorHotspot } = criarMapaVinculos(vinculos)

  const hotspotIds = [
    ...new Set([
      ...vinculos.map((v) => v.hotspot_id).filter(Boolean),
      ...views.map((v) => v.hotspot_id).filter(Boolean),
      ...clicks.map((c) => c.hotspot_id).filter(Boolean),
      ...leads.map((l) => l.hotspot_id).filter(Boolean),
    ]),
  ]

  let hotspots = []

  if (hotspotIds.length > 0) {
    let hotspotQuery = supabaseAdmin
      .from('hotspots')
      .select('id, nome, status, cidade, cliente_id')

    if (hotspotId) {
      hotspotQuery = hotspotQuery.eq('id', hotspotId)
    } else {
      hotspotQuery = hotspotQuery.in('id', hotspotIds)
    }

    const { data, error } = await hotspotQuery

    if (error) throw error

    hotspots = data || []
  }

  const clienteIds = [
    ...new Set([
      ...anuncios.map((ad) => ad.cliente_id).filter(Boolean),
      ...hotspots.map((h) => h.cliente_id).filter(Boolean),
    ]),
  ]

  let clientes = []

  if (clienteIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, nome_empresa')
      .in('id', clienteIds)

    if (error) throw error

    clientes = data || []
  }

  const clientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente]))

  const viewsFiltradas = views.filter((view) =>
    pertenceAoHotspot(view, hotspotId, vinculosPorHotspot)
  )

  const clicksFiltrados = clicks.filter((click) =>
    pertenceAoHotspot(click, hotspotId, vinculosPorHotspot)
  )

  const leadsFiltrados = leads.filter((lead) =>
    pertenceAoHotspot(lead, hotspotId, vinculosPorHotspot)
  )

  const rankingAnuncios = anuncios.map((ad) => {
    const adViews = viewsFiltradas.filter((view) => view.anuncio_id === ad.id)
    const adClicks = clicksFiltrados.filter((click) => click.anuncio_id === ad.id)
    const adLeads = leadsFiltrados.filter((lead) => lead.anuncio_id === ad.id)
    const cliente = clientePorId.get(ad.cliente_id)

    return {
      id: ad.id,
      titulo: ad.titulo || 'Anúncio sem título',
      ativo: Boolean(ad.ativo),
      cliente_id: ad.cliente_id,
      cliente_nome: cliente?.nome_empresa || cliente?.nome || '',
      visualizacoes: adViews.length,
      cliques: adClicks.length,
      leads: adLeads.length,
      usuarios_unicos: uniqueCount(adViews),
      ctr: calcularCtr(adClicks.length, adViews.length),
      views_com_hotspot_real: contarComHotspotReal(adViews),
      clicks_com_hotspot_real: contarComHotspotReal(adClicks),
    }
  }).sort(ordenarPorViews)

  const rankingHotspots = hotspots.map((hotspot) => {
    const viewsDoHotspot = views.filter((view) =>
      pertenceAoHotspot(view, hotspot.id, vinculosPorHotspot)
    )

    const clicksDoHotspot = clicks.filter((click) =>
      pertenceAoHotspot(click, hotspot.id, vinculosPorHotspot)
    )

    const leadsDoHotspot = leads.filter((lead) =>
      pertenceAoHotspot(lead, hotspot.id, vinculosPorHotspot)
    )

    const cliente = clientePorId.get(hotspot.cliente_id)

    return {
      id: hotspot.id,
      nome: hotspot.nome || 'Hotspot',
      status: hotspot.status || '',
      cidade: hotspot.cidade || '',
      cliente_nome: cliente?.nome_empresa || cliente?.nome || '',
      visualizacoes: viewsDoHotspot.length,
      cliques: clicksDoHotspot.length,
      leads: leadsDoHotspot.length,
      usuarios_unicos: uniqueCount(viewsDoHotspot),
      ctr: calcularCtr(clicksDoHotspot.length, viewsDoHotspot.length),
      views_com_hotspot_real: contarComHotspotReal(viewsDoHotspot),
      clicks_com_hotspot_real: contarComHotspotReal(clicksDoHotspot),
      usa_fallback_historico:
        viewsDoHotspot.some((view) => !view.hotspot_id) ||
        clicksDoHotspot.some((click) => !click.hotspot_id),
    }
  }).sort(ordenarPorViews)

  const totalVisualizacoes = viewsFiltradas.length
  const totalCliques = clicksFiltrados.length
  const totalLeads = leadsFiltrados.length

  return {
    ok: true,
    periodo,
    filtros: {
      clienteId,
      hotspotId,
    },
    resumo: {
      totalVisualizacoes,
      totalCliques,
      totalLeads,
      ctrGeral: calcularCtr(totalCliques, totalVisualizacoes),
      usuariosUnicos: uniqueCount(viewsFiltradas),
      anunciosAtivos: anuncios.filter((ad) => ad.ativo === true).length,
      totalAnuncios: anuncios.length,
      hotspotsComCampanha: rankingHotspots.length,
    },
    rankings: {
      anuncios: rankingAnuncios,
      hotspots: rankingHotspots,
    },
    qualidadeDados: {
      viewsComHotspotReal: contarComHotspotReal(viewsFiltradas),
      clicksComHotspotReal: contarComHotspotReal(clicksFiltrados),
      usaFallbackHistorico:
        viewsFiltradas.some((view) => !view.hotspot_id) ||
        clicksFiltrados.some((click) => !click.hotspot_id),
    },
    generatedAt: new Date().toISOString(),
  }
}
