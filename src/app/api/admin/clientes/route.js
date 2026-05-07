// src/app/api/admin/clientes/route.js
// ============================================================
// API administrativa segura para a aba Clientes.
// Substitui o acesso direto do navegador às tabelas:
// - clientes
// - planos
// - auth.users
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['Ativo', 'Inativo', 'Inadimplente', 'Cancelado']

function limparNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
  // Evita quebrar a sintaxe do filtro .or do PostgREST.
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function sanitizarClientePayload(cliente = {}) {
  return {
    nome: limparTexto(cliente.nome),
    nome_empresa: limparTexto(cliente.nome_empresa),
    nome_responsavel: limparTexto(cliente.nome_responsavel),
    email: limparTexto(cliente.email).toLowerCase(),
    telefone: limparNumeros(cliente.telefone).slice(0, 11),
    cpf_cnpj: limparNumeros(cliente.cpf_cnpj).slice(0, 14),
    endereco: limparTexto(cliente.endereco),
    cidade: limparTexto(cliente.cidade),
    estado: limparTexto(cliente.estado).toUpperCase(),
    plano_id: cliente.plano_id ? String(cliente.plano_id) : null,
    status: STATUS_VALIDOS.includes(cliente.status) ? cliente.status : 'Ativo',
  }
}

function validarCliente(payload) {
  if (!payload.nome) return 'Nome do empresário é obrigatório'
  if (!payload.nome_empresa) return 'Nome da empresa é obrigatório'
  if (!payload.nome_responsavel) return 'Nome do responsável é obrigatório'
  if (!payload.email) return 'E-mail é obrigatório'
  if (!payload.telefone) return 'Telefone é obrigatório'
  if (!payload.cpf_cnpj) return 'CPF/CNPJ é obrigatório'

  if (payload.nome.length < 3) return 'Nome do empresário deve ter pelo menos 3 caracteres'
  if (payload.nome_empresa.length < 3) return 'Nome da empresa deve ter pelo menos 3 caracteres'
  if (payload.nome_responsavel.length < 3) return 'Nome do responsável deve ter pelo menos 3 caracteres'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'E-mail inválido'
  }

  if (payload.telefone.length < 10) {
    return 'Telefone inválido. Inclua o DDD'
  }

  if (payload.cpf_cnpj.length !== 11 && payload.cpf_cnpj.length !== 14) {
    return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos'
  }

  return ''
}

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const busca = sanitizeBusca(searchParams.get('busca') || '')
    const status = searchParams.get('status') || 'Todos'

    // Busca os planos para preencher o select do formulário.
    const { data: planos, error: planosError } = await supabaseAdmin
      .from('planos')
      .select('id, nome')
      .order('nome')

    if (planosError) throw planosError

    // Busca os clientes com o relacionamento do plano.
    let query = supabaseAdmin
      .from('clientes')
      .select('*, planos(nome)')
      .order('created_at', { ascending: false })

    if (status !== 'Todos') {
      query = query.eq('status', status)
    }

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,nome_empresa.ilike.%${busca}%,email.ilike.%${busca}%,cpf_cnpj.ilike.%${busca}%`
      )
    }

    const { data: clientes, error: clientesError } = await query

    if (clientesError) throw clientesError

    return NextResponse.json({
      ok: true,
      clientes: clientes || [],
      planos: planos || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar clientes',
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
          { ok: false, error: 'ID do cliente é obrigatório' },
          { status: 400 }
        )
      }

      const { error } = await supabaseAdmin
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      return NextResponse.json({
        ok: true,
        message: 'Cliente excluído com sucesso',
      })
    }

    const payload = sanitizarClientePayload(body.cliente || {})
    const erroValidacao = validarCliente(payload)

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
          { ok: false, error: 'ID do cliente é obrigatório' },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('clientes')
        .update(payload)
        .eq('id', id)
        .select('*, planos(nome)')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        cliente: data,
        message: 'Cliente atualizado com sucesso',
      })
    }

    if (action === 'create') {
      // Cria credenciais de acesso do cliente pelo servidor.
      // Senha inicial: CPF/CNPJ, mantendo o comportamento atual.
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.cpf_cnpj,
        email_confirm: true,
        user_metadata: {
          tipo: 'cliente',
          nome: payload.nome,
          nome_empresa: payload.nome_empresa,
        },
      })

      if (authError) {
        throw new Error(`Erro ao criar credenciais de acesso: ${authError.message}`)
      }

      const { data, error } = await supabaseAdmin
        .from('clientes')
        .insert([payload])
        .select('*, planos(nome)')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        cliente: data,
        message: 'Cliente cadastrado e acesso criado com sucesso',
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
        error: error.message || 'Erro ao salvar cliente',
      },
      { status: 500 }
    )
  }
}