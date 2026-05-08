// src/app/api/cliente/suporte/route.js
// ============================================================
// API segura da Central de Suporte do Cliente.
// O cliente só enxerga e responde os próprios chamados.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireCliente } from '@/lib/cliente-api-auth'
import { createAdminNotification } from '@/lib/admin-notifications'

export const runtime = 'nodejs'

const CATEGORIAS = ['geral', 'financeiro', 'campanha', 'tecnico', 'hotspot', 'acesso']
const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function getClienteNome(cliente = {}) {
  return cliente.nome_empresa || cliente.nome || cliente.email || 'Cliente'
}

async function buscarTicketDoCliente(ticketId, clienteId) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (error) throw error

  return data
}

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { cliente } = auth
    const { searchParams } = new URL(request.url)
    const ticketId = limparTexto(searchParams.get('ticketId') || '')

    if (ticketId) {
      const ticket = await buscarTicketDoCliente(ticketId, cliente.id)

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
        .eq('internal_note', false)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      return NextResponse.json({
        ok: true,
        ticket,
        messages: messages || [],
      })
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      tickets: tickets || [],
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar chamados' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { cliente, user } = auth
    const body = await request.json()
    const action = limparTexto(body.action)

    if (action === 'create_ticket') {
      const subject = limparTexto(body.subject)
      const message = limparTexto(body.message)
      const category = CATEGORIAS.includes(body.category) ? body.category : 'geral'
      const priority = PRIORIDADES.includes(body.priority) ? body.priority : 'media'

      if (!subject || subject.length < 4) {
        return NextResponse.json(
          { ok: false, error: 'Informe um assunto válido' },
          { status: 400 }
        )
      }

      if (!message || message.length < 5) {
        return NextResponse.json(
          { ok: false, error: 'Descreva melhor sua solicitação' },
          { status: 400 }
        )
      }

      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('support_tickets')
        .insert([
          {
            cliente_id: cliente.id,
            subject,
            category,
            priority,
            status: 'aberto',
            created_by_type: 'cliente',
            created_by_email: user.email || cliente.email || '',
            last_message_at: new Date().toISOString(),
          },
        ])
        .select('*')
        .single()

      if (ticketError) throw ticketError

      const { error: messageError } = await supabaseAdmin
        .from('support_ticket_messages')
        .insert([
          {
            ticket_id: ticket.id,
            author_type: 'cliente',
            author_email: user.email || cliente.email || '',
            author_name: getClienteNome(cliente),
            message,
            internal_note: false,
          },
        ])

      if (messageError) throw messageError

      await createAdminNotification({
  type: 'support_ticket_created',
  title: 'Novo chamado aberto',
  message: subject,
  severity: priority === 'urgente' ? 'critical' : priority === 'alta' ? 'warning' : 'info',
  entity: 'support_tickets',
  entityId: ticket.id,
  actionUrl: `/dashboard/suporte?ticketId=${ticket.id}`,
  dedupKey: `support_ticket_created:${ticket.id}`,
  metadata: {
    ticket_id: ticket.id,
    cliente_id: cliente.id,
    cliente_nome: getClienteNome(cliente),
    email: user.email || cliente.email || '',
    category,
    priority,
  },
})

      return NextResponse.json({
        ok: true,
        ticket,
        message: 'Chamado aberto com sucesso',
      })
    }

    if (action === 'reply_ticket') {
      const ticketId = limparTexto(body.ticketId)
      const message = limparTexto(body.message)

      if (!ticketId) {
        return NextResponse.json(
          { ok: false, error: 'ID do chamado é obrigatório' },
          { status: 400 }
        )
      }

      if (!message || message.length < 2) {
        return NextResponse.json(
          { ok: false, error: 'Digite uma mensagem' },
          { status: 400 }
        )
      }

      const ticket = await buscarTicketDoCliente(ticketId, cliente.id)

      if (!ticket) {
        return NextResponse.json(
          { ok: false, error: 'Chamado não encontrado' },
          { status: 404 }
        )
      }

      const novoStatus =
        ticket.status === 'resolvido' || ticket.status === 'fechado'
          ? 'aberto'
          : ticket.status

      const { error: messageError } = await supabaseAdmin
        .from('support_ticket_messages')
        .insert([
          {
            ticket_id: ticket.id,
            author_type: 'cliente',
            author_email: user.email || cliente.email || '',
            author_name: getClienteNome(cliente),
            message,
            internal_note: false,
          },
        ])

      if (messageError) throw messageError

      const { error: updateError } = await supabaseAdmin
        .from('support_tickets')
        .update({
          status: novoStatus,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id)

      if (updateError) throw updateError

      await createAdminNotification({
  type: 'support_ticket_client_reply',
  title: 'Cliente respondeu um chamado',
  message: ticket.subject || 'Um cliente respondeu um chamado.',
  severity: 'info',
  entity: 'support_tickets',
  entityId: ticket.id,
  actionUrl: `/dashboard/suporte?ticketId=${ticket.id}`,
  metadata: {
    ticket_id: ticket.id,
    cliente_id: cliente.id,
    cliente_nome: getClienteNome(cliente),
    email: user.email || cliente.email || '',
  },
})

      return NextResponse.json({
        ok: true,
        message: 'Resposta enviada com sucesso',
      })
    }

    return NextResponse.json(
      { ok: false, error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar chamado' },
      { status: 500 }
    )
  }
}