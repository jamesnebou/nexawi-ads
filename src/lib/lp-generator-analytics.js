function cleanText(value = '') {
  return String(value || '').trim()
}

function getHeader(headers, key) {
  return cleanText(headers?.get?.(key) || '')
}

function getClientIp(headers) {
  const forwardedFor = getHeader(headers, 'x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || ''

  return getHeader(headers, 'x-real-ip') || getHeader(headers, 'cf-connecting-ip')
}

function getDomain(value = '') {
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function classifySource({ utmSource = '', referer = '' } = {}) {
  const source = cleanText(utmSource).toLowerCase()
  const domain = getDomain(referer)
  const haystack = `${source} ${domain}`

  if (!haystack.trim()) return 'direto'
  if (/(instagram|facebook|fb\.|meta|tiktok|youtube|linkedin|x\.com|twitter)/i.test(haystack)) return 'social'
  if (/(google|bing|yahoo|duckduckgo)/i.test(haystack)) return 'busca'
  if (/(whatsapp|wa\.me|t\.me|telegram)/i.test(haystack)) return 'mensageria'
  if (/(mail|newsletter|e-mail|email)/i.test(haystack)) return 'email'
  if (source) return source

  return domain || 'referencia'
}

export function buildLpAnalyticsMetadata({ request, body = {} }) {
  const pageUrl = cleanText(body.pageUrl)
  const referer = cleanText(body.referer) || getHeader(request.headers, 'referer')
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {}
  const utmSource = cleanText(body.utmSource || utm.source)
  const utmMedium = cleanText(body.utmMedium || utm.medium)
  const utmCampaign = cleanText(body.utmCampaign || utm.campaign)
  const utmContent = cleanText(body.utmContent || utm.content)
  const utmTerm = cleanText(body.utmTerm || utm.term)
  const sourceType = classifySource({ utmSource, referer })

  return {
    user_agent: getHeader(request.headers, 'user-agent'),
    ip: getClientIp(request.headers),
    page_url: pageUrl,
    referer,
    referer_domain: getDomain(referer),
    source_type: sourceType,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
  }
}

export function summarizeSourceBreakdown(rows = []) {
  const totals = new Map()

  rows.forEach((row) => {
    const metadata = row?.metadata || {}
    const key = cleanText(metadata.source_type || row?.origem || 'direto') || 'direto'
    totals.set(key, (totals.get(key) || 0) + 1)
  })

  return [...totals.entries()]
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total)
}
