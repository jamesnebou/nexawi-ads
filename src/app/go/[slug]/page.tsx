import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { Poppins } from 'next/font/google'
import {
  BarChart3,
  CalendarDays,
  Clock3,
  QrCode,
  Radio,
  ShieldCheck,
  SmartphoneNfc,
  Store,
} from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

type PublicQrStats = {
  id: string
  name: string
  slug: string
  status: string
  customer_name: string | null
  location_name: string | null
  campaign_name: string | null
  total_scans: number
  scans_today: number
  scans_7d: number
  scans_30d: number
  qr_scans: number
  nfc_scans: number
  last_scan_at: string | null
}

function publicBaseUrl() {
  return String(process.env.QR_PUBLIC_BASE_URL || 'https://go.nexawi.com.br').replace(/\/$/, '')
}

const getPublicQrStats = cache(async (slugValue: string): Promise<PublicQrStats | null> => {
  const slug = String(slugValue || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return null

  const { data, error } = await supabaseAdmin
    .from('qr_code_stats')
    .select(`
      id, name, slug, status, customer_name, location_name, campaign_name,
      total_scans, scans_today, scans_7d, scans_30d, qr_scans, nfc_scans,
      last_scan_at
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar painel público do QR Code:', error.message)
    return null
  }

  return data as PublicQrStats | null
})

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatDate(value: string | null) {
  if (!value) return 'Nenhum acesso registrado'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bahia',
  }).format(new Date(value))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const stats = await getPublicQrStats(slug)
  const displayName = stats?.customer_name || stats?.name || 'QR Code NexaWi'

  return {
    title: `${displayName} | Resultados QR NexaWi`,
    description: `Painel público de acessos do QR Code ${displayName}.`,
    alternates: stats ? { canonical: `${publicBaseUrl()}/${stats.slug}` } : undefined,
    robots: { index: false, follow: false },
  }
}

export default async function PublicQrStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const stats = await getPublicQrStats(slug)
  if (!stats) notFound()

  const displayName = stats.customer_name || stats.name
  const isActive = stats.status === 'active'
  const cards = [
    { label: 'Hoje', value: stats.scans_today, icon: Radio, detail: 'acessos registrados hoje' },
    { label: 'Últimos 7 dias', value: stats.scans_7d, icon: CalendarDays, detail: 'acessos na última semana' },
    { label: 'Últimos 30 dias', value: stats.scans_30d, icon: BarChart3, detail: 'acessos no último mês' },
    { label: 'Total', value: stats.total_scans, icon: QrCode, detail: 'desde a ativação' },
  ]

  return (
    <main className={`${poppins.className} min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 lg:py-12`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,122,0,0.08),transparent_32%)]" />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-8 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8cf059]">
                <ShieldCheck size={14} /> Resultados verificados pela NexaWi
              </div>
              <div className="flex items-start gap-4">
                <div className="hidden rounded-2xl border border-white/[0.08] bg-black/30 p-4 text-[#6be12f] sm:block">
                  <Store size={30} />
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-neutral-600">Painel público de acessos</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{displayName}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
                    Acompanhe quantas vezes esta placa foi acessada por QR Code ou aproximação NFC.
                  </p>
                </div>
              </div>
            </div>

            <span className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${isActive ? 'bg-[#6be12f]/10 text-[#8cf059]' : 'bg-red-500/10 text-red-300'}`}>
              {isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {(stats.location_name || stats.campaign_name) && (
            <div className="mt-7 flex flex-wrap gap-2 border-t border-white/[0.05] pt-5 text-xs font-bold text-neutral-400">
              {stats.location_name ? <span className="rounded-full bg-white/[0.04] px-3 py-2">Local: {stats.location_name}</span> : null}
              {stats.campaign_name ? <span className="rounded-full bg-white/[0.04] px-3 py-2">Campanha: {stats.campaign_name}</span> : null}
            </div>
          )}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, detail }) => (
            <article key={label} className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-600">{label}</p>
                <Icon size={18} className="text-[#6be12f]" />
              </div>
              <p className="text-4xl font-light">{formatNumber(value)}</p>
              <p className="mt-2 text-xs text-neutral-600">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-[#6be12f]/10 bg-[#6be12f]/[0.03] p-6">
            <QrCode size={22} className="text-[#8cf059]" />
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-600">Leituras pelo QR</p>
            <p className="mt-2 text-3xl font-black">{formatNumber(stats.qr_scans)}</p>
          </article>

          <article className="rounded-3xl border border-[#ff9d2e]/10 bg-[#ff9d2e]/[0.03] p-6">
            <SmartphoneNfc size={22} className="text-[#ff9d2e]" />
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-600">Aproximações NFC</p>
            <p className="mt-2 text-3xl font-black">{formatNumber(stats.nfc_scans)}</p>
          </article>

          <article className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-6">
            <Clock3 size={22} className="text-neutral-400" />
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-600">Último acesso</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-neutral-300">{formatDate(stats.last_scan_at)}</p>
          </article>
        </section>

        <footer className="mt-8 rounded-3xl border border-white/[0.05] bg-black/20 px-6 py-5 text-center">
          <p className="text-xs leading-relaxed text-neutral-600">
            Os números representam leituras válidas da placa. Pré-visualizações automáticas e robôs identificados não entram nas métricas.
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#6be12f]">NexaWi Ads · QR e NFC dinâmicos</p>
        </footer>
      </div>
    </main>
  )
}
