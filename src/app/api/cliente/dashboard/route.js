// src/app/api/cliente/dashboard/route.js
// ============================================================
// API segura para Dashboard do Cliente.
// O cliente só enxerga dados vinculados ao próprio cadastro.
//
// Retorna:
// - dados do cliente
// - plano
// - anúncios
// - visualizações
// - cliques
// - leads capturados
// - pagamentos
// - hotspots vinculados
// - status da campanha
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

async function buscarHotspotsVinculados(anuncioIds = []) {
  if (!anuncioIds.length) return []

  try {
    const { data, error } = await supabaseAdmin
      .from('anuncio_hotspots')
      .select(`
        anuncio_id,
        hotspots(id, nome, status)
      `)
      .in('anuncio_id', anuncioIds)

    if (error) throw error

    const map = new Map()

    ;(data || []).forEach((item) => {
      const hotspot = item.hotspots

      if (hotspot?.id && !map.has(hotspot.id)) {
        map.set(hotspot.id, {
          id: hotspot.id,
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

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { cliente } = auth

    const [
      { data: anunciosData, error: anunciosError },
      { data: pagamentosData, error: pagamentosError },
    ] = await Promise.all([
      supabaseAdmin
        .from('anuncios')
        .select(`
          *,
          anuncio_views(count),
          anuncio_clicks(count)
        `)
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('pagamentos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false }),
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

    let leadsRecentes = []
    let totalLeads = 0

    if (anuncioIds.length > 0) {
      const { data: leadsData, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, nome, email, telefone, created_at, anuncio_id, hotspot_id, hotspots(nome)')
        .in('anuncio_id', anuncioIds)
        .order('created_at', { ascending: false })
        .limit(20)

      if (leadsError) throw leadsError

      leadsRecentes = leadsData || []

      const { count: leadsCount, error: leadsCountError } = await supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('anuncio_id', anuncioIds)

      if (leadsCountError) throw leadsCountError

      totalLeads = leadsCount || 0
    }

    const hotspotsVinculados = await buscarHotspotsVinculados(anuncioIds)

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
      cliente: {
        id: cliente.id,
        nome: cliente.nome || '',
        nome_empresa: cliente.nome_empresa || '',
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
        totalLeads,
        ctrGeral: calcularCtr(totalCliques, totalVisualizacoes),
        hotspotsVinculados: hotspotsVinculados.length,
      },
      financeiro,
      anuncios,
      leadsRecentes,
      pagamentosRecentes: (pagamentosData || []).slice(0, 5).map(normalizarPagamento),
      hotspotsVinculados,
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