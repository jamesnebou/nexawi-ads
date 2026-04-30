export const CONTROL_API_BASE_URL =
  (process.env.NEXT_PUBLIC_CONTROL_API_BASE_URL || '').replace(/\/$/, '')

export function buildControlApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!CONTROL_API_BASE_URL) {
    return normalizedPath
  }

  return `${CONTROL_API_BASE_URL}${normalizedPath}`
}

export async function controlApiFetch(path, options = {}) {
  const response = await fetch(buildControlApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  return response
}