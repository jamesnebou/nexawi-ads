import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function limparTelefone(value = '') {
  return String(value || '').replace(/\D/g, '').slice(0, 15)
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
}

function validarEmail(email = '') {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))

    // Honeypot: se vier preenchido, provavelmente é bot.
    if (limparTexto(body.website || body.site || body.company_site)) {
      return NextResponse.json({ ok: true })
    }

    const empresa = limparTexto(body.empresa || body.nome_empresa)
    const responsavel = limparTexto(body.responsavel || body.nome)
    const email = limparTexto(body.email).toLowerCase()
    const telefone = limparTelefone(body.telefone || body.whatsapp)
    const cidade = limparTexto(body.cidade)
    const segmento = limparTexto(body.segmento)
    const observacoes = limparTexto(body.mensagem || body.observacoes)

    if (!empresa) {
      return NextResponse.json(
        { ok: false, error: 'Nome da empresa é obrigatório' },
        { status: 400 }
      )
    }

    if (!telefone && !email) {
      return NextResponse.json(
        { ok: false, error: 'Informe telefone ou e-mail para contato' },
        { status: 400 }
      )
    }

    if (!validarEmail(email)) {
      return NextResponse.json(
        { ok: false, error: 'E-mail inválido' },
        { status: 400 }
      )
    }

    const ip = getClientIp(request)

    const payload = {
      empresa,
      responsavel: responsavel || null,
      email: email || null,
      telefone: telefone || null,
      cidade: cidade || null,
      segmento: segmento || null,
      origem: 'Landing Page',
      etapa: 'novo_lead',
      temperatura: 'Quente',
      valor_potencial: null,
      proximo_contato: null,
      observacoes: [
        observacoes,
        ip ? `IP origem: ${ip}` : '',
      ].filter(Boolean).join('\n'),
      responsavel_interno: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('crm_prospects')
      .insert([payload])
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      prospectId: data.id,
      message: 'Interesse registrado com sucesso',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao registrar interesse',
      },
      { status: 500 }
    )
  }
}
