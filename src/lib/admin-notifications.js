// src/lib/admin-notifications.js
// ============================================================
// Helper de notificações internas da NexaWi ADS.
// Registra alertas importantes para administradores.
// Nunca deve quebrar a operação principal caso falhe.
// ============================================================

import { supabaseAdmin } from '@/lib/supabase-admin'

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
    if (!title) {
      return {
        ok: false,
        skipped: true,
      }
    }

    const payload = {
      type,
      title,
      message,
      severity,
      entity,
      entity_id: entityId ? String(entityId) : null,
      action_url: actionUrl || null,
      dedup_key: dedupKey || null,
      metadata: metadata || {},
      active: true,
      updated_at: new Date().toISOString(),
    }

    if (dedupKey) {
      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .upsert([payload], {
          onConflict: 'dedup_key',
        })

      if (error) throw error

      return { ok: true }
    }

    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .insert([payload])

    if (error) throw error

    return { ok: true }
  } catch (error) {
    console.error('Erro ao criar notificação admin:', error)

    return {
      ok: false,
      error: error.message || 'Erro ao criar notificação',
    }
  }
}