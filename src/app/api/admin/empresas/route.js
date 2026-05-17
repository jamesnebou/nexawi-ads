import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const ROLES_EMPRESA = ['owner', 'admin', 'marketing', 'financeiro', 'viewer']
const STATUS_EMPRESA = ['prospect', 'ativo', 'pausado', 'cancelado', 'inativo']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function normalizarStatus(value = '') {
  const status = limparTexto(value).toLowerCase()
  return STATUS_EMPRESA.includes(status) ? status : 'ativo'
}

function normalizarRole(value = '') {
  const role = limparTexto(value).toLowerCase()
  return ROLES_EMPRESA.includes(role) ? role : 'viewer'
}

function limparUuid(value = '') {
  const text = limparTexto(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

async function carregarUsuariosEmpresa(empresaIds = []) {
  if (!empresaIds.length) return {}

  const { data, error } = await supabaseAdmin
    .from('empresa_usuarios')
    .select('id, empresa_id, user_id, email, nome, role, permissions, active, invited_at, accepted_at, created_at, updated_at')
    .in('empresa_id', empresaIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).reduce((acc, usuario) => {
    if (!acc[usuario.empresa_id]) acc[usuario.empresa_id] = []
    acc[usuario.empresa_id].push(usuario)
    return acc
  }, {})
}

async function carregarResumoEmpresa(empresaIds = []) {
  const resumo = {}

  empresaIds.forEach((id) => {
    resumo[id] = {
      clientes: 0,
      hotspots: 0,
      mikrotiks: 0,
      anuncios: 0,
      leads: 0,
      visualizacoes: 0,
      cliques: 0,
      ctr: 0,
    }
  })

  if (!empresaIds.length) return resumo

  const consultas = await Promise.all([
    supabaseAdmin.from('clientes').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
    supabaseAdmin.from('hotspots').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
    supabaseAdmin.from('network_routers').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
    supabaseAdmin.from('anuncios').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
    supabaseAdmin.from('leads').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
    supabaseAdmin.from('anuncio_views').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
    supabaseAdmin.from('anuncio_clicks').select('empresa_id', { count: 'exact', head: false }).in('empresa_id', empresaIds),
  ])

  consultas.forEach(({ data, error }, index) => {
    if (error) throw error

    const chave = ['clientes', 'hotspots', 'mikrotiks', 'anuncios', 'leads', 'visualizacoes', 'cliques'][index]

    ;(data || []).forEach((item) => {
      if (!item.empresa_id || !resumo[item.empresa_id]) return
      resumo[item.empresa_id][chave] += 1
    })
  })

  Object.values(resumo).forEach((item) => {
    item.ctr = item.visualizacoes > 0
      ? Number(((item.cliques / item.visualizacoes) * 100).toFixed(2))
      : 0
  })

  return resumo
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const busca = limparTexto(searchParams.get('busca') || '')
    const status = limparTexto(searchParams.get('status') || '')

    let query = supabaseAdmin
      .from('empresas')
      .select(`
        id,
        cliente_id,
        plano_id,
        nome_empresa,
        nome_responsavel,
        email,
        telefone,
        cpf_cnpj,
        cidade,
        estado,
        endereco,
        status,
        permissions,
        metadata,
        created_at,
        updated_at,
        planos(nome, preco)
      `)
      .order('created_at', { ascending: false })

    if (!auth.isMaster) {
      const ids = auth.allowedEmpresaIds || []
      query = ids.length ? query.in('id', ids) : query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else if (auth.activeEmpresaId) {
      query = query.eq('id', auth.activeEmpresaId)
    }

    if (status && STATUS_EMPRESA.includes(status)) {
      query = query.eq('status', status)
    }

    if (busca) {
      query = query.or(`nome_empresa.ilike.%${busca}%,nome_responsavel.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%,cidade.ilike.%${busca}%`)
    }

    const { data, error } = await query
    if (error) throw error

    const empresaIds = (data || []).map((empresa) => empresa.id)
    const usuariosPorEmpresa = await carregarUsuariosEmpresa(empresaIds)
    const resumoPorEmpresa = await carregarResumoEmpresa(empresaIds)

    const empresas = (data || []).map((empresa) => ({
      ...empresa,
      usuarios: usuariosPorEmpresa[empresa.id] || [],
      resumo: resumoPorEmpresa[empresa.id] || {},
    }))

    return NextResponse.json({
      ok: true,
      empresas,
      filtros: { busca, status },
      options: {
        status: STATUS_EMPRESA,
        roles: ROLES_EMPRESA,
      },
      empresaScope: auth.empresaScope,
      permissions: auth.permissions?.empresas || {},
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar empresas.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'create',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const action = limparTexto(body.action || 'create_empresa')

    if (action === 'add_user') {
      const empresaId = limparUuid(body.empresa_id)

      if (!empresaId) {
        return NextResponse.json({ ok: false, error: 'Empresa é obrigatória.' }, { status: 400 })
      }

      if (!auth.isMaster && !auth.allowedEmpresaIds?.includes(empresaId)) {
        return NextResponse.json({ ok: false, error: 'Você não tem acesso a esta empresa.' }, { status: 403 })
      }

      if (!auth.isMaster && !auth.canAccess('empresas', 'manage_users')) {
        return NextResponse.json({ ok: false, error: 'Você não tem permissão para gerenciar usuários desta empresa.' }, { status: 403 })
      }

      const email = limparTexto(body.email).toLowerCase()

      if (!email) {
        return NextResponse.json({ ok: false, error: 'E-mail do usuário é obrigatório.' }, { status: 400 })
      }

      const payload = {
        empresa_id: empresaId,
        email,
        nome: limparTexto(body.nome) || null,
        role: normalizarRole(body.role),
        permissions: body.permissions && typeof body.permissions === 'object' ? body.permissions : {},
        active: body.active !== false,
      }

      const { data, error } = await supabaseAdmin
        .from('empresa_usuarios')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({ ok: true, usuario: data })
    }

    const nomeEmpresa = limparTexto(body.nome_empresa)

    if (!nomeEmpresa) {
      return NextResponse.json({ ok: false, error: 'Nome da empresa é obrigatório.' }, { status: 400 })
    }

    const payload = {
      cliente_id: limparUuid(body.cliente_id) || null,
      plano_id: limparUuid(body.plano_id) || null,
      nome_empresa: nomeEmpresa,
      nome_responsavel: limparTexto(body.nome_responsavel) || null,
      email: limparTexto(body.email).toLowerCase() || null,
      telefone: limparTexto(body.telefone) || null,
      cpf_cnpj: limparTexto(body.cpf_cnpj) || null,
      cidade: limparTexto(body.cidade) || null,
      estado: limparTexto(body.estado) || null,
      endereco: limparTexto(body.endereco) || null,
      status: normalizarStatus(body.status),
      permissions: body.permissions && typeof body.permissions === 'object' ? body.permissions : {},
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    }

    const { data, error } = await supabaseAdmin
      .from('empresas')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error

    if (data?.cliente_id) {
      await supabaseAdmin
        .from('clientes')
        .update({ empresa_id: data.id })
        .eq('id', data.cliente_id)
    }

    if (payload.email) {
      await supabaseAdmin
        .from('empresa_usuarios')
        .insert({
          empresa_id: data.id,
          email: payload.email,
          nome: payload.nome_responsavel,
          role: 'owner',
          active: true,
        })
    }

    return NextResponse.json({ ok: true, empresa: data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao criar empresa.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'update',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const action = limparTexto(body.action || 'update_empresa')

    if (action === 'update_user') {
      const usuarioId = limparUuid(body.id || body.usuario_id)

      if (!usuarioId) {
        return NextResponse.json({ ok: false, error: 'ID do usuário é obrigatório.' }, { status: 400 })
      }

      const { data: usuarioAtual, error: userCheckError } = await supabaseAdmin
        .from('empresa_usuarios')
        .select('id, empresa_id')
        .eq('id', usuarioId)
        .maybeSingle()

      if (userCheckError) throw userCheckError

      if (!usuarioAtual) {
        return NextResponse.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 404 })
      }

      if (!auth.isMaster && !auth.allowedEmpresaIds?.includes(usuarioAtual.empresa_id)) {
        return NextResponse.json({ ok: false, error: 'Você não tem acesso a esta empresa.' }, { status: 403 })
      }

      if (!auth.isMaster && !auth.canAccess('empresas', 'manage_users')) {
        return NextResponse.json({ ok: false, error: 'Você não tem permissão para gerenciar usuários desta empresa.' }, { status: 403 })
      }

      const payload = {
        nome: limparTexto(body.nome) || null,
        role: normalizarRole(body.role),
        active: body.active !== false,
        permissions: body.permissions && typeof body.permissions === 'object' ? body.permissions : {},
      }

      const { data, error } = await supabaseAdmin
        .from('empresa_usuarios')
        .update(payload)
        .eq('id', usuarioId)
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({ ok: true, usuario: data })
    }

    const id = limparUuid(body.id || body.empresa_id)

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID da empresa é obrigatório.' }, { status: 400 })
    }

    if (!auth.isMaster && !auth.allowedEmpresaIds?.includes(id)) {
      return NextResponse.json({ ok: false, error: 'Você não tem acesso a esta empresa.' }, { status: 403 })
    }

    const payload = {
      nome_empresa: limparTexto(body.nome_empresa),
      nome_responsavel: limparTexto(body.nome_responsavel) || null,
      email: limparTexto(body.email).toLowerCase() || null,
      telefone: limparTexto(body.telefone) || null,
      cpf_cnpj: limparTexto(body.cpf_cnpj) || null,
      cidade: limparTexto(body.cidade) || null,
      estado: limparTexto(body.estado) || null,
      endereco: limparTexto(body.endereco) || null,
      status: normalizarStatus(body.status),
      permissions: body.permissions && typeof body.permissions === 'object' ? body.permissions : {},
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    }

    if (!payload.nome_empresa) {
      delete payload.nome_empresa
    }

    const { data, error } = await supabaseAdmin
      .from('empresas')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, empresa: data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar empresa.' },
      { status: 500 }
    )
  }
}
