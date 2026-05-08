// src/app/api/admin/anuncios/upload-url/route.js
// ============================================================
// API administrativa segura para gerar URL assinada de upload.
// Assim o navegador não precisa de permissão pública de upload.
//
// Fluxo:
// 1. Front pede URL assinada.
// 2. API valida admin.
// 3. API valida permissão granular:
//    - criar anúncio: anuncios.create
//    - editar anúncio: anuncios.update
// 4. API cria signed upload URL com service_role.
// 5. Front envia o arquivo usando o token assinado.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const MIME_TYPES_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

const EXTENSOES_PERMITIDAS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp4',
  'webm',
  'mov',
]

// 30 MB por segurança. Depois podemos ajustar.
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024

function limparExtensao(filename = '') {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || 'bin'
  return ext.replace(/[^a-z0-9]/g, '') || 'bin'
}

function detectarTipoMidia(contentType = '') {
  if (String(contentType).startsWith('video/')) return 'video'
  return 'imagem'
}

function permissaoNegada() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Sem permissão para enviar mídia de anúncios',
    },
    { status: 403 }
  )
}

function validarArquivo({ filename, contentType, sizeBytes }) {
  const ext = limparExtensao(filename)

  if (!filename) return 'Nome do arquivo é obrigatório'

  if (!MIME_TYPES_PERMITIDOS.includes(contentType)) {
    return 'Tipo de arquivo não permitido. Envie imagem ou vídeo em formato aceito.'
  }

  if (!EXTENSOES_PERMITIDAS.includes(ext)) {
    return 'Extensão de arquivo não permitida.'
  }

  if (sizeBytes && Number(sizeBytes) > MAX_FILE_SIZE_BYTES) {
    return 'Arquivo muito grande. Limite máximo: 30MB.'
  }

  return ''
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
    const sizeBytes = Number(body.sizeBytes || 0)

    // mode pode ser:
    // - create: upload para novo anúncio
    // - update: upload para editar anúncio
    // Se não vier, mantém compatibilidade e aceita create OU update.
    const mode = String(body.mode || '').trim()

    if (mode === 'create' && !auth.canAccess('anuncios', 'create')) {
      return permissaoNegada()
    }

    if (mode === 'update' && !auth.canAccess('anuncios', 'update')) {
      return permissaoNegada()
    }

    if (!mode) {
      const podeCriar = auth.canAccess('anuncios', 'create')
      const podeEditar = auth.canAccess('anuncios', 'update')

      if (!podeCriar && !podeEditar) {
        return permissaoNegada()
      }
    }

    const erroValidacao = validarArquivo({
      filename,
      contentType,
      sizeBytes,
    })

    if (erroValidacao) {
      return NextResponse.json(
        {
          ok: false,
          error: erroValidacao,
        },
        { status: 400 }
      )
    }

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