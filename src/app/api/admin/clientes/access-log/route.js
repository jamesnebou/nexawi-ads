// src/app/api/cliente/access-log/route.js
// ============================================================
// API segura para registrar acessos ao Portal do Cliente.
// O cliente autenticado registra uma entrada real na tabela:
// public.cliente_access_logs
//
// Proteção:
// - exige token válido
// - usa requireCliente()
// - registra somente o próprio cliente
// - evita spam de logs em recarregamentos seguidos
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireCliente } from '@/lib/cliente-api-auth'

export const runtime = 'nodejs'

function getClientIp(request) {
  const forwardedFor = request?.headers?.get('x-forwarded-for')
  const realIp = request?.headers?.get('x-real-ip')
  const vercelIp = request?.headers?.get('x-vercel-forwarded-for')

  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  if (vercelIp) return vercelIp.split(',')[0].trim()
  if (realIp) return realIp.trim()

  return ''
}

function cincoMinutosAtrasISO() {
  return new Date(Date.now() - 5 * 60 * 1000).toISOString()
}

export async function POST(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { cliente } = auth

    const eventType = 'dashboard_access'
    const userAgent = request.headers.get('user-agent') || ''
    const ipAddress = getClientIp(request)

    // Evita registrar vários logs se o cliente recarregar a página várias vezes em poucos minutos.
    const { data: ultimoLog, error: ultimoLogError } = await supabaseAdmin
      .from('cliente_access_logs')
      .select('id, created_at')
      .eq('cliente_id', cliente.id)
      .eq('event_type', eventType)
      .gte('created_at', cincoMinutosAtrasISO())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ultimoLogError) throw ultimoLogError

    if (ultimoLog) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: 'Acesso recente já registrado.',
      })
    }

    const { error } = await supabaseAdmin
      .from('cliente_access_logs')
      .insert([
        {
          cliente_id: cliente.id,
          cliente_email: cliente.email || '',
          cliente_nome: cliente.nome || '',
          cliente_empresa: cliente.nome_empresa || '',
          event_type: eventType,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            origem: 'cliente_dashboard',
            status_cliente: cliente.status || '',
            plano_nome: cliente.planos?.nome || '',
          },
        },
      ])

    if (error) throw error

    return NextResponse.json({
      ok: true,
      skipped: false,
      message: 'Acesso registrado com sucesso.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao registrar acesso do cliente',
      },
      { status: 500 }
    )
  }
}