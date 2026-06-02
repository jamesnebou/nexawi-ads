import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function sanitizeSlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const slug = sanitizeSlug(searchParams.get('slug') || '')
  const portalBaseUrl = (process.env.NEXAWI_PUBLIC_BASE_URL || origin || 'https://www.nexawi.com.br').replace(/\/$/, '')

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: 'slug e obrigatorio' },
      { status: 400 }
    )
  }

  const portalUrl = `${portalBaseUrl}/portal/${slug}?mac=$(mac)&ip=$(ip)&link_login=$(link-login)&link_orig=$(link-orig)&dst=$(link-orig-esc)`
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=${portalUrl}">
    <title>NexaWi Ads</title>
    <script>
      window.location.replace("${portalUrl}");
    </script>
  </head>
  <body style="margin:0;background:#050505;color:#fff;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center">
    <main>
      <h1 style="font-size:22px;margin:0 0 8px">Redirecionando para a NexaWi...</h1>
      <p style="font-size:14px;color:#b3b3b3;margin:0 0 18px">Aguarde enquanto o portal do Wi-Fi e aberto.</p>
      <a href="${portalUrl}" style="color:#6be12f;font-weight:bold">Abrir portal</a>
    </main>
  </body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
