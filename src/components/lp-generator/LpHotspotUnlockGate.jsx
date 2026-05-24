'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Wifi } from 'lucide-react'
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

export default function LpHotspotUnlockGate() {
  const [visible, setVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(10)
  const [status, setStatus] = useState('waiting')
  const [message, setMessage] = useState('Sua internet será liberada em instantes.')
  const startedRef = useRef(false)

  const payload = useMemo(() => {
    if (typeof window === 'undefined') return null

    const params = new URLSearchParams(window.location.search)
    const pendingAuth = getParam(params, 'pendingAuth') === '1'

    if (!pendingAuth) return null

    return {
      pendingAuth,
      hotspotSlug: getParam(params, 'hotspotSlug'),
      leadId: getParam(params, 'leadId'),
      clientMac: normalizeMac(getParam(params, 'clientMac') || getParam(params, 'mac')),
      clientIp: getParam(params, 'clientIp') || getParam(params, 'ip'),
      anuncioId: getParam(params, 'anuncioId'),
    }
  }, [])

  useEffect(() => {
    if (!payload?.pendingAuth || startedRef.current) return
    startedRef.current = true
    setVisible(true)
    setSecondsLeft(10)

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
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Não foi possível liberar a internet agora.')
        }

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
    }, 10000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [payload])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md rounded-3xl border border-white/10 bg-[#050505]/95 p-4 text-white shadow-[0_20px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10">
          {status === 'done' ? (
            <CheckCircle2 className="text-[#6be12f]" size={24} />
          ) : status === 'authorizing' ? (
            <Loader2 className="animate-spin text-[#6be12f]" size={24} />
          ) : (
            <Wifi className="text-[#6be12f]" size={24} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6be12f]">
            NexaWi Wi-Fi
          </p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-white">
            {message}
          </p>

          {status === 'waiting' ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                <span>Aguardando permanência na página</span>
                <span>{secondsLeft}s</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#6be12f] transition-all duration-1000"
                  style={{ width: `${Math.max(0, Math.min(100, ((10 - secondsLeft) / 10) * 100))}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
