'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { controlApiFetch } from '@/lib/control-api-client'

function clean(value = '') {
  return String(value || '').trim()
}

function normalizeMac(value = '') {
  return clean(value).toUpperCase().replace(/-/g, ':')
}

function getParam(params, key) {
  return clean(params.get(key) || '')
}

function getStoredPendingAuth() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem('nexawi_pending_auth')
    if (!raw) return null

    const data = JSON.parse(raw)

    if (!data?.expiresAt || Date.now() > Number(data.expiresAt)) {
      window.sessionStorage.removeItem('nexawi_pending_auth')
      return null
    }

    return data
  } catch {
    return null
  }
}

function parseDelaySeconds(value = '') {
  const parsed = Number(value || 30)
  if (!Number.isFinite(parsed)) return 30
  return Math.min(120, Math.max(5, Math.floor(parsed)))
}

export default function LpHotspotUnlockGate() {
  const [visible, setVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [status, setStatus] = useState('waiting')
  const [message, setMessage] = useState('Sua internet será liberada em instantes.')
  const startedRef = useRef(false)

  const payload = useMemo(() => {
    if (typeof window === 'undefined') return null

    const params = new URLSearchParams(window.location.search)
    const stored = getStoredPendingAuth()
    const pendingAuth = getParam(params, 'pendingAuth') === '1' || stored?.pendingAuth === '1'

    if (!pendingAuth) return null

    return {
      pendingAuth,
      hotspotSlug: getParam(params, 'hotspotSlug') || stored?.hotspotSlug || '',
      leadId: getParam(params, 'leadId') || stored?.leadId || '',
      clientMac: normalizeMac(getParam(params, 'clientMac') || getParam(params, 'mac') || stored?.clientMac || ''),
      clientIp: getParam(params, 'clientIp') || getParam(params, 'ip') || stored?.clientIp || '',
      anuncioId: getParam(params, 'anuncioId') || stored?.anuncioId || '',
      adSessionId: getParam(params, 'adSessionId') || stored?.adSessionId || '',
      delaySeconds: parseDelaySeconds(getParam(params, 'delaySeconds') || stored?.delaySeconds || 30),
    }
  }, [])

  useEffect(() => {
    if (!payload?.pendingAuth || startedRef.current) return
    startedRef.current = true
    setVisible(true)
    setSecondsLeft(payload.delaySeconds)

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    const timer = window.setTimeout(async () => {
      try {
        // No captive portal, o IP pode não estar disponível antes da liberação geral.
        // A autorização real no MikroTik usa principalmente hotspotSlug + leadId + MAC.
        // O backend ainda tenta descobrir o host/IP local diretamente no RouterOS pelo MAC.
        if (!payload.hotspotSlug || !payload.leadId || !payload.clientMac) {
          throw new Error('Dados da sessão incompletos para liberar o Wi-Fi.')
        }

        setStatus('authorizing')
        setMessage('Liberando sua internet...')

        const response = await controlApiFetch('/api/control/session/authorize', {
          method: 'POST',
          body: JSON.stringify({
            hotspotSlug: payload.hotspotSlug,
            leadId: payload.leadId,
            clientMac: payload.clientMac,
            clientIp: payload.clientIp || '',
            adSessionId: payload.adSessionId || '',
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Não foi possível liberar a internet agora.')
        }

        try {
          window.sessionStorage.removeItem('nexawi_pending_auth')
        } catch {}

        setStatus('done')
        setMessage('Internet liberada. Continue nesta página ou navegue normalmente.')

        window.setTimeout(() => {
          setVisible(false)
        }, 4500)
      } catch (error) {
        console.error('Erro ao liberar Wi-Fi pela LP:', error)
        setStatus('error')
        setMessage(error?.message || 'Não foi possível liberar sua internet. Tente reconectar no Wi-Fi.')
      } finally {
        window.clearInterval(interval)
      }
    }, payload.delaySeconds * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [payload])

  if (!visible) return null

  const progressPercent = payload?.delaySeconds
    ? Math.max(0, Math.min(100, ((payload.delaySeconds - secondsLeft) / payload.delaySeconds) * 100))
    : 0

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[9999] mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#050505]/90 px-3 py-2 text-white shadow-[0_10px_35px_rgba(0,0,0,.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-bold leading-tight text-white">
              {status === 'waiting'
                ? 'Internet em liberação...'
                : message}
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
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
