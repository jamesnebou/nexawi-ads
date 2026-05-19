import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function getDataInicio(periodo = 'todos') {
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

function sanitizeSearch(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function calcularOrigemPrincipal(leads = []) {
  const map = new Map()

  leads.forEach((lead) => {
    const titulo = lead.anuncios?.titulo || 'Campanha NexaWi'
    map.set(titulo, (map.get(titulo) || 0) + 1)
  })

  const ranking = Array.from(map.entries())
    .map(([titulo, total]) => ({ titulo, total }))
    .sort((a, b) => b.total - a.total)

  return ranking[0] || null
}

function aplicarEscopoClienteEmpresa(query, { clienteId, empresaId }) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) return query.eq('empresa_id', empresaId)
  return query.eq('cliente_id', clienteId)
}

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const periodo = searchParams.get('periodo') || 'todos'
    const anuncioId = String(searchParams.get('anuncioId') || '').trim()
    const busca = sanitizeSearch(searchParams.get('busca') || '')

    const { cliente, empresaId } = auth
    const clienteId = cliente.id

    let anunciosQuery = supabaseAdmin
      .from('anuncios')
      .select('id, titulo, ativo, created_at')
      .order('created_at', { ascending: false })

    anunciosQuery = aplicarEscopoClienteEmpresa(anunciosQuery, { clienteId, empresaId })

    const { data: anuncios, error: anunciosError } = await anunciosQuery

    if (anunciosError) throw anunciosError

    const anunciosList = anuncios || []
    const anuncioIds = anunciosList.map((ad) => ad.id).filter(Boolean)

    let query = supabaseAdmin
      .from('leads')
      .select('id, empresa_id, nome, email, telefone, created_at, anuncio_id, hotspot_id')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    } else if (anuncioIds.length > 0) {
      query = query.in('anuncio_id', anuncioIds)
    } else {
      return NextResponse.json({
        ok: true,
        periodo,
        filtros: { anuncioId, busca },
        resumo: {
          total: 0,
          hoje: 0,
          mes: 0,
          origemPrincipal: null,
        },
        leads: [],
        anuncios: anunciosList,
      })
    }

    const dataInicio = getDataInicio(periodo)

    if (dataInicio) {
      query = query.gte('created_at', dataInicio)
    }

    if (anuncioId && anuncioIds.includes(anuncioId)) {
      query = query.eq('anuncio_id', anuncioId)
    }

    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`)
    }

    const { data: leadsData, error: leadsError } = await query

    if (leadsError) throw leadsError

    const rawLeads = leadsData || []
    const hotspotIds = [...new Set(rawLeads.map((lead) => lead.hotspot_id).filter(Boolean))]

    let hotspots = []

    if (hotspotIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .select('id, nome')
        .in('id', hotspotIds)

      if (error) throw error

      hotspots = data || []
    }

    const anunciosById = new Map(anunciosList.map((ad) => [ad.id, ad]))
    const hotspotsById = new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]))

    const leads = rawLeads.map((lead) => ({
      ...lead,
      anuncios: {
        titulo: anunciosById.get(lead.anuncio_id)?.titulo || 'Campanha NexaWi',
      },
      hotspots: {
        nome: hotspotsById.get(lead.hotspot_id)?.nome || 'Hotspot',
      },
    }))

    const hojeInicio = new Date()
    hojeInicio.setHours(0, 0, 0, 0)

    const mesInicio = new Date()
    mesInicio.setDate(1)
    mesInicio.setHours(0, 0, 0, 0)

    return NextResponse.json({
      ok: true,
      periodo,
      filtros: {
        anuncioId,
        busca,
      },
      resumo: {
        total: leads.length,
        hoje: leads.filter((lead) => new Date(lead.created_at).getTime() >= hojeInicio.getTime()).length,
        mes: leads.filter((lead) => new Date(lead.created_at).getTime() >= mesInicio.getTime()).length,
        origemPrincipal: calcularOrigemPrincipal(leads),
      },
      leads,
      anuncios: anunciosList,
      multiempresa: {
        empresa_id: empresaId || cliente.empresa_id || null,
        usaEmpresaId: Boolean(empresaId),
        fallbackClienteId: cliente.id,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar leads do cliente',
      },
      { status: 500 }
    )
  }
}
