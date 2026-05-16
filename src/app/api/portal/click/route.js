// src/app/api/portal/click/route.js
// ============================================================
// API segura para registrar CTA do anúncio.
// Agora registra também hotspot_id para relatórios por ponto.
// Registra copy, open e open_attempt sem expor a tabela ao público.
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
    const tipoAcao = limparTexto(body.tipoAcao || body.tipo_acao || 'open')
    const urlDestino = limparTexto(body.urlDestino || body.url_destino)

    if (!anuncioId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const tipoPermitido = ['copy', 'open', 'open_attempt']

    if (!tipoPermitido.includes(tipoAcao)) {
      throw new Error('tipoAcao inválido')
    }

    const hoje = new Date().toISOString().split('T')[0]

    let existingQuery = supabaseAdmin
      .from('anuncio_clicks')
      .select('id')
      .eq('anuncio_id', anuncioId)
      .eq('ip_address', ipAddress || '0.0.0.0')
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
