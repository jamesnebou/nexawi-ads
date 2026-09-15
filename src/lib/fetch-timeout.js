function boundedTimeout(value, fallback) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return fallback

  return Math.max(1_000, Math.min(120_000, Math.floor(parsed)))
}

export function getExternalRequestTimeoutMs(fallback = 15_000) {
  return boundedTimeout(process.env.NEXAWI_EXTERNAL_REQUEST_TIMEOUT_MS, fallback)
}

export function getControlRequestTimeoutMs(fallback = 45_000) {
  return boundedTimeout(process.env.NEXAWI_CONTROL_REQUEST_TIMEOUT_MS, fallback)
}

export function timeoutSignal(timeoutMs, existingSignal) {
  const timeout = AbortSignal.timeout(boundedTimeout(timeoutMs, 15_000))

  if (!existingSignal) return timeout
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([existingSignal, timeout])
  }

  return existingSignal
}

export function fetchWithTimeout(input, init = {}, timeoutMs = 15_000) {
  return fetch(input, {
    ...init,
    signal: timeoutSignal(timeoutMs, init.signal),
  })
}
