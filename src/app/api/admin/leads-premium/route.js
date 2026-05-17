import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['Novo', 'Contatado', 'Convertido', 'Perdido']

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

function normalizeStatus(value = '') {
  const status = String(value || '').trim()
  return STATUS_VALIDOS.includes(status) ? status : 'Novo'
}

function cleanText(value = '') {
  return String(value || '').trim()
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

function contarPorStatus(leads = []) {
  const base = {
    Novo: 0,
    Contatado: 0,
    Convertido: 0,
    Perdido: 0,
  }

  leads.forEach((lead) => {
    const status = normalizeStatus(lead.crm_status)
    base[status] = (base[status] || 0) + 1
  })

  return base
}

async function carregarBase({ clienteId = '' } = {}) {
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

  return {
    clientes: clientesData || [],
    anuncios: anunciosData || [],
  }
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
    const clienteId = cleanText(searchParams.get('clienteId') || '')
    const anuncioId = cleanText(searchParams.get('anuncioId') || '')
    const busca = sanitizeSearch(searchParams.get('busca') || '')
    const statusFiltro = cleanText(searchParams.get('status') || '')

    const { clientes, anuncios } = await carregarBase({ clienteId })
    const anuncioIds = anuncios.map((ad) => ad.id).filter(Boolean)

    if (anuncioIds.length === 0) {
      return NextResponse.json({
        ok: true,
        periodo,
        filtros: { clienteId, anuncioId, busca, status: statusFiltro },
        resumo: {
          total: 0,
          hoje: 0,
          mes: 0,
          origemPrincipal: null,
          porStatus: contarPorStatus([]),
        },
        leads: [],
        anuncios,
        clientes,
        statusOptions: STATUS_VALIDOS,
        permissions: auth.permissions?.leads || {},
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
        crm_status,
        crm_observacoes,
        crm_proximo_contato,
        crm_updated_at
      `)
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

    let leads = rawLeads.map((lead) => {
      const anuncio = anunciosById.get(lead.anuncio_id)
      const cliente = clientesById.get(anuncio?.cliente_id)
      const hotspot = hotspotsById.get(lead.hotspot_id)

      return {
        ...lead,
        crm_status: normalizeStatus(lead.crm_status),
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

    if (statusFiltro && STATUS_VALIDOS.includes(statusFiltro)) {
      leads = leads.filter((lead) => normalizeStatus(lead.crm_status) === statusFiltro)
    }

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
        status: statusFiltro,
      },
      resumo: {
        total: leads.length,
        hoje: leads.filter((lead) => new Date(lead.created_at).getTime() >= hojeInicio.getTime()).length,
        mes: leads.filter((lead) => new Date(lead.created_at).getTime() >= mesInicio.getTime()).length,
        origemPrincipal: calcularOrigemPrincipal(leads),
        porStatus: contarPorStatus(leads),
      },
      leads,
      anuncios,
      clientes,
      statusOptions: STATUS_VALIDOS,
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

export async function PATCH(request) {
  const auth = await requireAdmin(request, {
    module: 'leads',
    action: 'update',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json().catch(() => ({}))

    const id = cleanText(body.id || body.leadId || '')
    const crmStatus = normalizeStatus(body.crm_status || body.status || 'Novo')
    const crmObservacoes = cleanText(body.crm_observacoes || body.observacoes || '')
    const crmProximoContato = cleanText(body.crm_proximo_contato || body.proximoContato || '')

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID do lead é obrigatório' },
        { status: 400 }
      )
    }

    const updatePayload = {
      crm_status: crmStatus,
      crm_observacoes: crmObservacoes || null,
      crm_proximo_contato: crmProximoContato || null,
      crm_updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        nome,
        email,
        telefone,
        created_at,
        anuncio_id,
        hotspot_id,
        crm_status,
        crm_observacoes,
        crm_proximo_contato,
        crm_updated_at
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      lead: data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao atualizar lead',
      },
      { status: 500 }
    )
  }
}
