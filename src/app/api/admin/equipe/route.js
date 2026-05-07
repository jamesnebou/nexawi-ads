// src/app/api/admin/equipe/route.js
// ============================================================
// API administrativa segura para Equipe/Admins.
// Permite ao administrador master:
// - listar administradores
// - adicionar admin existente no Supabase Auth
// - alterar cargo
// - ativar/desativar admin
// - controlar permissões granulares por módulo e ação
//
// Exemplo de permission:
// {
//   "hotspots": { "view": true, "create": true, "update": true, "delete": false }
// }
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const ROLES_VALIDOS = ['master', 'admin', 'suporte', 'financeiro', 'viewer']

const MODULOS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: ['view'],
  },
  {
    key: 'clientes',
    label: 'Clientes',
    actions: ['view', 'create', 'update', 'delete', 'export'],
  },
  {
    key: 'hotspots',
    label: 'Hotspots',
    actions: ['view', 'create', 'update', 'delete', 'export'],
  },
  {
    key: 'anuncios',
    label: 'Anúncios',
    actions: ['view', 'create', 'update', 'delete', 'activate', 'pause', 'export'],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    actions: ['view', 'create', 'update', 'delete', 'mark_paid', 'export'],
  },
  {
    key: 'planos',
    label: 'Planos',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'leads',
    label: 'Leads',
    actions: ['view', 'delete', 'export'],
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    actions: ['view', 'export'],
  },
  {
    key: 'auditoria',
    label: 'Auditoria',
    actions: ['view', 'export'],
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    actions: ['view', 'update'],
  },
  {
    key: 'usuarios_admin',
    label: 'Equipe/Admins',
    actions: ['view', 'create', 'update', 'delete'],
  },
]

const PERMISSOES_PADRAO = {
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

function limparEmail(value = '') {
  return String(value || '').trim().toLowerCase()
}

function normalizarPermissoes(role = 'admin', permissions = {}) {
  const base = PERMISSOES_PADRAO[role] || PERMISSOES_PADRAO.admin
  const banco = permissions && typeof permissions === 'object' ? permissions : {}

  const resultado = {}

  MODULOS.forEach((modulo) => {
    const baseModulo = base[modulo.key] || {}
    const bancoModulo = banco[modulo.key]

    resultado[modulo.key] = {}

    // Compatibilidade com modelo antigo: { hotspots: true }
    if (typeof bancoModulo === 'boolean') {
      modulo.actions.forEach((action) => {
        resultado[modulo.key][action] = bancoModulo
      })

      return
    }

    const bancoModuloObj = bancoModulo && typeof bancoModulo === 'object'
      ? bancoModulo
      : {}

    modulo.actions.forEach((action) => {
      if (typeof bancoModuloObj[action] === 'boolean') {
        resultado[modulo.key][action] = bancoModuloObj[action]
      } else {
        resultado[modulo.key][action] = Boolean(baseModulo[action])
      }
    })
  })

  return resultado
}

async function buscarAuthUserPorEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (error) throw error

  const users = data?.users || []

  return users.find((user) => limparEmail(user.email) === limparEmail(email)) || null
}

async function contarMastersAtivosExceto(userId = '') {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('role', 'master')
    .eq('active', true)

  if (error) throw error

  return (data || []).filter((item) => item.user_id !== userId).length
}

export async function GET(request) {
  const auth = await requireAdmin(request, { module: 'usuarios_admin', action: 'view' })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { data: admins, error } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, email, role, active, permissions, created_at, updated_at')
      .order('email', { ascending: true })

    if (error) throw error

    const adminsNormalizados = (admins || []).map((admin) => ({
      ...admin,
      role: admin.role || 'admin',
      active: admin.active !== false,
      permissions: normalizarPermissoes(admin.role || 'admin', admin.permissions || {}),
    }))

    return NextResponse.json({
      ok: true,
      admins: adminsNormalizados,
      roles: ROLES_VALIDOS,
      modules: MODULOS,
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
  const auth = await requireAdmin(request, { module: 'usuarios_admin', action: 'update' })

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
        admin: {
          ...data,
          permissions: normalizarPermissoes(data.role, data.permissions),
        },
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

      const role = ROLES_VALIDOS.includes(body.role) ? body.role : adminAntes.role || 'admin'
      const active = typeof body.active === 'boolean' ? body.active : adminAntes.active
      const permissions = normalizarPermissoes(role, body.permissions || adminAntes.permissions || {})

      // Segurança: não permite o master logado se desativar.
      if (userId === auth.user.id && active === false) {
        return NextResponse.json(
          { ok: false, error: 'Você não pode desativar seu próprio usuário.' },
          { status: 400 }
        )
      }

      // Segurança: não permite o master logado remover seu próprio cargo master.
      if (userId === auth.user.id && role !== 'master') {
        return NextResponse.json(
          { ok: false, error: 'Você não pode remover seu próprio cargo master.' },
          { status: 400 }
        )
      }

      // Segurança: não permite deixar o sistema sem master ativo.
      if (adminAntes.role === 'master' && (role !== 'master' || active === false)) {
        const outrosMasters = await contarMastersAtivosExceto(userId)

        if (outrosMasters === 0) {
          return NextResponse.json(
            { ok: false, error: 'Não é permitido deixar o sistema sem nenhum master ativo.' },
            { status: 400 }
          )
        }
      }

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
        admin: {
          ...data,
          permissions: normalizarPermissoes(data.role, data.permissions),
        },
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