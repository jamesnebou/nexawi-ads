// src/app/api/admin/suporte/route.js
// ============================================================
// API administrativa da Central de Suporte.
// Admins autorizados podem listar, responder, atribuir e mudar status.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado']
const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function permissaoNegada(acao) {
  return NextResponse.json(
    { ok: false, error: `Sem permissão para ${acao} em suporte` },
    { status: 403 }
  )
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'suporte',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)

    const ticketId = limparTexto(searchParams.get('ticketId') || '')
    const status = limparTexto(searchParams.get('status') || 'todos')
    const priority = limparTexto(searchParams.get('priority') || 'todos')
    const busca = sanitizeBusca(searchParams.get('busca') || '')

    if (ticketId) {
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('support_tickets')
        .select(`
          *,
          clientes(id, nome, nome_empresa, email, telefone, cidade, estado, planos(nome))
        `)
        .eq('id', ticketId)
        .maybeSingle()

      if (ticketError) throw ticketError

      if (!ticket) {
        return NextResponse.json(
          { ok: false, error: 'Chamado não encontrado' },
          { status: 404 }
        )
      }

      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      return NextResponse.json({
        ok: true,
        ticket,
        messages: messages || [],
        permissions: auth.permissions?.suporte || {},
      })
    }

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        clientes(id, nome, nome_empresa, email, telefone, cidade, estado, planos(nome))
      `)
      .order('last_message_at', { ascending: false })
      .limit(200)

    if (status !== 'todos') query = query.eq('status', status)
    if (priority !== 'todos') query = query.eq('priority', priority)

    if (busca) {
      query = query.or(
        `subject.ilike.%${busca}%,created_by_email.ilike.%${busca}%,assigned_admin_email.ilike.%${busca}%`
      )
    }

    const { data: tickets, error } = await query

    if (error) throw error

    const lista = tickets || []

    const resumo = {
      total: lista.length,
      abertos: lista.filter((t) => t.status === 'aberto').length,
      andamento: lista.filter((t) => t.status === 'em_andamento').length,
      aguardandoCliente: lista.filter((t) => t.status === 'aguardando_cliente').length,
      resolvidos: lista.filter((t) => t.status === 'resolvido').length,
      urgentes: lista.filter((t) => t.priority === 'urgente').length,
    }

    return NextResponse.json({
      ok: true,
      tickets: lista,
      resumo,
      permissions: auth.permissions?.suporte || {},
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar chamados' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const action = limparTexto(body.action)
    const ticketId = limparTexto(body.ticketId)

    if (!ticketId) {
      return NextResponse.json(
        { ok: false, error: 'ID do chamado é obrigatório' },
        { status: 400 }
      )
    }

    const { data: ticketAntes, error: ticketAntesError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketAntesError) throw ticketAntesError

    if (!ticketAntes) {
      return NextResponse.json(
        { ok: false, error: 'Chamado não encontrado' },
        { status: 404 }
      )
    }

    if (action === 'reply_ticket') {
      if (!auth.canAccess('suporte', 'reply')) return permissaoNegada('reply')

      const message = limparTexto(body.message)
      const internalNote = Boolean(body.internal_note)

      if (!message || message.length < 2) {
        return NextResponse.json(
          { ok: false, error: 'Digite uma mensagem' },
          { status: 400 }
        )
      }

      const { error: messageError } = await supabaseAdmin
        .from('support_ticket_messages')
        .insert([
          {
            ticket_id: ticketAntes.id,
            author_type: 'admin',
            author_email: auth.user?.email || '',
            author_name: auth.adminProfile?.email || auth.user?.email || 'Admin',
            message,
            internal_note: internalNote,
          },
        ])

      if (messageError) throw messageError

      const novoStatus = internalNote ? ticketAntes.status : 'em_andamento'

      const { error: updateError } = await supabaseAdmin
        .from('support_tickets')
        .update({
          status: novoStatus,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketAntes.id)

      if (updateError) throw updateError

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: internalNote ? 'support_internal_note' : 'support_reply',
        entity: 'support_tickets',
        entityId: ticketAntes.id,
        description: internalNote
          ? 'Adicionou nota interna em chamado'
          : 'Respondeu um chamado de suporte',
        metadata: {
          ticket_id: ticketAntes.id,
          subject: ticketAntes.subject,
          internal_note: internalNote,
        },
      })

      return NextResponse.json({
        ok: true,
        message: internalNote ? 'Nota interna salva' : 'Resposta enviada',
      })
    }

    if (action === 'update_ticket') {
      if (!auth.canAccess('suporte', 'update')) return permissaoNegada('update')

      const status = STATUS_VALIDOS.includes(body.status) ? body.status : ticketAntes.status
      const priority = PRIORIDADES.includes(body.priority) ? body.priority : ticketAntes.priority
      const assignedAdminEmail = limparTexto(body.assigned_admin_email || ticketAntes.assigned_admin_email || '')

      if (status === 'fechado' && !auth.canAccess('suporte', 'close')) {
        return permissaoNegada('close')
      }

      if (assignedAdminEmail !== ticketAntes.assigned_admin_email && !auth.canAccess('suporte', 'assign')) {
        return permissaoNegada('assign')
      }

      const { data, error } = await supabaseAdmin
        .from('support_tickets')
        .update({
          status,
          priority,
          assigned_admin_email: assignedAdminEmail || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketAntes.id)
        .select('*')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'support_update',
        entity: 'support_tickets',
        entityId: ticketAntes.id,
        description: 'Atualizou um chamado de suporte',
        metadata: {
          ticket_id: ticketAntes.id,
          status_anterior: ticketAntes.status,
          status_atual: data.status,
          prioridade_anterior: ticketAntes.priority,
          prioridade_atual: data.priority,
          responsavel_anterior: ticketAntes.assigned_admin_email,
          responsavel_atual: data.assigned_admin_email,
        },
      })

      return NextResponse.json({
        ok: true,
        ticket: data,
        message: 'Chamado atualizado com sucesso',
      })
    }

    return NextResponse.json(
      { ok: false, error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar chamado' },
      { status: 500 }
    )
  }
}