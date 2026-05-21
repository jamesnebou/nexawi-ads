import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

export async function POST(request) {
  try {
    const body = await request.json()
    const pageSlug = cleanText(body.pageSlug)
    const nome = cleanText(body.nome)
    const email = cleanText(body.email)
    const telefone = cleanText(body.telefone)
    const mensagem = cleanText(body.mensagem)

    if (!pageSlug) {
      return NextResponse.json({ ok: false, error: 'LP nao identificada' }, { status: 400 })
    }

    if (!nome || !telefone) {
      return NextResponse.json({ ok: false, error: 'Nome e telefone sao obrigatorios' }, { status: 400 })
    }

    const { data: page, error: pageError } = await supabaseAdmin
      .from('lp_generator_pages')
      .select('id, slug, status')
      .eq('slug', pageSlug)
      .eq('status', 'published')
      .maybeSingle()

    if (pageError) throw pageError

    if (!page) {
      return NextResponse.json({ ok: false, error: 'LP nao encontrada ou indisponivel' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('lp_generator_leads')
      .insert([{
        page_id: page.id,
        page_slug: pageSlug,
        nome,
        email: email || null,
        telefone,
        mensagem: mensagem || null,
        metadata: {
          user_agent: request.headers.get('user-agent') || '',
          referer: request.headers.get('referer') || '',
        },
      }])

    if (error) throw error

    return NextResponse.json({
      ok: true,
      message: 'Interesse enviado com sucesso.',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao enviar interesse' },
      { status: 500 }
    )
  }
}
