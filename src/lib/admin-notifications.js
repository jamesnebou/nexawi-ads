// src/lib/admin-notifications.js
// ============================================================
// Helper de notificações internas da NexaWi ADS.
// Registra alertas importantes para administradores.
// Nunca deve quebrar a operação principal caso falhe.
//
// Correção profissional:
// - Não usa upsert com índice parcial.
// - Se tiver dedupKey, busca primeiro.
// - Se existir, atualiza.
// - Se não existir, insere.
// - Retorna erro detalhado no console do servidor.
// ============================================================

import { supabaseAdmin } from '@/lib/supabase-admin'

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

    // ============================================================
    // Se tiver dedupKey, evita duplicar a mesma notificação.
    // Sem usar upsert para não depender de índice parcial.
    // ============================================================

    if (dedupKeyLimpa) {
      const { data: existing, error: findError } = await supabaseAdmin
        .from('admin_notifications')
        .select('id')
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

        return {
          ok: true,
          action: 'updated',
          id: data?.id || existing.id,
        }
      }
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('admin_notifications')
      .insert([payload])
      .select('id')
      .single()

    if (insertError) {
      throw insertError
    }

    return {
      ok: true,
      action: 'created',
      id: data?.id || null,
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