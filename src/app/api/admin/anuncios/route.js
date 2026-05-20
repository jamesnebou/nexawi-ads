// src/app/api/admin/anuncios/route.js
// ============================================================
// API administrativa segura para a aba Anúncios.
// Sprint 5 Multiempresa:
// - Lista clientes/hotspots/anúncios por empresa
// - Cria anúncio vinculado à empresa ativa
// - Valida cliente e hotspots dentro do escopo permitido
// - Métricas e ações respeitam empresa_id
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import {
  assertSaasAccountActive,
  assertSaasPlanLimit,
  getSaasFinanceContext,
} from '@/lib/saas-finance'

export const runtime = 'nodejs'

const TIPOS_MIDIA_VALIDOS = ['imagem', 'video']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function sanitizeUuid(value = '') {
  const clean = limparTexto(value)
  if (!clean) return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(clean) ? clean : null
}

function permissaoNegada(modulo, acao) {
  return NextResponse.json(
    {
      ok: false,
      error: `Sem permissão para ${acao} em ${modulo}`,
    },
    { status: 403 }
  )
}

function resolveEmpresaIdForWrite(auth, providedEmpresaId = '') {
  const provided = sanitizeUuid(providedEmpresaId)

  if (auth.isMaster) {
    return provided || auth.activeEmpresaId || null
  }

  if (provided && !auth.allowedEmpresaIds?.includes(provided)) {
    throw new Error('Você não tem acesso a esta empresa.')
  }

  const empresaId = provided || auth.activeEmpresaId || auth.allowedEmpresaIds?.[0] || null

  if (!empresaId) {
    throw new Error('Nenhuma empresa vinculada ao usuário para criar/editar anúncio.')
  }

  return empresaId
}

function sanitizarAnuncioPayload(anuncio = {}, empresaId = null) {
  const duracao = Number(anuncio.duracao_segundos || 15)

  return {
    empresa_id: empresaId,
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

async function buscarMetricasDoAnuncio(anuncioId, auth) {
  let viewsQuery = supabaseAdmin
    .from('anuncio_views')
    .select('*', { count: 'exact', head: true })
    .eq('anuncio_id', anuncioId)

  let clicksQuery = supabaseAdmin
    .from('anuncio_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('anuncio_id', anuncioId)

  viewsQuery = auth.applyEmpresaScope(viewsQuery)
  clicksQuery = auth.applyEmpresaScope(clicksQuery)

  const [
    { count: viewsCount, error: viewsError },
    { count: clicksCount, error: clicksError },
  ] = await Promise.all([viewsQuery, clicksQuery])

  if (viewsError) throw viewsError
  if (clicksError) throw clicksError

  return {
    views: viewsCount || 0,
    clicks: clicksCount || 0,
  }
}

async function buscarAnuncioBasico(anuncioId, auth) {
  let query = supabaseAdmin
    .from('anuncios')
    .select(`
      id,
      empresa_id,
      titulo,
      descricao,
      media_url,
      tipo_media,
      url_destino,
      duracao_segundos,
      ativo,
      cliente_id,
      estado,
      cidade,
      created_at
    `)
    .eq('id', anuncioId)

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarHotspotIdsDoAnuncio(anuncioId) {
  const { data, error } = await supabaseAdmin
    .from('anuncio_hotspots')
    .select('hotspot_id')
    .eq('anuncio_id', anuncioId)

  if (error) throw error

  return (data || [])
    .map((item) => item.hotspot_id)
    .filter(Boolean)
}

async function contarEventosDoAnuncio(anuncioId, auth) {
  let viewsQuery = supabaseAdmin
    .from('anuncio_views')
    .select('*', { count: 'exact', head: true })
    .eq('anuncio_id', anuncioId)

  let clicksQuery = supabaseAdmin
    .from('anuncio_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('anuncio_id', anuncioId)

  viewsQuery = auth.applyEmpresaScope(viewsQuery)
  clicksQuery = auth.applyEmpresaScope(clicksQuery)

  const [
    { count: viewsCount, error: viewsError },
    { count: clicksCount, error: clicksError },
  ] = await Promise.all([viewsQuery, clicksQuery])

  if (viewsError) throw viewsError
  if (clicksError) throw clicksError

  return {
    views_removidas: viewsCount || 0,
    clicks_removidos: clicksCount || 0,
  }
}

async function validarClienteNoEscopo(clienteId, empresaId, auth) {
  let query = supabaseAdmin
    .from('clientes')
    .select('id, empresa_id')
    .eq('id', clienteId)

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Cliente não encontrado ou fora do escopo da empresa.')

  if (empresaId && data.empresa_id && data.empresa_id !== empresaId) {
    throw new Error('Cliente selecionado pertence a outra empresa.')
  }

  return data
}

async function validarHotspotsNoEscopo(hotspotIds, empresaId, auth) {
  if (!hotspotIds.length) return []

  let query = supabaseAdmin
    .from('hotspots')
    .select('id, empresa_id')
    .in('id', hotspotIds)

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query

  if (error) throw error

  const encontrados = data || []
  const idsEncontrados = new Set(encontrados.map((item) => item.id))
  const faltando = hotspotIds.filter((id) => !idsEncontrados.has(id))

  if (faltando.length > 0) {
    throw new Error('Um ou mais hotspots não existem ou estão fora do escopo da empresa.')
  }

  if (empresaId && encontrados.some((item) => item.empresa_id && item.empresa_id !== empresaId)) {
    throw new Error('Um ou mais hotspots pertencem a outra empresa.')
  }

  return encontrados
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'anuncios',
    action: 'view',
  })

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

    let clientesQuery = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id, nome, estado, cidade')
      .order('nome', { ascending: true })

    clientesQuery = auth.applyEmpresaScope(clientesQuery)

    const { data: clientes, error: clientesError } = await clientesQuery

    if (clientesError) throw clientesError

    let hotspotsQuery = supabaseAdmin
      .from('hotspots')
      .select('id, empresa_id, nome, status, cliente_id, estado, cidade')
      .eq('status', 'Ativo')
      .order('nome', { ascending: true })

    hotspotsQuery = auth.applyEmpresaScope(hotspotsQuery)

    const { data: hotspotsData, error: hotspotsError } = await hotspotsQuery

    if (hotspotsError) throw hotspotsError

    const hotspots = (hotspotsData || []).map((hotspot) => {
      const cliente = (clientes || []).find((c) => c.id === hotspot.cliente_id)

      return {
        ...hotspot,
        clientes: cliente ? { id: cliente.id, nome: cliente.nome } : null,
      }
    })

    let anuncioIdsFiltradosPorHotspot = null

    if (filterHotspotId) {
      await validarHotspotsNoEscopo([filterHotspotId], auth.activeEmpresaId, auth)

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
          empresaScope: auth.empresaScope,
          permissions: auth.permissions?.anuncios || {},
        })
      }
    }

    let query = supabaseAdmin
      .from('anuncios')
      .select(`
        id,
        empresa_id,
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

    query = auth.applyEmpresaScope(query)

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

      const metricas = await buscarMetricasDoAnuncio(anuncio.id, auth)

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
      empresaScope: auth.empresaScope,
      permissions: auth.permissions?.anuncios || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: error.code || null,
        error: error.message || 'Erro ao buscar anúncios',
      },
      { status: error.status || 500 }
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
      const acaoNecessaria = ativo ? 'activate' : 'pause'

      if (!auth.canAccess('anuncios', acaoNecessaria)) {
        return permissaoNegada('anuncios', acaoNecessaria)
      }

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do anúncio é obrigatório' },
          { status: 400 }
        )
      }

      const anuncioAntes = await buscarAnuncioBasico(id, auth)

      if (!anuncioAntes) {
        return NextResponse.json(
          { ok: false, error: 'Anúncio não encontrado ou fora do escopo da empresa.' },
          { status: 404 }
        )
      }

      if (ativo) {
        const saasContext = await getSaasFinanceContext({
          empresaId: anuncioAntes.empresa_id,
          clienteId: anuncioAntes.cliente_id,
        })

        assertSaasAccountActive(saasContext)
      }

      const { data, error } = await supabaseAdmin
        .from('anuncios')
        .update({ ativo })
        .eq('id', id)
        .select('id, empresa_id, titulo, ativo, cliente_id, tipo_media')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: ativo ? 'activate' : 'pause',
        entity: 'anuncios',
        entityId: data.id,
        description: ativo ? 'Ativou um anúncio' : 'Pausou um anúncio',
        metadata: {
          empresa_id: data.empresa_id || anuncioAntes?.empresa_id || '',
          anuncio_id: data.id,
          titulo: data.titulo || anuncioAntes?.titulo || '',
          cliente_id: data.cliente_id || anuncioAntes?.cliente_id || null,
          tipo_media: data.tipo_media || anuncioAntes?.tipo_media || '',
          ativo_anterior: anuncioAntes?.ativo ?? null,
          ativo_atual: data.ativo,
        },
      })

      return NextResponse.json({
        ok: true,
        anuncio: data,
        message: ativo ? 'Anúncio ativado' : 'Anúncio pausado',
      })
    }

    if (action === 'delete') {
      if (!auth.canAccess('anuncios', 'delete')) {
        return permissaoNegada('anuncios', 'delete')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do anúncio é obrigatório' },
          { status: 400 }
        )
      }

      const anuncioAntes = await buscarAnuncioBasico(id, auth)

      if (!anuncioAntes) {
        return NextResponse.json(
          { ok: false, error: 'Anúncio não encontrado ou fora do escopo da empresa.' },
          { status: 404 }
        )
      }

      const hotspotIdsAntes = await buscarHotspotIdsDoAnuncio(id)
      const eventosAntes = await contarEventosDoAnuncio(id, auth)

      const { error: linksDeleteError } = await supabaseAdmin
        .from('anuncio_hotspots')
        .delete()
        .eq('anuncio_id', id)

      if (linksDeleteError) throw linksDeleteError

      let viewsDeleteQuery = supabaseAdmin
        .from('anuncio_views')
        .delete()
        .eq('anuncio_id', id)

      let clicksDeleteQuery = supabaseAdmin
        .from('anuncio_clicks')
        .delete()
        .eq('anuncio_id', id)

      viewsDeleteQuery = auth.applyEmpresaScope(viewsDeleteQuery)
      clicksDeleteQuery = auth.applyEmpresaScope(clicksDeleteQuery)

      const { error: viewsDeleteError } = await viewsDeleteQuery
      if (viewsDeleteError) throw viewsDeleteError

      const { error: clicksDeleteError } = await clicksDeleteQuery
      if (clicksDeleteError) throw clicksDeleteError

      const { error } = await supabaseAdmin
        .from('anuncios')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'anuncios',
        entityId: id,
        description: 'Excluiu um anúncio',
        metadata: {
          empresa_id: anuncioAntes?.empresa_id || '',
          anuncio_id: id,
          titulo: anuncioAntes?.titulo || '',
          cliente_id: anuncioAntes?.cliente_id || null,
          tipo_media: anuncioAntes?.tipo_media || '',
          ativo_anterior: anuncioAntes?.ativo ?? null,
          hotspot_ids_anteriores: hotspotIdsAntes,
          quantidade_hotspots_vinculados: hotspotIdsAntes.length,
          views_removidas: eventosAntes.views_removidas,
          clicks_removidos: eventosAntes.clicks_removidos,
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Anúncio excluído com sucesso',
      })
    }

    const empresaId = resolveEmpresaIdForWrite(auth, body.anuncio?.empresa_id)
    const payload = sanitizarAnuncioPayload(body.anuncio || {}, empresaId)
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

    await validarClienteNoEscopo(payload.cliente_id, empresaId, auth)
    await validarHotspotsNoEscopo(hotspotIds, empresaId, auth)

    let anuncioId = null
    let anuncioAntes = null
    let hotspotIdsAntes = []

    if (action === 'update') {
      if (!auth.canAccess('anuncios', 'update')) {
        return permissaoNegada('anuncios', 'update')
      }

      anuncioId = String(body.id || '').trim()

      if (!anuncioId) {
        return NextResponse.json(
          { ok: false, error: 'ID do anúncio é obrigatório' },
          { status: 400 }
        )
      }

      anuncioAntes = await buscarAnuncioBasico(anuncioId, auth)

      if (!anuncioAntes) {
        return NextResponse.json(
          { ok: false, error: 'Anúncio não encontrado ou fora do escopo da empresa.' },
          { status: 404 }
        )
      }

      if (payload.ativo) {
        const saasContext = await getSaasFinanceContext({
          empresaId,
          clienteId: payload.cliente_id,
        })

        assertSaasAccountActive(saasContext)
      }

      hotspotIdsAntes = await buscarHotspotIdsDoAnuncio(anuncioId)

      const { data, error } = await supabaseAdmin
        .from('anuncios')
        .update(payload)
        .eq('id', anuncioId)
        .select('*')
        .single()

      if (error) throw error
      anuncioId = data.id

      const { error: deleteLinksError } = await supabaseAdmin
        .from('anuncio_hotspots')
        .delete()
        .eq('anuncio_id', anuncioId)

      if (deleteLinksError) throw deleteLinksError
    } else if (action === 'create') {
      if (!auth.canAccess('anuncios', 'create')) {
        return permissaoNegada('anuncios', 'create')
      }

      const saasContext = await getSaasFinanceContext({
        empresaId,
        clienteId: payload.cliente_id,
      })

      assertSaasAccountActive(saasContext)
      assertSaasPlanLimit(saasContext, 'criativos')

      const { data, error } = await supabaseAdmin
        .from('anuncios')
        .insert([payload])
        .select('*')
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

    const anuncioAtual = await buscarAnuncioBasico(anuncioId, auth)

    await logAdminAction({
      request,
      adminUser: auth.user,
      action: action === 'update' ? 'update' : 'create',
      entity: 'anuncios',
      entityId: anuncioId,
      description: action === 'update' ? 'Atualizou um anúncio' : 'Criou um novo anúncio',
      metadata: {
        empresa_id: anuncioAtual?.empresa_id || payload.empresa_id || '',
        anuncio_id: anuncioId,
        titulo_anterior: anuncioAntes?.titulo || null,
        titulo_atual: anuncioAtual?.titulo || payload.titulo,
        cliente_id_anterior: anuncioAntes?.cliente_id || null,
        cliente_id_atual: anuncioAtual?.cliente_id || payload.cliente_id,
        tipo_media_anterior: anuncioAntes?.tipo_media || null,
        tipo_media_atual: anuncioAtual?.tipo_media || payload.tipo_media,
        ativo_anterior: anuncioAntes?.ativo ?? null,
        ativo_atual: anuncioAtual?.ativo ?? payload.ativo,
        duracao_anterior: anuncioAntes?.duracao_segundos || null,
        duracao_atual: anuncioAtual?.duracao_segundos || payload.duracao_segundos,
        estado_anterior: anuncioAntes?.estado || null,
        estado_atual: anuncioAtual?.estado || payload.estado,
        cidade_anterior: anuncioAntes?.cidade || null,
        cidade_atual: anuncioAtual?.cidade || payload.cidade,
        hotspot_ids_anteriores: hotspotIdsAntes,
        hotspot_ids_atuais: hotspotIds,
        alterou_vinculos_hotspots: JSON.stringify(hotspotIdsAntes.sort()) !== JSON.stringify([...hotspotIds].sort()),
      },
    })

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
        code: error.code || null,
      },
      { status: error.status || 500 }
    )
  }
}
