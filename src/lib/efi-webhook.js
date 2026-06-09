import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit-log'
import { createAdminNotification } from '@/lib/admin-notifications'
import { markWifiPixEfiPaymentStatus } from '@/lib/wifi-pix'

const MAX_WEBHOOK_BODY_BYTES = 256 * 1024
const WEBHOOK_RATE_LIMIT = {
  keyPrefix: 'webhook:efi',
  limit: 180,
  windowMs: 60_000,
}

function secureCompare(a = '', b = '') {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function isAuthorized(request) {
  const configuredToken = process.env.EFI_WEBHOOK_TOKEN || ''
  if (!configuredToken) return true

  const received =
    request.headers.get('x-efi-webhook-token') ||
    request.headers.get('x-webhook-token') ||
    request.nextUrl?.searchParams?.get('token') ||
    ''

  return Boolean(received && secureCompare(received, configuredToken))
}

async function notifyEfiWebhookIssue({ type, title, message, severity = 'warning', dedupKey, metadata = {} }) {
  await createAdminNotification({
    type,
    title,
    message,
    severity,
    entity: 'efi_webhook',
    entityId: metadata?.txid || metadata?.end_to_end_id || '',
    actionUrl: '/dashboard/wifi-pix',
    dedupKey,
    metadata: {
      provider: 'efi',
      ...metadata,
    },
  })
}

async function auditEfiPixEvent(request, result = {}, payload = {}) {
  await logAdminAction({
    request,
    adminUser: {
      id: null,
      email: 'efi-webhook@nexawi.system',
    },
    action: result.paid ? 'wifi_pix_payment_paid' : 'wifi_pix_payment_synced',
    entity: 'wifi_pix_vendas',
    entityId: result.venda?.id || '',
    description: result.matched
      ? `Webhook Efi: venda Wi-Fi Pix ${result.venda?.id} sincronizada como ${result.venda?.status}.`
      : 'Webhook Efi: venda Wi-Fi Pix nao encontrada.',
    metadata: {
      provider: 'efi',
      matched: Boolean(result.matched),
      reason: result.reason || '',
      venda_id: result.venda?.id || null,
      status: result.venda?.status || null,
      paid: Boolean(result.paid),
      txid: result.txid || null,
      end_to_end_id: result.endToEndId || null,
      pix_count: Array.isArray(payload?.pix) ? payload.pix.length : 0,
    },
  })
}

export async function handleEfiWebhook(request) {
  const rate = checkRateLimit(request, WEBHOOK_RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas requisicoes para o webhook Efi' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        },
      }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: 'Webhook Efi nao autorizado' },
      { status: 401 }
    )
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Payload do webhook Efi muito grande' },
      { status: 413 }
    )
  }

  try {
    const body = await request.json()
    const pixItems = Array.isArray(body?.pix) ? body.pix : []
    const results = []

    if (pixItems.length === 0) {
      await notifyEfiWebhookIssue({
        type: 'efi_webhook_empty',
        title: 'Webhook Efi sem Pix no payload',
        message: 'A Efi chamou o webhook, mas o payload nao trouxe itens Pix para conciliar.',
        severity: 'warning',
        dedupKey: 'efi-webhook-empty-payload',
        metadata: {
          received_keys: Object.keys(body || {}),
        },
      })
    }

    for (const pix of pixItems) {
      const result = await markWifiPixEfiPaymentStatus({
        txid: pix.txid,
        endToEndId: pix.endToEndId,
        payload: pix,
      })
      await auditEfiPixEvent(request, result, body)

      if (!result.matched) {
        const txid = result.txid || pix.txid || ''
        const endToEndId = result.endToEndId || pix.endToEndId || ''

        await notifyEfiWebhookIssue({
          type: 'efi_webhook_unmatched_payment',
          title: 'Pix Efi nao encontrado no Wi-Fi no Pix',
          message: 'A Efi confirmou um Pix, mas nenhuma venda pendente foi encontrada para esse identificador.',
          severity: 'warning',
          dedupKey: `efi-webhook-unmatched:${txid || endToEndId || 'sem-id'}`,
          metadata: {
            txid: txid || null,
            end_to_end_id: endToEndId || null,
            reason: result.reason || '',
          },
        })
      }

      results.push({
        matched: Boolean(result.matched),
        paid: Boolean(result.paid),
        txid: result.txid || pix.txid || null,
        vendaId: result.venda?.id || null,
      })
    }

    return NextResponse.json({ ok: true, provider: 'efi', received: pixItems.length, results })
  } catch (error) {
    await notifyEfiWebhookIssue({
      type: 'efi_webhook_error',
      title: 'Erro ao processar webhook Efi',
      message: error.message || 'Erro desconhecido ao processar webhook Efi.',
      severity: 'critical',
      dedupKey: 'efi-webhook-processing-error',
      metadata: {
        error: error.message || '',
        code: error.code || '',
      },
    })

    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao processar webhook Efi' },
      { status: 500 }
    )
  }
}

