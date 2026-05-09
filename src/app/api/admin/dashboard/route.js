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
//
// Agora também retorna:
// - Resumo operacional de onboarding
// - Clientes em implantação
// - Alertas operacionais
// - Distribuição por etapa de implantação
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { countOnlineHotspotClients } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

const CORES_PADRAO = ['#6be12f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const ONBOARDING_LABELS = {
  novo_lead: 'Novo lead',
  contrato_enviado: 'Contrato enviado',
  pagamento_pendente: 'Pagamento pendente',
  pagamento_confirmado: 'Pagamento confirmado',
  setup_em_andamento: 'Setup em andamento',
  hotspot_configurado: 'Hotspot configurado',
  campanha_criada: 'Campanha criada',
  portal_testado: 'Portal testado',
  cliente_ativo: 'Cliente ativo',
  cliente_pausado: 'Cliente pausado',
  cancelado: 'Cancelado',
}

const CHECKLIST_KEYS = [
  'contrato_enviado',
  'pagamento_confirmado',
  'dados_empresa_recebidos',
  'criativo_recebido',
  'hotspot_vinculado',
  'anuncio_criado',
  'portal_testado',
  'cliente_liberado',
]

const STATUS_SETUP = [
  'novo_lead',
  'contrato_enviado',
  'pagamento_pendente',
  'pagamento_confirmado',
  'setup_em_andamento',
  'hotspot_configurado',
  'campanha_criada',
  'portal_testado',
]

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

function normalizarOnboardingStatus(cliente = {}) {
  if (cliente.onboarding_status) {
    return cliente.onboarding_status
  }

  if (cliente.status === 'Ativo') return 'cliente_ativo'
  if (cliente.status === 'Inadimplente') return 'pagamento_pendente'
  if (cliente.status === 'Cancelado') return 'cancelado'
  if (cliente.status === 'Inativo') return 'cliente_pausado'

  return 'novo_lead'
}

function calcularProgressoChecklist(checklist = {}) {
  const obj = checklist && typeof checklist === 'object' ? checklist : {}
  const total = CHECKLIST_KEYS.length
  const feitos = CHECKLIST_KEYS.filter((key) => Boolean(obj[key])).length

  return {
    total,
    feitos,
    percentual: total > 0 ? Math.round((feitos / total) * 100) : 0,
  }
}

function normalizarClienteOperacional(cliente = {}) {
  const onboardingStatus = normalizarOnboardingStatus(cliente)
  const progresso = calcularProgressoChecklist(cliente.onboarding_checklist)

  return {
    id: cliente.id,
    nome: cliente.nome || '',
    nome_empresa: cliente.nome_empresa || '',
    email: cliente.email || '',
    status: cliente.status || '',
    plano_nome: cliente.planos?.nome || '',
    onboarding_status: onboardingStatus,
    onboarding_status_label: ONBOARDING_LABELS[onboardingStatus] || 'Novo lead',
    onboarding_travado: Boolean(cliente.onboarding_travado),
    onboarding_motivo_trava: cliente.onboarding_motivo_trava || '',
    onboarding_responsavel: cliente.onboarding_responsavel || '',
    onboarding_updated_at: cliente.onboarding_updated_at || cliente.created_at || '',
    progresso,
  }
}

function calcularResumoOperacional(clientes = [], pagamentos = []) {
  const normalizados = clientes.map(normalizarClienteOperacional)

  const clientesEmSetup = normalizados.filter((cliente) =>
    STATUS_SETUP.includes(cliente.onboarding_status)
  )

  const clientesTravados = normalizados.filter((cliente) => cliente.onboarding_travado)

  const clientesProntosParaAtivar = normalizados.filter((cliente) =>
    ['portal_testado'].includes(cliente.onboarding_status) ||
    (cliente.progresso.percentual >= 100 && cliente.onboarding_status !== 'cliente_ativo')
  )

  const pagamentosPendentesClientes = normalizados.filter((cliente) =>
    cliente.onboarding_status === 'pagamento_pendente' ||
    cliente.status === 'Inadimplente'
  )

  const pagamentosPendentesFinanceiro = (pagamentos || []).filter((pagamento) =>
    pagamento.status === 'Pendente'
  )

  return {
    totalClientesMonitorados: normalizados.length,
    emSetup: clientesEmSetup.length,
    travados: clientesTravados.length,
    pagamentoPendente: pagamentosPendentesClientes.length,
    pagamentosPendentesFinanceiro: pagamentosPendentesFinanceiro.length,
    prontosParaAtivar: clientesProntosParaAtivar.length,
    implantacoesConcluidas: normalizados.filter((cliente) =>
      cliente.onboarding_status === 'cliente_ativo'
    ).length,
    clientesPausados: normalizados.filter((cliente) =>
      cliente.onboarding_status === 'cliente_pausado'
    ).length,
    cancelados: normalizados.filter((cliente) =>
      cliente.onboarding_status === 'cancelado'
    ).length,
  }
}

function montarClientesOperacao(clientes = []) {
  return clientes
    .map(normalizarClienteOperacional)
    .filter((cliente) =>
      cliente.onboarding_travado ||
      STATUS_SETUP.includes(cliente.onboarding_status)
    )
    .sort((a, b) => {
      if (a.onboarding_travado && !b.onboarding_travado) return -1
      if (!a.onboarding_travado && b.onboarding_travado) return 1

      const dataA = new Date(a.onboarding_updated_at || 0).getTime()
      const dataB = new Date(b.onboarding_updated_at || 0).getTime()

      return dataB - dataA
    })
    .slice(0, 8)
}

function montarAlertasOperacionais(clientes = [], pagamentos = []) {
  const alertasClientes = clientes
    .map(normalizarClienteOperacional)
    .filter((cliente) =>
      cliente.onboarding_travado ||
      cliente.onboarding_status === 'pagamento_pendente' ||
      cliente.status === 'Inadimplente'
    )
    .map((cliente) => {
      if (cliente.onboarding_travado) {
        return {
          id: `cliente-travado-${cliente.id}`,
          tipo: 'travado',
          titulo: 'Cliente travado',
          descricao: cliente.onboarding_motivo_trava || 'Implantação parada por pendência.',
          cliente_nome: cliente.nome_empresa || cliente.nome,
          responsavel: cliente.onboarding_responsavel || '',
          severidade: 'alta',
        }
      }

      return {
        id: `pagamento-pendente-${cliente.id}`,
        tipo: 'pagamento_pendente',
        titulo: 'Pagamento pendente',
        descricao: 'Cliente aguardando confirmação de pagamento.',
        cliente_nome: cliente.nome_empresa || cliente.nome,
        responsavel: cliente.onboarding_responsavel || '',
        severidade: 'media',
      }
    })

  const alertasFinanceiro = (pagamentos || [])
    .filter((pagamento) => pagamento.status === 'Pendente')
    .slice(0, 5)
    .map((pagamento) => ({
      id: `pagamento-${pagamento.id}`,
      tipo: 'financeiro_pendente',
      titulo: 'Cobrança pendente',
      descricao: `Pagamento pendente de ${pagamento.clientes?.nome || 'cliente sem nome'}.`,
      cliente_nome: pagamento.clientes?.nome || '',
      responsavel: 'Financeiro',
      severidade: 'media',
    }))

  return [...alertasClientes, ...alertasFinanceiro].slice(0, 8)
}

function montarOnboardingPorStatus(clientes = []) {
  const map = {}

  clientes.forEach((cliente) => {
    const status = normalizarOnboardingStatus(cliente)
    const label = ONBOARDING_LABELS[status] || status

    map[label] = (map[label] || 0) + 1
  })

  return Object.entries(map)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

async function buscarUltimosAcessosPortalClientes(clientes = []) {
  if (!clientes.length) return []

  const clientesPorId = new Map()

  clientes.forEach((cliente) => {
    if (cliente.id) {
      clientesPorId.set(cliente.id, cliente)
    }
  })

  const { data, error } = await supabaseAdmin
    .from('cliente_access_logs')
    .select(`
      id,
      cliente_id,
      cliente_email,
      cliente_nome,
      cliente_empresa,
      event_type,
      ip_address,
      user_agent,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error

  return (data || []).map((log) => {
    const cliente = clientesPorId.get(log.cliente_id)

    return {
      id: log.id,
      cliente_id: log.cliente_id,
      nome: log.cliente_nome || cliente?.nome || '',
      nome_empresa: log.cliente_empresa || cliente?.nome_empresa || '',
      email: log.cliente_email || cliente?.email || '',
      status: cliente?.status || '',
      plano_nome: cliente?.planos?.nome || '',
      event_type: log.event_type || '',
      ip_address: log.ip_address || '',
      user_agent: log.user_agent || '',
      created_at: log.created_at || '',
    }
  })
}

async function buscarUltimosAcessosClientes(clientes = []) {
  if (!clientes.length) return []

  const clientesPorEmail = new Map()

  clientes.forEach((cliente) => {
    const email = String(cliente.email || '').trim().toLowerCase()

    if (email) {
      clientesPorEmail.set(email, cliente)
    }
  })

  if (clientesPorEmail.size === 0) return []

  const acessos = []
  let page = 1
  const perPage = 1000

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const users = data?.users || []

    users.forEach((user) => {
      const email = String(user.email || '').trim().toLowerCase()
      const cliente = clientesPorEmail.get(email)

      if (!cliente || !user.last_sign_in_at) return

      acessos.push({
        id: cliente.id,
        nome: cliente.nome || '',
        nome_empresa: cliente.nome_empresa || '',
        email,
        status: cliente.status || '',
        plano_nome: cliente.planos?.nome || '',
        last_sign_in_at: user.last_sign_in_at,
      })
    })

    if (users.length < perPage) break

    page += 1
  }

  return acessos
    .sort((a, b) => {
      const dataA = new Date(a.last_sign_in_at || 0).getTime()
      const dataB = new Date(b.last_sign_in_at || 0).getTime()

      return dataB - dataA
    })
    .slice(0, 8)
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

async function buscarPessoasOnlineReais() {
  try {
    const result = await countOnlineHotspotClients()

    return {
      count: result.count || 0,
      source: 'routeros',
      reliable: true,
      checkedAt: result.checkedAt,
      error: '',
    }
  } catch (error) {
    console.error('Erro ao buscar pessoas online no MikroTik:', error)

    return {
      count: 0,
      source: 'routeros',
      reliable: false,
      checkedAt: new Date().toISOString(),
      error: error.message || 'Erro ao consultar MikroTik',
    }
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
        { data: clientesData, error: clientesError },
      ] = await Promise.all([
        supabaseAdmin
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Ativo'),

        supabaseAdmin
          .from('clientes')
          .select(`
            id,
            nome,
            nome_empresa,
            email,
            status,
            plano_id,
            created_at,
            onboarding_status,
            onboarding_checklist,
            onboarding_observacao,
            onboarding_responsavel,
            onboarding_travado,
            onboarding_motivo_trava,
            onboarding_updated_at,
            planos(nome)
          `)
          .order('created_at', { ascending: false }),
      ])

      if (clientesCountError) throw clientesCountError
      if (clientesError) throw clientesError

      clientesAtivos = clientesCount || 0
      clientes = clientesData || []
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

      
      if (hotspotId) {
        queryLeadsHoje = queryLeadsHoje.eq('hotspot_id', hotspotId)
        queryLeadsMes = queryLeadsMes.eq('hotspot_id', hotspotId)
        queryPessoasOnline = queryPessoasOnline.eq('hotspot_id', hotspotId)
      }

      const [
  { count: leadsHojeCount, error: leadsHojeError },
  { count: leadsMesCount, error: leadsMesError },
  { data: leadsData, error: leadsGeralError },
] = await Promise.all([
  queryLeadsHoje,
  queryLeadsMes,
  supabaseAdmin
    .from('leads')
    .select('id, nome, email, created_at, hotspot_id, hotspots(nome)')
    .order('created_at', { ascending: false })
    .limit(5000),
])

      if (leadsHojeError) throw leadsHojeError
      if (leadsMesError) throw leadsMesError
      if (leadsGeralError) throw leadsGeralError

      leadsHoje = leadsHojeCount || 0
      leadsMes = leadsMesCount || 0
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

      const pessoasOnlineReal = await buscarPessoasOnlineReais()
pessoasOnline = pessoasOnlineReal.count

    const metricas = {
  clientesAtivos,
  hotspotsAtivos,
  leadsHoje,
  leadsMes,
  pessoasOnline,
  pessoasOnlineFonte: pessoasOnlineReal.source,
  pessoasOnlineConfiavel: pessoasOnlineReal.reliable,
  pessoasOnlineCheckedAt: pessoasOnlineReal.checkedAt,
  pessoasOnlineErro: pessoasOnlineReal.error,
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

    const resumoOperacional = podeVerClientes
      ? calcularResumoOperacional(clientes, pagamentos)
      : {
          totalClientesMonitorados: 0,
          emSetup: 0,
          travados: 0,
          pagamentoPendente: 0,
          pagamentosPendentesFinanceiro: 0,
          prontosParaAtivar: 0,
          implantacoesConcluidas: 0,
          clientesPausados: 0,
          cancelados: 0,
        }

    const clientesOperacao = podeVerClientes
      ? montarClientesOperacao(clientes)
      : []

    const alertasOperacionais = podeVerClientes || podeVerFinanceiro
      ? montarAlertasOperacionais(podeVerClientes ? clientes : [], podeVerFinanceiro ? pagamentos : [])
      : []

    const onboardingPorStatus = podeVerClientes
      ? montarOnboardingPorStatus(clientes)
      : []

      const clientesUltimosAcessos = podeVerClientes
  ? await buscarUltimosAcessosClientes(clientes)
  : []

    return NextResponse.json({
      ok: true,
      hotspots: podeVerHotspots ? hotspotsData : [],
      metricas,
      interacoesAnuncios: interacoes,
      resumoOperacional,
      clientesOperacao,
      alertasOperacionais,
      onboardingPorStatus,
      clientesUltimosAcessos,
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
        operacao: podeVerClientes,
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