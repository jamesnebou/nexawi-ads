// src/lib/admin-api-auth.js
// ============================================================
// Helper de autenticação e autorização para APIs administrativas.
// Objetivo:
// - Ler o token enviado pelo navegador.
// - Validar o usuário no Supabase Auth.
// - Confirmar se ele está na tabela public.admin_users.
// - Verificar se o admin está ativo.
// - Carregar role e permissões.
// - Permitir bloqueio por permissão específica nas APIs.
//
// Compatibilidade:
// APIs antigas que usam requireAdmin(request) continuam funcionando.
// APIs novas podem usar requireAdmin(request, { permission: 'financeiro' })
// ou requireAdmin(request, { requireMaster: true })
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TODAS_PERMISSOES = [
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

// Permissões padrão por cargo.
// Depois, o campo permissions do banco pode sobrescrever individualmente.
const PERMISSOES_POR_CARGO = {
  master: {
    dashboard: true,
    clientes: true,
    hotspots: true,
    anuncios: true,
    financeiro: true,
    planos: true,
    leads: true,
    relatorios: true,
    auditoria: true,
    configuracoes: true,
    usuarios_admin: true,
  },

  admin: {
    dashboard: true,
    clientes: true,
    hotspots: true,
    anuncios: true,
    financeiro: true,
    planos: true,
    leads: true,
    relatorios: true,
    auditoria: true,
    configuracoes: true,
    usuarios_admin: false,
  },

  suporte: {
    dashboard: true,
    clientes: true,
    hotspots: true,
    anuncios: true,
    financeiro: false,
    planos: false,
    leads: true,
    relatorios: true,
    auditoria: false,
    configuracoes: false,
    usuarios_admin: false,
  },

  financeiro: {
    dashboard: true,
    clientes: true,
    hotspots: false,
    anuncios: false,
    financeiro: true,
    planos: true,
    leads: false,
    relatorios: true,
    auditoria: false,
    configuracoes: false,
    usuarios_admin: false,
  },

  viewer: {
    dashboard: true,
    clientes: false,
    hotspots: false,
    anuncios: false,
    financeiro: false,
    planos: false,
    leads: true,
    relatorios: true,
    auditoria: false,
    configuracoes: false,
    usuarios_admin: false,
  },
}

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || ''

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authHeader.slice(7).trim()
}

function normalizarPermissoes(role = 'admin', permissions = {}) {
  const permissoesPadrao = PERMISSOES_POR_CARGO[role] || PERMISSOES_POR_CARGO.admin
  const permissoesBanco = permissions && typeof permissions === 'object' ? permissions : {}

  const resultado = {}

  TODAS_PERMISSOES.forEach((permissao) => {
    // Se o banco definir true/false, ele manda.
    // Se não definir, usa o padrão do cargo.
    if (typeof permissoesBanco[permissao] === 'boolean') {
      resultado[permissao] = permissoesBanco[permissao]
    } else {
      resultado[permissao] = Boolean(permissoesPadrao[permissao])
    }
  })

  return resultado
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

export async function requireAdmin(request, options = {}) {
  try {
    const {
      permission = '',
      requireMaster = false,
    } = options

    const token = getBearerToken(request)

    if (!token) {
      return criarRespostaErro('Sessão não encontrada', 401)
    }

    // Valida o token JWT do usuário logado.
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !userData?.user) {
      return criarRespostaErro('Sessão inválida ou expirada', 401)
    }

    const user = userData.user

    // Confere se o usuário logado é admin e carrega perfil administrativo.
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

    function canAccess(permissao) {
      if (!permissao) return true
      if (isMaster) return true

      return Boolean(permissions[permissao])
    }

    if (requireMaster && !isMaster) {
      return criarRespostaErro('Apenas o administrador master pode executar esta ação', 403)
    }

    if (permission && !canAccess(permission)) {
      return criarRespostaErro(`Sem permissão para acessar: ${permission}`, 403)
    }

    return {
      user,
      adminProfile,
      role,
      permissions,
      isMaster,
      canAccess,
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