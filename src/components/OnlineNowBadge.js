'use client'

// src/components/OnlineNowBadge.js
// ============================================================
// Badge público de pessoas online agora.
// Usa /api/public/online, que retorna apenas dado agregado.
// Seguro para landing page.
// ============================================================

import { useEffect, useState } from 'react'
import { Wifi, Activity } from 'lucide-react'

export default function OnlineNowBadge() {
  const [online, setOnline] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reliable, setReliable] = useState(false)

  async function buscarOnline() {
    try {
      const response = await fetch('/api/public/online', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        setReliable(false)
        return
      }

      setOnline(Number(data.online || 0))
      setReliable(Boolean(data.reliable))
    } catch (error) {
      console.error('Erro ao buscar pessoas online:', error)
      setReliable(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscarOnline()

    const interval = setInterval(() => {
      buscarOnline()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 shadow-[0_0_28px_rgba(107,225,47,0.10)] backdrop-blur-xl">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#6be12f]/15 border border-[#6be12f]/25">
        <span className="absolute h-3 w-3 rounded-full bg-[#6be12f] animate-ping opacity-60" />
        <Wifi size={19} className="relative z-10 text-[#8cf059]" />
      </div>

      <div className="text-left">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059]">
          Ao vivo na rede NexaWi
        </p>

        <p className="text-sm sm:text-base font-bold text-white">
          {loading ? (
            'Consultando conexões...'
          ) : reliable ? (
            <>
              <span className="text-[#8cf059]">{online}</span>{' '}
              {online === 1 ? 'pessoa online agora' : 'pessoas online agora'}
            </>
          ) : (
            'Monitoramento online ativo'
          )}
        </p>
      </div>

      <Activity size={17} className="hidden sm:block text-[#6be12f]" />
    </div>
  )
}