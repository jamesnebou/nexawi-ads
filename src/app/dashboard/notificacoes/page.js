'use client'

import { useEffect, useState } from 'react'
import { Poppins } from 'next/font/google'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

function formatarData(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getIcon(severity) {
  if (severity === 'critical') return ShieldAlert
  if (severity === 'warning') return AlertTriangle
  if (severity === 'success') return CheckCircle2
  return Info
}

function getStyle(severity) {
  if (severity === 'critical') {
    return 'bg-red-500/10 border-red-500/20 text-red-300'
  }

  if (severity === 'warning') {
    return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
  }

  if (severity === 'success') {
    return 'bg-[#6be12f]/10 border-[#6be12f]/20 text-[#8cf059]'
  }

  return 'bg-blue-500/10 border-blue-500/20 text-blue-300'
}

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada.')
  }

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

export default function NotificacoesPage() {
  const router = useRouter()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState('')

  useEffect(() => {
    buscarNotificacoes()
  }, [])

  async function buscarNotificacoes() {
    setLoading(true)

    try {
      const data = await adminApiFetch('/api/admin/notificacoes?limit=100&sync=1')

      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error(error)
      toast.error(error.message || 'Erro ao buscar notificações.')
    } finally {
      setLoading(false)
    }
  }

  async function marcarComoLida(notification) {
    if (!notification?.id || notification.read) return

    setSalvando(notification.id)

    try {
      await adminApiFetch('/api/admin/notificacoes', {
        method: 'POST',
        body: {
          action: 'mark_read',
          id: notification.id,
        },
      })

      await buscarNotificacoes()
    } catch (error) {
      toast.error(error.message || 'Erro ao marcar como lida.')
    } finally {
      setSalvando('')
    }
  }

  async function marcarTodasComoLidas() {
    setSalvando('all')

    try {
      await adminApiFetch('/api/admin/notificacoes', {
        method: 'POST',
        body: {
          action: 'mark_all_read',
        },
      })

      toast.success('Todas marcadas como lidas.')
      await buscarNotificacoes()
    } catch (error) {
      toast.error(error.message || 'Erro ao marcar todas.')
    } finally {
      setSalvando('')
    }
  }

  async function abrirNotificacao(notification) {
    await marcarComoLida(notification)

    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className={`${poppins.className} relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up`}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <Bell className="text-[#6be12f]" size={24} />
              </div>
              Notificações
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Alertas internos, chamados, pendências e eventos importantes
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={buscarNotificacoes}
              className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-white font-bold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>

            <button
              onClick={marcarTodasComoLidas}
              disabled={salvando === 'all' || unreadCount === 0}
              className="bg-[#6be12f] disabled:opacity-50 text-black font-extrabold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              {salvando === 'all' ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <CheckCheck size={17} />
              )}
              Marcar todas como lidas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <CardResumo label="Total" value={notifications.length} />
          <CardResumo label="Não lidas" value={unreadCount} />
          <CardResumo label="Críticas" value={notifications.filter((n) => n.severity === 'critical').length} />
        </div>

        {loading ? (
          <div className="py-32 flex justify-center">
            <Loader2 className="animate-spin text-[#6be12f]" size={32} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] py-24 text-center">
            <Bell size={44} className="text-neutral-700 mx-auto mb-5" />
            <h2 className="text-xl font-bold text-white">Nenhuma notificação</h2>
            <p className="text-sm text-neutral-500 mt-2">
              Quando houver alertas internos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.severity)
              const style = getStyle(notification.severity)

              return (
                <div
                  key={notification.id}
                  className={`mobile-tight-card rounded-[1.6rem] border p-5 transition-all ${
                    notification.read
                      ? 'bg-white/[0.015] border-white/[0.04]'
                      : 'bg-white/[0.035] border-white/[0.08] shadow-[0_0_30px_rgba(107,225,47,0.05)]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${style}`}>
                        <Icon size={22} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {!notification.read && (
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20">
                              Nova
                            </span>
                          )}

                          <span className="inline-flex max-w-full break-all px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/[0.04] text-neutral-400 border border-white/[0.06]">
                            {notification.type}
                          </span>
                        </div>

                        <h2 className="text-base font-extrabold text-white">
                          {notification.title}
                        </h2>

                        <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                          {notification.message || 'Sem descrição.'}
                        </p>

                        <p className="text-[11px] text-neutral-600 mt-3">
                          {formatarData(notification.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => marcarComoLida(notification)}
                          disabled={salvando === notification.id}
                          className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-sm font-bold text-neutral-300 sm:w-auto"
                        >
                          {salvando === notification.id ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            'Marcar lida'
                          )}
                        </button>
                      )}

                      {notification.action_url && (
                        <button
                          onClick={() => abrirNotificacao(notification)}
                          className="flex w-full items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#6be12f] text-black text-sm font-extrabold sm:w-auto"
                        >
                          Abrir
                          <ExternalLink size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-fade-in-up {
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
          }
        `}} />
      </div>
    </>
  )
}

function CardResumo({ label, value }) {
  return (
    <div className="mobile-tight-card bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6">
      <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
        {label}
      </p>
      <p className="text-4xl font-light text-white tracking-tight mt-4">
        {value}
      </p>
    </div>
  )
}