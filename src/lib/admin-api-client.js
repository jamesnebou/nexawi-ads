'use client'

import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'

const supabase = createBrowserSupabaseClient()
const SESSION_TIMEOUT_MS = 8000
const API_TIMEOUT_MS = 15000

function withTimeout(promise, timeoutMs, message) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

async function getToken(forceRefresh = false) {
  const request = forceRefresh
    ? supabase.auth.refreshSession()
    : supabase.auth.getSession()
  const { data, error } = await withTimeout(
    request,
    SESSION_TIMEOUT_MS,
    'Tempo excedido ao validar a sessão administrativa.'
  )

  const token = data?.session?.access_token
  if (error || !token) {
    const sessionError = new Error('Sessão administrativa não encontrada.')
    sessionError.status = 401
    throw sessionError
  }
  return token
}

async function requestJson(path, options, token) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    const text = await response.text()
    let data = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      const parseError = new Error(`A API não retornou JSON. Status: ${response.status}`)
      parseError.status = response.status
      throw parseError
    }

    if (!response.ok) {
      const apiError = new Error(data?.error || 'Erro na API administrativa.')
      apiError.status = response.status
      throw apiError
    }

    return data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo excedido ao acessar a API administrativa.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function adminApiFetch(path, options = {}) {
  let token = await getToken(false)

  try {
    return await requestJson(path, options, token)
  } catch (error) {
    if (error?.status !== 401) throw error
    token = await getToken(true)
    return requestJson(path, options, token)
  }
}
