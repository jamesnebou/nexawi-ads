'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

function sectionStyle(config) {
  return {
    '--primary': config.identidade.corPrimaria,
    '--secondary': config.identidade.corSecundaria,
    '--page-bg': config.identidade.corFundo,
    '--page-text': config.identidade.corTexto,
    '--page-muted': config.identidade.corTextoSuave,
  }
}

function Cta({ href, children, variant = 'primary' }) {
  const className = variant === 'ghost'
    ? 'border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]'
    : 'bg-[var(--primary)] text-black shadow-[0_18px_60px_rgba(0,0,0,0.34)] hover:brightness-110'

  return (
    <a
      href={href || '#formulario'}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black transition ${className}`}
    >
      {children}
      <ArrowRight size={17} />
    </a>
  )
}

function Metric({ value, label }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--page-muted)]">{label}</p>
    </div>
  )
}

function VisualPanel({ config }) {
  if (config.hero.imagemUrl) {
    return (
      <div className="relative">
        <div className="absolute -inset-3 rounded-[2rem] border border-white/10 bg-white/[0.03]" />
        <img
          src={config.hero.imagemUrl}
          alt=""
          className="relative aspect-[4/5] w-full rounded-[1.65rem] border border-white/10 object-cover shadow-2xl shadow-black/50"
        />
      </div>
    )
  }

  return (
    <div className="relative rounded-[2rem] border border-white/10 bg-[#101010] p-4 shadow-2xl shadow-black/50">
      <div className="rounded-[1.5rem] border border-white/10 bg-black p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">Live preview</p>
            <p className="mt-1 text-sm font-black text-white">{config.identidade.marca}</p>
          </div>
          <div className="rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
            Online
          </div>
        </div>

        <div className="grid gap-3 py-5">
          <div className="h-3 w-28 rounded-full bg-white/20" />
          <div className="h-5 w-4/5 rounded-full bg-white/80" />
          <div className="h-5 w-3/5 rounded-full bg-white/55" />
          <div className="mt-2 h-16 rounded-2xl border border-white/10 bg-white/[0.04]" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['Oferta', 'Prova', 'Lead'].map((item, index) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-lg font-black text-white">0{index + 1}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[var(--page-muted)]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GeneratedLandingPage({ page, config }) {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', mensagem: '' })
  const [sending, setSending] = useState(false)

  async function sendLead(event) {
    event.preventDefault()
    setSending(true)

    try {
      const response = await fetch('/api/lp-generator/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageSlug: page.slug,
          ...form,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao enviar')

      toast.success(data.message || 'Enviado com sucesso.')
      setForm({ nome: '', email: '', telefone: '', mensagem: '' })

      const whatsapp = config.formulario.destinoWhatsapp
      if (whatsapp) {
        const message = encodeURIComponent(`Ola, vim pela landing page ${page.name}. Meu nome e ${form.nome}.`)
        window.setTimeout(() => {
          window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank')
        }, 700)
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar interesse.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main style={sectionStyle(config)} className="min-h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]">
      <Toaster position="top-right" />

      {config.hero.ativo && (
        <section
          className="relative"
          style={config.hero.backgroundUrl ? {
            backgroundImage: `linear-gradient(120deg, rgba(5,5,5,.94), rgba(5,5,5,.74), rgba(5,5,5,.58)), url(${config.hero.backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />

          <div className="relative mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-5 pb-14 pt-5 sm:px-8">
            <nav className="mb-12 flex items-center justify-between rounded-full border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                {config.identidade.logoUrl ? (
                  <img src={config.identidade.logoUrl} alt={config.identidade.marca} className="h-9 w-auto object-contain" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-black text-black">
                    {config.identidade.marca?.charAt(0) || 'L'}
                  </div>
                )}
                <span className="text-sm font-black">{config.identidade.marca}</span>
              </div>

              <a href="#formulario" className="rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-[var(--primary)]">
                Contato
              </a>
            </nav>

            <div className="grid flex-1 items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
              <div>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)] backdrop-blur-xl">
                  <Sparkles size={14} />
                  {config.hero.eyebrow}
                </p>

                <h1 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                  {config.hero.titulo}
                </h1>

                <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--page-muted)] sm:text-xl">
                  {config.hero.subtitulo}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Cta href={config.hero.ctaUrl}>{config.hero.ctaTexto}</Cta>
                  <Cta href="#beneficios" variant="ghost">Ver detalhes</Cta>
                </div>

                <div className="mt-10 grid max-w-2xl grid-cols-3 gap-5 border-t border-white/10 pt-7">
                  <Metric value="24h" label="no ar" />
                  <Metric value="+3x" label="clareza" />
                  <Metric value="100%" label="editavel" />
                </div>
              </div>

              <VisualPanel config={config} />
            </div>

            <a href="#beneficios" className="mt-10 inline-flex w-fit items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--page-muted)] hover:text-white">
              Descer
              <ChevronDown size={15} />
            </a>
          </div>
        </section>
      )}

      {config.beneficios.ativo && (
        <section id="beneficios" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">Metodo visual</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">{config.beneficios.titulo}</h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--page-muted)]">
              Uma LP forte precisa ser entendida em segundos: promessa clara, prova suficiente e chamada para acao sem friccao.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {(config.beneficios.itens || []).map((item, index) => {
              const Icon = [Target, TrendingUp, ShieldCheck][index % 3]
              return (
                <div key={index} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-[var(--primary)]/35 hover:bg-white/[0.055]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Icon size={22} />
                  </div>
                  <span className="mt-8 block text-xs font-black uppercase tracking-[0.22em] text-[var(--page-muted)]">0{index + 1}</span>
                  <h3 className="mt-3 text-2xl font-black">{item.titulo}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{item.texto}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {config.prova.ativo && (
        <section className="border-y border-white/10 bg-white/[0.025] px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-6">
              <BadgeCheck className="text-[var(--primary)]" size={34} />
              <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.prova.titulo}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--page-muted)]">
                Prova social posicionada antes da oferta reduz duvida e aumenta confianca na decisao.
              </p>
            </div>

            <div>
              <blockquote className="text-3xl font-black leading-tight sm:text-5xl">
                &ldquo;{config.prova.depoimento}&rdquo;
              </blockquote>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{config.prova.autor}</p>
            </div>
          </div>
        </section>
      )}

      {config.oferta.ativo && (
        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">Oferta principal</p>
              <h2 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">{config.oferta.titulo}</h2>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-[var(--page-muted)]">{config.oferta.texto}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {['Promessa clara', 'Contato direto', 'Layout mobile'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white">
                    <CheckCircle2 size={17} className="text-[var(--primary)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between border-t border-white/10 bg-black/30 p-7 sm:p-10 lg:border-l lg:border-t-0">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--page-muted)]">Condicao</p>
                <p className="mt-5 text-5xl font-black tracking-tight">{config.oferta.preco}</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">
                  Direcione o visitante para o proximo passo sem excesso de texto.
                </p>
              </div>

              <div className="mt-8">
                <Cta href={config.oferta.ctaUrl}>{config.oferta.ctaTexto}</Cta>
              </div>
            </div>
          </div>
        </section>
      )}

      {config.faq.ativo && (
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">Duvidas</p>
            <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{config.faq.titulo}</h2>
          </div>

          <div className="grid gap-3">
            {(config.faq.itens || []).map((item, index) => (
              <details key={index} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black">
                  {item.pergunta}
                  <ChevronDown className="shrink-0 transition group-open:rotate-180" size={18} />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {config.formulario.ativo && (
        <section id="formulario" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:grid-cols-[.82fr_1.18fr]">
            <div className="border-b border-white/10 bg-black/30 p-7 sm:p-10 lg:border-b-0 lg:border-r">
              <MessageCircle className="text-[var(--primary)]" size={34} />
              <h2 className="mt-6 text-4xl font-black leading-tight">{config.formulario.titulo}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{config.formulario.texto}</p>

              <div className="mt-8 space-y-3 text-sm font-bold text-white">
                <p className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[var(--primary)]" /> Retorno com contexto da LP</p>
                <p className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[var(--primary)]" /> Dados organizados no painel</p>
                <p className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[var(--primary)]" /> Pronto para contato comercial</p>
              </div>
            </div>

            <form onSubmit={sendLead} className="grid gap-4 p-7 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome" className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone / WhatsApp" className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
              </div>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
              <textarea value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Mensagem" rows={4} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
              <button disabled={sending} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-4 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60">
                {sending ? 'Enviando...' : config.formulario.botao}
                {!sending && <ArrowRight size={17} />}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  )
}
