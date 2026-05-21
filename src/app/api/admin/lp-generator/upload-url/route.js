import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { slugifyLp } from '@/lib/lp-generator-defaults'

export const runtime = 'nodejs'

const BUCKET = 'landing-assets'
const MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function cleanExt(filename = '') {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || 'png'
  return ext.replace(/[^a-z0-9]/g, '') || 'png'
}

function validateFile({ filename, contentType, sizeBytes }) {
  const ext = cleanExt(filename)

  if (!filename) return 'Nome do arquivo e obrigatorio'
  if (!MIME_TYPES.includes(contentType)) return 'Envie uma imagem JPG, PNG, WEBP ou GIF.'
  if (!EXTENSIONS.includes(ext)) return 'Extensao de imagem nao permitida.'
  if (sizeBytes && Number(sizeBytes) > MAX_FILE_SIZE_BYTES) return 'Imagem muito grande. Limite maximo: 10MB.'

  return ''
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) return auth.errorResponse
  if (!auth.canAccess('configuracoes', 'update') && !auth.isMaster) {
    return NextResponse.json({ ok: false, error: 'Sem permissao para enviar imagens de LP' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const filename = String(body.filename || 'imagem.png').trim()
    const contentType = String(body.contentType || '').trim()
    const sizeBytes = Number(body.sizeBytes || 0)
    const lpSlug = slugifyLp(body.slug || body.lpSlug || 'lp')
    const field = slugifyLp(body.field || 'imagem')

    const errorMessage = validateFile({ filename, contentType, sizeBytes })
    if (errorMessage) {
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 400 })
    }

    const ext = cleanExt(filename)
    const path = `lp-generator/${lpSlug}/${field}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (error) throw error

    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from(BUCKET)
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
      { ok: false, error: error.message || 'Erro ao preparar upload da imagem da LP' },
      { status: 500 }
    )
  }
}
