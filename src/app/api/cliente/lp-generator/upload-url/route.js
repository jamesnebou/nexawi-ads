import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { slugifyLp } from '@/lib/lp-generator-defaults'

export const runtime = 'nodejs'

const BUCKET = 'landing-assets'
const MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function cleanText(value = '') {
  return String(value || '').trim()
}

function cleanExt(filename = '') {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || 'png'
  return ext.replace(/[^a-z0-9]/g, '') || 'png'
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

function validateFile({ filename, contentType, sizeBytes }) {
  const ext = cleanExt(filename)

  if (!filename) return 'Nome do arquivo e obrigatorio'
  if (!MIME_TYPES.includes(contentType)) return 'Envie uma imagem JPG, PNG, WEBP ou GIF.'
  if (!EXTENSIONS.includes(ext)) return 'Extensao de imagem nao permitida.'
  if (sizeBytes && Number(sizeBytes) > MAX_FILE_SIZE_BYTES) return 'Imagem muito grande. Limite maximo: 10MB.'

  return ''
}

function aplicarEscopoCliente(query, { clienteId, empresaId }) {
  if (empresaId && clienteId) {
    return query.or(`empresa_id.eq.${empresaId},cliente_id.eq.${clienteId}`)
  }

  if (empresaId) return query.eq('empresa_id', empresaId)
  return query.eq('cliente_id', clienteId)
}

export async function POST(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const pageId = cleanText(body.pageId || body.id)
    const filename = cleanText(body.filename || 'imagem.png')
    const contentType = cleanText(body.contentType)
    const sizeBytes = Number(body.sizeBytes || 0)

    if (!isValidUuid(pageId)) {
      return NextResponse.json({ ok: false, error: 'ID da LP e obrigatorio para upload' }, { status: 400 })
    }

    const errorMessage = validateFile({ filename, contentType, sizeBytes })
    if (errorMessage) {
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 400 })
    }

    let pageQuery = supabaseAdmin
      .from('lp_generator_pages')
      .select('id, slug')
      .eq('id', pageId)
      .neq('status', 'archived')

    pageQuery = aplicarEscopoCliente(pageQuery, {
      clienteId: auth.cliente.id,
      empresaId: auth.empresaId,
    })

    const { data: page, error: pageError } = await pageQuery.maybeSingle()
    if (pageError) throw pageError

    if (!page) {
      return NextResponse.json({ ok: false, error: 'LP nao encontrada para este cliente' }, { status: 404 })
    }

    const lpSlug = slugifyLp(page.slug || body.slug || 'lp')
    const field = slugifyLp(body.field || 'imagem')
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
