const buckets = new Map()

function getClientIp(request) {
  const forwarded = request?.headers?.get('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || 'unknown'
}

export function checkRateLimit(request, { keyPrefix = 'global', limit = 60, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const ip = getClientIp(request)
  const key = `${keyPrefix}:${ip}`
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: now + windowMs,
      ip,
    }
  }

  current.count += 1
  buckets.set(key, current)

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
    ip,
  }
}
