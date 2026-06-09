import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const ETAPAS = [
  'novo_lead',
  'em_contato',
  'reuniao_agendada',
  'proposta_enviada',
  'negociacao',
  'cliente_fechado',
  'perdido',
]

const TEMPERATURAS = ['Frio', 'Morno', 'Quente']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function limparBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizarEtapa(value = '') {
  const etapa = limparTexto(value)
  return ETAPAS.includes(etapa) ? etapa : 'novo_lead'
}

function normalizarTemperatura(value = '') {
  const temperatura = limparTexto(value)
  return TEMPERATURAS.includes(temperatura) ? temperatura : 'Morno'
}

function calcularResumo(prospects = []) {
  const porEtapa = ETAPAS.reduce((acc, etapa) => {
    acc[etapa] = 0
    return acc
  }, {})

  prospects.forEach((prospect) => {
    const etapa = normalizarEtapa(prospect.etapa)
    porEtapa[etapa] = (porEtapa[etapa] || 0) + 1
  })

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite7Dias = new Date()
  limite7Dias.setDate(limite7Dias.getDate() + 7)
  limite7Dias.setHours(23, 59, 59, 999)

  const proximosContatos = prospects.filter((prospect) => {
    if (!prospect.proximo_contato) return false

    const data = new Date(`${prospect.proximo_contato}T00:00:00`)
    return data >= hoje && data <= limite7Dias
  }).length

  const valorPotencial = prospects.reduce((acc, prospect) => {
    return acc + Number(prospect.valor_potencial || 0)
  }, 0)

  return {
    total: prospects.length,
    novos: porEtapa.novo_lead || 0,
    emContato: porEtapa.em_contato || 0,
    propostas: porEtapa.proposta_enviada || 0,
    negociacao: porEtapa.negociacao || 0,
    fechados: porEtapa.cliente_fechado || 0,
    perdidos: porEtapa.perdido || 0,
    proximosContatos,
    valorPotencial,
    porEtapa,
  }
}

function montarPayload(body = {}) {
  return {
    empresa: limparTexto(body.empresa),
    responsavel: limparTexto(body.responsavel) || null,
    email: limparTexto(body.email).toLowerCase() || null,
    telefone: limparTexto(body.telefone) || null,
    cidade: limparTexto(body.cidade) || null,
    segmento: limparTexto(body.segmento) || null,
    origem: limparTexto(body.origem) || 'Manual',
    etapa: normalizarEtapa(body.etapa),
    temperatura: normalizarTemperatura(body.temperatura),
    valor_potencial:
      body.valor_potencial === '' || body.valor_potencial == null
        ? null
        : Number(body.valor_potencial),
    proximo_contato: limparTexto(body.proximo_contato) || null,
    observacoes: limparTexto(body.observacoes) || null,
    responsavel_interno: limparTexto(body.responsavel_interno) || null,
    updated_at: new Date().toISOString(),
  }
}

function validarPayload(payload) {
  if (!payload.empresa) return 'Nome da empresa é obrigatório'

  if (!payload.email && !payload.telefone) {
    return 'Informe pelo menos telefone ou e-mail do prospect'
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'E-mail inválido'
  }

  return ''
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'clientes',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)

    const etapa = limparTexto(searchParams.get('etapa') || '')
    const temperatura = limparTexto(searchParams.get('temperatura') || '')
    const origem = limparTexto(searchParams.get('origem') || '')
    const busca = limparBusca(searchParams.get('busca') || '')

    let query = supabaseAdmin
      .from('crm_prospects')
      .select('*')
      .order('created_at', { ascending: false })

    if (etapa && ETAPAS.includes(etapa)) {
      query = query.eq('etapa', etapa)
    }

    if (temperatura && TEMPERATURAS.includes(temperatura)) {
      query = query.eq('temperatura', temperatura)
    }

    if (origem) {
      query = query.ilike('origem', `%${origem}%`)
    }

    if (busca) {
      query = query.or(
        `empresa.ilike.%${busca}%,responsavel.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%,cidade.ilike.%${busca}%,segmento.ilike.%${busca}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    const prospects = (data || []).map((prospect) => ({
      ...prospect,
      etapa: normalizarEtapa(prospect.etapa),
      temperatura: normalizarTemperatura(prospect.temperatura),
      origem: prospect.origem || 'Manual',
    }))

    const origens = [
      ...new Set(
        prospects
          .map((prospect) => prospect.origem)
          .filter(Boolean)
      ),
    ].sort()

    return NextResponse.json({
      ok: true,
      prospects,
      resumo: calcularResumo(prospects),
      filtros: {
        etapa,
        temperatura,
        origem,
        busca,
      },
      options: {
        etapas: ETAPAS,
        temperaturas: TEMPERATURAS,
        origens,
      },
      permissions: auth.permissions?.clientes || {},
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar prospects' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'clientes',
    action: 'create',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const payload = montarPayload(body)

    const erro = validarPayload(payload)

    if (erro) {
      return NextResponse.json({ ok: false, error: erro }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('crm_prospects')
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select('*')
      .single()

    if (error) throw error

    await logAdminAction({
      request,
      adminUser: auth.adminUser,
      action: 'crm_prospect_criado',
      entity: 'crm_prospects',
      entityId: data.id,
      description: `Prospect ${data.empresa || data.id} criado no CRM.`,
      metadata: { after: data },
    })

    return NextResponse.json({
      ok: true,
      prospect: data,
      message: 'Prospect criado com sucesso',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao criar prospect' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin(request, {
    module: 'clientes',
    action: 'update',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const id = limparTexto(body.id || body.prospectId || '')

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID do prospect é obrigatório' },
        { status: 400 }
      )
    }

    const { data: prospectAtual, error: findError } = await supabaseAdmin
      .from('crm_prospects')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError) throw findError

    if (!prospectAtual) {
      return NextResponse.json(
        { ok: false, error: 'Prospect nao encontrado.' },
        { status: 404 }
      )
    }

    const payload = montarPayload(body)
    const erro = validarPayload(payload)

    if (erro) {
      return NextResponse.json({ ok: false, error: erro }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('crm_prospects')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    await logAdminAction({
      request,
      adminUser: auth.adminUser,
      action: 'crm_prospect_atualizado',
      entity: 'crm_prospects',
      entityId: id,
      description: `Prospect ${data.empresa || id} atualizado no CRM.`,
      metadata: { before: prospectAtual, after: data },
    })

    return NextResponse.json({
      ok: true,
      prospect: data,
      message: 'Prospect atualizado com sucesso',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar prospect' },
      { status: 500 }
    )
  }
}
