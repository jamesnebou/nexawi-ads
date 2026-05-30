'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'nexawi_pending_auth'

function lerPayloadPendente() {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)

    if (stored) {
      const parsed = JSON.parse(stored)

      if (parsed?.pendingAuth === '1') {
        return parsed
      }
    }
  } catch {}

  const params = new URLSearchParams(window.location.search)

  if (params.get('pendingAuth') !== '1') {
    return null
  }

  return {
    pendingAuth: '1',
    hotspotSlug: params.get('hotspotSlug') || '',
    leadId: params.get('leadId') || '',
    clientMac: params.get('clientMac') || '',
    clientIp: params.get('clientIp') || '',
    anuncioId: params.get('anuncioId') || '',
    delaySeconds: params.get('delaySeconds') || '10',
  }
}

export default function PendingInternalCtaAuthorization() {
  useEffect(() => {
    const payload = lerPayloadPendente()

    if (!payload) return undefined

    if (payload.expiresAt && Date.now() > Number(payload.expiresAt)) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return undefined
    }

    if (!payload.hotspotSlug || !payload.leadId || !payload.clientMac || !payload.clientIp) {
      console.warn('CTA interna sem dados suficientes para liberar a internet.')
      return undefined
    }

    const delaySeconds = Math.min(
      60,
      Math.max(3, Number(payload.delaySeconds || 10))
    )

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/control/session/authorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            hotspotSlug: payload.hotspotSlug,
            leadId: payload.leadId,
            clientMac: payload.clientMac,
            clientIp: payload.clientIp,
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 409 && data?.status?.state === 'cooldown') {
            window.sessionStorage.removeItem(STORAGE_KEY)
            return
          }

          throw new Error(data?.error || 'Falha ao liberar internet após CTA interna')
        }

        window.sessionStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Erro ao concluir liberação da CTA interna:', error)
      }
    }, delaySeconds * 1000)

    return () => window.clearTimeout(timer)
  }, [])

  return null
}
