// src/app/api/admin/financeiro/route.js
// ============================================================
// API administrativa segura para a aba Financeiro.
// Substitui o acesso direto do navegador às tabelas:
// - pagamentos
// - clientes
// - planos
//
// Agora:
// Dashboard → API admin → valida admin → valida permissão → service_role → Supabase
//
// Permissões aplicadas:
// - GET financeiro: financeiro.view
// - Criar pagamento: financeiro.create
// - Editar pagamento: financeiro.update
// - Excluir pagamento: financeiro.delete
// - Marcar como pago: financeiro.mark_paid
// - Exportar: financeiro.export fica no front, porque o CSV é gerado no navegador
//
// Auditoria:
// - Registra criação, edição, exclusão e marcação como pago.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { getSaasFinanceContext } from '@/lib/saas-finance'

export const runtime = 'nodejs'

const STATUS_VALIDOS = [
  'Pendente',
  'Pago',
  'Vencido',
  'Cancelado',
  'Em negociação',
  'Isento',
  'Estornado',
]

const METODOS_VALIDOS = [
  'PIX',
  'Cartão de Crédito',
  'Boleto',
  'Dinheiro',
  'Transferência',
  'Outro',
]

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
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

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function inicioMesAtual() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
}

function fimMesAtual() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
}

function isDataVencida(dataVencimento) {
  if (!dataVencimento) return false

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const vencimento = new Date(`${dataVencimento}T12:00:00`)
  vencimento.setHours(0, 0, 0, 0)

  return vencimento < hoje
}

function statusCalculado(pagamento) {
  if (['Pago', 'Cancelado', 'Isento', 'Estornado', 'Em negociação'].includes(pagamento.status)) {
    return pagamento.status
  }

  if (pagamento.status === 'Pendente' && isDataVencida(pagamento.data_vencimento)) {
    return 'Vencido'
  }

  return pagamento.status || 'Pendente'
}

function sanitizarPagamentoPayload(pagamento = {}) {
  const valor = Number(String(pagamento.valor || '').replace(',', '.'))

  const status = STATUS_VALIDOS.includes(pagamento.status)
    ? pagamento.status
    : 'Pendente'

  const metodo = pagamento.metodo_pagamento && METODOS_VALIDOS.includes(pagamento.metodo_pagamento)
    ? pagamento.metodo_pagamento
    : pagamento.metodo_pagamento
      ? 'Outro'
      : null

  const payload = {
    cliente_id: pagamento.cliente_id ? String(pagamento.cliente_id) : '',
    plano_id: pagamento.plano_id ? String(pagamento.plano_id) : null,
    valor: Number.isFinite(valor) ? valor : 0,
    data_vencimento: pagamento.data_vencimento || '',
    data_pagamento: pagamento.data_pagamento || null,
    metodo_pagamento: metodo,
    status,
    observacao: limparTexto(pagamento.observacao) || null,
  }

  if (payload.status === 'Pago' && !payload.data_pagamento) {
    payload.data_pagamento = hojeISO()
  }

  if (payload.status !== 'Pago' && !payload.data_pagamento) {
    payload.data_pagamento = null
  }

  return payload
}

function validarPagamento(payload) {
  if (!payload.cliente_id) return 'Cliente é obrigatório'
  if (!payload.valor || payload.valor <= 0) return 'Valor precisa ser maior que zero'
  if (!payload.data_vencimento) return 'Data de vencimento é obrigatória'
  return ''
}

function aplicarFiltroPeriodo(pagamentos, periodo) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const inicioMes = inicioMesAtual()
  const fimMes = fimMesAtual()

  if (periodo === 'mes_atual') {
    return pagamentos.filter((p) =>
      p.data_vencimento >= inicioMes &&
      p.data_vencimento <= fimMes
    )
  }

  if (periodo === 'ultimos_30') {
    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - 30)
    const isoInicio = dataInicio.toISOString().slice(0, 10)

    return pagamentos.filter((p) => p.data_vencimento >= isoInicio)
  }

  if (periodo === 'proximos_30') {
    const dataFim = new Date()
    dataFim.setDate(dataFim.getDate() + 30)
    const isoFim = dataFim.toISOString().slice(0, 10)
    const isoHoje = hoje.toISOString().slice(0, 10)

    return pagamentos.filter((p) =>
      p.data_vencimento >= isoHoje &&
      p.data_vencimento <= isoFim
    )
  }

  return pagamentos
}

function calcularMetricas({ pagamentosTodos, clientes }) {
  const inicioMes = inicioMesAtual()
  const fimMes = fimMesAtual()
  const hoje = hojeISO()

  const pagamentosComStatus = pagamentosTodos.map((p) => ({
    ...p,
    status_calculado: statusCalculado(p),
  }))

  const recebidosMes = pagamentosComStatus.filter((p) =>
    p.status === 'Pago' &&
    p.data_pagamento &&
    p.data_pagamento >= inicioMes &&
    p.data_pagamento <= fimMes
  )

  const previstosMes = pagamentosComStatus.filter((p) =>
    p.data_vencimento &&
    p.data_vencimento >= inicioMes &&
    p.data_vencimento <= fimMes &&
    !['Cancelado', 'Estornado'].includes(p.status)
  )

  const pendentesMes = pagamentosComStatus.filter((p) =>
    p.status_calculado === 'Pendente' &&
    p.data_vencimento &&
    p.data_vencimento >= inicioMes &&
    p.data_vencimento <= fimMes
  )

  const vencidos = pagamentosComStatus.filter((p) =>
    p.status_calculado === 'Vencido'
  )

  const recebidosHoje = pagamentosComStatus.filter((p) =>
    p.status === 'Pago' &&
    p.data_pagamento === hoje
  )

  const clientesAtivos = (clientes || []).filter((c) => c.status === 'Ativo')

  const mrr = clientesAtivos.reduce((acc, cliente) => {
    const preco = Number(cliente.planos?.preco || 0)
    return acc + preco
  }, 0)

  const clientesComPlano = clientesAtivos.filter((c) => Number(c.planos?.preco || 0) > 0)
  const ticketMedio = clientesComPlano.length > 0 ? mrr / clientesComPlano.length : 0

  const clientesInadimplentes = new Set(
    vencidos
      .map((p) => p.cliente_id)
      .filter(Boolean)
  ).size

  return {
    recebidoMes: recebidosMes.reduce((acc, p) => acc + Number(p.valor || 0), 0),
    previstoMes: previstosMes.reduce((acc, p) => acc + Number(p.valor || 0), 0),
    pendenteMes: pendentesMes.reduce((acc, p) => acc + Number(p.valor || 0), 0),
    vencidoTotal: vencidos.reduce((acc, p) => acc + Number(p.valor || 0), 0),
    recebidoHoje: recebidosHoje.reduce((acc, p) => acc + Number(p.valor || 0), 0),
    mrr,
    ticketMedio,
    clientesInadimplentes,
    totalPagamentos: pagamentosComStatus.length,
  }
}

async function montarAssinaturas(clientes = []) {
  const relevantes = (clientes || []).filter((cliente) => cliente.plano_id || cliente.empresa_id)

  return Promise.all(
    relevantes.map(async (cliente) => {
      const contexto = await getSaasFinanceContext({
        clienteId: cliente.id,
        empresaId: cliente.empresa_id || '',
      })
      const pagamentoGateway = (contexto.pagamentos || []).find((pagamento) =>
        pagamento.gateway_pagamento === 'asaas' &&
        (pagamento.gateway_subscription_id || pagamento.gateway_payment_id)
      )

      return {
        cliente_id: cliente.id,
        empresa_id: cliente.empresa_id || null,
        cliente_nome: cliente.nome || '',
        empresa_nome: cliente.nome_empresa || cliente.empresas?.nome_empresa || '',
        status_cliente: cliente.status || '',
        plano: contexto.plano
          ? {
              id: contexto.plano.id,
              nome: contexto.plano.nome,
              preco: Number(contexto.plano.preco || 0),
              ciclo_cobranca: contexto.plano.ciclo_cobranca || 'mensal',
              intervalo_relatorio: contexto.plano.intervalo_relatorio || 'mensal',
            }
          : null,
        status_pagamento: contexto.status_pagamento,
        status_operacional: contexto.status_operacional,
        motivo_bloqueio: contexto.motivo_bloqueio,
        limites: contexto.limites,
        uso: contexto.uso,
        financeiro: contexto.resumo_financeiro,
        gateway: pagamentoGateway
          ? {
              provider: pagamentoGateway.gateway_pagamento,
              payment_id: pagamentoGateway.gateway_payment_id || null,
              subscription_id: pagamentoGateway.gateway_subscription_id || null,
              invoice_url: pagamentoGateway.gateway_invoice_url || null,
              bank_slip_url: pagamentoGateway.gateway_bank_slip_url || null,
              status: pagamentoGateway.gateway_status || null,
            }
          : null,
      }
    })
  )
}

async function carregarResumoWifiPix(auth) {
  const configured = Boolean(
    process.env.WIFI_PIX_GATEWAY === 'efi' ||
    process.env.EFI_CLIENT_ID ||
    process.env.EFI_CLIENT_SECRET ||
    process.env.EFI_PIX_KEY
  )

  try {
    let query = supabaseAdmin
      .from('wifi_pix_vendas')
      .select('id, empresa_id, valor, status, gateway_pagamento, metodo_pagamento, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (auth?.applyEmpresaScope) {
      query = auth.applyEmpresaScope(query)
    }

    const { data, error } = await query

    if (error) throw error

    const vendas = data || []
    const statusPagos = new Set(['pago', 'autorizado'])
    const confirmadas = vendas.filter((venda) => statusPagos.has(venda.status))

    return {
      configured,
      gateway: process.env.WIFI_PIX_GATEWAY || 'asaas',
      totalVendas: vendas.length,
      vendasConfirmadas: confirmadas.length,
      vendasPendentes: vendas.filter((venda) => venda.status === 'pendente').length,
      receitaConfirmada: confirmadas.reduce((total, venda) => total + Number(venda.valor || 0), 0),
      ultimaVendaEm: vendas[0]?.created_at || null,
    }
  } catch (error) {
    return {
      configured,
      gateway: process.env.WIFI_PIX_GATEWAY || 'asaas',
      totalVendas: 0,
      vendasConfirmadas: 0,
      vendasPendentes: 0,
      receitaConfirmada: 0,
      error: error.message || 'Erro ao carregar resumo Wi-Fi no Pix',
    }
  }
}

async function buscarPagamentoBasico(pagamentoId) {
  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .select('id, cliente_id, plano_id, valor, data_vencimento, data_pagamento, metodo_pagamento, status')
    .eq('id', pagamentoId)
    .maybeSingle()

  if (error) throw error

  return data || null
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'financeiro',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const busca = sanitizeBusca(searchParams.get('busca') || '')
    const status = searchParams.get('status') || 'Todos'
    const periodo = searchParams.get('periodo') || 'todos'

    const [
      { data: clientes, error: clientesError },
      { data: planos, error: planosError },
      { data: pagamentos, error: pagamentosError },
    ] = await Promise.all([
      supabaseAdmin
        .from('clientes')
        .select('id, empresa_id, nome, nome_empresa, status, plano_id, planos(id, nome, preco)')
        .order('nome'),

      supabaseAdmin
        .from('planos')
        .select('id, nome, preco')
        .order('nome'),

      supabaseAdmin
        .from('pagamentos')
        .select('*, clientes(id, nome), planos(id, nome, preco)')
        .order('data_vencimento', { ascending: false }),
    ])

    if (clientesError) throw clientesError
    if (planosError) throw planosError
    if (pagamentosError) throw pagamentosError

    const pagamentosComStatus = (pagamentos || []).map((p) => ({
      ...p,
      status_calculado: statusCalculado(p),
    }))

    const metricas = calcularMetricas({
      pagamentosTodos: pagamentosComStatus,
      clientes: clientes || [],
    })
    const assinaturas = await montarAssinaturas(clientes || [])
    const wifiPixResumo = await carregarResumoWifiPix(auth)

    let filtrados = aplicarFiltroPeriodo(pagamentosComStatus, periodo)

    if (status !== 'Todos') {
      filtrados = filtrados.filter((p) => p.status_calculado === status)
    }

    if (busca) {
      filtrados = filtrados.filter((p) => {
        const cliente = String(p.clientes?.nome || '').toLowerCase()
        const plano = String(p.planos?.nome || '').toLowerCase()
        const valor = String(p.valor || '').toLowerCase()
        const metodo = String(p.metodo_pagamento || '').toLowerCase()
        const obs = String(p.observacao || '').toLowerCase()

        return (
          cliente.includes(busca) ||
          plano.includes(busca) ||
          valor.includes(busca) ||
          metodo.includes(busca) ||
          obs.includes(busca)
        )
      })
    }

    return NextResponse.json({
      ok: true,
      pagamentos: filtrados,
      clientes: clientes || [],
      planos: planos || [],
      assinaturas,
      metricas,
      wifiPixResumo,
      permissions: auth.permissions?.financeiro || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar financeiro',
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

    if (action === 'delete') {
      if (!auth.canAccess('financeiro', 'delete')) {
        return permissaoNegada('financeiro', 'delete')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do pagamento é obrigatório' },
          { status: 400 }
        )
      }

      const pagamentoAntes = await buscarPagamentoBasico(id)

      const { error } = await supabaseAdmin
        .from('pagamentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'pagamentos',
        entityId: id,
        description: 'Excluiu um pagamento',
        metadata: {
          pagamento_id: id,
          cliente_id: pagamentoAntes?.cliente_id || null,
          plano_id: pagamentoAntes?.plano_id || null,
          valor: pagamentoAntes?.valor || 0,
          status_anterior: pagamentoAntes?.status || '',
          data_vencimento: pagamentoAntes?.data_vencimento || null,
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Pagamento excluído com sucesso',
      })
    }

    if (action === 'mark_paid') {
      if (!auth.canAccess('financeiro', 'mark_paid')) {
        return permissaoNegada('financeiro', 'mark_paid')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do pagamento é obrigatório' },
          { status: 400 }
        )
      }

      const pagamentoAntes = await buscarPagamentoBasico(id)

      const { data, error } = await supabaseAdmin
        .from('pagamentos')
        .update({
          status: 'Pago',
          data_pagamento: hojeISO(),
          metodo_pagamento: body.metodo_pagamento || 'PIX',
        })
        .eq('id', id)
        .select('*, clientes(id, nome), planos(id, nome, preco)')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'mark_paid',
        entity: 'pagamentos',
        entityId: data.id,
        description: 'Marcou um pagamento como pago',
        metadata: {
          pagamento_id: data.id,
          cliente_id: data.cliente_id,
          plano_id: data.plano_id || null,
          valor: data.valor,
          status_anterior: pagamentoAntes?.status || '',
          status_atual: data.status,
          metodo_pagamento: data.metodo_pagamento || '',
          data_pagamento: data.data_pagamento || null,
        },
      })

      return NextResponse.json({
        ok: true,
        pagamento: {
          ...data,
          status_calculado: statusCalculado(data),
        },
        message: 'Pagamento marcado como pago',
      })
    }

    const payload = sanitizarPagamentoPayload(body.pagamento || {})
    const erroValidacao = validarPagamento(payload)

    if (erroValidacao) {
      return NextResponse.json(
        { ok: false, error: erroValidacao },
        { status: 400 }
      )
    }

    if (action === 'update') {
      if (!auth.canAccess('financeiro', 'update')) {
        return permissaoNegada('financeiro', 'update')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do pagamento é obrigatório' },
          { status: 400 }
        )
      }

      const pagamentoAntes = await buscarPagamentoBasico(id)

      const { data, error } = await supabaseAdmin
        .from('pagamentos')
        .update(payload)
        .eq('id', id)
        .select('*, clientes(id, nome), planos(id, nome, preco)')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'pagamentos',
        entityId: data.id,
        description: 'Atualizou um pagamento',
        metadata: {
          pagamento_id: data.id,
          cliente_id: data.cliente_id,
          plano_id_anterior: pagamentoAntes?.plano_id || null,
          plano_id_atual: data.plano_id || null,
          valor_anterior: pagamentoAntes?.valor || 0,
          valor_atual: data.valor,
          status_anterior: pagamentoAntes?.status || '',
          status_atual: data.status,
          vencimento_anterior: pagamentoAntes?.data_vencimento || null,
          vencimento_atual: data.data_vencimento || null,
        },
      })

      return NextResponse.json({
        ok: true,
        pagamento: {
          ...data,
          status_calculado: statusCalculado(data),
        },
        message: 'Pagamento atualizado com sucesso',
      })
    }

    if (action === 'create') {
      if (!auth.canAccess('financeiro', 'create')) {
        return permissaoNegada('financeiro', 'create')
      }

      const { data, error } = await supabaseAdmin
        .from('pagamentos')
        .insert([payload])
        .select('*, clientes(id, nome), planos(id, nome, preco)')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'pagamentos',
        entityId: data.id,
        description: 'Criou um novo pagamento',
        metadata: {
          pagamento_id: data.id,
          cliente_id: data.cliente_id,
          plano_id: data.plano_id || null,
          valor: data.valor,
          status: data.status,
          data_vencimento: data.data_vencimento || null,
        },
      })

      return NextResponse.json({
        ok: true,
        pagamento: {
          ...data,
          status_calculado: statusCalculado(data),
        },
        message: 'Pagamento registrado com sucesso',
      })
    }

    return NextResponse.json(
      { ok: false, error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao salvar financeiro',
      },
      { status: 500 }
    )
  }
}
