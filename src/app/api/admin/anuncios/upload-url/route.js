// src/app/api/admin/anuncios/upload-url/route.js
// ============================================================
// API administrativa segura para gerar URL assinada de upload.
// Assim o navegador não precisa de permissão pública de upload.
// Fluxo:
// 1. Front pede URL assinada.
// 2. API valida admin.
// 3. API cria signed upload URL com service_role.
// 4. Front envia o arquivo usando o token assinado.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

function limparExtensao(filename = '') {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || 'bin'
  return ext.replace(/[^a-z0-9]/g, '') || 'bin'
}

function detectarTipoMidia(contentType = '') {
  if (String(contentType).startsWith('video/')) return 'video'
  return 'imagem'
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()

    const filename = String(body.filename || 'arquivo').trim()
    const contentType = String(body.contentType || '').trim()
    const ext = limparExtensao(filename)
    const tipoMedia = detectarTipoMidia(contentType)
    const path = `anuncios/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabaseAdmin
      .storage
      .from('anuncios')
      .createSignedUploadUrl(path)

    if (error) throw error

    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('anuncios')
      .getPublicUrl(path)

    return NextResponse.json({
      ok: true,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      tipoMedia,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao preparar upload',
      },
      { status: 500 }
    )
  }
}