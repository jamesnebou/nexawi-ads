import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  }

  return null
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
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const periodo = searchParams.get('periodo') || 'ultimos_30'
    const anuncioId = String(searchParams.get('anuncioId') || '').trim()
    const busca = String(searchParams.get('busca') || '').trim()

    const { cliente } = auth

    const { data: anuncios, error: anunciosError } = await supabaseAdmin
      .from('anuncios')
      .select('id, titulo, ativo, created_at')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })

    if (anunciosError) throw anunciosError

    const anuncioIds = (anuncios || []).map((ad) => ad.id).filter(Boolean)

    if (anuncioIds.length === 0) {
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
        anuncios: [],
      })
    }

    let query = supabaseAdmin
      .from('leads')
      .select(`
        id,
        nome,
        email,
        telefone,
        created_at,
        anuncio_id,
        hotspot_id,
        anuncios(titulo),
        hotspots(nome)
      `)
      .in('anuncio_id', anuncioIds)
      .order('created_at', { ascending: false })
      .limit(500)

    const dataInicio = getDataInicio(periodo)

    if (dataInicio) {
      query = query.gte('created_at', dataInicio)
    }

    if (anuncioId && anuncioIds.includes(anuncioId)) {
      query = query.eq('anuncio_id', anuncioId)
    }

    if (busca) {
      const termo = busca.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ')
      query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) throw leadsError

    const hojeInicio = new Date()
    hojeInicio.setHours(0, 0, 0, 0)

    const mesInicio = new Date()
    mesInicio.setDate(1)
    mesInicio.setHours(0, 0, 0, 0)

    const leadsList = leads || []

    return NextResponse.json({
      ok: true,
      periodo,
      filtros: {
        anuncioId,
        busca,
      },
      resumo: {
        total: leadsList.length,
        hoje: leadsList.filter((lead) => new Date(lead.created_at).getTime() >= hojeInicio.getTime()).length,
        mes: leadsList.filter((lead) => new Date(lead.created_at).getTime() >= mesInicio.getTime()).length,
        origemPrincipal: calcularOrigemPrincipal(leadsList),
      },
      leads: leadsList,
      anuncios: anuncios || [],
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
