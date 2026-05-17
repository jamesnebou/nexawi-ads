// src/lib/email-service.js
// ============================================================
// Serviço de e-mail transacional da NexaWi ADS.
// Usado para alertas internos importantes.
// ============================================================

import nodemailer from 'nodemailer'

function boolEnv(value = '') {
  return String(value || '').toLowerCase() === 'true'
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = boolEnv(process.env.SMTP_SECURE)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendEmail({
  to,
  subject,
  text = '',
  html = '',
}) {
  try {
    const transporter = getTransporter()

    if (!transporter) {
      console.warn('SMTP não configurado. E-mail não enviado.')

      return {
        ok: false,
        skipped: true,
        error: 'SMTP não configurado',
      }
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })

    return {
      ok: true,
      messageId: info.messageId,
    }
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)

    return {
      ok: false,
      error: error.message || 'Erro ao enviar e-mail',
    }
  }
}

export async function sendAdminAlertEmail({
  title,
  message = '',
  severity = 'info',
  actionUrl = '',
}) {
  const to = process.env.ADMIN_ALERT_EMAIL || 'contato@nexawi.com.br'

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.nexawi.com.br'

  const urlFinal = actionUrl
    ? `${baseUrl}${actionUrl}`
    : `${baseUrl}/dashboard/notificacoes`

  const subjectPrefix =
    severity === 'critical'
      ? '[URGENTE]'
      : severity === 'warning'
        ? '[ATENÇÃO]'
        : '[NexaWi ADS]'

  const subject = `${subjectPrefix} ${title}`

  const safeTitle = escapeHtml(title || '')
  const rawMessage = String(message || 'Você recebeu uma nova notificação interna da NexaWi ADS.')
  const safeMessage = escapeHtml(rawMessage).replace(/\n/g, '<br />')

  const html = `
    <div style="font-family: Arial, sans-serif; background:#050505; color:#ffffff; padding:32px;">
      <div style="max-width:640px; margin:0 auto; background:#0a0a0a; border:1px solid rgba(255,255,255,0.08); border-radius:24px; padding:32px;">
        <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#6be12f; font-weight:bold; margin-bottom:14px;">
          NexaWi ADS
        </div>

        <h1 style="margin:0 0 12px; color:#ffffff; font-size:24px;">
          ${safeTitle}
        </h1>

        <p style="font-size:15px; line-height:1.6; color:#cfcfcf;">
          ${safeMessage}
        </p>

        <div style="margin:24px 0; padding:16px; border-radius:16px; background:#050505; border:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0; color:#888; font-size:12px; text-transform:uppercase; letter-spacing:1px;">
            Severidade
          </p>
          <p style="margin:6px 0 0; color:#ffffff; font-weight:bold;">
            ${severity}
          </p>
        </div>

        <a href="${urlFinal}" style="display:inline-block; background:#6be12f; color:#000000; text-decoration:none; padding:14px 22px; border-radius:14px; font-weight:bold;">
          Abrir no painel
        </a>

        <p style="margin-top:28px; color:#666; font-size:12px;">
          Notificação automática do sistema NexaWi ADS.
        </p>
      </div>
    </div>
  `

  const text = `${String(title || '')}\n\n${rawMessage}\n\nAbrir no painel: ${urlFinal}\n\nNexaWi ADS`

  return sendEmail({
    to,
    subject,
    text,
    html,
  })
}
