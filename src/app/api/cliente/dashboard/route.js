// src/app/api/cliente/dashboard/route.js
// ============================================================
// API segura para Dashboard do Cliente.
// Sprint 5 Multiempresa:
// - O cliente vê somente dados da própria empresa/conta
// - Usa empresa_id quando existir
// - Mantém fallback por cliente_id para dados antigos
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireCliente } from '@/lib/cliente-api-auth'

export const runtime = 'nodejs'

function extrairNumero(relacao) {
  if (!relacao) return 0
  if (Array.isArray(relacao)) return relacao[0]?.count || 0
  return relacao.count || 0
}

function calcularCtr(cliques, visualizacoes) {
  if (!visualizacoes || visualizacoes <= 0) return 0
  return Number(((cliques / visualizacoes) * 100).toFixed(2))
}

function calcularStatusCampanha({ anunciosAtivos, totalAnuncios, cliente }) {
  if (cliente.status === 'Inadimplente') {
    return {
      status: 'financeiro_pendente',
      label: 'Financeiro pendente',
      message: 'Sua conta possui pendência financeira. Regularize para manter sua campanha ativa.',
    }
  }

  if (cliente.status === 'Inativo') {
    return {
      status: 'pausada',
      label: 'Conta pausada',
      message: 'Sua conta está pausada. Fale com o suporte para reativar sua campanha.',
    }
  }

  if (anunciosAtivos > 0) {
    return {
      status: 'no_ar',
      label: 'Campanha no ar',
      message: 'Sua campanha está ativa e aparecendo na rede NexaWi.',
    }
  }

  if (totalAnuncios > 0) {
    return {
      status: 'sem_anuncio_ativo',
      label: 'Campanha aguardando ativação',
      message: 'Você possui anúncios cadastrados, mas nenhum está ativo no momento.',
    }
  }

  return {
    status: 'aguardando_setup',
    label: 'Aguardando campanha',
    message: 'Sua campanha ainda está em configuração pela equipe NexaWi.',
  }
}

function normalizarPagamento(pagamento = {}) {
  return {
    id: pagamento.id,
    valor: Number(pagamento.valor || 0),
    status: pagamento.status || '',
    created_at: pagamento.created_at || '',
    data_pagamento: pagamento.data_pagamento || null,
    data_vencimento: pagamento.data_vencimento || null,
  }
}

function calcularFinanceiro(pagamentos = []) {
  const pagos = pagamentos.filter((p) => p.status === 'Pago')
  const pendentes = pagamentos.filter((p) => p.status === 'Pendente')

  const totalPago = pagos.reduce((acc, p) => acc + Number(p.valor || 0), 0)
  const totalPendente = pendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0)

  const proximoPagamento =
    pendentes
      .slice()
      .sort((a, b) => {
        const dataA = new Date(a.data_vencimento || a.created_at || 0).getTime()
        const dataB = new Date(b.data_vencimento || b.created_at || 0).getTime()
        return dataA - dataB
      })[0] || null

  return {
    totalPago,
    totalPendente,
    pagamentosPendentes: pendentes.length,
    proximoPagamento: proximoPagamento ? normalizarPagamento(proximoPagamento) : null,
  }
}

function aplicarEscopoClienteEmpresa(query, { clienteId, empresaId }) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) {
    return query.eq('empresa_id', empresaId)
  }

  return query.eq('cliente_id', clienteId)
}

async function buscarHotspotsVinculados({ anuncioIds = [], empresaId = '' }) {
  if (!anuncioIds.length) return []

  try {
    const { data, error } = await supabaseAdmin
      .from('anuncio_hotspots')
      .select(`
        anuncio_id,
        hotspots(id, empresa_id, nome, status)
      `)
      .in('anuncio_id', anuncioIds)

    if (error) throw error

    const map = new Map()

    ;(data || []).forEach((item) => {
      const hotspot = item.hotspots

      if (!hotspot?.id) return
      if (empresaId && hotspot.empresa_id && hotspot.empresa_id !== empresaId) return

      if (!map.has(hotspot.id)) {
        map.set(hotspot.id, {
          id: hotspot.id,
          empresa_id: hotspot.empresa_id || null,
          nome: hotspot.nome || 'Hotspot',
          status: hotspot.status || '',
        })
      }
    })

    return Array.from(map.values())
  } catch (error) {
    console.error('Erro ao buscar hotspots vinculados ao cliente:', error)
    return []
  }
}

async function buscarLeadsRecentes({ anuncioIds = [], empresaId = '' }) {
  if (!anuncioIds.length && !empresaId) {
    return { leadsRecentes: [], totalLeads: 0 }
  }

  let leadsQuery = supabaseAdmin
    .from('leads')
    .select('id, empresa_id, nome, email, telefone, created_at, anuncio_id, hotspot_id, hotspots(nome)')
    .order('created_at', { ascending: false })
    .limit(20)

  let countQuery = supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })

  if (empresaId) {
    leadsQuery = leadsQuery.eq('empresa_id', empresaId)
    countQuery = countQuery.eq('empresa_id', empresaId)
  } else {
    leadsQuery = leadsQuery.in('anuncio_id', anuncioIds)
    countQuery = countQuery.in('anuncio_id', anuncioIds)
  }

  const [
    { data: leadsData, error: leadsError },
    { count: leadsCount, error: leadsCountError },
  ] = await Promise.all([leadsQuery, countQuery])

  if (leadsError) throw leadsError
  if (leadsCountError) throw leadsCountError

  return {
    leadsRecentes: leadsData || [],
    totalLeads: leadsCount || 0,
  }
}

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { cliente, empresaId, empresa } = auth
    const clienteId = cliente.id

    let anunciosQuery = supabaseAdmin
      .from('anuncios')
      .select(`
        *,
        anuncio_views(count),
        anuncio_clicks(count)
      `)
      .order('created_at', { ascending: false })

    anunciosQuery = aplicarEscopoClienteEmpresa(anunciosQuery, {
      clienteId,
      empresaId,
    })

    let pagamentosQuery = supabaseAdmin
      .from('pagamentos')
      .select('*')
      .order('created_at', { ascending: false })

    pagamentosQuery = aplicarEscopoClienteEmpresa(pagamentosQuery, {
      clienteId,
      empresaId,
    })

    const [
      { data: anunciosData, error: anunciosError },
      { data: pagamentosData, error: pagamentosError },
    ] = await Promise.all([
      anunciosQuery,
      pagamentosQuery,
    ])

    if (anunciosError) throw anunciosError
    if (pagamentosError) throw pagamentosError

    const anuncios = (anunciosData || []).map((ad) => {
      const visualizacoes = extrairNumero(ad.anuncio_views)
      const cliques = extrairNumero(ad.anuncio_clicks)

      return {
        ...ad,
        visualizacoes,
        cliques,
        ctr: calcularCtr(cliques, visualizacoes),
        anuncio_views: undefined,
        anuncio_clicks: undefined,
      }
    })

    const anuncioIds = anuncios.map((ad) => ad.id).filter(Boolean)

    const [leadsResult, hotspotsVinculados] = await Promise.all([
      buscarLeadsRecentes({ anuncioIds, empresaId }),
      buscarHotspotsVinculados({ anuncioIds, empresaId }),
    ])

    const anunciosAtivos = anuncios.filter((ad) => ad.ativo === true).length
    const anunciosInativos = anuncios.filter((ad) => ad.ativo === false).length
    const totalVisualizacoes = anuncios.reduce((acc, ad) => acc + Number(ad.visualizacoes || 0), 0)
    const totalCliques = anuncios.reduce((acc, ad) => acc + Number(ad.cliques || 0), 0)

    const financeiro = calcularFinanceiro(pagamentosData || [])

    const campanha = calcularStatusCampanha({
      anunciosAtivos,
      totalAnuncios: anuncios.length,
      cliente,
    })

    return NextResponse.json({
      ok: true,
      empresa: empresa
        ? {
            id: empresa.id,
            nome_empresa: empresa.nome_empresa || '',
            email: empresa.email || '',
            telefone: empresa.telefone || '',
            cidade: empresa.cidade || '',
            estado: empresa.estado || '',
            status: empresa.status || '',
          }
        : null,
      cliente: {
        id: cliente.id,
        empresa_id: empresaId || cliente.empresa_id || null,
        nome: cliente.nome || '',
        nome_empresa: empresa?.nome_empresa || cliente.nome_empresa || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        status: cliente.status || '',
        plano_nome: cliente.planos?.nome || 'Sem plano',
        onboarding_status: cliente.onboarding_status || '',
        onboarding_travado: Boolean(cliente.onboarding_travado),
      },
      campanha,
      resumo: {
        anunciosAtivos,
        anunciosInativos,
        totalAnuncios: anuncios.length,
        totalVisualizacoes,
        totalCliques,
        totalLeads: leadsResult.totalLeads,
        ctrGeral: calcularCtr(totalCliques, totalVisualizacoes),
        hotspotsVinculados: hotspotsVinculados.length,
      },
      financeiro,
      anuncios,
      leadsRecentes: leadsResult.leadsRecentes,
      pagamentosRecentes: (pagamentosData || []).slice(0, 5).map(normalizarPagamento),
      hotspotsVinculados,
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
        error: error.message || 'Erro ao carregar dashboard do cliente',
      },
      { status: 500 }
    )
  }
}
