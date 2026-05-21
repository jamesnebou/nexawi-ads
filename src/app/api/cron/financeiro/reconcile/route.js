import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'
import { createAdminNotification } from '@/lib/admin-notifications'

export const runtime = 'nodejs'

function isAuthorized(request) {
  const secret = process.env.NEXAWI_CRON_SECRET
  const headerSecret = request.headers.get('x-cron-secret')
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  return Boolean(secret && (headerSecret === secret || bearer === secret))
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function clienteNome(pagamento = {}) {
  return pagamento.clientes?.nome_empresa || pagamento.clientes?.nome || 'Cliente'
}

async function marcarPagamentoVencido(request, pagamento) {
  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .update({
      status: 'Vencido',
      observacao: pagamento.observacao || 'Marcado como vencido pela reconciliacao financeira automatica.',
    })
    .eq('id', pagamento.id)
    .eq('status', 'Pendente')
    .select('id, cliente_id, empresa_id, plano_id, valor, status, data_vencimento')
    .maybeSingle()

  if (error) throw error

  if (!data?.id) {
    return {
      updated: false,
      pagamentoId: pagamento.id,
      reason: 'Pagamento ja foi alterado por outro processo.',
    }
  }

  await logAdminAction({
    request,
    adminUser: {
      id: null,
      email: 'financeiro-cron@nexawi.system',
    },
    action: 'finance_overdue_reconciled',
    entity: 'pagamentos',
    entityId: data.id,
    description: `Pagamento ${data.id} marcado como vencido pela reconciliacao financeira automatica.`,
    metadata: {
      pagamento_id: data.id,
      cliente_id: data.cliente_id || null,
      empresa_id: data.empresa_id || null,
      plano_id: data.plano_id || null,
      valor: data.valor || null,
      data_vencimento: data.data_vencimento || null,
      previous_status: pagamento.status || null,
      status: data.status,
    },
  })

  const notification = await createAdminNotification({
    type: 'financeiro_inadimplente',
    title: 'Cliente bloqueado por inadimplencia',
    message: `${clienteNome(pagamento)} possui cobranca vencida de ${moeda(data.valor)} desde ${data.data_vencimento}. A operacao fica bloqueada ate a regularizacao.`,
    severity: 'critical',
    entity: 'pagamentos',
    entityId: data.id,
    actionUrl: '/dashboard/financeiro',
    dedupKey: `financeiro_inadimplente:${data.id}`,
    metadata: {
      pagamento_id: data.id,
      cliente_id: data.cliente_id || null,
      empresa_id: data.empresa_id || null,
      valor: data.valor || null,
      data_vencimento: data.data_vencimento || null,
      status: data.status,
    },
  })

  return {
    updated: true,
    pagamentoId: data.id,
    clienteId: data.cliente_id || null,
    empresaId: data.empresa_id || null,
    notification,
  }
}

async function reconciliarFinanceiro(request) {
  const hoje = todayISO()

  const { data: vencidos, error } = await supabaseAdmin
    .from('pagamentos')
    .select('id, cliente_id, empresa_id, plano_id, valor, status, data_vencimento, observacao, clientes(nome, nome_empresa, email)')
    .eq('status', 'Pendente')
    .lt('data_vencimento', hoje)
    .is('data_pagamento', null)
    .order('data_vencimento', { ascending: true })
    .limit(200)

  if (error) throw error

  const results = []

  for (const pagamento of vencidos || []) {
    results.push(await marcarPagamentoVencido(request, pagamento))
  }

  const atualizados = results.filter((item) => item.updated)

  return {
    checkedAt: new Date().toISOString(),
    today: hoje,
    found: (vencidos || []).length,
    updated: atualizados.length,
    results,
  }
}

async function handleReconcile(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: 'Nao autorizado' },
      { status: 401 }
    )
  }

  try {
    const result = await reconciliarFinanceiro(request)

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao reconciliar financeiro',
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  return handleReconcile(request)
}

export async function POST(request) {
  return handleReconcile(request)
}
