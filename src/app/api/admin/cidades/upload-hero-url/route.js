// src/app/api/admin/cidades/upload-hero-url/route.js
// ============================================================
// API segura para gerar URL assinada de upload da imagem do Hero
// das landing pages por cidade.
//
// Permissão aplicada:
// - configuracoes.update
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const HERO_IMAGE_BUCKET = 'landing-assets'

const MIME_TYPES_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

const EXTENSOES_PERMITIDAS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
]

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function limparExtensao(filename = '') {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || 'png'
  return ext.replace(/[^a-z0-9]/g, '') || 'png'
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function permissaoNegada() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Sem permissão para enviar imagem de cidade',
    },
    { status: 403 }
  )
}

function validarArquivo({ filename, contentType, sizeBytes }) {
  const ext = limparExtensao(filename)

  if (!filename) return 'Nome do arquivo é obrigatório'

  if (!MIME_TYPES_PERMITIDOS.includes(contentType)) {
    return 'Tipo de arquivo não permitido. Envie uma imagem JPG, PNG, WEBP ou GIF.'
  }

  if (!EXTENSOES_PERMITIDAS.includes(ext)) {
    return 'Extensão de arquivo não permitida.'
  }

  if (sizeBytes && Number(sizeBytes) > MAX_FILE_SIZE_BYTES) {
    return 'Arquivo muito grande. Limite máximo: 10MB.'
  }

  return ''
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  if (!auth.canAccess('configuracoes', 'update')) {
    return permissaoNegada()
  }

  try {
    const body = await request.json()

    const filename = String(body.filename || 'hero.png').trim()
    const contentType = String(body.contentType || '').trim()
    const sizeBytes = Number(body.sizeBytes || 0)
    const cidadeSlug = slugify(body.slug || body.cidade_nome || 'cidade')

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

    const path = `cidades/${cidadeSlug}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`

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
        error: error.message || 'Erro ao preparar upload da imagem da cidade',
      },
      { status: 500 }
    )
  }
}