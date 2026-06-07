function clean(value = '', maxLength = 1000) {
  return String(value || '').trim().slice(0, maxLength)
}

function env(name = '') {
  return clean(process.env[name])
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : ''
}

function getClientIp(request, metadata = {}) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || metadata.ip || ''
}

function extractClickIds(url = '') {
  try {
    const params = new URL(url).searchParams
    return {
      gclid: clean(params.get('gclid')),
      gbraid: clean(params.get('gbraid')),
      wbraid: clean(params.get('wbraid')),
    }
  } catch {
    return { gclid: '', gbraid: '', wbraid: '' }
  }
}

function googleAdsDateTime(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  const isoLike = date.toISOString().replace('T', ' ').slice(0, 19)

  return `${isoLike}${sign}${hh}:${mm}`
}

async function sendMetaConversion({ request, body, metadata, clickId }) {
  const pixelId = env('META_CONVERSIONS_PIXEL_ID') || env('LP_META_CONVERSIONS_PIXEL_ID')
  const accessToken = env('META_CONVERSIONS_ACCESS_TOKEN') || env('LP_META_CONVERSIONS_ACCESS_TOKEN')

  if (!pixelId || !accessToken) {
    return { ok: true, skipped: true, reason: 'meta_env_missing' }
  }

  const version = env('META_CONVERSIONS_API_VERSION') || 'v20.0'
  const pageUrl = clean(body.pageUrl || metadata.page_url)
  const payload = {
    data: [{
      event_name: 'LandingNativeClick',
      event_time: Math.floor(Date.now() / 1000),
      event_id: clickId,
      action_source: 'website',
      event_source_url: pageUrl,
      user_data: {
        client_ip_address: getClientIp(request, metadata),
        client_user_agent: metadata.user_agent || request.headers.get('user-agent') || '',
        fbp: getCookie(request, '_fbp'),
        fbc: getCookie(request, '_fbc'),
      },
      custom_data: {
        page_slug: clean(body.pageSlug || body.page_slug || 'home', 120),
        target_label: clean(body.targetLabel || body.target_label, 180),
        target_url: clean(body.targetUrl || body.target_url),
        utm_source: clean(metadata.utm_source),
        utm_campaign: clean(metadata.utm_campaign),
      },
    }],
  }

  const testCode = env('META_CONVERSIONS_TEST_EVENT_CODE')
  if (testCode) payload.test_event_code = testCode

  const response = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return { ok: false, status: response.status, error: text.slice(0, 500) }
  }

  return { ok: true }
}

async function sendGoogleAdsConversion({ body, metadata, clickId }) {
  const developerToken = env('GOOGLE_ADS_DEVELOPER_TOKEN')
  const accessToken = env('GOOGLE_ADS_OAUTH_ACCESS_TOKEN')
  const customerId = env('GOOGLE_ADS_CUSTOMER_ID').replace(/\D/g, '')
  const conversionActionId = env('GOOGLE_ADS_CONVERSION_ACTION_ID').replace(/\D/g, '')

  if (!developerToken || !accessToken || !customerId || !conversionActionId) {
    return { ok: true, skipped: true, reason: 'google_ads_env_missing' }
  }

  const pageUrl = clean(body.pageUrl || metadata.page_url)
  const clickIds = extractClickIds(pageUrl)
  const clickIdKey = clickIds.gclid ? 'gclid' : clickIds.gbraid ? 'gbraid' : clickIds.wbraid ? 'wbraid' : ''

  if (!clickIdKey) {
    return { ok: true, skipped: true, reason: 'google_click_id_missing' }
  }

  const version = env('GOOGLE_ADS_API_VERSION') || 'v19'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  const loginCustomerId = env('GOOGLE_ADS_LOGIN_CUSTOMER_ID').replace(/\D/g, '')
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId

  const payload = {
    conversions: [{
      conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
      conversionDateTime: googleAdsDateTime(new Date()),
      conversionValue: 1,
      currencyCode: 'BRL',
      orderId: clickId,
      [clickIdKey]: clickIds[clickIdKey],
    }],
    partialFailure: true,
  }

  const response = await fetch(`https://googleads.googleapis.com/${version}/customers/${customerId}:uploadClickConversions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return { ok: false, status: response.status, error: text.slice(0, 500) }
  }

  return { ok: true }
}

export async function sendNativeLandingServerConversions({ request, body = {}, metadata = {}, clickId = '' }) {
  const eventId = clickId || `lp-click-${Date.now()}`
  const results = await Promise.allSettled([
    sendMetaConversion({ request, body, metadata, clickId: eventId }),
    sendGoogleAdsConversion({ body, metadata, clickId: eventId }),
  ])

  return {
    meta: results[0].status === 'fulfilled' ? results[0].value : { ok: false, error: results[0].reason?.message || 'Meta conversion failed' },
    googleAds: results[1].status === 'fulfilled' ? results[1].value : { ok: false, error: results[1].reason?.message || 'Google Ads conversion failed' },
  }
}
