import { fetchWithTimeout, getControlRequestTimeoutMs } from './fetch-timeout'

export async function controlApiFetch(path, init = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return fetchWithTimeout(normalizedPath, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  }, getControlRequestTimeoutMs())
}
