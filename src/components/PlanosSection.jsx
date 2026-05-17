'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function resolveSlugFromPathname(pathname = '/') {
  const cleaned = String(pathname || '/').split('?')[0].split('#')[0]
  const parts = cleaned.split('/').filter(Boolean)

  if (parts.length === 1) {
    return parts[0].toLowerCase()
  }

  return ''
}

function buildPlanoHref(plano, modoPreco) {
  const params = new URLSearchParams()

  params.set('plano', plano.titulo)
  params.set('plano_id', plano.id)
  params.set('valor', String(Number(plano.valor || 0)))
  params.set('ciclo', modoPreco)

  return `/anunciar?${params.toString()}`
}

const PLANOS_META = [
  {
    id: 'basico',
    titulo: 'Básico',
    descricao: 'Ideal para Prestadores de Serviços local.',
    cta: 'Assinar o Básico',
    itens: [
      '1 Criativo (Imagem)',
      'Exibição em 1 Ponto',
      'Botão de Redirecionamento',
      'Relatório Mensal',
    ],
  },
  {
    id: 'comercial',
    titulo: 'Comercial',
    descricao: 'Para negócios com bom fluxo que querem impacto real e rápido.',
    destaque: true,
    badge: 'MAIS VENDIDO',
    cta: 'Assinar Comercial',
    itens: [
      '3 Criativos (Imagem ou Vídeo)',
      'Exibição em 1 ponto',
      'Botão de Redirecionamento',
      'Enviar para seu Site',
      'Prioridade na Exibição',
      'Relatório Quinzenal',
      'Maior Frequência de Exibição',
    ],
  },
  {
    id: 'vip',
    titulo: 'VIP / Exclusividade',
    descricao: 'Para dominar a cidade e capturar contatos com exclusividade no seu nicho.',
    cta: 'Assinar VIP',
    itens: [
      '5 Criativos (Imagem e Vídeo)',
      'Exclusividade no Nicho',
      'Captura de Leads (Lista)',
      'Acesso exclusivo a Dashboard',
      'Relatório em RealTime',
      'Enviar para Site',
      'Destaque Máximo',
      'Campanha Promo',
      'Acesso a todos os pontos',
    ],
  },
]

export default function PlanosSection({ slug = '' }) {
  const pathname = usePathname()
  const detectedSlug = slug || resolveSlugFromPathname(pathname)

  const [modoPreco, setModoPreco] = useState('mensal')
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        setLoading(true)

        const query = detectedSlug ? `?slug=${encodeURIComponent(detectedSlug)}` : ''
        const response = await fetch(`/api/landing-config${query}`, {
          method: 'GET',
          cache: 'no-store',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar preços da landing')
        }

        if (ativo) {
          setConfig(data.config || null)
        }
      } catch (error) {
        console.error('Erro ao carregar preços da landing:', error)
      } finally {
        if (ativo) setLoading(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [detectedSlug])

  const planos = useMemo(() => {
    const mostrarAncora = Boolean(config?.mostrar_preco_ancora)

    return [
      {
        ...PLANOS_META[0],
        valor:
          modoPreco === 'mensal'
            ? Number(config?.preco_basico_mensal ?? 0)
            : Number(config?.preco_basico_anual ?? 0),
        ancora:
          modoPreco === 'mensal'
            ? config?.preco_ancora_basico_mensal
            : config?.preco_ancora_basico_anual,
        mostrarAncora,
        sufixo: modoPreco === 'mensal' ? '/mês' : '/ano',
      },
      {
        ...PLANOS_META[1],
        valor:
          modoPreco === 'mensal'
            ? Number(config?.preco_comercial_mensal ?? 0)
            : Number(config?.preco_comercial_anual ?? 0),
        ancora:
          modoPreco === 'mensal'
            ? config?.preco_ancora_comercial_mensal
            : config?.preco_ancora_comercial_anual,
        mostrarAncora,
        sufixo: modoPreco === 'mensal' ? '/mês' : '/ano',
      },
      {
        ...PLANOS_META[2],
        valor:
          modoPreco === 'mensal'
            ? Number(config?.preco_vip_mensal ?? 0)
            : Number(config?.preco_vip_anual ?? 0),
        ancora:
          modoPreco === 'mensal'
            ? config?.preco_ancora_vip_mensal
            : config?.preco_ancora_vip_anual,
        mostrarAncora,
        sufixo: modoPreco === 'mensal' ? '/mês' : '/ano',
      },
    ]
  }, [config, modoPreco])

  return (
    <section
      id="planos"
      className="relative z-10 py-20 md:py-24 px-6 max-w-7xl mx-auto text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700"
    >
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6 md:mb-8 leading-tight">
        Escolha o seu plano ideal
      </h2>

      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setModoPreco('mensal')}
            className={`px-6 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 ${
              modoPreco === 'mensal'
                ? 'bg-[#6be12f] text-black shadow-[0_0_20px_rgba(107,225,47,0.45)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Plano Mensal
          </button>

          <button
            type="button"
            onClick={() => setModoPreco('anual')}
            className={`px-6 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 ${
              modoPreco === 'anual'
                ? 'bg-[#6be12f] text-black shadow-[0_0_20px_rgba(107,225,47,0.45)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Plano Anual
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-base sm:text-lg mb-14 md:mb-16">
        {config?.observacao_precos || 'Planos mensais com fidelidade de 3 meses.'}
      </p>

      {config?.cidade_nome ? (
        <p className="text-[#8cf059] text-sm font-bold uppercase tracking-widest mb-8">
          Oferta ativa para {config.cidade_nome}
        </p>
      ) : null}

      <style>{`
        @keyframes glassSweep {
          0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
          15% { opacity: .18; }
          50% { opacity: .28; }
          100% { transform: translateX(280%) skewX(-18deg); opacity: 0; }
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {planos.map((plano) => {
          const exibirAncora =
            plano.mostrarAncora &&
            plano.ancora !== null &&
            Number(plano.ancora) > Number(plano.valor)

          return (
            <div
              key={plano.id}
              className={`relative rounded-3xl p-8 md:p-10 text-left transition-all duration-300 h-full flex flex-col overflow-visible ${
                plano.destaque
                  ? 'bg-[#041406] border border-[#6be12f]/60 shadow-[0_0_45px_rgba(107,225,47,0.18)] hover:shadow-[0_0_60px_rgba(107,225,47,0.30)] hover:scale-[1.02]'
                  : 'bg-white/[0.02] border border-white/10 hover:border-white/20 hover:scale-[1.01]'
              }`}
            >
              {plano.destaque && (
                <>
                  <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div
                  className="absolute top-0 left-[-35px] h-full w-[120px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  style={{
                    animation: "sweep 3.5s ease-in-out infinite alternate",
                  }}
                />
              </div>

                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full bg-[#6be12f] text-black text-[11px] font-extrabold uppercase tracking-[0.18em] shadow-[0_0_25px_rgba(107,225,47,0.5)]">
                    {plano.badge}
                  </div>
                </>
              )}

              <div className="relative z-10 flex-1 flex flex-col">
                <h3 className={`text-2xl md:text-3xl font-extrabold mb-3 ${plano.destaque ? 'text-[#8cf059]' : 'text-white'}`}>
                  {plano.titulo}
                </h3>

                <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 min-h-[72px]">
                  {plano.descricao}
                </p>

                <div className="mb-8 min-h-[94px]">
                  {exibirAncora ? (
                    <p className="text-gray-500 text-xl font-light line-through mb-2">
                      {formatPrice(plano.ancora)}
                    </p>
                  ) : (
                    <div className="h-[36px] mb-2" />
                  )}

                  {loading ? (
                    <div className="text-5xl font-black text-white">...</div>
                  ) : (
                    <div className="text-5xl font-black text-white leading-none">
                      {formatPrice(plano.valor)}
                      <span className="text-2xl text-gray-500 font-medium">{plano.sufixo}</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-5 mb-10 text-gray-300 text-lg flex-1">
                  {plano.itens.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <svg
                        className="w-6 h-6 text-[#6be12f] flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={buildPlanoHref(plano, modoPreco)}
                className={`w-full block text-center px-8 py-4 rounded-xl transition-all duration-300 font-extrabold text-xl mt-auto ${
                  plano.destaque
                    ? 'bg-[#6be12f] text-black shadow-[0_0_25px_rgba(107,225,47,0.55)] hover:shadow-[0_0_45px_rgba(107,225,47,0.75)] hover:-translate-y-1'
                    : 'bg-transparent border border-white/20 text-white hover:border-white/35 hover:bg-white/[0.03]'
                }`}
              >
                {plano.cta}
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
