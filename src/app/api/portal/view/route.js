// src/app/api/portal/view/route.js
// ============================================================
// API segura para registrar visualização de anúncio.
// Agora registra também hotspot_id para relatórios por ponto.
// Mantém compatibilidade com portais antigos sem hotspotId.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function aplicarFiltroHotspot(query, hotspotId) {
  if (hotspotId) {
    return query.eq('hotspot_id', hotspotId)
  }

  return query.is('hotspot_id', null)
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))

    const anuncioId = limparTexto(body.anuncioId || body.anuncio_id)
    const hotspotId = limparTexto(body.hotspotId || body.hotspot_id)
    const ipAddress = limparTexto(body.ipAddress || body.ip_address)

    if (!anuncioId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const hoje = new Date().toISOString().split('T')[0]

    let existingQuery = supabaseAdmin
      .from('anuncio_views')
      .select('id')
      .eq('anuncio_id', anuncioId)
      .eq('ip_address', ipAddress || '0.0.0.0')
      .gte('timestamp', `${hoje}T00:00:00.000Z`)
      .limit(1)

    existingQuery = aplicarFiltroHotspot(existingQuery, hotspotId)

    const { data: existing, error: existingError } = await existingQuery

    if (existingError) throw existingError

    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin
        .from('anuncio_views')
        .insert([{
          anuncio_id: anuncioId,
          hotspot_id: hotspotId || null,
          ip_address: ipAddress || null,
        }])

      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      hotspotId: hotspotId || null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao registrar visualização',
      },
      { status: 500 }
    )
  }
}
