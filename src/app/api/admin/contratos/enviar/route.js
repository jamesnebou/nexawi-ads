import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email-service'
import { renderNexawiContractHtml } from '@/lib/nexawi-contract-generator'
import { buildContractPdfAttachment } from '@/lib/contract-pdf-generator'

export const runtime = 'nodejs'

const NEXAWI_EMAIL = 'contato@nexawi.com.br'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function limparUuid(value = '') {
  const text = limparTexto(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

function erro(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTitulo(fields = {}) {
  const nome = fields?.contratante?.nome_razao_social || 'Cliente'
  const plano = fields?.plano?.nome || 'Plano NexaWi'
  return `Contrato NexaWi — ${nome} — ${plano}`
}

function getClienteEmail(fields = {}) {
  return limparTexto(fields?.contratante?.email || '')
}

function buildEmailHtml({ fields, contractHtml, destinatarioTipo = 'cliente' }) {
  const nomeCliente = escapeHtml(fields?.contratante?.nome_razao_social || 'Cliente NexaWi')
  const plano = escapeHtml(fields?.plano?.nome || 'Plano NexaWi')
  const intro = destinatarioTipo === 'nexawi'
    ? `Segue uma cópia interna do contrato gerado para ${nomeCliente}. O PDF também está anexado a este e-mail.`
    : `Segue a minuta do contrato NexaWi referente ao plano ${plano}. O PDF também está anexado a este e-mail.`

  return `
    <div style="font-family: Arial, sans-serif; background:#050505; color:#ffffff; padding:28px;">
      <div style="max-width:860px; margin:0 auto; background:#0a0a0a; border:1px solid rgba(255,255,255,0.08); border-radius:22px; overflow:hidden;">
        <div style="padding:28px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#6be12f; font-weight:bold; margin-bottom:12px;">
            NexaWi ADS / NexaWi Wi-Fi
          </div>
          <h1 style="margin:0 0 12px; color:#ffffff; font-size:24px;">
            Contrato NexaWi
          </h1>
          <p style="margin:0; color:#cfcfcf; font-size:15px; line-height:1.6;">
            ${intro}
          </p>
          <p style="margin:16px 0 0; color:#888; font-size:13px; line-height:1.5;">
            Revise as informações antes da assinatura. Em caso de dúvidas, responda este e-mail.
          </p>
        </div>

        <div style="background:#ffffff; color:#111111; padding:28px;">
          <style>
            .contract-document { font-family: Arial, sans-serif; color: #111; line-height: 1.55; font-size: 13px; }
            .contract-document h1 { font-size: 20px; text-align: center; margin: 0 0 18px; }
            .contract-document h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .contract-document p { margin: 8px 0; }
            .contract-document .muted { color: #555; text-align: center; }
            .contract-document table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            .contract-document th, .contract-document td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            .contract-document th { width: 32%; background: #f5f5f5; }
            .contract-document .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }
          </style>
          ${contractHtml}
        </div>

        <div style="padding:22px 28px; color:#777; font-size:12px; line-height:1.5;">
          E-mail enviado automaticamente pelo sistema NexaWi ADS. Uma cópia em PDF segue anexada.
        </div>
      </div>
    </div>
  `
}

async function validarEscopo({ auth, empresaId = '', clienteId = '' }) {
  if (auth.isMaster) return true

  if (empresaId && auth.allowedEmpresaIds?.includes(empresaId)) return true

  if (clienteId) {
    let query = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id')
      .eq('id', clienteId)

    query = auth.applyEmpresaScope(query)

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (data?.id) return true
  }

  return false
}

async function carregarContrato(id, auth) {
  const contratoId = limparUuid(id)
  if (!contratoId) return null

  let query = supabaseAdmin
    .from('empresa_contratos')
    .select('*')
    .eq('id', contratoId)

  if (!auth.isMaster) {
    if (auth.allowedEmpresaIds?.length) {
      query = query.in('empresa_id', auth.allowedEmpresaIds)
    } else {
      query = query.eq('empresa_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

async function salvarContratoAntesDeEnviar({ auth, body, fields, html }) {
  const empresaId = limparUuid(body.empresa_id || fields?.meta?.empresa_id)
  const clienteId = limparUuid(body.cliente_id || fields?.meta?.cliente_id)

  const permitido = await validarEscopo({ auth, empresaId, clienteId })
  if (!permitido) {
    throw new Error('Contrato fora do escopo permitido para este usuário.')
  }

  const payload = {
    empresa_id: empresaId || null,
    cliente_id: clienteId || null,
    source: limparTexto(body.source || fields?.meta?.source || 'empresa'),
    status: 'gerado',
    titulo: limparTexto(body.titulo || getTitulo(fields)),
    template_version: limparTexto(fields?.meta?.template_version || 'nexawi-contract-v1'),
    contrato_numero: limparTexto(body.contrato_numero || ''),
    fields_json: fields,
    html_rendered: html,
    cliente_email: getClienteEmail(fields),
    nexawi_email: NEXAWI_EMAIL,
    updated_by: auth.user?.id || null,
  }

  if (auth.user?.id) payload.created_by = auth.user.id

  if (body.id) {
    const contratoId = limparUuid(body.id)
    if (!contratoId) throw new Error('ID do contrato inválido.')

    const { data, error } = await supabaseAdmin
      .from('empresa_contratos')
      .update(payload)
      .eq('id', contratoId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    return data
  }

  const { data, error } = await supabaseAdmin
    .from('empresa_contratos')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'update',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    let contrato = null
    let fields = body.fields || null
    let html = body.html || ''

    if (body.id && !fields) {
      contrato = await carregarContrato(body.id, auth)
      if (!contrato) return erro('Contrato não encontrado ou fora do escopo permitido.', 404)
      fields = contrato.fields_json
      html = contrato.html_rendered || renderNexawiContractHtml(fields)
    }

    if (!fields || typeof fields !== 'object') {
      return erro('Dados do contrato são obrigatórios para envio.')
    }

    if (!html) {
      html = renderNexawiContractHtml(fields)
    }

    if (!contrato) {
      contrato = await salvarContratoAntesDeEnviar({ auth, body, fields, html })
    }

    const clienteEmail = limparTexto(body.cliente_email || contrato?.cliente_email || getClienteEmail(fields))
    const nexawiEmail = limparTexto(body.nexawi_email || contrato?.nexawi_email || NEXAWI_EMAIL)

    if (!clienteEmail) {
      return erro('O contrato não possui e-mail do cliente. Preencha o e-mail antes de enviar.')
    }

    const subject = limparTexto(body.subject || `Contrato NexaWi — ${fields?.contratante?.nome_razao_social || 'Cliente'}`)
    const text = `${subject}\n\n${stripHtml(html)}\n\nNexaWi ADS / NexaWi Wi-Fi`
    const pdfAttachment = buildContractPdfAttachment({ fields, html, title: subject })

    const [clienteResult, nexawiResult] = await Promise.all([
      sendEmail({
        to: clienteEmail,
        subject,
        text,
        html: buildEmailHtml({ fields, contractHtml: html, destinatarioTipo: 'cliente' }),
        attachments: [pdfAttachment],
      }),
      sendEmail({
        to: nexawiEmail,
        subject: `[CÓPIA INTERNA] ${subject}`,
        text,
        html: buildEmailHtml({ fields, contractHtml: html, destinatarioTipo: 'nexawi' }),
        attachments: [pdfAttachment],
      }),
    ])

    const now = new Date().toISOString()
    const updates = {
      status: clienteResult.ok && nexawiResult.ok ? 'enviado' : 'envio_pendente',
      sent_to_cliente_at: clienteResult.ok ? now : null,
      sent_to_nexawi_at: nexawiResult.ok ? now : null,
      cliente_email: clienteEmail,
      nexawi_email: nexawiEmail,
      updated_by: auth.user?.id || null,
    }

    const { data: contratoAtualizado, error: updateError } = await supabaseAdmin
      .from('empresa_contratos')
      .update(updates)
      .eq('id', contrato.id)
      .select('id, empresa_id, cliente_id, status, titulo, cliente_email, nexawi_email, sent_to_cliente_at, sent_to_nexawi_at, created_at, updated_at')
      .maybeSingle()

    if (updateError) throw updateError

    return NextResponse.json({
      ok: clienteResult.ok && nexawiResult.ok,
      contrato: contratoAtualizado,
      envio: {
        cliente: clienteResult,
        nexawi: nexawiResult,
        pdf: {
          attached: true,
          filename: pdfAttachment.filename,
        },
      },
      message:
        clienteResult.ok && nexawiResult.ok
          ? 'Contrato enviado para o cliente e para a NexaWi com PDF anexado.'
          : 'O contrato foi salvo, mas um ou mais e-mails não foram enviados. Verifique a configuração SMTP.',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao enviar contrato.' },
      { status: 500 }
    )
  }
}
