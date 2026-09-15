import { timingSafeEqual } from 'node:crypto'

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''), 'utf8')
  const right = Buffer.from(String(rightValue || ''), 'utf8')

  if (!left.length || left.length !== right.length) return false

  return timingSafeEqual(left, right)
}

export function getControlSecret() {
  return String(process.env.NEXAWI_CONTROL_SECRET || '').trim()
}

export function isTrustedControlRequest(request, { allowCronSecret = false } = {}) {
  const received =
    request.headers.get('x-control-secret') ||
    (allowCronSecret ? request.headers.get('x-cron-secret') : '')
  const expected = [
    getControlSecret(),
    allowCronSecret ? String(process.env.NEXAWI_CRON_SECRET || '').trim() : '',
  ].filter(Boolean)

  return expected.some((secret) => safeEqual(received, secret))
}

export function isTrustedCronRequest(request) {
  const received = request.headers.get('x-cron-secret') || ''
  const expected = String(process.env.NEXAWI_CRON_SECRET || '').trim()

  return safeEqual(received, expected)
}

export function getControlRequestHeaders() {
  const secret = getControlSecret()

  if (!secret) {
    throw new Error('NEXAWI_CONTROL_SECRET nao configurado')
  }

  return {
    'x-control-secret': secret,
  }
}
