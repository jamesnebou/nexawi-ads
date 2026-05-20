import { supabaseAdmin } from '@/lib/supabase-admin'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function isVencido(pagamento = {}) {
  if (!pagamento.data_vencimento) return false
  if (['Pago', 'Cancelado', 'Isento', 'Estornado'].includes(pagamento.status)) return false
  return pagamento.data_vencimento < hojeISO()
}

function isEmPrazo(pagamento = {}) {
  if (!pagamento.data_vencimento) return false
  if (['Pago', 'Cancelado', 'Isento', 'Estornado'].includes(pagamento.status)) return false
  return pagamento.data_vencimento >= hojeISO()
}

function normalizarLimite(value) {
  const numero = Number(value || 0)
  return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 0
}

function dentroDoLimite({ limite, usoAtual, incremento = 1 }) {
  if (!limite || limite <= 0) return true
  return usoAtual + incremento <= limite
}

function aplicarEscopo(query, { empresaId = '', clienteId = '' } = {}) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) return query.eq('empresa_id', empresaId)
  if (clienteId) return query.eq('cliente_id', clienteId)

  return query
}

async function carregarConta({ empresaId = '', clienteId = '' } = {}) {
  let cliente = null
  let empresa = null

  if (clienteId) {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, empresa_id, nome, nome_empresa, email, status, plano_id, planos(id, nome, preco, ciclo_cobranca, max_criativos, max_pontos, intervalo_relatorio)')
      .eq('id', clienteId)
      .maybeSingle()

    if (error) throw error
    cliente = data || null
    empresaId = empresaId || cliente?.empresa_id || ''
  }

  if (empresaId) {
    const { data, error } = await supabaseAdmin
      .from('empresas')
      .select('id, cliente_id, nome_empresa, email, status, plano_id, planos(id, nome, preco, ciclo_cobranca, max_criativos, max_pontos, intervalo_relatorio)')
      .eq('id', empresaId)
      .maybeSingle()

    if (error) throw error
    empresa = data || null

    if (!cliente && empresa?.cliente_id) {
      const { data: clienteData, error: clienteError } = await supabaseAdmin
        .from('clientes')
        .select('id, empresa_id, nome, nome_empresa, email, status, plano_id, planos(id, nome, preco, ciclo_cobranca, max_criativos, max_pontos, intervalo_relatorio)')
        .eq('id', empresa.cliente_id)
        .maybeSingle()

      if (clienteError) throw clienteError
      cliente = clienteData || null
    }
  }

  return { cliente, empresa, empresaId: empresaId || cliente?.empresa_id || null }
}

async function carregarPagamentos({ empresaId = '', clienteId = '' } = {}) {
  let query = supabaseAdmin
    .from('pagamentos')
    .select('id, empresa_id, cliente_id, plano_id, valor, status, data_vencimento, data_pagamento, created_at, gateway_pagamento, gateway_payment_id, gateway_subscription_id, gateway_invoice_url, gateway_bank_slip_url, gateway_status')
    .order('data_vencimento', { ascending: true })

  query = aplicarEscopo(query, { empresaId, clienteId })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

async function contarUso({ empresaId = '', clienteId = '' } = {}) {
  const [anunciosResult, hotspotsResult] = await Promise.all([
    aplicarEscopo(
      supabaseAdmin.from('anuncios').select('id', { count: 'exact', head: true }),
      { empresaId, clienteId }
    ),
    aplicarEscopo(
      supabaseAdmin.from('hotspots').select('id', { count: 'exact', head: true }),
      { empresaId, clienteId }
    ),
  ])

  if (anunciosResult.error) throw anunciosResult.error
  if (hotspotsResult.error) throw hotspotsResult.error

  return {
    criativos: anunciosResult.count || 0,
    pontos: hotspotsResult.count || 0,
  }
}

export async function getSaasFinanceContext({ empresaId = '', clienteId = '' } = {}) {
  const conta = await carregarConta({ empresaId, clienteId })
  const scope = {
    empresaId: conta.empresaId || empresaId || '',
    clienteId: clienteId || conta.cliente?.id || conta.empresa?.cliente_id || '',
  }

  const [pagamentos, uso] = await Promise.all([
    carregarPagamentos(scope),
    contarUso(scope),
  ])

  const plano = conta.empresa?.planos || conta.cliente?.planos || null
  const vencidos = pagamentos.filter(isVencido)
  const emPrazo = pagamentos.filter(isEmPrazo)
  const pendentes = pagamentos.filter((p) => p.status === 'Pendente')
  const pagos = pagamentos.filter((p) => p.status === 'Pago')
  const statusConta = conta.empresa?.status || conta.cliente?.status || ''

  let statusPagamento = 'sem_cobranca'
  if (vencidos.length > 0) statusPagamento = 'inadimplente'
  else if (emPrazo.length > 0) statusPagamento = 'em_prazo'
  else if (pagos.length > 0) statusPagamento = 'em_dia'

  let statusOperacional = 'ativo'
  let motivoBloqueio = ''

  if (['cancelado', 'Cancelado'].includes(statusConta)) {
    statusOperacional = 'bloqueado'
    motivoBloqueio = 'Conta cancelada.'
  } else if (['pausado', 'inativo', 'Inativo'].includes(statusConta)) {
    statusOperacional = 'pausado'
    motivoBloqueio = 'Conta pausada ou inativa.'
  } else if (statusConta === 'Inadimplente' || statusPagamento === 'inadimplente') {
    statusOperacional = 'bloqueado'
    motivoBloqueio = 'A vigencia financeira venceu e existe pagamento em aberto.'
  }

  const limites = {
    criativos: normalizarLimite(plano?.max_criativos),
    pontos: normalizarLimite(plano?.max_pontos),
  }

  return {
    cliente: conta.cliente,
    empresa: conta.empresa,
    plano,
    pagamentos,
    status_pagamento: statusPagamento,
    status_operacional: statusOperacional,
    motivo_bloqueio: motivoBloqueio,
    inadimplente: statusPagamento === 'inadimplente',
    bloqueado: statusOperacional === 'bloqueado',
    em_prazo: statusPagamento === 'em_prazo',
    limites,
    uso,
    resumo_financeiro: {
      total_pago: pagos.reduce((acc, p) => acc + Number(p.valor || 0), 0),
      total_pendente: pendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0),
      total_vencido: vencidos.reduce((acc, p) => acc + Number(p.valor || 0), 0),
      total_em_prazo: emPrazo.reduce((acc, p) => acc + Number(p.valor || 0), 0),
      pagamentos_pendentes: pendentes.length,
      pagamentos_vencidos: vencidos.length,
      pagamentos_em_prazo: emPrazo.length,
      proximo_vencimento: emPrazo[0]?.data_vencimento || null,
      vencimento_bloqueio: emPrazo[0]?.data_vencimento || null,
    },
  }
}

export function assertSaasAccountActive(context) {
  if (!context?.bloqueado) return

  const error = new Error(context.motivo_bloqueio || 'Conta bloqueada por pendencia financeira.')
  error.status = 402
  error.code = 'SAAS_ACCOUNT_BLOCKED'
  throw error
}

export function assertSaasPlanLimit(context, recurso, incremento = 1) {
  const limite = Number(context?.limites?.[recurso] || 0)
  const usoAtual = Number(context?.uso?.[recurso] || 0)

  if (dentroDoLimite({ limite, usoAtual, incremento })) return

  const labels = {
    criativos: 'criativos/anuncios',
    pontos: 'pontos Wi-Fi/hotspots',
  }

  const error = new Error(`Limite do plano atingido para ${labels[recurso] || recurso}. Uso atual: ${usoAtual}. Limite: ${limite}.`)
  error.status = 402
  error.code = 'SAAS_PLAN_LIMIT_REACHED'
  throw error
}
