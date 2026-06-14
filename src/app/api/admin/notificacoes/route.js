// src/app/api/admin/notificacoes/route.js
// ============================================================
// API administrativa para notificações internas.
// Permite:
// - listar notificações
// - contar não lidas
// - marcar uma como lida
// - marcar todas como lidas
// - gerar alertas operacionais automáticos
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { createAdminNotification } from '@/lib/admin-notifications'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function getAdminReadKey(auth) {
  return auth.user?.id || auth.user?.email || 'admin'
}

function isRead(notification, readKey) {
  const readBy = notification?.read_by

  if (!readBy || typeof readBy !== 'object') return false

  return Boolean(readBy[readKey])
}

async function sincronizarAlertasOperacionais(auth) {
  try {
    const podeVerClientes = auth.canAccess('clientes', 'view')
    const podeVerFinanceiro = auth.canAccess('financeiro', 'view')
    const podeVerSuporte = auth.canAccess('suporte', 'view')

    if (podeVerClientes) {
      const { data: clientesTravados, error } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, nome_empresa, email, onboarding_motivo_trava')
        .eq('onboarding_travado', true)
        .limit(20)

      if (error) throw error

      await Promise.all(
        (clientesTravados || []).map((cliente) =>
          createAdminNotification({
            type: 'cliente_travado',
            title: 'Cliente travado no onboarding',
            message:
              cliente.onboarding_motivo_trava ||
              'Existe um cliente com implantação travada.',
            severity: 'critical',
            entity: 'clientes',
            entityId: cliente.id,
            actionUrl: '/dashboard/clientes',
            dedupKey: `cliente_travado:${cliente.id}`,
            metadata: {
              cliente_id: cliente.id,
              nome: cliente.nome || '',
              nome_empresa: cliente.nome_empresa || '',
              email: cliente.email || '',
            },
          })
        )
      )
    }

    if (podeVerFinanceiro) {
      const { data: pagamentosPendentes, error } = await supabaseAdmin
        .from('pagamentos')
        .select('id, valor, status, cliente_id, clientes(nome, nome_empresa, email)')
        .eq('status', 'Pendente')
        .limit(20)

      if (error) throw error

      await Promise.all(
        (pagamentosPendentes || []).map((pagamento) =>
          createAdminNotification({
            type: 'pagamento_pendente',
            title: 'Pagamento pendente',
            message: `Existe uma cobrança pendente de ${Number(pagamento.valor || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}.`,
            severity: 'warning',
            entity: 'pagamentos',
            entityId: pagamento.id,
            actionUrl: '/dashboard/financeiro',
            dedupKey: `pagamento_pendente:${pagamento.id}`,
            metadata: {
              pagamento_id: pagamento.id,
              cliente_id: pagamento.cliente_id,
              cliente_nome: pagamento.clientes?.nome_empresa || pagamento.clientes?.nome || '',
              email: pagamento.clientes?.email || '',
            },
          })
        )
      )
    }

    if (podeVerSuporte) {
      const { data: ticketsUrgentes, error } = await supabaseAdmin
        .from('support_tickets')
        .select('id, subject, priority, status, created_by_email')
        .eq('priority', 'urgente')
        .in('status', ['aberto', 'em_andamento', 'aguardando_cliente'])
        .limit(20)

      if (error) throw error

      await Promise.all(
        (ticketsUrgentes || []).map((ticket) =>
          createAdminNotification({
            type: 'ticket_urgente',
            title: 'Chamado urgente aberto',
            message: ticket.subject || 'Existe um chamado urgente aguardando atendimento.',
            severity: 'critical',
            entity: 'support_tickets',
            entityId: ticket.id,
            actionUrl: `/dashboard/suporte?ticketId=${ticket.id}`,
            dedupKey: `ticket_urgente:${ticket.id}`,
            metadata: {
              ticket_id: ticket.id,
              status: ticket.status,
              priority: ticket.priority,
              created_by_email: ticket.created_by_email || '',
            },
          })
        )
      )
    }
  } catch (error) {
    console.error('Erro ao sincronizar alertas operacionais:', error)
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'dashboard',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('sync') === '1') {
      await sincronizarAlertasOperacionais(auth)
    }

    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)
    const unreadOnly = searchParams.get('unreadOnly') === '1'
    const readKey = getAdminReadKey(auth)

    const { data, error } = await supabaseAdmin
      .from('admin_notifications')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const notifications = (data || []).map((item) => ({
      ...item,
      read: isRead(item, readKey),
    }))

    const filtered = unreadOnly
      ? notifications.filter((item) => !item.read)
      : notifications

    const unreadCount = notifications.filter((item) => !item.read).length

    return NextResponse.json({
      ok: true,
      notifications: filtered,
      unreadCount,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar notificações',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'dashboard',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()

    const action = limparTexto(body.action)
    const id = limparTexto(body.id)

    const readKey = getAdminReadKey(auth)
    const readValue = new Date().toISOString()

    if (action === 'mark_read') {
      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID da notificação é obrigatório' },
          { status: 400 }
        )
      }

      const { data: notification, error: getError } = await supabaseAdmin
        .from('admin_notifications')
        .select('id, read_by')
        .eq('id', id)
        .maybeSingle()

      if (getError) throw getError

      if (!notification) {
        return NextResponse.json(
          { ok: false, error: 'Notificação não encontrada' },
          { status: 404 }
        )
      }

      const readBy = {
        ...(notification.read_by || {}),
        [readKey]: readValue,
      }

      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .update({
          read_by: readBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      return NextResponse.json({
        ok: true,
        message: 'Notificação marcada como lida',
      })
    }

    if (action === 'mark_all_read') {
      const { data: notifications, error: getError } = await supabaseAdmin
        .from('admin_notifications')
        .select('id, read_by')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(100)

      if (getError) throw getError

      await Promise.all(
        (notifications || []).map((notification) => {
          const readBy = {
            ...(notification.read_by || {}),
            [readKey]: readValue,
          }

          return supabaseAdmin
            .from('admin_notifications')
            .update({
              read_by: readBy,
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id)
        })
      )

      return NextResponse.json({
        ok: true,
        message: 'Todas as notificações foram marcadas como lidas',
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
        error: error.message || 'Erro ao atualizar notificação',
      },
      { status: 500 }
    )
  }
}