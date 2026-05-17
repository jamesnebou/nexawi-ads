'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Instagram,
  Loader2,
  MapPin,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Wifi,
} from 'lucide-react'

const formInicial = {
  empresa: '',
  responsavel: '',
  telefone: '',
  email: '',
  cidade: '',
  segmento: '',
  mensagem: '',
  website: '',
}

const WHATSAPP_NEXAWI = '5577988656394'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function getPlanoFromUrl() {
  if (typeof window === 'undefined') {
    return { plano: '', planoId: '', ciclo: '', valor: '' }
  }

  const params = new URLSearchParams(window.location.search)

  return {
    plano: params.get('plano') || '',
    planoId: params.get('plano_id') || '',
    ciclo: params.get('ciclo') || '',
    valor: params.get('valor') || '',
  }
}

function buildWhatsAppUrl({ form, planoInteresse }) {
  const detalhesPlano = planoInteresse.plano
    ? `Tenho interesse no plano ${planoInteresse.plano}${planoInteresse.ciclo ? ` (${planoInteresse.ciclo})` : ''}${planoInteresse.valor ? ` de ${formatCurrency(planoInteresse.valor)}` : ''}.`
    : 'Tenho interesse em anunciar na NexaWi ADS.'

  const message = [
    'Ola, equipe NexaWi!',
    detalhesPlano,
    form.empresa ? `Empresa: ${form.empresa}` : '',
    form.responsavel ? `Responsavel: ${form.responsavel}` : '',
    form.telefone ? `WhatsApp: ${form.telefone}` : '',
    form.cidade ? `Cidade: ${form.cidade}` : '',
  ].filter(Boolean).join('\n')

  return `https://wa.me/${WHATSAPP_NEXAWI}?text=${encodeURIComponent(message)}`
}

export default function AnunciarPage() {
  const [form, setForm] = useState(formInicial)
  const [planoInteresse, setPlanoInteresse] = useState({ plano: '', planoId: '', ciclo: '', valor: '' })
  const [redirectSeconds, setRedirectSeconds] = useState(5)
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const planoSelecionadoLabel = useMemo(() => {
    if (!planoInteresse.plano) return ''

    return [
      planoInteresse.plano,
      planoInteresse.ciclo,
      planoInteresse.valor ? formatCurrency(planoInteresse.valor) : '',
    ].filter(Boolean).join(' - ')
  }, [planoInteresse])

  useEffect(() => {
    setPlanoInteresse(getPlanoFromUrl())
  }, [])

  useEffect(() => {
    if (!success || !whatsappUrl) return undefined

    setRedirectSeconds(5)

    const interval = window.setInterval(() => {
      setRedirectSeconds((current) => Math.max(current - 1, 0))
    }, 1000)

    const timeout = window.setTimeout(() => {
      window.location.href = whatsappUrl
    }, 5000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [success, whatsappUrl])

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      const whatsappDestino = buildWhatsAppUrl({ form, planoInteresse })
      const response = await fetch('/api/public/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          plano_interesse: planoInteresse.plano,
          plano_id: planoInteresse.planoId,
          ciclo_interesse: planoInteresse.ciclo,
          valor_potencial: planoInteresse.valor,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao enviar interesse.')
      }

      setWhatsappUrl(whatsappDestino)
      setSuccess(true)
      setForm(formInicial)
    } catch (err) {
      setError(err.message || 'Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-[#6be12f]/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(107,225,47,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(107,225,47,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-6">
              <Sparkles size={14} />
              Mídia local inevitável
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.98] text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
              Sua marca na tela de quem está usando Wi-Fi agora.
            </h1>

            <p className="text-lg text-neutral-400 mt-6 max-w-2xl leading-relaxed">
              A NexaWi transforma redes Wi-Fi de alto fluxo em pontos de mídia digital.
              Antes de navegar, o usuário vê sua campanha, sua oferta e seu botão de ação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <Feature icon={Wifi} title="Wi-Fi como mídia" text="Sua marca aparece antes do acesso." />
              <Feature icon={MapPin} title="100% local" text="Alcance pessoas próximas do seu negócio." />
              <Feature icon={MousePointerClick} title="Com CTA" text="WhatsApp, site, cupom ou oferta." />
            </div>

            <div className="mt-9 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 p-3">
                  <ShieldCheck className="text-[#6be12f]" size={22} />
                </div>

                <div>
                  <h2 className="font-black text-white text-lg">
                    Ideal para empresas que querem aparecer no momento certo.
                  </h2>

                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                    Restaurantes, clínicas, escolas, lojas, eventos, serviços locais e marcas que querem gerar lembrança,
                    tráfego e contatos com uma mídia diferente do anúncio comum.
                  </p>
                </div>
              </div>
            </div>
            <a
              href="https://www.instagram.com/nexawi_ads/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-between gap-4 rounded-[2rem] border border-[#6be12f]/20 bg-[#6be12f]/10 p-5 transition-all hover:border-[#8cf059]/40 hover:bg-[#6be12f]/15"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-black/30 border border-[#6be12f]/20 p-3">
                  <Instagram className="text-[#8cf059]" size={22} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-extrabold text-[#8cf059]">
                    Acompanhe a NexaWi
                  </p>
                  <p className="text-sm font-black text-white mt-1">
                    @nexawi_ads
                  </p>
                </div>
              </div>
              <ArrowRight className="text-[#8cf059]" size={18} />
            </a>
          </div>

          <div className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            {success ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
                  <CheckCircle2 className="text-[#6be12f]" size={36} />
                </div>

                <h2 className="text-2xl font-black text-white">
                  Interesse registrado!
                </h2>

                <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
                  Recebemos seus dados. Em alguns segundos voce sera direcionado para o WhatsApp com a mensagem pronta.
                </p>

                {planoSelecionadoLabel && (
                  <div className="mt-6 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-left">
                    <p className="text-[11px] uppercase tracking-widest font-extrabold text-[#8cf059] mb-1">
                      Plano escolhido
                    </p>
                    <p className="text-sm font-bold text-white">
                      {planoSelecionadoLabel}
                    </p>
                  </div>
                )}

                <p className="text-xs text-neutral-600 mt-5">
                  Redirecionando em {redirectSeconds}s.
                </p>

                <a
                  href={whatsappUrl}
                  className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.06]"
                >
                  Ir agora para o WhatsApp
                </a>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-black text-white">
                    Quero anunciar na NexaWi
                  </h2>

                  <p className="text-sm text-neutral-500 mt-2">
                    Preencha abaixo para receber uma proposta comercial.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <Field label="Empresa" value={form.empresa} onChange={(v) => updateField('empresa', v)} required />
                  <Field label="Responsável" value={form.responsavel} onChange={(v) => updateField('responsavel', v)} />
                  <Field label="WhatsApp" value={form.telefone} onChange={(v) => updateField('telefone', v)} required />
                  <Field label="E-mail" type="email" value={form.email} onChange={(v) => updateField('email', v)} />
                  <Field label="Cidade" value={form.cidade} onChange={(v) => updateField('cidade', v)} />
                  <Field label="Segmento" value={form.segmento} onChange={(v) => updateField('segmento', v)} />

                  {planoSelecionadoLabel && (
                    <div className="sm:col-span-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4">
                      <p className="text-[11px] uppercase tracking-widest font-extrabold text-[#8cf059] mb-1">
                        Plano de interesse
                      </p>
                      <p className="text-sm font-bold text-white">
                        {planoSelecionadoLabel}
                      </p>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2">
                      O que você quer divulgar?
                    </label>

                    <textarea
                      value={form.mensagem}
                      onChange={(e) => updateField('mensagem', e.target.value)}
                      rows={4}
                      className="w-full bg-[#050505] border border-white/[0.08] text-white text-sm rounded-2xl px-5 py-4 outline-none focus:border-[#6be12f]/40"
                      placeholder="Ex: divulgar clínica, restaurante, promoção, lançamento..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="sm:col-span-2 rounded-2xl bg-[#6be12f] hover:bg-[#8cf059] text-black font-black py-4 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Quero aparecer no Wi-Fi
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
      <Icon className="text-[#6be12f] mb-4" size={22} />
      <h3 className="font-black text-white">{title}</h3>
      <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{text}</p>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label>
      <span className="block text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2">
        {label}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#050505] border border-white/[0.08] text-white text-sm rounded-2xl px-5 py-4 outline-none focus:border-[#6be12f]/40"
      />
    </label>
  )
}
