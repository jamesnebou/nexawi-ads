// src/app/api/admin/clientes/route.js
// ============================================================
// API administrativa segura para a aba Clientes.
// Substitui o acesso direto do navegador às tabelas:
// - clientes
// - planos
// - auth.users
//
// Permissões aplicadas:
// - GET clientes: clientes.view
// - Criar cliente: clientes.create
// - Editar cliente: clientes.update
// - Excluir cliente: clientes.delete
//
// Agora também controla:
// - Status de onboarding/implantação
// - Checklist interno de setup
// - Cliente travado por pendência
// - Responsável interno pela implantação
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['Ativo', 'Inativo', 'Inadimplente', 'Cancelado']

const ONBOARDING_STATUS_VALIDOS = [
  'novo_lead',
  'contrato_enviado',
  'pagamento_pendente',
  'pagamento_confirmado',
  'setup_em_andamento',
  'hotspot_configurado',
  'campanha_criada',
  'portal_testado',
  'cliente_ativo',
  'cliente_pausado',
  'cancelado',
]

const CHECKLIST_PADRAO = {
  contrato_enviado: false,
  pagamento_confirmado: false,
  dados_empresa_recebidos: false,
  criativo_recebido: false,
  hotspot_vinculado: false,
  anuncio_criado: false,
  portal_testado: false,
  cliente_liberado: false,
}

function limparNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
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

function booleano(value, fallback = false) {
  if (typeof value === 'boolean') return value
  return fallback
}

function normalizarChecklist(checklist = {}) {
  const base = { ...CHECKLIST_PADRAO }

  if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist)) {
    return base
  }

  Object.keys(base).forEach((key) => {
    if (typeof checklist[key] === 'boolean') {
      base[key] = checklist[key]
    }
  })

  return base
}

function inferirOnboardingStatusPorStatusConta(status = 'Ativo') {
  if (status === 'Ativo') return 'cliente_ativo'
  if (status === 'Inadimplente') return 'pagamento_pendente'
  if (status === 'Cancelado') return 'cancelado'
  if (status === 'Inativo') return 'cliente_pausado'
  return 'novo_lead'
}

function sanitizarClientePayload(cliente = {}) {
  const statusConta = STATUS_VALIDOS.includes(cliente.status)
    ? cliente.status
    : 'Ativo'

  const onboardingStatus = ONBOARDING_STATUS_VALIDOS.includes(cliente.onboarding_status)
    ? cliente.onboarding_status
    : inferirOnboardingStatusPorStatusConta(statusConta)

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
    status: statusConta,

    onboarding_status: onboardingStatus,
    onboarding_checklist: normalizarChecklist(cliente.onboarding_checklist),
    onboarding_observacao: limparTexto(cliente.onboarding_observacao) || null,
    onboarding_responsavel: limparTexto(cliente.onboarding_responsavel) || null,
    onboarding_travado: booleano(cliente.onboarding_travado, false),
    onboarding_motivo_trava: limparTexto(cliente.onboarding_motivo_trava) || null,
    onboarding_updated_at: new Date().toISOString(),
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

function calcularResumoOnboarding(clientes = []) {
  return {
    total: clientes.length,
    novoLead: clientes.filter((c) => c.onboarding_status === 'novo_lead').length,
    emSetup: clientes.filter((c) =>
      [
        'contrato_enviado',
        'pagamento_pendente',
        'pagamento_confirmado',
        'setup_em_andamento',
        'hotspot_configurado',
        'campanha_criada',
        'portal_testado',
      ].includes(c.onboarding_status)
    ).length,
    ativos: clientes.filter((c) => c.onboarding_status === 'cliente_ativo').length,
    pausados: clientes.filter((c) => c.onboarding_status === 'cliente_pausado').length,
    cancelados: clientes.filter((c) => c.onboarding_status === 'cancelado').length,
    travados: clientes.filter((c) => c.onboarding_travado === true).length,
    pagamentoPendente: clientes.filter((c) => c.onboarding_status === 'pagamento_pendente').length,
  }
}

export async function GET(request) {
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
    const onboardingStatus = searchParams.get('onboarding_status') || 'Todos'
    const travado = searchParams.get('travado') || 'Todos'

    const { data: planos, error: planosError } = await supabaseAdmin
      .from('planos')
      .select('id, nome')
      .order('nome')

    if (planosError) throw planosError

    let query = supabaseAdmin
      .from('clientes')
      .select('*, planos(nome)')
      .order('created_at', { ascending: false })

    if (status !== 'Todos') {
      query = query.eq('status', status)
    }

    if (onboardingStatus !== 'Todos') {
      query = query.eq('onboarding_status', onboardingStatus)
    }

    if (travado === 'Sim') {
      query = query.eq('onboarding_travado', true)
    }

    if (travado === 'Não') {
      query = query.eq('onboarding_travado', false)
    }

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,nome_empresa.ilike.%${busca}%,email.ilike.%${busca}%,cpf_cnpj.ilike.%${busca}%,onboarding_responsavel.ilike.%${busca}%`
      )
    }

    const { data: clientes, error: clientesError } = await query

    if (clientesError) throw clientesError

    const clientesNormalizados = (clientes || []).map((cliente) => ({
      ...cliente,
      onboarding_status:
        cliente.onboarding_status ||
        inferirOnboardingStatusPorStatusConta(cliente.status),
      onboarding_checklist: normalizarChecklist(cliente.onboarding_checklist),
      onboarding_travado: Boolean(cliente.onboarding_travado),
    }))

    return NextResponse.json({
      ok: true,
      clientes: clientesNormalizados,
      planos: planos || [],
      resumoOnboarding: calcularResumoOnboarding(clientesNormalizados),
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
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'delete') {
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

      const { data: clienteAntes, error: clienteAntesError } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, nome_empresa, email, status, onboarding_status, onboarding_travado')
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
          onboarding_status_anterior: clienteAntes?.onboarding_status || '',
          onboarding_travado_anterior: clienteAntes?.onboarding_travado ?? null,
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

      const { data: clienteAntes, error: clienteAntesError } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, nome_empresa, email, status, plano_id, cidade, estado, onboarding_status, onboarding_checklist, onboarding_travado, onboarding_responsavel')
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
          onboarding_status_anterior: clienteAntes?.onboarding_status || '',
          onboarding_status_atual: data.onboarding_status || '',
          onboarding_travado_anterior: clienteAntes?.onboarding_travado ?? null,
          onboarding_travado_atual: data.onboarding_travado ?? null,
          onboarding_responsavel_anterior: clienteAntes?.onboarding_responsavel || '',
          onboarding_responsavel_atual: data.onboarding_responsavel || '',
        },
      })

      return NextResponse.json({
        ok: true,
        cliente: {
          ...data,
          onboarding_checklist: normalizarChecklist(data.onboarding_checklist),
        },
        message: 'Cliente atualizado com sucesso',
      })
    }

    if (action === 'create') {
      if (!auth.canAccess('clientes', 'create')) {
        return permissaoNegada('clientes', 'create')
      }

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
          onboarding_status: data.onboarding_status || '',
          onboarding_travado: data.onboarding_travado ?? false,
        },
      })

      return NextResponse.json({
        ok: true,
        cliente: {
          ...data,
          onboarding_checklist: normalizarChecklist(data.onboarding_checklist),
        },
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