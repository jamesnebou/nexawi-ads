// src/lib/admin-api-auth.js
// ============================================================
// Helper de autenticação e autorização para APIs administrativas.
// Suporta:
// - admin ativo/inativo
// - cargo: master, admin, suporte, financeiro, viewer
// - permissões granulares por módulo e ação
// - Sprint 5 Multiempresa: escopo por empresa/tenant
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MODULOS = [
  'dashboard',
  'empresas',
  'clientes',
  'hotspots',
  'anuncios',
  'financeiro',
  'planos',
  'leads',
  'relatorios',
  'suporte',
  'auditoria',
  'configuracoes',
  'usuarios_admin',
  'dashboard_anunciante',
]

const ACOES_PADRAO = ['view', 'create', 'update', 'delete', 'export']

const PERMISSOES_POR_CARGO = {
  master: {
    dashboard: { view: true },
    empresas: { view: true, create: true, update: true, delete: true, export: true, manage_users: true },
    clientes: { view: true, create: true, update: true, delete: true, export: true },
    hotspots: { view: true, create: true, update: true, delete: true, export: true },
    anuncios: { view: true, create: true, update: true, delete: true, activate: true, pause: true, export: true },
    financeiro: { view: true, create: true, update: true, delete: true, mark_paid: true, export: true },
    planos: { view: true, create: true, update: true, delete: true },
    leads: { view: true, delete: true, export: true },
    relatorios: { view: true, export: true },
    suporte: { view: true, reply: true, update: true, close: true, assign: true, export: true },
    auditoria: { view: true, export: true },
    configuracoes: { view: true, update: true },
    usuarios_admin: { view: true, create: true, update: true, delete: true },
    dashboard_anunciante: { view: true, export: true },
  },

  admin: {
    dashboard: { view: true },
    empresas: { view: true, create: true, update: true, delete: false, export: true, manage_users: true },
    clientes: { view: true, create: true, update: true, delete: false, export: true },
    hotspots: { view: true, create: true, update: true, delete: false, export: true },
    anuncios: { view: true, create: true, update: true, delete: false, activate: true, pause: true, export: true },
    financeiro: { view: true, create: true, update: true, delete: false, mark_paid: true, export: true },
    planos: { view: true, create: true, update: true, delete: false },
    leads: { view: true, delete: false, export: true },
    relatorios: { view: true, export: true },
    suporte: { view: true, reply: true, update: true, close: true, assign: true, export: true },
    auditoria: { view: true, export: false },
    configuracoes: { view: true, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
    dashboard_anunciante: { view: true, export: true },
  },

  suporte: {
    dashboard: { view: true },
    empresas: { view: true, create: false, update: true, delete: false, export: false, manage_users: false },
    clientes: { view: true, create: true, update: true, delete: false, export: false },
    hotspots: { view: true, create: true, update: true, delete: false, export: false },
    anuncios: { view: true, create: true, update: true, delete: false, activate: true, pause: true, export: false },
    financeiro: { view: false, create: false, update: false, delete: false, mark_paid: false, export: false },
    planos: { view: false, create: false, update: false, delete: false },
    leads: { view: true, delete: false, export: false },
    relatorios: { view: true, export: false },
    suporte: { view: true, reply: true, update: true, close: true, assign: false, export: false },
    auditoria: { view: false, export: false },
    configuracoes: { view: false, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
    dashboard_anunciante: { view: true, export: false },
  },

  financeiro: {
    dashboard: { view: true },
    empresas: { view: true, create: false, update: false, delete: false, export: true, manage_users: false },
    clientes: { view: true, create: false, update: false, delete: false, export: true },
    hotspots: { view: false, create: false, update: false, delete: false, export: false },
    anuncios: { view: false, create: false, update: false, delete: false, activate: false, pause: false, export: false },
    financeiro: { view: true, create: true, update: true, delete: false, mark_paid: true, export: true },
    planos: { view: true, create: false, update: false, delete: false },
    leads: { view: false, delete: false, export: false },
    relatorios: { view: true, export: true },
    suporte: { view: true, reply: true, update: true, close: false, assign: false, export: false },
    auditoria: { view: false, export: false },
    configuracoes: { view: false, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
    dashboard_anunciante: { view: false, export: false },
  },

  viewer: {
    dashboard: { view: true },
    empresas: { view: false, create: false, update: false, delete: false, export: false, manage_users: false },
    clientes: { view: false, create: false, update: false, delete: false, export: false },
    hotspots: { view: false, create: false, update: false, delete: false, export: false },
    anuncios: { view: false, create: false, update: false, delete: false, activate: false, pause: false, export: false },
    financeiro: { view: false, create: false, update: false, delete: false, mark_paid: false, export: false },
    planos: { view: false, create: false, update: false, delete: false },
    leads: { view: true, delete: false, export: false },
    relatorios: { view: true, export: false },
    suporte: { view: true, reply: false, update: false, close: false, assign: false, export: false },
    auditoria: { view: false, export: false },
    configuracoes: { view: false, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
    dashboard_anunciante: { view: true, export: false },
  },
}

const PERMISSOES_EMPRESA_POR_PAPEL = {
  owner: {
    dashboard_anunciante: { view: true, export: true },
    anuncios: { view: true, create: true, update: true, delete: false, activate: true, pause: true, export: true },
    hotspots: { view: true, create: false, update: false, delete: false, export: true },
    leads: { view: true, delete: false, export: true },
    relatorios: { view: true, export: true },
    financeiro: { view: true, export: true },
    suporte: { view: true, reply: true, update: true, close: false },
    empresas: { view: true, update: true, manage_users: true },
  },
  admin: {
    dashboard_anunciante: { view: true, export: true },
    anuncios: { view: true, create: true, update: true, delete: false, activate: true, pause: true, export: true },
    hotspots: { view: true, export: true },
    leads: { view: true, export: true },
    relatorios: { view: true, export: true },
    financeiro: { view: false, export: false },
    suporte: { view: true, reply: true, update: true },
    empresas: { view: true, update: false, manage_users: false },
  },
  marketing: {
    dashboard_anunciante: { view: true, export: true },
    anuncios: { view: true, create: true, update: true, delete: false, activate: false, pause: false, export: true },
    hotspots: { view: true, export: false },
    leads: { view: true, export: true },
    relatorios: { view: true, export: true },
    financeiro: { view: false, export: false },
    suporte: { view: true, reply: true, update: false },
    empresas: { view: true, update: false, manage_users: false },
  },
  financeiro: {
    dashboard_anunciante: { view: true, export: true },
    anuncios: { view: false, export: false },
    hotspots: { view: false, export: false },
    leads: { view: false, export: false },
    relatorios: { view: true, export: true },
    financeiro: { view: true, export: true },
    suporte: { view: true, reply: true, update: false },
    empresas: { view: true, update: false, manage_users: false },
  },
  viewer: {
    dashboard_anunciante: { view: true, export: false },
    anuncios: { view: true, export: false },
    hotspots: { view: true, export: false },
    leads: { view: true, export: false },
    relatorios: { view: true, export: false },
    financeiro: { view: false, export: false },
    suporte: { view: true, reply: false, update: false },
    empresas: { view: true, update: false, manage_users: false },
  },
}

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || ''

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authHeader.slice(7).trim()
}

function criarRespostaErro(error, status = 403) {
  return {
    errorResponse: NextResponse.json(
      {
        ok: false,
        error,
      },
      { status }
    ),
  }
}

function normalizarPermissoes(role = 'admin', permissions = {}) {
  const base = PERMISSOES_POR_CARGO[role] || PERMISSOES_POR_CARGO.admin
  const banco = permissions && typeof permissions === 'object' ? permissions : {}

  const resultado = {}

  MODULOS.forEach((modulo) => {
    const baseModulo = base[modulo] || {}
    const bancoModulo = banco[modulo]

    resultado[modulo] = {}

    if (typeof bancoModulo === 'boolean') {
      const acoes = new Set([
        ...Object.keys(baseModulo),
        ...ACOES_PADRAO,
      ])

      acoes.forEach((acao) => {
        resultado[modulo][acao] = bancoModulo
      })

      return
    }

    const bancoModuloObj = bancoModulo && typeof bancoModulo === 'object'
      ? bancoModulo
      : {}

    const acoes = new Set([
      ...Object.keys(baseModulo),
      ...Object.keys(bancoModuloObj),
      ...ACOES_PADRAO,
    ])

    acoes.forEach((acao) => {
      if (typeof bancoModuloObj[acao] === 'boolean') {
        resultado[modulo][acao] = bancoModuloObj[acao]
      } else {
        resultado[modulo][acao] = Boolean(baseModulo[acao])
      }
    })
  })

  return resultado
}

function normalizarPermissoesEmpresa(role = 'viewer', permissions = {}) {
  const base = PERMISSOES_EMPRESA_POR_PAPEL[role] || PERMISSOES_EMPRESA_POR_PAPEL.viewer
  const banco = permissions && typeof permissions === 'object' ? permissions : {}
  const resultado = {}

  const modulos = new Set([...Object.keys(base), ...Object.keys(banco)])

  modulos.forEach((modulo) => {
    const baseModulo = base[modulo] || {}
    const bancoModulo = banco[modulo]
    resultado[modulo] = {}

    if (typeof bancoModulo === 'boolean') {
      Object.keys(baseModulo).forEach((acao) => {
        resultado[modulo][acao] = bancoModulo
      })
      return
    }

    const bancoModuloObj = bancoModulo && typeof bancoModulo === 'object' ? bancoModulo : {}
    const acoes = new Set([...Object.keys(baseModulo), ...Object.keys(bancoModuloObj), ...ACOES_PADRAO])

    acoes.forEach((acao) => {
      resultado[modulo][acao] = typeof bancoModuloObj[acao] === 'boolean'
        ? bancoModuloObj[acao]
        : Boolean(baseModulo[acao])
    })
  })

  return resultado
}

function parsePermission(permission = '') {
  const text = String(permission || '').trim()

  if (!text) {
    return {
      module: '',
      action: '',
    }
  }

  if (text.includes('.')) {
    const [module, action] = text.split('.')

    return {
      module,
      action: action || 'view',
    }
  }

  return {
    module: text,
    action: 'view',
  }
}

function limparUuid(value = '') {
  const text = String(value || '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

function getEmpresaIdSolicitada(request) {
  const headerEmpresaId = limparUuid(request.headers.get('x-empresa-id') || '')

  if (headerEmpresaId) return headerEmpresaId

  try {
    const url = new URL(request.url)
    return limparUuid(url.searchParams.get('empresa_id') || url.searchParams.get('empresaId') || '')
  } catch {
    return ''
  }
}

async function carregarEmpresasDoUsuario({ user, adminData, isMaster }) {
  const userId = user?.id || ''
  const email = String(user?.email || adminData?.email || '').trim().toLowerCase()

  let memberships = []

  if (userId) {
    const { data, error } = await supabaseAdmin
      .from('empresa_usuarios')
      .select(`
        id,
        empresa_id,
        user_id,
        email,
        nome,
        role,
        permissions,
        active,
        empresas(id, nome_empresa, email, status, plano_id, cliente_id)
      `)
      .eq('user_id', userId)
      .eq('active', true)

    if (error) throw error
    memberships = data || []
  }

  if (email) {
    const { data, error } = await supabaseAdmin
      .from('empresa_usuarios')
      .select(`
        id,
        empresa_id,
        user_id,
        email,
        nome,
        role,
        permissions,
        active,
        empresas(id, nome_empresa, email, status, plano_id, cliente_id)
      `)
      .ilike('email', email)
      .eq('active', true)

    if (error) throw error

    const ids = new Set(memberships.map((item) => item.id))
    ;(data || []).forEach((item) => {
      if (!ids.has(item.id)) memberships.push(item)
    })
  }

  const empresaIdAdmin = limparUuid(adminData?.empresa_id || '')

  if (empresaIdAdmin && !memberships.some((item) => item.empresa_id === empresaIdAdmin)) {
    const { data, error } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa, email, status, plano_id, cliente_id')
      .eq('id', empresaIdAdmin)
      .maybeSingle()

    if (error) throw error

    if (data) {
      memberships.push({
        id: `admin-${empresaIdAdmin}`,
        empresa_id: empresaIdAdmin,
        user_id: userId || null,
        email,
        nome: adminData?.email || email,
        role: 'admin',
        permissions: {},
        active: true,
        empresas: data,
      })
    }
  }

  if (isMaster) {
    return memberships
  }

  return memberships.filter((item) => item.active !== false && item.empresa_id)
}

export async function requireAdmin(request, options = {}) {
  try {
    const {
      permission = '',
      module = '',
      action = 'view',
      requireMaster = false,
      requireEmpresa = false,
    } = options

    const token = getBearerToken(request)

    if (!token) {
      return criarRespostaErro('Sessão não encontrada', 401)
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !userData?.user) {
      return criarRespostaErro('Sessão inválida ou expirada', 401)
    }

    const user = userData.user

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, email, role, active, permissions, empresa_id, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      throw adminError
    }

    if (!adminData) {
      return criarRespostaErro('Usuário sem permissão administrativa', 403)
    }

    if (adminData.active === false) {
      return criarRespostaErro('Administrador desativado. Fale com o administrador master.', 403)
    }

    const role = adminData.role || 'admin'
    const isMaster = role === 'master'
    const permissions = normalizarPermissoes(role, adminData.permissions)
    const memberships = await carregarEmpresasDoUsuario({ user, adminData, isMaster })
    const allowedEmpresaIds = [...new Set(memberships.map((item) => item.empresa_id).filter(Boolean))]
    const requestedEmpresaId = getEmpresaIdSolicitada(request)
    const adminEmpresaId = limparUuid(adminData.empresa_id || '')

    let activeEmpresaId = requestedEmpresaId || adminEmpresaId || allowedEmpresaIds[0] || ''

    if (!isMaster && requestedEmpresaId && !allowedEmpresaIds.includes(requestedEmpresaId)) {
      return criarRespostaErro('Você não tem acesso a esta empresa.', 403)
    }

    if (!isMaster && requireEmpresa && !activeEmpresaId) {
      return criarRespostaErro('Nenhuma empresa vinculada ao usuário.', 403)
    }

    if (!isMaster && activeEmpresaId && !allowedEmpresaIds.includes(activeEmpresaId)) {
      activeEmpresaId = allowedEmpresaIds[0] || ''
    }

    const activeMembership = memberships.find((item) => item.empresa_id === activeEmpresaId) || null
    const empresaPermissions = activeMembership
      ? normalizarPermissoesEmpresa(activeMembership.role, activeMembership.permissions)
      : {}

    const empresas = memberships.map((item) => ({
      membership_id: item.id,
      empresa_id: item.empresa_id,
      role: item.role || 'viewer',
      permissions: normalizarPermissoesEmpresa(item.role, item.permissions),
      nome: item.nome || '',
      email: item.email || '',
      empresa: item.empresas || null,
    }))

    const empresaScope = {
      activeEmpresaId,
      requestedEmpresaId,
      allowedEmpresaIds,
      isScoped: Boolean(activeEmpresaId),
      activeMembership,
      empresaPermissions,
      empresas,
    }

    const adminProfile = {
      user_id: adminData.user_id,
      email: adminData.email || user.email || '',
      auth_email: user.email || '',
      role,
      active: adminData.active !== false,
      empresa_id: adminEmpresaId || null,
      empresa_scope: empresaScope,
      empresas,
      created_at: adminData.created_at || null,
      updated_at: adminData.updated_at || null,
    }

    function canAccess(modulo, acao = 'view') {
      if (!modulo) return true
      if (isMaster) return true

      const adminPermission = Boolean(permissions?.[modulo]?.[acao])
      const empresaPermission = Boolean(empresaPermissions?.[modulo]?.[acao])

      return adminPermission || empresaPermission
    }

    function canView(modulo) {
      return canAccess(modulo, 'view')
    }

    function canCreate(modulo) {
      return canAccess(modulo, 'create')
    }

    function canUpdate(modulo) {
      return canAccess(modulo, 'update')
    }

    function canDelete(modulo) {
      return canAccess(modulo, 'delete')
    }

    function applyEmpresaScope(query, column = 'empresa_id') {
      if (isMaster) {
        return activeEmpresaId ? query.eq(column, activeEmpresaId) : query
      }

      if (activeEmpresaId) {
        return query.eq(column, activeEmpresaId)
      }

      if (allowedEmpresaIds.length > 0) {
        return query.in(column, allowedEmpresaIds)
      }

      return query.eq(column, '00000000-0000-0000-0000-000000000000')
    }

    if (requireMaster && !isMaster) {
      return criarRespostaErro('Apenas o administrador master pode executar esta ação', 403)
    }

    const parsed = parsePermission(permission)
    const moduloSolicitado = module || parsed.module
    const acaoSolicitada = action || parsed.action || 'view'

    if (moduloSolicitado && !canAccess(moduloSolicitado, acaoSolicitada)) {
      return criarRespostaErro(
        `Sem permissão para ${acaoSolicitada} em ${moduloSolicitado}`,
        403
      )
    }

    return {
      user,
      adminProfile,
      role,
      permissions,
      empresaPermissions,
      empresaScope,
      empresas,
      activeEmpresaId,
      allowedEmpresaIds,
      isMaster,
      canAccess,
      canView,
      canCreate,
      canUpdate,
      canDelete,
      applyEmpresaScope,
      errorResponse: null,
    }
  } catch (error) {
    return {
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: error.message || 'Erro ao validar admin',
        },
        { status: 500 }
      ),
    }
  }
}
