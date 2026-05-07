// src/app/api/admin/configuracoes/upload-hero-url/route.js
// ============================================================
// API segura para gerar URL assinada de upload da imagem do Hero.
// Assim o navegador não precisa de permissão pública de upload.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const HERO_IMAGE_BUCKET = 'landing-assets'

function limparExtensao(filename = '') {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || 'png'
  return ext.replace(/[^a-z0-9]/g, '') || 'png'
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()

    const filename = String(body.filename || 'hero.png').trim()
    const ext = limparExtensao(filename)
    const path = `hero/hero-global-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabaseAdmin
      .storage
      .from(HERO_IMAGE_BUCKET)
      .createSignedUploadUrl(path)

    if (error) throw error

    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from(HERO_IMAGE_BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({
      ok: true,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao preparar upload da imagem',
      },
      { status: 500 }
    )
  }
}