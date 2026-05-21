'use client'

import { useState } from 'react'
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

function Cta({ href, children }) {
  return (
    <a
      href={href || '#formulario'}
      className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-6 py-4 text-sm font-black text-black shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_30%,transparent)] transition hover:brightness-110"
    >
      {children}
    </a>
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
    <main style={sectionStyle(config)} className="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
      <Toaster position="top-right" />

      {config.hero.ativo && (
        <section
          className="relative overflow-hidden"
          style={config.hero.backgroundUrl ? { backgroundImage: `linear-gradient(90deg, rgba(5,5,5,.92), rgba(5,5,5,.58)), url(${config.hero.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_32%)]" />
          <div className="relative mx-auto grid min-h-[92vh] max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-8 flex items-center gap-3">
                {config.identidade.logoUrl ? (
                  <img src={config.identidade.logoUrl} alt={config.identidade.marca} className="h-10 w-auto object-contain" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-black text-black">
                    {config.identidade.marca?.charAt(0) || 'L'}
                  </div>
                )}
                <span className="text-sm font-black">{config.identidade.marca}</span>
              </div>

              <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
                {config.hero.eyebrow}
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                {config.hero.titulo}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--page-muted)] sm:text-lg">
                {config.hero.subtitulo}
              </p>
              <div className="mt-8">
                <Cta href={config.hero.ctaUrl}>{config.hero.ctaTexto}</Cta>
              </div>
            </div>

            {config.hero.imagemUrl && (
              <div className="relative">
                <img src={config.hero.imagemUrl} alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl shadow-black/50" />
              </div>
            )}
          </div>
        </section>
      )}

      {config.beneficios.ativo && (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <h2 className="max-w-3xl text-3xl font-black sm:text-5xl">{config.beneficios.titulo}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(config.beneficios.itens || []).map((item, index) => (
              <div key={index} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6">
                <span className="text-sm font-black text-[var(--primary)]">0{index + 1}</span>
                <h3 className="mt-5 text-xl font-black">{item.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--page-muted)]">{item.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {config.prova.ativo && (
        <section className="border-y border-white/10 bg-white/[0.025] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--primary)]">{config.prova.titulo}</p>
            <blockquote className="mt-6 text-2xl font-black leading-tight sm:text-4xl">
              &ldquo;{config.prova.depoimento}&rdquo;
            </blockquote>
            <p className="mt-5 text-sm font-bold text-[var(--page-muted)]">{config.prova.autor}</p>
          </div>
        </section>
      )}

      {config.oferta.ativo && (
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_380px]">
          <div>
            <h2 className="text-3xl font-black sm:text-5xl">{config.oferta.titulo}</h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--page-muted)]">{config.oferta.texto}</p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">Oferta</p>
            <p className="mt-4 text-4xl font-black">{config.oferta.preco}</p>
            <div className="mt-6">
              <Cta href={config.oferta.ctaUrl}>{config.oferta.ctaTexto}</Cta>
            </div>
          </div>
        </section>
      )}

      {config.faq.ativo && (
        <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
          <h2 className="text-3xl font-black sm:text-5xl">{config.faq.titulo}</h2>
          <div className="mt-8 grid gap-3">
            {(config.faq.itens || []).map((item, index) => (
              <details key={index} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <summary className="cursor-pointer text-base font-black">{item.pergunta}</summary>
                <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {config.formulario.ativo && (
        <section id="formulario" className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-3xl font-black">{config.formulario.titulo}</h2>
            <p className="mt-3 text-sm text-[var(--page-muted)]">{config.formulario.texto}</p>
            <form onSubmit={sendLead} className="mt-6 grid gap-3">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome" className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none focus:border-[var(--primary)]/50" />
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone / WhatsApp" className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none focus:border-[var(--primary)]/50" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none focus:border-[var(--primary)]/50" />
              <textarea value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Mensagem" rows={4} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none focus:border-[var(--primary)]/50" />
              <button disabled={sending} className="rounded-2xl bg-[var(--primary)] px-6 py-4 text-sm font-black text-black disabled:opacity-60">
                {sending ? 'Enviando...' : config.formulario.botao}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  )
}
