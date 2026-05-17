import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAdminAlertEmail } from '@/lib/email-service'

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

function limparValor(value = '') {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
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
    const planoInteresse = limparTexto(body.plano_interesse || body.plano)
    const planoId = limparTexto(body.plano_id)
    const cicloInteresse = limparTexto(body.ciclo_interesse || body.ciclo)
    const valorPotencial = limparValor(body.valor_potencial || body.valor)

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
      valor_potencial: valorPotencial,
      proximo_contato: null,
      observacoes: [
        planoInteresse ? `Plano de interesse: ${planoInteresse}` : '',
        cicloInteresse ? `Ciclo: ${cicloInteresse}` : '',
        valorPotencial !== null ? `Valor potencial: ${formatCurrency(valorPotencial)}` : '',
        planoId ? `Plano ID: ${planoId}` : '',
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

    const emailResult = await sendAdminAlertEmail({
      title: 'Novo lead da landing',
      severity: 'warning',
      actionUrl: '/dashboard/crm-clientes',
      message: [
        `Empresa: ${empresa}`,
        responsavel ? `Responsavel: ${responsavel}` : '',
        telefone ? `Telefone/WhatsApp: ${telefone}` : '',
        email ? `E-mail: ${email}` : '',
        cidade ? `Cidade: ${cidade}` : '',
        segmento ? `Segmento: ${segmento}` : '',
        planoInteresse ? `Plano de interesse: ${planoInteresse}` : '',
        cicloInteresse ? `Ciclo: ${cicloInteresse}` : '',
        valorPotencial !== null ? `Valor potencial: ${formatCurrency(valorPotencial)}` : '',
      ].filter(Boolean).join('\n'),
    })

    return NextResponse.json({
      ok: true,
      prospectId: data.id,
      emailSent: Boolean(emailResult?.ok),
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
