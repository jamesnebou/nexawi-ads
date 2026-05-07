// src/app/api/admin/anuncios/route.js
// ============================================================
// API administrativa segura para a aba Anúncios.
// Substitui o acesso direto do navegador às tabelas:
// - anuncios
// - anuncio_hotspots
// - anuncio_views
// - anuncio_clicks
// - clientes
// - hotspots
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const TIPOS_MIDIA_VALIDOS = ['imagem', 'video']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
  // Evita quebrar a sintaxe do filtro .or do PostgREST.
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function sanitizarAnuncioPayload(anuncio = {}) {
  const duracao = Number(anuncio.duracao_segundos || 15)

  return {
    titulo: limparTexto(anuncio.titulo),
    descricao: limparTexto(anuncio.descricao),
    media_url: limparTexto(anuncio.media_url),
    tipo_media: TIPOS_MIDIA_VALIDOS.includes(anuncio.tipo_media)
      ? anuncio.tipo_media
      : 'imagem',
    url_destino: limparTexto(anuncio.url_destino),
    duracao_segundos: Number.isFinite(duracao) ? duracao : 15,
    ativo: Boolean(anuncio.ativo),
    cliente_id: anuncio.cliente_id ? String(anuncio.cliente_id) : null,
    estado: limparTexto(anuncio.estado).toUpperCase(),
    cidade: limparTexto(anuncio.cidade),
  }
}

function validarAnuncio(payload, hotspotIds = []) {
  if (!payload.titulo) return 'Título da campanha é obrigatório'
  if (!payload.cliente_id) return 'Cliente responsável é obrigatório'
  if (!Array.isArray(hotspotIds) || hotspotIds.length === 0) {
    return 'Selecione pelo menos um hotspot'
  }

  if (payload.duracao_segundos < 5 || payload.duracao_segundos > 120) {
    return 'Duração inválida'
  }

  return ''
}

async function buscarMetricasDoAnuncio(anuncioId) {
  const [
    { count: viewsCount, error: viewsError },
    { count: clicksCount, error: clicksError },
  ] = await Promise.all([
    supabaseAdmin
      .from('anuncio_views')
      .select('*', { count: 'exact', head: true })
      .eq('anuncio_id', anuncioId),

    supabaseAdmin
      .from('anuncio_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('anuncio_id', anuncioId),
  ])

  if (viewsError) throw viewsError
  if (clicksError) throw clicksError

  return {
    views: viewsCount || 0,
    clicks: clicksCount || 0,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const searchTerm = sanitizeBusca(searchParams.get('searchTerm') || '')
    const filterStatus = searchParams.get('filterStatus') || 'todos'
    const filterHotspotId = searchParams.get('filterHotspotId') || ''
    const filterClientId = searchParams.get('filterClientId') || ''
    const filterMediaType = searchParams.get('filterMediaType') || 'todos'
    const filterEstado = searchParams.get('filterEstado') || ''
    const filterCidade = searchParams.get('filterCidade') || ''

    // Clientes usados nos filtros e no modal.
    const { data: clientes, error: clientesError } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, estado, cidade')
      .order('nome', { ascending: true })

    if (clientesError) throw clientesError

    // Hotspots ativos usados nos filtros e vínculos do anúncio.
    const { data: hotspotsData, error: hotspotsError } = await supabaseAdmin
      .from('hotspots')
      .select('id, nome, status, cliente_id, estado, cidade')
      .eq('status', 'Ativo')
      .order('nome', { ascending: true })

    if (hotspotsError) throw hotspotsError

    const hotspots = (hotspotsData || []).map((hotspot) => {
      const cliente = (clientes || []).find((c) => c.id === hotspot.cliente_id)

      return {
        ...hotspot,
        clientes: cliente ? { id: cliente.id, nome: cliente.nome } : null,
      }
    })

    let anuncioIdsFiltradosPorHotspot = null

    // Filtro por hotspot é feito buscando primeiro os anúncios vinculados.
    if (filterHotspotId) {
      const { data: vinculos, error: vinculosError } = await supabaseAdmin
        .from('anuncio_hotspots')
        .select('anuncio_id')
        .eq('hotspot_id', filterHotspotId)

      if (vinculosError) throw vinculosError

      anuncioIdsFiltradosPorHotspot = (vinculos || [])
        .map((v) => v.anuncio_id)
        .filter(Boolean)

      if (anuncioIdsFiltradosPorHotspot.length === 0) {
        return NextResponse.json({
          ok: true,
          clientes: clientes || [],
          hotspots,
          anuncios: [],
        })
      }
    }

    // Query principal dos anúncios.
    let query = supabaseAdmin
      .from('anuncios')
      .select(`
        id,
        titulo,
        descricao,
        media_url,
        tipo_media,
        url_destino,
        duracao_segundos,
        ativo,
        created_at,
        cliente_id,
        estado,
        cidade,
        clientes(id, nome, estado, cidade),
        anuncio_hotspots(
          hotspot_id,
          hotspots(id, nome)
        )
      `)
      .order('created_at', { ascending: false })

    if (filterStatus === 'ativo') {
      query = query.eq('ativo', true)
    } else if (filterStatus === 'inativo') {
      query = query.eq('ativo', false)
    }

    if (filterClientId) {
      query = query.eq('cliente_id', filterClientId)
    }

    if (filterMediaType === 'imagem') {
      query = query.eq('tipo_media', 'imagem')
    } else if (filterMediaType === 'video') {
      query = query.eq('tipo_media', 'video')
    }

    if (filterEstado) {
      query = query.eq('estado', filterEstado)
    }

    if (filterCidade) {
      query = query.eq('cidade', filterCidade)
    }

    if (searchTerm) {
      query = query.or(`titulo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`)
    }

    if (anuncioIdsFiltradosPorHotspot) {
      query = query.in('id', anuncioIdsFiltradosPorHotspot)
    }

    const { data: anunciosData, error: anunciosError } = await query

    if (anunciosError) throw anunciosError

    const anuncios = await Promise.all((anunciosData || []).map(async (anuncio) => {
      const hotspotNomes = (anuncio.anuncio_hotspots || [])
        .map((ah) => ah.hotspots?.nome)
        .filter(Boolean)

      const metricas = await buscarMetricasDoAnuncio(anuncio.id)

      return {
        ...anuncio,
        hotspot_nomes: hotspotNomes,
        cliente: anuncio.clientes || null,
        views: metricas.views,
        clicks: metricas.clicks,
      }
    }))

    return NextResponse.json({
      ok: true,
      clientes: clientes || [],
      hotspots,
      anuncios,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar anúncios',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'toggle') {
      const id = String(body.id || '').trim()
      const ativo = Boolean(body.ativo)

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do anúncio é obrigatório' },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('anuncios')
        .update({ ativo })
        .eq('id', id)
        .select('id, ativo')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        anuncio: data,
        message: ativo ? 'Anúncio ativado' : 'Anúncio pausado',
      })
    }

    if (action === 'delete') {
      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do anúncio é obrigatório' },
          { status: 400 }
        )
      }

      // Remove vínculos e métricas antes do anúncio para evitar erro de FK.
      await supabaseAdmin.from('anuncio_hotspots').delete().eq('anuncio_id', id)
      await supabaseAdmin.from('anuncio_views').delete().eq('anuncio_id', id)
      await supabaseAdmin.from('anuncio_clicks').delete().eq('anuncio_id', id)

      const { error } = await supabaseAdmin
        .from('anuncios')
        .delete()
        .eq('id', id)

      if (error) throw error

      return NextResponse.json({
        ok: true,
        message: 'Anúncio excluído com sucesso',
      })
    }

    const payload = sanitizarAnuncioPayload(body.anuncio || {})
    const hotspotIds = Array.isArray(body.hotspotIds)
      ? body.hotspotIds.map((id) => String(id)).filter(Boolean)
      : []

    const erroValidacao = validarAnuncio(payload, hotspotIds)

    if (erroValidacao) {
      return NextResponse.json(
        { ok: false, error: erroValidacao },
        { status: 400 }
      )
    }

    let anuncioId = null

    if (action === 'update') {
      anuncioId = String(body.id || '').trim()

      if (!anuncioId) {
        return NextResponse.json(
          { ok: false, error: 'ID do anúncio é obrigatório' },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('anuncios')
        .update(payload)
        .eq('id', anuncioId)
        .select('id')
        .single()

      if (error) throw error
      anuncioId = data.id

      // Atualiza vínculos.
      const { error: deleteLinksError } = await supabaseAdmin
        .from('anuncio_hotspots')
        .delete()
        .eq('anuncio_id', anuncioId)

      if (deleteLinksError) throw deleteLinksError
    } else if (action === 'create') {
      const { data, error } = await supabaseAdmin
        .from('anuncios')
        .insert([payload])
        .select('id')
        .single()

      if (error) throw error
      anuncioId = data.id
    } else {
      return NextResponse.json(
        { ok: false, error: 'Ação inválida' },
        { status: 400 }
      )
    }

    const links = hotspotIds.map((hotspotId) => ({
      anuncio_id: anuncioId,
      hotspot_id: hotspotId,
    }))

    if (links.length > 0) {
      const { error: linksError } = await supabaseAdmin
        .from('anuncio_hotspots')
        .insert(links)

      if (linksError) throw linksError
    }

    return NextResponse.json({
      ok: true,
      anuncioId,
      message: action === 'update' ? 'Anúncio atualizado com sucesso' : 'Anúncio criado com sucesso',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao salvar anúncio',
      },
      { status: 500 }
    )
  }
}