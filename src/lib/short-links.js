export const SHORT_LINK_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

export function normalizeShortLinkSlug(value) {
  const slug = String(value || '').trim().toLowerCase()
  return SHORT_LINK_SLUG_PATTERN.test(slug) && slug !== 'inativo' ? slug : null
}

export function normalizeShortLinkTarget(value) {
  const input = String(value || '').trim()
  if (!input || input.length > 2048) return null

  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function shortLinkBaseUrl() {
  return String(
    process.env.QR_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.nexawi.com.br'
  ).replace(/\/+$/, '')
}

export function shortLinkUrl(slug) {
  return `${shortLinkBaseUrl()}/l/${slug}`
}
