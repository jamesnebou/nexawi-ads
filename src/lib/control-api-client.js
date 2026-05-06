export async function controlApiFetch(path, init = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return fetch(normalizedPath, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}