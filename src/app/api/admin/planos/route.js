// src/app/api/admin/planos/route.js
// ============================================================
// API administrativa segura para a aba Planos.
// Substitui o acesso direto do navegador às tabelas:
// - planos
// - clientes
//
// Permissões aplicadas:
// - GET planos: planos.view
// - Criar plano: planos.create
// - Editar plano: planos.update
// - Excluir plano: planos.delete
//
// Auditoria:
// - Registra criação, edição e exclusão de planos.
// - Impede exclusão de plano com clientes vinculados.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const INTERVALOS_VALIDOS = ['diario', 'semanal', 'mensal']
const CICLOS_VALIDOS = ['mensal', 'trimestral', 'semestral', 'anual']

function limparTexto(value = '') {
  return String(value || '').trim()
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

function sanitizarPlanoPayload(plano = {}) {
  const preco = Number(String(plano.preco || '').replace(',', '.'))
  const maxCriativos = Number(plano.max_criativos || 0)
  const maxLps = Number(plano.max_lps || 0)
  const maxLeadsMes = Number(plano.max_leads_mes || 0)

  return {
    nome: limparTexto(plano.nome),
    preco: Number.isFinite(preco) ? preco : 0,
    max_criativos: Number.isFinite(maxCriativos) ? Math.max(0, Math.floor(maxCriativos)) : 0,
    max_lps: Number.isFinite(maxLps) ? Math.max(0, Math.floor(maxLps)) : 0,
    max_leads_mes: Number.isFinite(maxLeadsMes) ? Math.max(0, Math.floor(maxLeadsMes)) : 0,
    templates_premium: plano.templates_premium !== false,
    intervalo_relatorio: INTERVALOS_VALIDOS.includes(plano.intervalo_relatorio)
      ? plano.intervalo_relatorio
      : 'mensal',
    ciclo_cobranca: CICLOS_VALIDOS.includes(plano.ciclo_cobranca)
      ? plano.ciclo_cobranca
      : 'mensal',
  }
}

function validarPlano(payload) {
  if (!payload.nome) return 'Nome do plano é obrigatório'
  if (payload.nome.length < 2) return 'Nome do plano precisa ter pelo menos 2 caracteres'
  if (!payload.preco || payload.preco <= 0) return 'Preço precisa ser maior que zero'
  return ''
}

function isMissingPlanLimitColumn(error) {
  const message = String(error?.message || '')
  return error?.code === '42703' || message.includes('max_lps') || message.includes('max_leads_mes') || message.includes('templates_premium')
}

function legacyPlanoPayload(payload) {
  const legacy = { ...payload }
  delete legacy.max_lps
  delete legacy.max_leads_mes
  delete legacy.templates_premium
  return legacy
}

async function buscarPlanoBasico(id) {
  const { data, error } = await supabaseAdmin
    .from('planos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error

  return data || null
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'planos',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const ciclo = searchParams.get('ciclo') || 'mensal'

    let query = supabaseAdmin
      .from('planos')
      .select('*')
      .order('preco', { ascending: true })

    if (ciclo !== 'todos') {
      query = query.eq('ciclo_cobranca', ciclo)
    }

    const [
      { data: planosData, error: planosError },
      { data: clientesData, error: clientesError },
    ] = await Promise.all([
      query,
      supabaseAdmin
        .from('clientes')
        .select('plano_id, status'),
    ])

    if (planosError) throw planosError
    if (clientesError) throw clientesError

    const planos = (planosData || []).map((plano) => {
      const quantidadeClientes = (clientesData || [])
        .filter((cliente) => cliente.plano_id === plano.id)
        .length

      const quantidadeClientesAtivos = (clientesData || [])
        .filter((cliente) => cliente.plano_id === plano.id && cliente.status === 'Ativo')
        .length

      return {
        ...plano,
        quantidade_clientes: quantidadeClientes,
        quantidade_clientes_ativos: quantidadeClientesAtivos,
      }
    })

    return NextResponse.json({
      ok: true,
      planos,
      permissions: auth.permissions?.planos || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar planos',
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
      if (!auth.canAccess('planos', 'delete')) {
        return permissaoNegada('planos', 'delete')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do plano é obrigatório' },
          { status: 400 }
        )
      }

      const planoAntes = await buscarPlanoBasico(id)

      const { data: clientesVinculados, error: clientesError } = await supabaseAdmin
        .from('clientes')
        .select('id')
        .eq('plano_id', id)
        .limit(1)

      if (clientesError) throw clientesError

      if (clientesVinculados && clientesVinculados.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Este plano possui clientes vinculados. Remova ou altere os clientes antes de excluir.',
          },
          { status: 409 }
        )
      }

      const { error } = await supabaseAdmin
        .from('planos')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'planos',
        entityId: id,
        description: 'Excluiu um plano',
        metadata: {
          plano_id: id,
          nome: planoAntes?.nome || '',
          preco: planoAntes?.preco || 0,
          ciclo_cobranca: planoAntes?.ciclo_cobranca || '',
          intervalo_relatorio: planoAntes?.intervalo_relatorio || '',
          max_criativos: planoAntes?.max_criativos || 0,
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Plano excluído com sucesso',
      })
    }

    const payload = sanitizarPlanoPayload(body.plano || {})
    const erroValidacao = validarPlano(payload)

    if (erroValidacao) {
      return NextResponse.json(
        { ok: false, error: erroValidacao },
        { status: 400 }
      )
    }

    if (action === 'update') {
      if (!auth.canAccess('planos', 'update')) {
        return permissaoNegada('planos', 'update')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do plano é obrigatório' },
          { status: 400 }
        )
      }

      const planoAntes = await buscarPlanoBasico(id)

      let { data, error } = await supabaseAdmin
        .from('planos')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (isMissingPlanLimitColumn(error)) {
        const retry = await supabaseAdmin
          .from('planos')
          .update(legacyPlanoPayload(payload))
          .eq('id', id)
          .select('*')
          .single()

        data = retry.data
        error = retry.error
      }

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'planos',
        entityId: data.id,
        description: 'Atualizou um plano',
        metadata: {
          plano_id: data.id,
          nome_anterior: planoAntes?.nome || '',
          nome_atual: data.nome,
          preco_anterior: planoAntes?.preco || 0,
          preco_atual: data.preco,
          ciclo_anterior: planoAntes?.ciclo_cobranca || '',
          ciclo_atual: data.ciclo_cobranca,
          intervalo_relatorio_anterior: planoAntes?.intervalo_relatorio || '',
          intervalo_relatorio_atual: data.intervalo_relatorio,
          max_criativos_anterior: planoAntes?.max_criativos || 0,
          max_criativos_atual: data.max_criativos,
          max_lps_atual: data.max_lps || payload.max_lps || 0,
          max_leads_mes_atual: data.max_leads_mes || payload.max_leads_mes || 0,
          templates_premium_atual: data.templates_premium ?? payload.templates_premium,
        },
      })

      return NextResponse.json({
        ok: true,
        plano: data,
        message: 'Plano atualizado com sucesso',
      })
    }

    if (action === 'create') {
      if (!auth.canAccess('planos', 'create')) {
        return permissaoNegada('planos', 'create')
      }

      let { data, error } = await supabaseAdmin
        .from('planos')
        .insert([payload])
        .select('*')
        .single()

      if (isMissingPlanLimitColumn(error)) {
        const retry = await supabaseAdmin
          .from('planos')
          .insert([legacyPlanoPayload(payload)])
          .select('*')
          .single()

        data = retry.data
        error = retry.error
      }

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'planos',
        entityId: data.id,
        description: 'Criou um novo plano',
        metadata: {
          plano_id: data.id,
          nome: data.nome,
          preco: data.preco,
          ciclo_cobranca: data.ciclo_cobranca,
          intervalo_relatorio: data.intervalo_relatorio,
          max_criativos: data.max_criativos,
          max_lps: data.max_lps || payload.max_lps || 0,
          max_leads_mes: data.max_leads_mes || payload.max_leads_mes || 0,
          templates_premium: data.templates_premium ?? payload.templates_premium,
        },
      })

      return NextResponse.json({
        ok: true,
        plano: data,
        message: 'Plano criado com sucesso',
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
        error: error.message || 'Erro ao salvar plano',
      },
      { status: 500 }
    )
  }
}
