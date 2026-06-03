import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLpConfig } from '@/lib/lp-generator-defaults'
import { buildLpAnalyticsMetadata } from '@/lib/lp-generator-analytics'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const LP_LEAD_RATE_LIMIT = {
  keyPrefix: 'lp-generator:lead',
  limit: 30,
  windowMs: 60_000,
}

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

function isMissingPlanLimitColumn(error) {
  const message = String(error?.message || '')
  return error?.code === '42703' || message.includes('max_leads_mes')
}

async function getLeadLimit(page) {
  if (!page?.cliente_id && !page?.empresa_id) return 0

  let query = supabaseAdmin
    .from('clientes')
    .select('id, empresa_id, planos(max_leads_mes)')
    .neq('status', 'Cancelado')
    .limit(1)

  if (page.cliente_id) query = query.eq('id', page.cliente_id)
  else query = query.eq('empresa_id', page.empresa_id)

  let { data, error } = await query.maybeSingle()

  if (isMissingPlanLimitColumn(error)) {
    const fallbackQuery = page.cliente_id
      ? supabaseAdmin.from('clientes').select('id, empresa_id, planos(id)').eq('id', page.cliente_id).limit(1)
      : supabaseAdmin.from('clientes').select('id, empresa_id, planos(id)').eq('empresa_id', page.empresa_id).limit(1)

    const retry = await fallbackQuery.maybeSingle()
    data = retry.data
    error = retry.error
  }

  if (error) throw error
  return Number(data?.planos?.max_leads_mes || 0)
}

async function countLeadsThisMonth(page) {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  let query = supabaseAdmin
    .from('lp_generator_leads')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart.toISOString())

  if (page.cliente_id) query = query.eq('cliente_id', page.cliente_id)
  else if (page.empresa_id) query = query.eq('empresa_id', page.empresa_id)
  else query = query.eq('page_id', page.id)

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

async function assertLeadLimit(page) {
  const maxLeadsMes = await getLeadLimit(page)

  if (!maxLeadsMes || maxLeadsMes <= 0) return

  const leadsMes = await countLeadsThisMonth(page)
  if (leadsMes >= maxLeadsMes) {
    throw new Error('Esta landing page atingiu o limite mensal de leads do plano. Entre em contato com a empresa anunciante.')
  }
}

export async function POST(request) {
  const rate = checkRateLimit(request, LP_LEAD_RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde alguns segundos e tente novamente.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        },
      }
    )
  }

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

    await assertLeadLimit(page)

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
          ...buildLpAnalyticsMetadata({ request, body }),
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
