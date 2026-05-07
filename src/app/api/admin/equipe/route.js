// src/app/api/admin/equipe/route.js
// ============================================================
// API administrativa segura para Equipe/Admins.
// Permite ao administrador master:
// - listar administradores
// - alterar cargo
// - ativar/desativar admin
// - alterar permissões por módulo
//
// Proteção:
// Apenas role master pode acessar.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const ROLES_VALIDOS = ['master', 'admin', 'suporte', 'financeiro', 'viewer']

const PERMISSOES_VALIDAS = [
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

const PERMISSOES_PADRAO = {
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

function limparEmail(value = '') {
  return String(value || '').trim().toLowerCase()
}

function normalizarPermissoes(role, permissions = {}) {
  const base = PERMISSOES_PADRAO[role] || PERMISSOES_PADRAO.admin
  const resultado = {}

  PERMISSOES_VALIDAS.forEach((key) => {
    if (typeof permissions[key] === 'boolean') {
      resultado[key] = permissions[key]
    } else {
      resultado[key] = Boolean(base[key])
    }
  })

  return resultado
}

async function buscarAuthUserPorEmail(email) {
  // Supabase Admin não tem "getUserByEmail" direto em todos os SDKs.
  // Então usamos listUsers e procuramos pelo e-mail.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (error) throw error

  const users = data?.users || []

  return users.find((user) => limparEmail(user.email) === limparEmail(email)) || null
}

export async function GET(request) {
  const auth = await requireAdmin(request, { requireMaster: true })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { data: admins, error } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, email, role, active, permissions, created_at, updated_at')
      .order('email', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      admins: admins || [],
      roles: ROLES_VALIDOS,
      permissoes: PERMISSOES_VALIDAS,
      permissoesPadrao: PERMISSOES_PADRAO,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar equipe',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, { requireMaster: true })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'upsert_admin') {
      const email = limparEmail(body.email)
      const role = ROLES_VALIDOS.includes(body.role) ? body.role : 'admin'
      const active = typeof body.active === 'boolean' ? body.active : true
      const permissions = normalizarPermissoes(role, body.permissions || {})

      if (!email) {
        return NextResponse.json(
          { ok: false, error: 'E-mail é obrigatório' },
          { status: 400 }
        )
      }

      const authUser = await buscarAuthUserPorEmail(email)

      if (!authUser) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Usuário não encontrado no Supabase Auth. Primeiro crie o usuário em Authentication > Users.',
          },
          { status: 404 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('admin_users')
        .upsert(
          {
            user_id: authUser.id,
            email,
            role,
            active,
            permissions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select('user_id, email, role, active, permissions, created_at, updated_at')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'upsert',
        entity: 'admin_users',
        entityId: data.user_id,
        description: 'Criou ou atualizou um administrador',
        metadata: {
          email: data.email,
          role: data.role,
          active: data.active,
          permissions: data.permissions,
        },
      })

      return NextResponse.json({
        ok: true,
        admin: data,
        message: 'Administrador salvo com sucesso',
      })
    }

    if (action === 'update_admin') {
      const userId = String(body.user_id || '').trim()

      if (!userId) {
        return NextResponse.json(
          { ok: false, error: 'ID do administrador é obrigatório' },
          { status: 400 }
        )
      }

      const { data: adminAntes, error: adminAntesError } = await supabaseAdmin
        .from('admin_users')
        .select('user_id, email, role, active, permissions')
        .eq('user_id', userId)
        .maybeSingle()

      if (adminAntesError) throw adminAntesError

      if (!adminAntes) {
        return NextResponse.json(
          { ok: false, error: 'Administrador não encontrado' },
          { status: 404 }
        )
      }

      // Evita o master desativar a si mesmo por acidente.
      if (userId === auth.user.id && body.active === false) {
        return NextResponse.json(
          { ok: false, error: 'Você não pode desativar o próprio usuário master logado.' },
          { status: 400 }
        )
      }

      const role = ROLES_VALIDOS.includes(body.role) ? body.role : adminAntes.role || 'admin'
      const active = typeof body.active === 'boolean' ? body.active : adminAntes.active
      const permissions = normalizarPermissoes(role, body.permissions || adminAntes.permissions || {})

      const { data, error } = await supabaseAdmin
        .from('admin_users')
        .update({
          role,
          active,
          permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('user_id, email, role, active, permissions, created_at, updated_at')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'admin_users',
        entityId: data.user_id,
        description: 'Atualizou permissões de um administrador',
        metadata: {
          email: data.email,
          role_anterior: adminAntes.role,
          role_atual: data.role,
          active_anterior: adminAntes.active,
          active_atual: data.active,
          permissions_anteriores: adminAntes.permissions,
          permissions_atuais: data.permissions,
        },
      })

      return NextResponse.json({
        ok: true,
        admin: data,
        message: 'Administrador atualizado com sucesso',
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
        error: error.message || 'Erro ao salvar equipe',
      },
      { status: 500 }
    )
  }
}