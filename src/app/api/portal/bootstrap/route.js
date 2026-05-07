// src/app/api/portal/bootstrap/route.js
// ============================================================
// API pública segura para carregar o portal.
// Ela devolve apenas dados mínimos do hotspot e anúncios ativos.
// O navegador não consulta mais as tabelas diretamente.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function sanitizeSlug(value = '') {
  return String(value || '').trim()
}

export async function POST(request) {
  try {
    const body = await request.json()
    const slug = sanitizeSlug(body.slug)

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: 'slug é obrigatório' },
        { status: 400 }
      )
    }

    // Busca o hotspot por slug.
    let { data: hotspot, error: hotspotError } = await supabaseAdmin
      .from('hotspots')
      .select('id, nome, slug, status')
      .eq('slug', slug)
      .maybeSingle()

    if (hotspotError) throw hotspotError

    // Fallback: busca por nome, porque seu sistema já usa essa lógica.
    if (!hotspot) {
      const result = await supabaseAdmin
        .from('hotspots')
        .select('id, nome, slug, status')
        .eq('nome', slug)
        .maybeSingle()

      if (result.error) throw result.error
      hotspot = result.data
    }

    if (!hotspot || hotspot.status !== 'Ativo') {
      return NextResponse.json(
        { ok: false, error: 'Hotspot não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Busca vínculos de anúncios para este hotspot.
    const { data: vinculos, error: vinculosError } = await supabaseAdmin
      .from('anuncio_hotspots')
      .select('anuncio_id')
      .eq('hotspot_id', hotspot.id)

    if (vinculosError) throw vinculosError

    const anuncioIds = (vinculos || [])
      .map((v) => v.anuncio_id)
      .filter(Boolean)

    let anuncios = []

    if (anuncioIds.length > 0) {
      const { data: anunciosData, error: anunciosError } = await supabaseAdmin
        .from('anuncios')
        .select(`
          id,
          titulo,
          descricao,
          url_destino,
          duracao_segundos,
          ativo,
          media_url,
          tipo_media
        `)
        .in('id', anuncioIds)
        .eq('ativo', true)

      if (anunciosError) throw anunciosError
      anuncios = anunciosData || []
    }

    return NextResponse.json({
      ok: true,
      hotspot,
      anuncios,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar portal',
      },
      { status: 500 }
    )
  }
}