import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:telefone-rapido',
  limit: 30,
  windowMs: 60_000,
}

function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function somenteNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
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

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const hotspotId = String(body.hotspotId || '').trim()
    const macAddress = normalizeMac(body.macAddress || '')
    const telefone = somenteNumeros(body.telefone)

    if (!hotspotId) throw new Error('hotspotId e obrigatorio')
    if (!macAddress) throw new Error('MAC e obrigatorio')
    if (telefone.length !== 11) throw new Error('telefone invalido')

    const { inicio, fim } = getMesAtualRange()

    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id, nome, telefone')
      .eq('hotspot_id', hotspotId)
      .eq('mac_address', macAddress)
      .eq('telefone', telefone)
      .gte('created_at', inicio)
      .lt('created_at', fim)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Celular nao confere com este dispositivo',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      lead: {
        id: data.id,
        nome: data.nome || '',
        telefone: data.telefone || '',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao validar celular',
      },
      { status: 400 }
    )
  }
}
