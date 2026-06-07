import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
const RATE_LIMIT = {
  keyPrefix: 'portal:ad-complete',
  limit: 50,
  windowMs: 60_000,
}

function limparTexto(value = '') {
  return String(value || '').trim()
}

function normalizeMac(value = '') {
  return limparTexto(value).toUpperCase().replace(/-/g, ':')
}

async function buscarLead({ leadId, hotspotId, macAddress }) {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, hotspot_id, mac_address')
    .eq('id', leadId)
    .eq('hotspot_id', hotspotId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const leadMac = normalizeMac(data.mac_address || '')
  const incomingMac = normalizeMac(macAddress || '')

  if (leadMac && incomingMac && leadMac !== incomingMac) {
    throw new Error('MAC divergente para concluir anuncio')
  }

  return data
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const adSessionId = limparTexto(body.adSessionId || body.ad_session_id)
    const leadId = limparTexto(body.leadId || body.lead_id)
    const hotspotId = limparTexto(body.hotspotId || body.hotspot_id)
    const macAddress = normalizeMac(body.macAddress || body.mac_address)

    if (!adSessionId) throw new Error('adSessionId e obrigatorio')
    if (!leadId) throw new Error('leadId e obrigatorio')
    if (!hotspotId) throw new Error('hotspotId e obrigatorio')
    if (!macAddress) throw new Error('MAC e obrigatorio')

    const lead = await buscarLead({ leadId, hotspotId, macAddress })

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: 'Lead nao encontrado para este hotspot' },
        { status: 404 }
      )
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('portal_ad_rotations')
      .select('id, lead_id, hotspot_id, anuncio_id, eligible_at, completed_at')
      .eq('id', adSessionId)
      .eq('lead_id', leadId)
      .eq('hotspot_id', hotspotId)
      .maybeSingle()

    if (sessionError) throw sessionError

    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Sessao de anuncio nao encontrada' },
        { status: 404 }
      )
    }

    const now = new Date()
    const eligibleAt = session.eligible_at ? new Date(session.eligible_at) : null

    if (eligibleAt && eligibleAt.getTime() > now.getTime()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Tempo obrigatorio do anuncio ainda nao foi cumprido',
          remainingSeconds: Math.ceil((eligibleAt.getTime() - now.getTime()) / 1000),
        },
        { status: 409 }
      )
    }

    if (!session.completed_at) {
      const { error: updateError } = await supabaseAdmin
        .from('portal_ad_rotations')
        .update({ completed_at: now.toISOString() })
        .eq('id', session.id)

      if (updateError) throw updateError
    }

    return NextResponse.json({
      ok: true,
      adSessionId: session.id,
      completedAt: session.completed_at || now.toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao concluir anuncio',
      },
      { status: error.status || 400 }
    )
  }
}
