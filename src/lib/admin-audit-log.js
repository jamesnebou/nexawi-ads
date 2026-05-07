// src/lib/admin-audit-log.js
// ============================================================
// Helper de auditoria administrativa da NexaWi ADS.
// Objetivo:
// - Registrar ações sensíveis feitas no painel admin.
// - Não quebrar a API caso o log falhe.
// - Guardar quem fez, o que fez, onde fez e quando fez.
// ============================================================

import { supabaseAdmin } from '@/lib/supabase-admin'

function getClientIp(request) {
  const forwardedFor = request?.headers?.get('x-forwarded-for')
  const realIp = request?.headers?.get('x-real-ip')
  const vercelIp = request?.headers?.get('x-vercel-forwarded-for')

  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  if (vercelIp) return vercelIp.split(',')[0].trim()
  if (realIp) return realIp.trim()

  return ''
}

export async function logAdminAction({
  request,
  adminUser,
  action,
  entity,
  entityId = '',
  description = '',
  metadata = {},
}) {
  try {
    // Se não tiver o mínimo necessário, apenas ignora.
    // Auditoria nunca deve derrubar a operação principal.
    if (!action || !entity) {
      return {
        ok: false,
        skipped: true,
      }
    }

    const { error } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert([
        {
          admin_user_id: adminUser?.id || null,
          admin_email: adminUser?.email || '',
          action,
          entity,
          entity_id: entityId ? String(entityId) : null,
          description,
          metadata: metadata || {},
          ip_address: getClientIp(request),
          user_agent: request?.headers?.get('user-agent') || '',
        },
      ])

    if (error) {
      console.error('Erro ao registrar auditoria admin:', error)

      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: true,
    }
  } catch (error) {
    console.error('Falha inesperada ao registrar auditoria admin:', error)

    return {
      ok: false,
      error: error.message || 'Erro desconhecido na auditoria',
    }
  }
}