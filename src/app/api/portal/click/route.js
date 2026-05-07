// src/app/api/portal/click/route.js
// ============================================================
// API segura para registrar CTA do anúncio.
// Registra copy, open e open_attempt sem expor a tabela ao público.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()

    const anuncioId = String(body.anuncioId || '').trim()
    const ipAddress = String(body.ipAddress || '').trim()
    const tipoAcao = String(body.tipoAcao || 'open').trim()
    const urlDestino = String(body.urlDestino || '').trim()

    if (!anuncioId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const tipoPermitido = ['copy', 'open', 'open_attempt']

    if (!tipoPermitido.includes(tipoAcao)) {
      throw new Error('tipoAcao inválido')
    }

    const hoje = new Date().toISOString().split('T')[0]

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('anuncio_clicks')
      .select('id')
      .eq('anuncio_id', anuncioId)
      .eq('ip_address', ipAddress || '0.0.0.0')
      .eq('tipo_acao', tipoAcao)
      .gte('timestamp', `${hoje}T00:00:00.000Z`)
      .limit(1)

    if (existingError) throw existingError

    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin
        .from('anuncio_clicks')
        .insert([{
          anuncio_id: anuncioId,
          ip_address: ipAddress || null,
          tipo_acao: tipoAcao,
          url_destino: urlDestino || null,
        }])

      if (error) throw error
    }

    return NextResponse.json({ ok: true })
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