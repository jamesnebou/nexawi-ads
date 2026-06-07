// src/app/api/portal/lead/quick/route.js
// ============================================================
// API segura para verificar se existe cadastro recente no mês.
// Não devolve CPF, telefone ou e-mail.
// Só diz se existe lead para aquele hotspot + MAC.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:lead:quick',
  limit: 60,
  windowMs: 60_000,
}

function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function getMesAtualRange() {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 0, 0, 0, 0)

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  }
}

function mascararTelefone(value = '') {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length !== 11) return ''

  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })
  }

  try {
    const body = await request.json()

    const hotspotId = String(body.hotspotId || '').trim()
    const macAddress = normalizeMac(body.macAddress || '')

    if (!hotspotId || !macAddress) {
      return NextResponse.json({
        ok: true,
        found: false,
      })
    }

    const { inicio, fim } = getMesAtualRange()

    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id, nome, telefone')
      .eq('hotspot_id', hotspotId)
      .eq('mac_address', macAddress)
      .gte('created_at', inicio)
      .lt('created_at', fim)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      found: Boolean(data),
      lead: data
        ? {
            id: data.id,
            nome: data.nome || '',
            telefoneMascarado: mascararTelefone(data.telefone),
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro no CPF rápido',
      },
      { status: 500 }
    )
  }
}
