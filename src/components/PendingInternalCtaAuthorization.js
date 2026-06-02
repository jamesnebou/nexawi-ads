'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'nexawi_pending_auth'

function clampDelay(value = 10) {
  const parsed = Number(value || 10)
  if (!Number.isFinite(parsed)) return 10
  return Math.min(120, Math.max(3, Math.floor(parsed)))
}

function lerPayloadPendente() {
  const params = new URLSearchParams(window.location.search)
  const queryPending = params.get('pendingAuth') === '1'

  if (queryPending) {
    return {
      pendingAuth: '1',
      hotspotSlug: params.get('hotspotSlug') || '',
      leadId: params.get('leadId') || '',
      clientMac: params.get('clientMac') || '',
      clientIp: params.get('clientIp') || '',
      anuncioId: params.get('anuncioId') || '',
      delaySeconds: params.get('delaySeconds') || '10',
      expiresAt: Date.now() + 5 * 60 * 1000,
    }
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)

    if (stored) {
      const parsed = JSON.parse(stored)

      if (parsed?.pendingAuth === '1') {
        return parsed
      }
    }
  } catch {}

  return null
}

export default function PendingInternalCtaAuthorization() {
  const [payload, setPayload] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [status, setStatus] = useState('waiting')
  const startedRef = useRef(false)

  const delaySeconds = useMemo(() => clampDelay(payload?.delaySeconds || 10), [payload])

  useEffect(() => {
    const nextPayload = lerPayloadPendente()

    if (!nextPayload) return

    if (nextPayload.expiresAt && Date.now() > Number(nextPayload.expiresAt)) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    if (!nextPayload.hotspotSlug || !nextPayload.leadId || !nextPayload.clientMac) {
      console.warn('CTA interna sem dados suficientes para liberar a internet.')
      return
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextPayload))
    } catch {}

    setPayload(nextPayload)
    setSecondsLeft(clampDelay(nextPayload.delaySeconds || 10))
  }, [])

  useEffect(() => {
    if (!payload || startedRef.current) return undefined

    startedRef.current = true

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    const timer = window.setTimeout(async () => {
      try {
        setStatus('authorizing')

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
            clientIp: payload.clientIp || '',
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 409 && data?.status?.state === 'cooldown') {
            window.sessionStorage.removeItem(STORAGE_KEY)
            setStatus('done')
            return
          }

          throw new Error(data?.error || 'Falha ao liberar internet apos CTA interna')
        }

        window.sessionStorage.removeItem(STORAGE_KEY)
        setStatus('done')

        window.setTimeout(() => {
          setPayload(null)
        }, 4500)
      } catch (error) {
        console.error('Erro ao concluir liberacao da CTA interna:', error)
        setStatus('error')
      } finally {
        window.clearInterval(interval)
      }
    }, delaySeconds * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [delaySeconds, payload])

  if (!payload) return null

  const progress = Math.max(0, Math.min(100, ((delaySeconds - secondsLeft) / delaySeconds) * 100))

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[9999] mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#050505]/90 px-3 py-2 text-white shadow-[0_10px_35px_rgba(0,0,0,.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-bold leading-tight text-white">
              {status === 'waiting'
                ? 'Internet em liberacao...'
                : status === 'authorizing'
                  ? 'Liberando sua internet...'
                  : status === 'done'
                    ? 'Internet liberada.'
                    : 'Nao foi possivel liberar agora.'}
            </p>

            {status === 'waiting' ? (
              <span className="shrink-0 rounded-full bg-[#6be12f]/10 px-2 py-0.5 text-[11px] font-black text-[#6be12f]">
                {secondsLeft}s
              </span>
            ) : null}
          </div>

          {status === 'waiting' ? (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#6be12f] transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
