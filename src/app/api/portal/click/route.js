// src/app/api/portal/click/route.js
// ============================================================
// API segura para registrar CTA do anúncio.
// Registra hotspot_id para relatórios por ponto.
// Segurança:
// - Não confia no IP enviado pelo navegador.
// - Valida se anúncio pertence ao hotspot informado.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:click',
  limit: 80,
  windowMs: 60_000,
}

function limparTexto(value = '') {
  return String(value || '').trim()
}

function getClientIp(request, fallback = '') {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const realIp = request.headers.get('x-real-ip') || ''

  return limparTexto(forwarded.split(',')[0] || realIp || fallback || '0.0.0.0')
}

function aplicarFiltroHotspot(query, hotspotId) {
  if (hotspotId) {
    return query.eq('hotspot_id', hotspotId)
  }

  return query.is('hotspot_id', null)
}

async function validarVinculoAnuncioHotspot({ anuncioId, hotspotId }) {
  if (!hotspotId) return true

  const { data, error } = await supabaseAdmin
    .from('anuncio_hotspots')
    .select('anuncio_id, hotspot_id')
    .eq('anuncio_id', anuncioId)
    .eq('hotspot_id', hotspotId)
    .limit(1)

  if (error) throw error

  return Boolean(data && data.length > 0)
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: true, rateLimited: true })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const anuncioId = limparTexto(body.anuncioId || body.anuncio_id)
    const hotspotId = limparTexto(body.hotspotId || body.hotspot_id)
    const ipAddress = getClientIp(request, body.ipAddress || body.ip_address)
    const tipoAcao = limparTexto(body.tipoAcao || body.tipo_acao || 'open')
    const urlDestino = limparTexto(body.urlDestino || body.url_destino)

    if (!anuncioId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const tipoPermitido = ['copy', 'open', 'open_attempt']

    if (!tipoPermitido.includes(tipoAcao)) {
      throw new Error('tipoAcao inválido')
    }

    const vinculoValido = await validarVinculoAnuncioHotspot({
      anuncioId,
      hotspotId,
    })

    if (!vinculoValido) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Anúncio não vinculado ao hotspot informado',
        },
        { status: 400 }
      )
    }

    const hoje = new Date().toISOString().split('T')[0]

    let existingQuery = supabaseAdmin
      .from('anuncio_clicks')
      .select('id')
      .eq('anuncio_id', anuncioId)
      .eq('ip_address', ipAddress)
      .eq('tipo_acao', tipoAcao)
      .gte('timestamp', `${hoje}T00:00:00.000Z`)
      .limit(1)

    existingQuery = aplicarFiltroHotspot(existingQuery, hotspotId)

    const { data: existing, error: existingError } = await existingQuery

    if (existingError) throw existingError

    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin
        .from('anuncio_clicks')
        .insert([{
          anuncio_id: anuncioId,
          hotspot_id: hotspotId || null,
          ip_address: ipAddress || null,
          tipo_acao: tipoAcao,
          url_destino: urlDestino || null,
        }])

      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      hotspotId: hotspotId || null,
      tipoAcao,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao registrar clique',
      },
      { status: 500 }
    )
  }
}
