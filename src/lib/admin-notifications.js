// src/lib/admin-notifications.js
// ============================================================
// Helper de notificações internas da NexaWi ADS.
// Registra alertas importantes para administradores.
//
// Agora:
// - Cria/atualiza notificação interna
// - Envia e-mail para alertas importantes
// - Evita spam usando email_sent_at
// ============================================================

import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAdminAlertEmail } from '@/lib/email-service'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function normalizarSeverity(value = 'info') {
  const severity = limparTexto(value)

  if (['info', 'success', 'warning', 'critical'].includes(severity)) {
    return severity
  }

  return 'info'
}

function deveEnviarEmail({ type, severity }) {
  return (
    severity === 'critical' ||
    type === 'support_ticket_created' ||
    type === 'support_ticket_client_reply' ||
    type === 'cliente_travado'
  )
}

async function enviarEmailSeNecessario({
  notificationId,
  type,
  title,
  message,
  severity,
  actionUrl,
}) {
  if (!notificationId) return

  if (!deveEnviarEmail({ type, severity })) return

  const { data: notification, error: findError } = await supabaseAdmin
    .from('admin_notifications')
    .select('id, email_sent_at')
    .eq('id', notificationId)
    .maybeSingle()

  if (findError) {
    throw findError
  }

  if (!notification || notification.email_sent_at) {
    return
  }

  const emailResult = await sendAdminAlertEmail({
    title,
    message,
    severity,
    actionUrl,
  })

  if (emailResult.ok) {
    await supabaseAdmin
      .from('admin_notifications')
      .update({
        email_sent_at: new Date().toISOString(),
        email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    return
  }

  await supabaseAdmin
    .from('admin_notifications')
    .update({
      email_error: emailResult.error || 'Erro desconhecido ao enviar e-mail',
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
}

export async function createAdminNotification({
  type = 'info',
  title,
  message = '',
  severity = 'info',
  entity = '',
  entityId = '',
  actionUrl = '',
  dedupKey = '',
  metadata = {},
}) {
  try {
    const titulo = limparTexto(title)

    if (!titulo) {
      return {
        ok: false,
        skipped: true,
        error: 'Título da notificação não informado',
      }
    }

    const dedupKeyLimpa = limparTexto(dedupKey)

    const payload = {
      type: limparTexto(type) || 'info',
      title: titulo,
      message: limparTexto(message),
      severity: normalizarSeverity(severity),
      entity: limparTexto(entity),
      entity_id: entityId ? String(entityId) : null,
      action_url: actionUrl || null,
      dedup_key: dedupKeyLimpa || null,
      metadata: metadata || {},
      active: true,
      updated_at: new Date().toISOString(),
    }

    let notificationId = null
    let action = 'created'

    if (dedupKeyLimpa) {
      const { data: existing, error: findError } = await supabaseAdmin
        .from('admin_notifications')
        .select('id, email_sent_at')
        .eq('dedup_key', dedupKeyLimpa)
        .maybeSingle()

      if (findError) {
        throw findError
      }

      if (existing?.id) {
        const { data, error: updateError } = await supabaseAdmin
          .from('admin_notifications')
          .update(payload)
          .eq('id', existing.id)
          .select('id')
          .single()

        if (updateError) {
          throw updateError
        }

        notificationId = data?.id || existing.id
        action = 'updated'
      }
    }

    if (!notificationId) {
      const { data, error: insertError } = await supabaseAdmin
        .from('admin_notifications')
        .insert([payload])
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      notificationId = data?.id || null
      action = 'created'
    }

    await enviarEmailSeNecessario({
      notificationId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      actionUrl: payload.action_url,
    })

    return {
      ok: true,
      action,
      id: notificationId,
    }
  } catch (error) {
    console.error('Erro ao criar notificação admin:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    return {
      ok: false,
      error: error.message || 'Erro ao criar notificação',
      details: error.details || '',
      hint: error.hint || '',
      code: error.code || '',
    }
  }
}