// src/lib/admin-api-auth.js
// ============================================================
// Helper de autenticação e autorização para APIs administrativas.
// Agora suporta:
// - admin ativo/inativo
// - cargo: master, admin, suporte, financeiro, viewer
// - permissões granulares por módulo e ação
//
// Exemplos:
// requireAdmin(request)
// requireAdmin(request, { requireMaster: true })
// requireAdmin(request, { permission: 'hotspots.view' })
// requireAdmin(request, { module: 'hotspots', action: 'delete' })
//
// Compatibilidade:
// APIs antigas que usam apenas requireAdmin(request) continuam funcionando.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MODULOS = [
  'dashboard',
  'clientes',
  'hotspots',
  'anuncios',
  'financeiro',
  'planos',
  'leads',
  'relatorios',
  'auditoria',
  'configuracoes',
  'usuarios_admin',
]

const ACOES_PADRAO = ['view', 'create', 'update', 'delete', 'export']

const PERMISSOES_POR_CARGO = {
  master: {
    dashboard: { view: true },
    clientes: { view: true, create: true, update: true, delete: true, export: true },
    hotspots: { view: true, create: true, update: true, delete: true, export: true },
    anuncios: { view: true, create: true, update: true, delete: true, activate: true, pause: true, export: true },
    financeiro: { view: true, create: true, update: true, delete: true, mark_paid: true, export: true },
    planos: { view: true, create: true, update: true, delete: true },
    leads: { view: true, delete: true, export: true },
    relatorios: { view: true, export: true },
    auditoria: { view: true, export: true },
    configuracoes: { view: true, update: true },
    usuarios_admin: { view: true, create: true, update: true, delete: true },
  },

  admin: {
    dashboard: { view: true },
    clientes: { view: true, create: true, update: true, delete: false, export: true },
    hotspots: { view: true, create: true, update: true, delete: false, export: true },
    anuncios: { view: true, create: true, update: true, delete: false, activate: true, pause: true, export: true },
    financeiro: { view: true, create: true, update: true, delete: false, mark_paid: true, export: true },
    planos: { view: true, create: true, update: true, delete: false },
    leads: { view: true, delete: false, export: true },
    relatorios: { view: true, export: true },
    auditoria: { view: true, export: false },
    configuracoes: { view: true, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
  },

  suporte: {
    dashboard: { view: true },
    clientes: { view: true, create: true, update: true, delete: false, export: false },
    hotspots: { view: true, create: true, update: true, delete: false, export: false },
    anuncios: { view: true, create: true, update: true, delete: false, activate: true, pause: true, export: false },
    financeiro: { view: false, create: false, update: false, delete: false, mark_paid: false, export: false },
    planos: { view: false, create: false, update: false, delete: false },
    leads: { view: true, delete: false, export: false },
    relatorios: { view: true, export: false },
    auditoria: { view: false, export: false },
    configuracoes: { view: false, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
  },

  financeiro: {
    dashboard: { view: true },
    clientes: { view: true, create: false, update: false, delete: false, export: true },
    hotspots: { view: false, create: false, update: false, delete: false, export: false },
    anuncios: { view: false, create: false, update: false, delete: false, activate: false, pause: false, export: false },
    financeiro: { view: true, create: true, update: true, delete: false, mark_paid: true, export: true },
    planos: { view: true, create: false, update: false, delete: false },
    leads: { view: false, delete: false, export: false },
    relatorios: { view: true, export: true },
    auditoria: { view: false, export: false },
    configuracoes: { view: false, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
  },

  viewer: {
    dashboard: { view: true },
    clientes: { view: false, create: false, update: false, delete: false, export: false },
    hotspots: { view: false, create: false, update: false, delete: false, export: false },
    anuncios: { view: false, create: false, update: false, delete: false, activate: false, pause: false, export: false },
    financeiro: { view: false, create: false, update: false, delete: false, mark_paid: false, export: false },
    planos: { view: false, create: false, update: false, delete: false },
    leads: { view: true, delete: false, export: false },
    relatorios: { view: true, export: false },
    auditoria: { view: false, export: false },
    configuracoes: { view: false, update: false },
    usuarios_admin: { view: false, create: false, update: false, delete: false },
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

    // Compatibilidade com modelo antigo:
    // permissions: { hotspots: true }
    // vira permissão total básica naquele módulo.
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

export async function requireAdmin(request, options = {}) {
  try {
    const {
      permission = '',
      module = '',
      action = 'view',
      requireMaster = false,
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
      .select('user_id, email, role, active, permissions, created_at, updated_at')
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

    const adminProfile = {
      user_id: adminData.user_id,
      email: adminData.email || user.email || '',
      auth_email: user.email || '',
      role,
      active: adminData.active !== false,
      permissions,
      created_at: adminData.created_at || null,
      updated_at: adminData.updated_at || null,
    }

    function canAccess(modulo, acao = 'view') {
      if (!modulo) return true
      if (isMaster) return true

      return Boolean(permissions?.[modulo]?.[acao])
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
      isMaster,
      canAccess,
      canView,
      canCreate,
      canUpdate,
      canDelete,
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