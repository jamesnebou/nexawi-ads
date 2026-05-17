import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
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

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'leads',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const periodo = searchParams.get('periodo') || 'todos'
    const clienteId = String(searchParams.get('clienteId') || '').trim()
    const anuncioId = String(searchParams.get('anuncioId') || '').trim()
    const busca = sanitizeSearch(searchParams.get('busca') || '')

    const { data: clientesData, error: clientesError } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, nome_empresa, email, status')
      .order('nome_empresa', { ascending: true })

    if (clientesError) throw clientesError

    let anunciosQuery = supabaseAdmin
      .from('anuncios')
      .select('id, titulo, ativo, cliente_id, created_at')
      .order('created_at', { ascending: false })

    if (clienteId) {
      anunciosQuery = anunciosQuery.eq('cliente_id', clienteId)
    }

    const { data: anunciosData, error: anunciosError } = await anunciosQuery

    if (anunciosError) throw anunciosError

    const clientes = clientesData || []
    const anuncios = anunciosData || []
    const anuncioIds = anuncios.map((ad) => ad.id).filter(Boolean)

    if (anuncioIds.length === 0) {
      return NextResponse.json({
        ok: true,
        periodo,
        filtros: { clienteId, anuncioId, busca },
        resumo: {
          total: 0,
          hoje: 0,
          mes: 0,
          origemPrincipal: null,
        },
        leads: [],
        anuncios,
        clientes,
        permissions: auth.permissions?.leads || {},
      })
    }

    let query = supabaseAdmin
      .from('leads')
      .select('id, nome, email, telefone, created_at, anuncio_id, hotspot_id')
      .in('anuncio_id', anuncioIds)
      .order('created_at', { ascending: false })
      .limit(3000)

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
        .select('id, nome, cidade, estado')
        .in('id', hotspotIds)

      if (error) throw error

      hotspots = data || []
    }

    const clientesById = new Map(clientes.map((cliente) => [cliente.id, cliente]))
    const anunciosById = new Map(anuncios.map((ad) => [ad.id, ad]))
    const hotspotsById = new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]))

    const leads = rawLeads.map((lead) => {
      const anuncio = anunciosById.get(lead.anuncio_id)
      const cliente = clientesById.get(anuncio?.cliente_id)
      const hotspot = hotspotsById.get(lead.hotspot_id)

      return {
        ...lead,
        anuncios: {
          id: anuncio?.id || lead.anuncio_id,
          titulo: anuncio?.titulo || 'Campanha NexaWi',
          cliente_id: anuncio?.cliente_id || '',
        },
        clientes: {
          id: cliente?.id || '',
          nome: cliente?.nome || '',
          nome_empresa: cliente?.nome_empresa || '',
          email: cliente?.email || '',
        },
        hotspots: {
          id: hotspot?.id || '',
          nome: hotspot?.nome || 'Hotspot',
          cidade: hotspot?.cidade || '',
          estado: hotspot?.estado || '',
        },
      }
    })

    const hojeInicio = new Date()
    hojeInicio.setHours(0, 0, 0, 0)

    const mesInicio = new Date()
    mesInicio.setDate(1)
    mesInicio.setHours(0, 0, 0, 0)

    return NextResponse.json({
      ok: true,
      periodo,
      filtros: {
        clienteId,
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
      anuncios,
      clientes,
      permissions: auth.permissions?.leads || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar leads administrativos',
      },
      { status: 500 }
    )
  }
}
