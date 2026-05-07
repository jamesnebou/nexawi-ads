// src/app/api/admin/planos/route.js
// ============================================================
// API administrativa segura para a aba Planos.
// Substitui o acesso direto do navegador às tabelas:
// - planos
// - clientes
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const INTERVALOS_VALIDOS = ['diario', 'semanal', 'mensal']
const CICLOS_VALIDOS = ['mensal', 'trimestral', 'semestral', 'anual']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizarPlanoPayload(plano = {}) {
  const preco = Number(String(plano.preco || '').replace(',', '.'))
  const maxCriativos = Number(plano.max_criativos || 0)
  const maxPontos = Number(plano.max_pontos || 0)

  return {
    nome: limparTexto(plano.nome),
    preco: Number.isFinite(preco) ? preco : 0,
    max_criativos: Number.isFinite(maxCriativos) ? Math.max(0, Math.floor(maxCriativos)) : 0,
    max_pontos: Number.isFinite(maxPontos) ? Math.max(0, Math.floor(maxPontos)) : 0,
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

export async function GET(request) {
  const auth = await requireAdmin(request)

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
      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do plano é obrigatório' },
          { status: 400 }
        )
      }

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
      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do plano é obrigatório' },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('planos')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        plano: data,
        message: 'Plano atualizado com sucesso',
      })
    }

    if (action === 'create') {
      const { data, error } = await supabaseAdmin
        .from('planos')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

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