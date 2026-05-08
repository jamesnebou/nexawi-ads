// src/app/api/admin/dashboard/route.js
// ============================================================
// API administrativa segura para a Dashboard Geral.
// Substitui o acesso direto do navegador às tabelas:
// - clientes
// - hotspots
// - leads
// - pagamentos
// - anuncio_clicks
// - anuncio_hotspots
//
// Permissões aplicadas:
// - dashboard.view → visualizar dashboard
//
// Observação profissional:
// A rota exige dashboard.view para abrir.
// Os dados financeiros, leads, clientes e relatórios também são
// filtrados conforme permissões secundárias do admin.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const CORES_PADRAO = ['#6be12f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function inicioDoDiaISO() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje.toISOString()
}

function inicioDoMesISO() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0).toISOString()
}

function subtrairMinutosISO(minutos) {
  return new Date(Date.now() - minutos * 60 * 1000).toISOString()
}

function ultimosDiasISO(qtd = 14) {
  const hoje = new Date()

  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date()
    d.setDate(hoje.getDate() - (qtd - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

function ultimosMesesISO(qtd = 6) {
  const hoje = new Date()

  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date()
    d.setMonth(hoje.getMonth() - (qtd - 1 - i))
    return d.toISOString().slice(0, 7)
  })
}

function graficoVazioDias() {
  return ultimosDiasISO(14).map((d) => ({
    data: new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    leads: 0,
  }))
}

function graficoVazioMeses() {
  return ultimosMesesISO(6).map((m) => ({
    label: new Date(`${m}-01T12:00:00`).toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit',
    }),
    recebido: 0,
    pendente: 0,
  }))
}

async function contarInteracoesAnuncios({ hotspotId = '' } = {}) {
  let anuncioIdsDoHotspot = null

  if (hotspotId) {
    const { data: vinculos, error: vinculosError } = await supabaseAdmin
      .from('anuncio_hotspots')
      .select('anuncio_id')
      .eq('hotspot_id', hotspotId)

    if (vinculosError) throw vinculosError

    anuncioIdsDoHotspot = (vinculos || [])
      .map((v) => v.anuncio_id)
      .filter(Boolean)

    if (anuncioIdsDoHotspot.length === 0) {
      return {
        linksCopiados: 0,
        tentativasAbrir: 0,
      }
    }
  }

  let queryCopias = supabaseAdmin
    .from('anuncio_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_acao', 'copy')

  let queryAberturas = supabaseAdmin
    .from('anuncio_clicks')
    .select('*', { count: 'exact', head: true })
    .in('tipo_acao', ['open', 'open_attempt'])

  if (anuncioIdsDoHotspot) {
    queryCopias = queryCopias.in('anuncio_id', anuncioIdsDoHotspot)
    queryAberturas = queryAberturas.in('anuncio_id', anuncioIdsDoHotspot)
  }

  const [
    { count: linksCopiados, error: copiasError },
    { count: tentativasAbrir, error: aberturasError },
  ] = await Promise.all([
    queryCopias,
    queryAberturas,
  ])

  if (copiasError) throw copiasError
  if (aberturasError) throw aberturasError

  return {
    linksCopiados: linksCopiados || 0,
    tentativasAbrir: tentativasAbrir || 0,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'dashboard',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const hotspotId = String(searchParams.get('hotspotId') || '').trim()

    const podeVerClientes = auth.canAccess('clientes', 'view')
    const podeVerHotspots = auth.canAccess('hotspots', 'view')
    const podeVerLeads = auth.canAccess('leads', 'view')
    const podeVerFinanceiro = auth.canAccess('financeiro', 'view')
    const podeVerRelatorios = auth.canAccess('relatorios', 'view')
    const podeVerAnuncios = auth.canAccess('anuncios', 'view')

    const podeVerInteracoes = podeVerRelatorios || podeVerAnuncios

    const inicioHoje = inicioDoDiaISO()
    const inicioMes = inicioDoMesISO()
    const quinzeMinutosAtras = subtrairMinutosISO(15)

    let hotspotsData = []
    let clientesAtivos = 0
    let hotspotsAtivos = 0
    let leadsHoje = 0
    let leadsMes = 0
    let pessoasOnline = 0
    let pagamentos = []
    let clientes = []
    let leadsGeral = []
    let interacoes = {
      linksCopiados: 0,
      tentativasAbrir: 0,
    }

    if (podeVerHotspots) {
      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .select('id, nome')
        .eq('status', 'Ativo')
        .order('nome')

      if (error) throw error

      hotspotsData = data || []

      const { count, error: countError } = await supabaseAdmin
        .from('hotspots')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo')

      if (countError) throw countError

      hotspotsAtivos = count || 0
    }

    if (podeVerClientes) {
      const [
        { count: clientesCount, error: clientesCountError },
        { data: clientesStatus, error: clientesError },
      ] = await Promise.all([
        supabaseAdmin
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Ativo'),

        supabaseAdmin
          .from('clientes')
          .select('status'),
      ])

      if (clientesCountError) throw clientesCountError
      if (clientesError) throw clientesError

      clientesAtivos = clientesCount || 0
      clientes = clientesStatus || []
    }

    if (podeVerLeads) {
      let queryLeadsHoje = supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoje)

      let queryLeadsMes = supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes)

      let queryPessoasOnline = supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', quinzeMinutosAtras)

      if (hotspotId) {
        queryLeadsHoje = queryLeadsHoje.eq('hotspot_id', hotspotId)
        queryLeadsMes = queryLeadsMes.eq('hotspot_id', hotspotId)
        queryPessoasOnline = queryPessoasOnline.eq('hotspot_id', hotspotId)
      }

      const [
        { count: leadsHojeCount, error: leadsHojeError },
        { count: leadsMesCount, error: leadsMesError },
        { count: pessoasOnlineCount, error: pessoasOnlineError },
        { data: leadsData, error: leadsGeralError },
      ] = await Promise.all([
        queryLeadsHoje,
        queryLeadsMes,
        queryPessoasOnline,
        supabaseAdmin
          .from('leads')
          .select('id, nome, email, created_at, hotspot_id, hotspots(nome)')
          .order('created_at', { ascending: false })
          .limit(5000),
      ])

      if (leadsHojeError) throw leadsHojeError
      if (leadsMesError) throw leadsMesError
      if (pessoasOnlineError) throw pessoasOnlineError
      if (leadsGeralError) throw leadsGeralError

      leadsHoje = leadsHojeCount || 0
      leadsMes = leadsMesCount || 0
      pessoasOnline = pessoasOnlineCount || 0
      leadsGeral = leadsData || []
    }

    if (podeVerFinanceiro) {
      const { data, error } = await supabaseAdmin
        .from('pagamentos')
        .select('id, valor, status, created_at, data_pagamento, clientes(nome)')
        .order('created_at', { ascending: false })

      if (error) throw error

      pagamentos = data || []
    }

    if (podeVerInteracoes) {
      interacoes = await contarInteracoesAnuncios({ hotspotId })
    }

    const recebidoMes = (pagamentos || [])
      .filter((p) => {
        if (p.status !== 'Pago') return false

        const dataReferencia = p.data_pagamento
          ? `${p.data_pagamento}T12:00:00.000Z`
          : p.created_at

        return dataReferencia >= inicioMes
      })
      .reduce((acc, p) => acc + Number(p.valor || 0), 0)

    const metricas = {
      clientesAtivos,
      hotspotsAtivos,
      leadsHoje,
      leadsMes,
      pessoasOnline,
      recebidoMes,
    }

    const ultimos14 = ultimosDiasISO(14)
    const leadsPorDiaMap = {}

    ultimos14.forEach((d) => {
      leadsPorDiaMap[d] = 0
    })

    ;(leadsGeral || []).forEach((lead) => {
      const d = lead.created_at?.slice(0, 10)

      if (leadsPorDiaMap[d] !== undefined) {
        leadsPorDiaMap[d] += 1
      }
    })

    const leadsPorDiaGeral = podeVerLeads
      ? ultimos14.map((d) => ({
          data: new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
          leads: leadsPorDiaMap[d] || 0,
        }))
      : graficoVazioDias()

    let leadsUnicosPorDiaHotspot = []

    if (podeVerLeads) {
      const leadsPorDiaHotspotMap = {}

      ultimos14.forEach((d) => {
        leadsPorDiaHotspotMap[d] = 0
      })

      ;(leadsGeral || [])
        .filter((lead) => {
          if (!hotspotId) return true
          return lead.hotspot_id === hotspotId
        })
        .forEach((lead) => {
          const d = lead.created_at?.slice(0, 10)

          if (leadsPorDiaHotspotMap[d] !== undefined) {
            leadsPorDiaHotspotMap[d] += 1
          }
        })

      leadsUnicosPorDiaHotspot = ultimos14.map((d) => ({
        data: new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        leads: leadsPorDiaHotspotMap[d] || 0,
      }))
    } else {
      leadsUnicosPorDiaHotspot = graficoVazioDias()
    }

    const ultimos6Meses = ultimosMesesISO(6)
    const receitaPorMesMap = {}

    ultimos6Meses.forEach((m) => {
      receitaPorMesMap[m] = {
        recebido: 0,
        pendente: 0,
      }
    })

    ;(pagamentos || []).forEach((pagamento) => {
      const mes = pagamento.created_at?.slice(0, 7)

      if (!receitaPorMesMap[mes]) return

      if (pagamento.status === 'Pago') {
        receitaPorMesMap[mes].recebido += Number(pagamento.valor || 0)
      }

      if (pagamento.status === 'Pendente') {
        receitaPorMesMap[mes].pendente += Number(pagamento.valor || 0)
      }
    })

    const receitaPorMes = podeVerFinanceiro
      ? ultimos6Meses.map((m) => ({
          label: new Date(`${m}-01T12:00:00`).toLocaleDateString('pt-BR', {
            month: 'short',
            year: '2-digit',
          }),
          recebido: receitaPorMesMap[m]?.recebido || 0,
          pendente: receitaPorMesMap[m]?.pendente || 0,
        }))
      : graficoVazioMeses()

    const clientesPorStatusMap = (clientes || []).reduce((acc, cliente) => {
      const status = cliente.status || 'Sem status'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const clientesPorStatus = podeVerClientes
      ? Object.entries(clientesPorStatusMap).map(([status, count]) => ({
          name: status,
          value: count,
        }))
      : []

    const leadsPorHotspotMap = (leadsGeral || []).reduce((acc, lead) => {
      const hotspotNome = lead.hotspots?.nome || 'Desconhecido'
      acc[hotspotNome] = (acc[hotspotNome] || 0) + 1
      return acc
    }, {})

    const leadsPorHotspotGeral = podeVerLeads
      ? Object.entries(leadsPorHotspotMap)
          .map(([name, leads]) => ({
            name,
            leads,
          }))
          .sort((a, b) => b.leads - a.leads)
          .slice(0, 5)
      : []

    return NextResponse.json({
      ok: true,
      hotspots: podeVerHotspots ? hotspotsData : [],
      metricas,
      interacoesAnuncios: interacoes,
      leadsPorDiaGeral,
      leadsUnicosPorDiaHotspot,
      receitaPorMes,
      clientesPorStatus,
      leadsPorHotspotGeral,
      pagamentosRecentes: podeVerFinanceiro ? (pagamentos || []).slice(0, 5) : [],
      leadsRecentes: podeVerLeads ? (leadsGeral || []).slice(0, 5) : [],
      cores: CORES_PADRAO,
      permissions: auth.permissions?.dashboard || {},
      visibility: {
        clientes: podeVerClientes,
        hotspots: podeVerHotspots,
        leads: podeVerLeads,
        financeiro: podeVerFinanceiro,
        relatorios: podeVerRelatorios,
        anuncios: podeVerAnuncios,
        interacoes: podeVerInteracoes,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar dashboard',
      },
      { status: 500 }
    )
  }
}