// src/app/api/admin/auditoria/route.js
// ============================================================
// API administrativa segura para Auditoria.
// Lê os registros da tabela admin_audit_logs.
//
// Permissões aplicadas:
// - GET auditoria: auditoria.view
// - Exportação: auditoria.export fica no front, porque o CSV é gerado no navegador
//
// Agora:
// Dashboard → API admin → valida admin → valida permissão → service_role → Supabase
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

function sanitizeBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function getDataInicio(periodo = 'ultimos_7') {
  const agora = new Date()

  if (periodo === 'hoje') {
    agora.setHours(0, 0, 0, 0)
    return agora.toISOString()
  }

  if (periodo === 'ultimos_7') {
    agora.setDate(agora.getDate() - 7)
    return agora.toISOString()
  }

  if (periodo === 'ultimos_30') {
    agora.setDate(agora.getDate() - 30)
    return agora.toISOString()
  }

  return null
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'auditoria',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const busca = sanitizeBusca(searchParams.get('busca') || '')
    const entity = searchParams.get('entity') || 'todos'
    const action = searchParams.get('action') || 'todos'
    const periodo = searchParams.get('periodo') || 'ultimos_7'

    const dataInicio = getDataInicio(periodo)

    let query = supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (dataInicio) {
      query = query.gte('created_at', dataInicio)
    }

    if (entity !== 'todos') {
      query = query.eq('entity', entity)
    }

    if (action !== 'todos') {
      query = query.eq('action', action)
    }

    if (busca) {
      query = query.or(
        `admin_email.ilike.%${busca}%,action.ilike.%${busca}%,entity.ilike.%${busca}%,description.ilike.%${busca}%,entity_id.ilike.%${busca}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    const logs = data || []

    const resumo = {
      total: logs.length,
      criacoes: logs.filter((log) => log.action === 'create').length,
      edicoes: logs.filter((log) => log.action === 'update').length,
      exclusoes: logs.filter((log) => log.action === 'delete').length,
      financeiro: logs.filter((log) => log.entity === 'pagamentos').length,
    }

    const entidades = [...new Set(logs.map((log) => log.entity).filter(Boolean))]
    const acoes = [...new Set(logs.map((log) => log.action).filter(Boolean))]

    return NextResponse.json({
      ok: true,
      logs,
      resumo,
      entidades,
      acoes,
      permissions: auth.permissions?.auditoria || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar auditoria',
      },
      { status: 500 }
    )
  }
}