import Image from 'next/image'
import Link from 'next/link'
import { Poppins } from 'next/font/google'
import {
  ArrowRight,
  BarChart3,
  Brush,
  Check,
  ChevronRight,
  Code2,
  Globe2,
  Layers3,
  Megaphone,
  MousePointerClick,
  Nfc,
  Palette,
  QrCode,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const WHATSAPP_NUMBER = '5577988656394'

export const metadata = {
  title: 'Serviços para empresas | NexaWi',
  description:
    'Plaquinhas inteligentes com QR Code e NFC, tráfego pago, design gráfico, landing pages e sites para empresas que querem atrair e converter mais clientes.',
  alternates: {
    canonical: '/servicos',
  },
  openGraph: {
    title: 'NexaWi Serviços — presença que vira resultado',
    description:
      'Do primeiro contato à venda: QR Code e NFC, tráfego pago, design e páginas profissionais para o seu negócio.',
  },
}

function whatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

const navItems = [
  { label: 'Plaquinhas', href: '#plaquinhas' },
  { label: 'Tráfego pago', href: '#trafego' },
  { label: 'Design', href: '#design' },
  { label: 'Sites e LPs', href: '#sites' },
]

const plaquePlans = [
  {
    name: 'QR Essencial',
    price: 'R$ 197',
    suffix: 'por unidade',
    recurring: '+ R$ 29/mês de plataforma',
    description: 'Para começar a receber avaliações e direcionar clientes com uma placa profissional.',
    features: [
      'QR Code dinâmico e editável',
      'Link personalizado da empresa',
      'Contagem de acessos',
      'Identificação única para reimpressão',
    ],
    message: 'Olá! Quero conhecer a plaquinha QR Essencial da NexaWi.',
  },
  {
    name: 'QR + NFC Pro',
    price: 'R$ 297',
    suffix: 'por unidade',
    recurring: '+ R$ 49/mês de plataforma',
    description: 'A experiência mais rápida: o cliente aproxima o celular ou aponta a câmera.',
    features: [
      'Tudo do plano Essencial',
      'Tag NFC configurada',
      'QR e NFC no mesmo destino',
      'Painel público de acessos',
      'Suporte para troca de destino',
    ],
    message: 'Olá! Quero a plaquinha QR + NFC Pro da NexaWi.',
    featured: true,
    badge: 'Mais escolhida',
  },
  {
    name: 'Rede de unidades',
    price: 'Sob consulta',
    suffix: 'a partir de 5 placas',
    recurring: 'Condição especial por volume',
    description: 'Para redes, franquias e empresas que precisam acompanhar vários pontos.',
    features: [
      'Links separados por unidade',
      'Identificação de cada placa',
      'Visão consolidada dos acessos',
      'Implantação e configuração assistida',
    ],
    message: 'Olá! Quero uma proposta para várias plaquinhas NexaWi.',
  },
]

const trafficPlans = [
  {
    name: 'Tráfego Start',
    price: 'R$ 790',
    suffix: '/mês',
    description: 'Para negócios locais que precisam começar a anunciar com direção.',
    features: ['1 canal de anúncios', 'Até 4 campanhas/mês', 'Configuração de conversões', 'Relatório mensal'],
    message: 'Olá! Quero saber mais sobre o Tráfego Start.',
  },
  {
    name: 'Tráfego Growth',
    price: 'R$ 1.290',
    suffix: '/mês',
    description: 'Mais testes, criativos e acompanhamento para acelerar oportunidades.',
    features: ['Meta Ads + Google Ads', 'Até 8 campanhas/mês', 'Otimização semanal', 'Reunião estratégica mensal'],
    message: 'Olá! Quero saber mais sobre o Tráfego Growth.',
    featured: true,
    badge: 'Melhor custo-benefício',
  },
  {
    name: 'Performance',
    price: 'R$ 1.990',
    suffix: '/mês',
    description: 'Operação completa para empresas com maior volume e metas agressivas.',
    features: ['Estratégia multicanal', 'Testes contínuos', 'Dashboard de indicadores', 'Acompanhamento quinzenal'],
    message: 'Olá! Quero uma proposta de gestão de tráfego Performance.',
  },
]

const designPlans = [
  {
    name: 'Presença',
    price: 'R$ 490',
    suffix: '/mês',
    description: 'Uma comunicação organizada para manter sua empresa ativa nas redes.',
    features: ['8 artes mensais', 'Adaptação para stories', 'Calendário de conteúdo', '1 rodada de ajustes'],
    message: 'Olá! Quero conhecer o plano de Design Presença.',
  },
  {
    name: 'Movimento',
    price: 'R$ 790',
    suffix: '/mês',
    description: 'Mais variedade visual para campanhas, promoções e rotina comercial.',
    features: ['12 artes mensais', 'Stories e carrosséis', 'Peças para anúncios', '2 rodadas de ajustes'],
    message: 'Olá! Quero conhecer o plano de Design Movimento.',
    featured: true,
    badge: 'Para vender mais',
  },
  {
    name: 'Identidade visual',
    price: 'R$ 1.290',
    suffix: 'projeto único',
    description: 'A base visual para sua empresa parecer profissional em todos os pontos de contato.',
    features: ['Logo principal e variações', 'Paleta e tipografia', 'Manual visual essencial', 'Aplicações da marca'],
    message: 'Olá! Quero criar uma identidade visual para minha empresa.',
  },
]

const sitePlans = [
  {
    name: 'Landing Page Express',
    price: 'R$ 1.490',
    suffix: 'projeto único',
    description: 'Uma página direta para apresentar a oferta e transformar visitas em contatos.',
    features: ['Página responsiva', 'Copy comercial essencial', 'Botões de conversão', 'Publicação assistida'],
    message: 'Olá! Quero uma Landing Page Express para minha empresa.',
  },
  {
    name: 'Site Profissional',
    price: 'R$ 2.990',
    suffix: 'a partir de',
    description: 'Presença digital completa para explicar seus serviços e gerar confiança.',
    features: ['Até 5 páginas', 'Design responsivo', 'SEO técnico inicial', 'Formulário e WhatsApp'],
    message: 'Olá! Quero um site profissional para minha empresa.',
    featured: true,
    badge: 'Presença completa',
  },
  {
    name: 'Projeto sob medida',
    price: 'Sob consulta',
    suffix: 'escopo personalizado',
    description: 'Para catálogos, integrações, áreas exclusivas e operações mais complexas.',
    features: ['Arquitetura personalizada', 'Integrações necessárias', 'Painel ou automações', 'Planejamento por etapas'],
    message: 'Olá! Quero conversar sobre um projeto de site sob medida.',
  },
]

const faqItems = [
  {
    question: 'O QR Code da plaquinha deixa de funcionar se eu trocar o link?',
    answer:
      'Não. O QR Code é dinâmico: o destino pode ser alterado pelo sistema sem reimprimir a placa. Isso permite trocar a avaliação, promoção, cardápio ou página sempre que necessário.',
  },
  {
    question: 'A mensalidade da plaquinha é obrigatória?',
    answer:
      'A mensalidade mantém o link dinâmico, as métricas de acesso, a edição do destino e o suporte. Se você quiser apenas um QR estático, podemos avaliar uma produção sem plataforma, mas ele não poderá ser alterado depois.',
  },
  {
    question: 'O investimento dos anúncios está incluído na gestão de tráfego?',
    answer:
      'Não. A mensalidade remunera estratégia, configuração, acompanhamento e otimização. O valor investido em Meta ou Google é pago diretamente pela empresa nas plataformas de anúncios.',
  },
  {
    question: 'Domínio e hospedagem estão incluídos no site?',
    answer:
      'O desenvolvimento e a publicação assistida estão incluídos conforme o plano. Domínio, hospedagem e ferramentas pagas de terceiros são apresentados separadamente antes da contratação.',
  },
]

export default function ServicosPage() {
  return (
    <main className={`${poppins.className} min-h-screen overflow-hidden bg-[#050706] text-white selection:bg-[#69e52f]/30`}>
      <Header />

      <section className="relative isolate min-h-[760px] border-b border-white/10 pt-28 lg:pt-36">
        <div className="absolute inset-0 -z-20">
          <Image
            src="/servicos/hero-plaquinha-qr-nfc.png"
            alt="Plaquinha inteligente com QR Code e NFC em um balcão comercial"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[67%_center]"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050706_0%,rgba(5,7,6,0.98)_33%,rgba(5,7,6,0.72)_58%,rgba(5,7,6,0.18)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#050706_0%,transparent_38%)]" />

        <div className="mx-auto grid max-w-7xl px-5 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-28">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#69e52f]/25 bg-[#69e52f]/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#8cf45e] backdrop-blur-md">
              <Sparkles size={15} />
              Da presença ao resultado
            </div>

            <h1 className="text-4xl font-extrabold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Sua empresa pronta para ser
              <span className="block bg-gradient-to-r from-[#8cf45e] to-[#43b91e] bg-clip-text text-transparent">
                encontrada, lembrada e escolhida.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-neutral-300 sm:text-xl">
              Plaquinhas inteligentes, tráfego pago, design e páginas profissionais trabalhando juntos para colocar mais clientes no caminho do seu negócio.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappUrl('Olá! Quero entender qual solução da NexaWi faz mais sentido para minha empresa.')}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#69e52f] px-6 py-4 text-sm font-extrabold text-black shadow-[0_15px_45px_rgba(105,229,47,0.2)] transition hover:-translate-y-0.5 hover:bg-[#8cf45e]"
              >
                Quero uma proposta
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </a>
              <a
                href="#plaquinhas"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/25 px-6 py-4 text-sm font-bold text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
              >
                Ver todos os serviços
                <ChevronRight size={18} />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-neutral-300">
              <TrustItem>Atendimento consultivo</TrustItem>
              <TrustItem>Soluções para negócio local</TrustItem>
              <TrustItem>Implantação acompanhada</TrustItem>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080b09]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {[
            ['QR + NFC', 'Acesso rápido'],
            ['Mídia paga', 'Com estratégia'],
            ['Design', 'Com consistência'],
            ['Sites', 'Que convertem'],
          ].map(([title, text]) => (
            <div key={title} className="bg-[#080b09] px-5 py-7 text-center">
              <p className="text-lg font-extrabold text-white">{title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <ServiceSection
        id="plaquinhas"
        eyebrow="Produto de entrada"
        title="Plaquinhas que transformam um balcão em ponto de conversão."
        description="O cliente aponta a câmera ou aproxima o celular e chega direto à avaliação, cardápio, catálogo, promoção ou WhatsApp da empresa. O destino pode mudar; a placa continua a mesma."
        image="/servicos/hero-plaquinha-qr-nfc.png"
        imageAlt="Plaquinha de avaliação com QR Code e NFC"
        icon={QrCode}
        highlights={[
          { icon: Nfc, title: 'QR + NFC', text: 'Compatível com praticamente qualquer celular atual.' },
          { icon: MousePointerClick, title: 'Link dinâmico', text: 'Troque o destino sem reimprimir a placa.' },
          { icon: BarChart3, title: 'Acessos visíveis', text: 'Acompanhe quantas pessoas utilizaram cada placa.' },
          { icon: ShieldCheck, title: 'Código único', text: 'Identifique, edite e reimprima a unidade correta.' },
        ]}
        plans={plaquePlans}
        note="Produção, acabamento e frete podem variar conforme quantidade, material e região."
      />

      <ServiceSection
        id="trafego"
        eyebrow="Aquisição de clientes"
        title="Tráfego pago para sua empresa aparecer com intenção — não por acaso."
        description="Planejamos campanhas, configuramos a mensuração e otimizamos os anúncios para gerar conversas, pedidos, visitas e oportunidades reais para o seu negócio."
        image="/servicos/trafego-pago.png"
        imageAlt="Profissionais analisando resultados de campanhas de tráfego pago"
        icon={Megaphone}
        reverse
        highlights={[
          { icon: Target, title: 'Estratégia local', text: 'Público, região e oferta alinhados ao seu negócio.' },
          { icon: TrendingUp, title: 'Otimização', text: 'Decisões orientadas pelos resultados das campanhas.' },
          { icon: UsersRound, title: 'Mais oportunidades', text: 'Anúncios preparados para gerar contatos qualificados.' },
          { icon: BarChart3, title: 'Relatórios claros', text: 'Você sabe o que foi feito e o que está funcionando.' },
        ]}
        plans={trafficPlans}
        note="O investimento nas plataformas de anúncios é pago separadamente e definido junto com o cliente."
      />

      <ServiceSection
        id="design"
        eyebrow="Marca e comunicação"
        title="Design que faz sua empresa parecer tão profissional quanto ela realmente é."
        description="Construímos uma identidade visual coerente e peças que ajudam sua marca a comunicar valor, manter presença e sustentar campanhas comerciais."
        image="/servicos/design-grafico.png"
        imageAlt="Mesa de criação com identidade visual, materiais gráficos e dispositivos"
        icon={Brush}
        highlights={[
          { icon: Palette, title: 'Identidade', text: 'Cores, tipografia e linguagem visual reconhecíveis.' },
          { icon: Layers3, title: 'Conteúdo', text: 'Peças organizadas para feed, stories e campanhas.' },
          { icon: Smartphone, title: 'Formatos certos', text: 'Artes adaptadas para cada canal e objetivo.' },
          { icon: Sparkles, title: 'Percepção de valor', text: 'Apresentação consistente para gerar mais confiança.' },
        ]}
        plans={designPlans}
        note="Prazos e quantidade de revisões seguem o escopo contratado para manter a entrega previsível."
      />

      <ServiceSection
        id="sites"
        eyebrow="Estrutura para conversão"
        title="Landing pages e sites que explicam, convencem e facilitam o próximo passo."
        description="Criamos páginas rápidas, responsivas e pensadas para o celular. Sua oferta fica clara e o visitante encontra o caminho para pedir orçamento, comprar ou falar no WhatsApp."
        image="/servicos/sites-landing-pages.png"
        imageAlt="Site profissional exibido em computador, tablet e celular"
        icon={Globe2}
        reverse
        highlights={[
          { icon: Code2, title: 'Responsivo', text: 'Experiência consistente no celular e no computador.' },
          { icon: Rocket, title: 'Rápido', text: 'Estrutura otimizada para carregar sem enrolação.' },
          { icon: MousePointerClick, title: 'Com CTA', text: 'Cada bloco conduz o visitante para uma ação.' },
          { icon: Globe2, title: 'Pronto para divulgar', text: 'Publicação e configuração orientadas pela equipe.' },
        ]}
        plans={sitePlans}
        note="Domínio, hospedagem e licenças de terceiros são informados separadamente quando necessários."
      />

      <section className="relative border-y border-white/10 bg-[#080b09] py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(105,229,47,0.10),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <SectionHeading
            eyebrow="Combinações inteligentes"
            title="Você não precisa contratar tudo. Precisa começar pelo que destrava o próximo resultado."
            description="Montamos uma rota comercial coerente para o momento da sua empresa — e evoluímos por etapas."
            centered
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              {
                icon: Star,
                title: 'Reputação local',
                text: 'Plaquinha QR + NFC, destino para avaliações e acompanhamento de acessos.',
                cta: 'Quero mais avaliações',
              },
              {
                icon: Zap,
                title: 'Campanha pronta para vender',
                text: 'Landing page, peças de anúncio e gestão de tráfego trabalhando no mesmo objetivo.',
                cta: 'Quero gerar contatos',
              },
              {
                icon: Rocket,
                title: 'Presença completa',
                text: 'Identidade visual, site profissional e plano de divulgação para lançar ou reposicionar a empresa.',
                cta: 'Quero profissionalizar minha marca',
              },
            ].map((combo) => {
              const Icon = combo.icon
              return (
                <div key={combo.title} className="group rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-[#69e52f]/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#69e52f]/10 text-[#8cf45e]">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold">{combo.title}</h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-neutral-400">{combo.text}</p>
                  <a
                    href={whatsappUrl(`Olá! ${combo.cta}. Quero entender a melhor combinação de serviços.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#8cf45e]"
                  >
                    {combo.cta}
                    <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionHeading
              eyebrow="Como funciona"
              title="Sem pacote empurrado. Primeiro entendemos o negócio."
              description="Uma conversa curta é suficiente para identificar a prioridade e montar o primeiro passo."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['01', 'Diagnóstico', 'Entendemos seu público, objetivo, operação e o que já foi tentado.'],
                ['02', 'Prioridade', 'Escolhemos a solução com maior chance de gerar impacto agora.'],
                ['03', 'Implantação', 'Produzimos, configuramos e validamos cada entrega com você.'],
                ['04', 'Evolução', 'Acompanhamos o resultado e indicamos o próximo movimento.'],
              ].map(([number, title, text]) => (
                <div key={number} className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6">
                  <span className="text-xs font-extrabold tracking-[0.2em] text-[#69e52f]">{number}</span>
                  <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#080b09] py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
          <SectionHeading
            eyebrow="Perguntas frequentes"
            title="Tudo claro antes de contratar."
            description="Escopo, prazo, recorrência e custos externos são apresentados na proposta."
          />

          <div className="space-y-3">
            {faqItems.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 open:border-[#69e52f]/25">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-white">
                  {item.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#8cf45e] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl pr-10 text-sm leading-7 text-neutral-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,229,47,0.16),transparent_45%)]" />
        <div className="relative mx-auto max-w-5xl rounded-[2.5rem] border border-[#69e52f]/25 bg-[linear-gradient(135deg,rgba(105,229,47,0.11),rgba(255,255,255,0.025))] px-6 py-12 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:px-12 sm:py-16">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#8cf45e]">Vamos começar?</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-5xl">
            Conte onde sua empresa está hoje. A gente mostra o próximo passo.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
            Fale diretamente com a NexaWi e receba uma orientação inicial sem compromisso.
          </p>
          <a
            href={whatsappUrl('Olá! Vi a página de serviços da NexaWi e quero conversar sobre minha empresa.')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#69e52f] px-7 py-4 text-sm font-extrabold text-black transition hover:-translate-y-0.5 hover:bg-[#8cf45e]"
          >
            Conversar no WhatsApp
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <Footer />

      <a
        href={whatsappUrl('Olá! Quero conhecer os serviços da NexaWi.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a NexaWi pelo WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#69e52f] px-5 py-3 text-xs font-extrabold text-black shadow-[0_12px_45px_rgba(105,229,47,0.35)] transition hover:-translate-y-1 sm:bottom-7 sm:right-7"
      >
        <MousePointerClick size={17} />
        Falar agora
      </a>
    </main>
  )
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050706]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Página inicial da NexaWi" className="relative h-10 w-36 shrink-0 sm:w-40">
          <Image src="/Nexa-logo.png" alt="NexaWi" fill sizes="160px" className="object-contain object-left" />
        </Link>

        <nav aria-label="Navegação dos serviços" className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-semibold text-neutral-300 transition hover:text-[#8cf45e]">
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href={whatsappUrl('Olá! Quero receber uma proposta dos serviços da NexaWi.')}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-[#69e52f]/30 bg-[#69e52f]/10 px-4 py-3 text-xs font-extrabold text-[#8cf45e] transition hover:bg-[#69e52f] hover:text-black sm:px-5"
        >
          Pedir proposta
        </a>
      </div>
    </header>
  )
}

function ServiceSection({
  id,
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  icon: ServiceIcon,
  highlights,
  plans,
  note,
  reverse = false,
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-white/10 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#69e52f]/20 bg-[#69e52f]/10 text-[#8cf45e]">
              <ServiceIcon size={26} />
            </div>
            <SectionHeading eyebrow={eyebrow} title={title} description={description} />

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <Icon size={19} className="text-[#69e52f]" />
                    <h3 className="mt-4 font-extrabold">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_25px_90px_rgba(0,0,0,0.35)]">
            <Image src={image} alt={imageAlt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </div>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-neutral-600">
          Valores de referência. {note}
        </p>
      </div>
    </section>
  )
}

function PlanCard({ plan }) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-[2rem] border p-6 sm:p-7 ${
        plan.featured
          ? 'border-[#69e52f]/45 bg-[#69e52f]/[0.07] shadow-[0_20px_70px_rgba(105,229,47,0.08)]'
          : 'border-white/10 bg-white/[0.025]'
      }`}
    >
      {plan.badge ? (
        <span className="mb-5 w-fit rounded-full bg-[#69e52f] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-black">
          {plan.badge}
        </span>
      ) : null}
      <h3 className="text-xl font-extrabold">{plan.name}</h3>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-neutral-400">{plan.description}</p>
      <div className="mt-6">
        <p className="text-3xl font-extrabold tracking-tight text-white">{plan.price}</p>
        <p className="mt-1 text-xs font-semibold text-neutral-500">{plan.suffix}</p>
        <p className="mt-3 text-xs font-bold text-[#8cf45e]">{plan.recurring || '\u00a0'}</p>
      </div>
      <ul className="mt-7 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-neutral-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#69e52f]/10 text-[#8cf45e]">
              <Check size={13} strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <a
        href={whatsappUrl(plan.message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold transition hover:-translate-y-0.5 ${
          plan.featured
            ? 'bg-[#69e52f] text-black hover:bg-[#8cf45e]'
            : 'border border-white/15 bg-white/[0.03] text-white hover:border-[#69e52f]/35 hover:text-[#8cf45e]'
        }`}
      >
        Quero este plano
        <ArrowRight size={16} />
      </a>
    </article>
  )
}

function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={centered ? 'mx-auto max-w-4xl text-center' : ''}>
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#69e52f]">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-5xl">{title}</h2>
      <p className={`mt-5 text-sm leading-7 text-neutral-400 sm:text-base ${centered ? 'mx-auto max-w-3xl' : 'max-w-2xl'}`}>
        {description}
      </p>
    </div>
  )
}

function TrustItem({ children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Check size={16} className="text-[#69e52f]" strokeWidth={3} />
      {children}
    </span>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
        <div>
          <div className="relative h-9 w-32">
            <Image src="/Nexa-logo.png" alt="NexaWi" fill sizes="128px" className="object-contain object-left" />
          </div>
          <p className="mt-3 text-xs text-neutral-600">Tecnologia, presença e resultado para negócios locais.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-5 text-xs font-semibold text-neutral-500">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[#8cf45e]">
              {item.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-neutral-700">© {new Date().getFullYear()} NexaWi.</p>
      </div>
    </footer>
  )
}
