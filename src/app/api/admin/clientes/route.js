// src/app/api/admin/clientes/route.js
// ============================================================
// API administrativa segura para a aba Clientes.
// Substitui o acesso direto do navegador às tabelas:
// - clientes
// - planos
// - auth.users
//
// Agora:
// Dashboard → API admin → valida admin → valida permissão → service_role → Supabase
//
// Permissões aplicadas:
// - GET clientes: clientes.view
// - Criar cliente: clientes.create
// - Editar cliente: clientes.update
// - Excluir cliente: clientes.delete
//
// Auditoria:
// - Registra criação, edição e exclusão de clientes.
// - Não salva CPF/CNPJ, telefone ou dados sensíveis no log.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

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

function permissaoNegada(modulo, acao) {
  return NextResponse.json(
    {
      ok: false,
      error: `Sem permissão para ${acao} em ${modulo}`,
    },
    { status: 403 }
  )
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
  // Para listar clientes, o admin precisa ter permissão de visualização.
  const auth = await requireAdmin(request, {
    module: 'clientes',
    action: 'view',
  })

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
      permissions: auth.permissions?.clientes || {},
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
  // Primeiro valida se é admin ativo.
  // A permissão específica será validada conforme a ação: create/update/delete.
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'delete') {
      // Para excluir cliente, precisa de clientes.delete.
      if (!auth.canAccess('clientes', 'delete')) {
        return permissaoNegada('clientes', 'delete')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do cliente é obrigatório' },
          { status: 400 }
        )
      }

      // Busca dados básicos antes de excluir para registrar auditoria.
      // Não buscamos CPF/CNPJ nem telefone para evitar expor dados sensíveis no log.
      const { data: clienteAntes, error: clienteAntesError } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, nome_empresa, email, status')
        .eq('id', id)
        .maybeSingle()

      if (clienteAntesError) throw clienteAntesError

      const { error } = await supabaseAdmin
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'clientes',
        entityId: id,
        description: 'Excluiu um cliente',
        metadata: {
          cliente_id: id,
          nome: clienteAntes?.nome || '',
          nome_empresa: clienteAntes?.nome_empresa || '',
          email: clienteAntes?.email || '',
          status_anterior: clienteAntes?.status || '',
        },
      })

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
      // Para editar cliente, precisa de clientes.update.
      if (!auth.canAccess('clientes', 'update')) {
        return permissaoNegada('clientes', 'update')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do cliente é obrigatório' },
          { status: 400 }
        )
      }

      // Busca dados básicos antes da alteração para comparação no log.
      const { data: clienteAntes, error: clienteAntesError } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, nome_empresa, email, status, plano_id, cidade, estado')
        .eq('id', id)
        .maybeSingle()

      if (clienteAntesError) throw clienteAntesError

      const { data, error } = await supabaseAdmin
        .from('clientes')
        .update(payload)
        .eq('id', id)
        .select('*, planos(nome)')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'clientes',
        entityId: data.id,
        description: 'Atualizou um cliente',
        metadata: {
          cliente_id: data.id,
          nome: data.nome,
          nome_empresa: data.nome_empresa,
          email: data.email,
          status_anterior: clienteAntes?.status || '',
          status_atual: data.status,
          plano_id_anterior: clienteAntes?.plano_id || null,
          plano_id_atual: data.plano_id || null,
          cidade: data.cidade,
          estado: data.estado,
        },
      })

      return NextResponse.json({
        ok: true,
        cliente: data,
        message: 'Cliente atualizado com sucesso',
      })
    }

    if (action === 'create') {
      // Para criar cliente, precisa de clientes.create.
      if (!auth.canAccess('clientes', 'create')) {
        return permissaoNegada('clientes', 'create')
      }

      // Cria credenciais de acesso do cliente pelo servidor.
      // Senha inicial: CPF/CNPJ, mantendo o comportamento atual.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'clientes',
        entityId: data.id,
        description: 'Criou um novo cliente',
        metadata: {
          cliente_id: data.id,
          auth_user_id: authData?.user?.id || null,
          nome: data.nome,
          nome_empresa: data.nome_empresa,
          email: data.email,
          status: data.status,
          plano_id: data.plano_id || null,
          cidade: data.cidade,
          estado: data.estado,
        },
      })

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