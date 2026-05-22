import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLpConfig } from '@/lib/lp-generator-defaults'

export const runtime = 'nodejs'

function cleanText(value = '') {
  return String(value || '').trim()
}

function getConfiguredCustomFields(fields = []) {
  return fields
    .filter((field) => cleanText(field?.rotulo))
    .slice(0, 8)
    .map((field, index) => ({
      id: cleanText(field.id) || `campo-${index + 1}`,
      rotulo: cleanText(field.rotulo),
      obrigatorio: Boolean(field.obrigatorio),
    }))
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

    const { data: page, error: pageError } = await supabaseAdmin
      .from('lp_generator_pages')
      .select('id, slug, status, cliente_id, empresa_id, config')
      .eq('slug', pageSlug)
      .eq('status', 'published')
      .maybeSingle()

    if (pageError) throw pageError

    if (!page) {
      return NextResponse.json({ ok: false, error: 'LP nao encontrada ou indisponivel' }, { status: 404 })
    }

    const config = getLpConfig(page.config || {})
    const formFields = config.formulario.campos || {}
    const standardValues = { nome, email, telefone, mensagem }
    const standardLabels = {
      nome: 'Nome',
      email: 'E-mail',
      telefone: 'Telefone',
      mensagem: 'Mensagem',
    }

    for (const fieldId of Object.keys(standardValues)) {
      if (formFields[fieldId]?.ativo && formFields[fieldId]?.obrigatorio && !standardValues[fieldId]) {
        return NextResponse.json(
          { ok: false, error: `${formFields[fieldId].rotulo || standardLabels[fieldId]} e obrigatorio` },
          { status: 400 }
        )
      }
    }

    const incomingCustomFields = body.camposExtras && typeof body.camposExtras === 'object'
      ? body.camposExtras
      : {}
    const customFields = getConfiguredCustomFields(config.formulario.camposExtras)
    const customAnswers = customFields.map((field) => ({
      id: field.id,
      rotulo: field.rotulo,
      valor: cleanText(incomingCustomFields[field.id]),
    }))

    const missingCustomField = customFields.find((field) => (
      field.obrigatorio && !customAnswers.find((answer) => answer.id === field.id)?.valor
    ))

    if (missingCustomField) {
      return NextResponse.json(
        { ok: false, error: `${missingCustomField.rotulo} e obrigatorio` },
        { status: 400 }
      )
    }

    const activeStandardValues = Object.entries(standardValues)
      .filter(([fieldId]) => formFields[fieldId]?.ativo)
      .map(([, value]) => value)
    const hasAnyAnswer = [...activeStandardValues, ...customAnswers.map((field) => field.valor)]
      .some((value) => cleanText(value))

    if (!hasAnyAnswer) {
      return NextResponse.json({ ok: false, error: 'Preencha ao menos um campo do formulario' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('lp_generator_leads')
      .insert([{
        page_id: page.id,
        cliente_id: page.cliente_id || null,
        empresa_id: page.empresa_id || null,
        page_slug: pageSlug,
        nome: formFields.nome?.ativo ? nome || null : null,
        email: formFields.email?.ativo ? email || null : null,
        telefone: formFields.telefone?.ativo ? telefone || null : null,
        mensagem: formFields.mensagem?.ativo ? mensagem || null : null,
        metadata: {
          user_agent: request.headers.get('user-agent') || '',
          referer: request.headers.get('referer') || '',
          custom_fields: customAnswers.filter((field) => field.valor),
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
