// src/app/api/portal/view/route.js
// ============================================================
// API segura para registrar visualização de anúncio.
// Evita que o navegador precise consultar/inserir direto na tabela.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()

    const anuncioId = String(body.anuncioId || '').trim()
    const ipAddress = String(body.ipAddress || '').trim()

    if (!anuncioId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const hoje = new Date().toISOString().split('T')[0]

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('anuncio_views')
      .select('id')
      .eq('anuncio_id', anuncioId)
      .eq('ip_address', ipAddress || '0.0.0.0')
      .gte('timestamp', `${hoje}T00:00:00.000Z`)
      .limit(1)

    if (existingError) throw existingError

    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin
        .from('anuncio_views')
        .insert([{
          anuncio_id: anuncioId,
          ip_address: ipAddress || null,
        }])

      if (error) throw error
    }

    return NextResponse.json({ ok: true })
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