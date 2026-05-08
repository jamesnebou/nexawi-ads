"use client";
import PlanosSection from '@/components/PlanosSection'
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from 'lucide-react'; // Importe o ícone ChevronDown
import { useMemo } from 'react'
import { usePathname } from 'next/navigation'




function resolveSlugFromPathname(pathname = '/') {
  const cleaned = String(pathname || '/').split('?')[0].split('#')[0]
  const parts = cleaned.split('/').filter(Boolean)

  if (parts.length === 1) {
    return parts[0].toLowerCase()
  }

  return ''
}

// Componente Modal
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#050505] border border-white/10 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 text-gray-300 text-sm md:text-base leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};




/// Componente individual de item do FAQ
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 py-4">
      <button
        className="flex justify-between items-center w-full text-left text-lg font-semibold text-white hover:text-[#6be12f] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
        <ChevronDown
          className={`h-5 w-5 transform transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="mt-2 text-gray-400 text-sm md:text-base leading-relaxed animate-fade-in-up">
          {answer}
        </div>
      )}
    </div>
  );
};

// Lista de perguntas e respostas do FAQ
const faqs = [
  {
    question: 'O que realmente é o Wi-Fi Grátis da NexaWi ADS?',
    answer: 'É uma solução inovadora que transforma o Wi-Fi gratuito em um canal de marketing. Um ecossistema de manipulação de mídia geolocalizada, focada em mostrar a sua empresa a pessoas que querem utilizar uma  internet de alta velocidade em vias de grande circulação. Seus clientes acessam a internet após visualizar um anúncio da sua marca, gerando visibilidade e dados valiosos para o seu negócio.',
  },
  {
    question: 'Como eu vou aparecer para o meu cliente, se eu aderir ser Nexa?',
    answer: 'A NexaWi oferece internet totalmente gratuita nos pricipais pontos da cidade, o seu cliente que não quer utilizar os seus dados móveis ou está sem intenet, acessa essa rede e precisa assistir um anúncio da sua empresa para ter a internet liberada. Assim coletamos os dados dela e se torna um Lead de alto potencial para seu negócio.',
  },
  {
    question: 'Como a NexaWi ADS pode ajudar meu negócio a crescer?',
    answer: 'Ao anunciar na nossa rede, você alcança um público altamente segmentado e engajado, que está fisicamente presente em locais estratégicos e ao lado do seu negócio. Isso aumenta o reconhecimento da sua marca, gera tráfego qualificado para seu site ou loja física e permite a coleta de leads para futuras campanhas.',
  },
  {
    question: 'Quais são os benefícios de anunciar com a NexaWi ADS?',
    answer: 'Os principais benefícios incluem: aumento da visibilidade da marca, geração de leads qualificados, segmentação precisa do público, acesso a dados de comportamento do consumidor, campanhas de marketing localizadas e um excelente retorno sobre o investimento (ROI).',
  },
  {
    question: 'Como funciona a segmentação de público?',
    answer: 'Nossa plataforma permite segmentar seu público com base em localização geográfica (onde o hotspot está instalado), dados demográficos (se coletados no cadastro do Wi-Fi), interesses e comportamento de navegação, garantindo que seu anúncio seja visto pelas pessoas certas.',
  },
  {
    question: 'Posso acompanhar o desempenho dos meus anúncios?',
    answer: 'Sim! Oferecemos um painel de controle intuitivo onde você pode acompanhar em tempo real métricas importantes como número de visualizações, cliques (CTAs), tempo de exibição e dados de engajamento dos seus anúncios.',
  },
  {
    question: 'Qual o custo para anunciar?',
    answer: 'Nossos planos são flexíveis e adaptados às suas necessidades e orçamento. Entre em contato conosco para solicitar uma proposta personalizada e descobrir a melhor solução para sua marca.',
  },
  {
    question: 'Como faço para começar a anunciar?',
    answer: 'É simples! Preencha nosso formulário de contato, e um de nossos especialistas entrará em contato para entender suas necessidades, apresentar as melhores opções e configurar sua primeira campanha.',
  },
];

// --- FIM DO CÓDIGO DO FAQ ---



const handleSubmitContact = async (e) => {
  e.preventDefault();

  setContactSuccess(null);
  setContactError(null);
  setIsSendingContact(true);

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contactName,
        phone: contactPhone,
        email: contactEmail,
        city: contactCity,
      }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      console.error("Erro ao converter resposta em JSON:", err);
    }

    if (!res.ok || data.ok === false) {
      throw new Error(
        (data && data.message) ||
          "Erro ao enviar mensagem. Tente novamente em instantes."
      );
    }

    setContactSuccess(
      "Mensagem enviada com sucesso! Em breve, um consultor NexaWi falará com você."
    );
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setContactCity("");
  } catch (err) {
    console.error("Erro no envio do formulário:", err);
    setContactError(
      err.message || "Não foi possível enviar sua mensagem. Tente novamente."
    );
  } finally {
    setIsSendingContact(false);
  }
};

export default function LandingPage() {
  // Variáveis de Estado para a Barra de Status ao Vivo
  const [onlineUsers, setOnlineUsers] = useState(124);
  const [leadsToday, setLeadsToday] = useState(47);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuickOpen, setMobileQuickOpen] = useState(false);

  // Estados para controlar a visibilidade dos Modals
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  // Estados do formulário de contato
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCity, setContactCity] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(null);
  const [contactError, setContactError] = useState(null);

// Controla a edição dentro da DashBoard da Headline, subgeadline, cta, e imagem
  const pathname = usePathname()

const [landingConfig, setLandingConfig] = useState({
  badge_topo: 'O seu novo Outdoor Digital',
  headline: 'Você está ignorando O ÚNICO CLIENTE na porta do seu negócio.',
  subheadline:
    'Enquanto você briga por atenção na internet, nós fazemos você aparecer exatamente pra quem já está perto do seu negócio — com o celular na mão.',
  cta_primaria: 'Quero ser visto pelo meu cliente',
  cta_secundaria: 'Como funciona isso?',
  whatsapp_destino: 'https://wa.me/77988656394',
  cidade_nome: '',
  hero_titulo_linha_1: 'Você está ignorando',
  hero_titulo_linha_2: 'O ÚNICO CLIENTE',
  hero_titulo_linha_3: 'na porta do seu negócio.',
  hero_subtitulo_linha_1: 'O cliente usa a internet, a sua marca aparece na tela dele.',
  hero_subtitulo_linha_2: 'Simples, inevitável e 100% local.',
  hero_titulo_linha_2_estilo: 'gradiente',
})

const currentSlug = useMemo(() => resolveSlugFromPathname(pathname), [pathname])
  


useEffect(() => {
  let ativo = true

  async function carregarLandingConfig() {
    try {
      const query = currentSlug ? `?slug=${encodeURIComponent(currentSlug)}` : ''
      const response = await fetch(`/api/landing-config${query}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar configuração da landing')
      }

      if (ativo && data?.config) {
        setLandingConfig((prev) => ({
          ...prev,
          ...data.config,
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar configuração da landing:', error)
    }
  }

  carregarLandingConfig()

  return () => {
    ativo = false
  }
}, [currentSlug])


  // Efeito para simular os números mudando em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => prev + Math.floor(Math.random() * 5) - 2);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Efeito que simula a variação em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => prev + Math.floor(Math.random() * 5) - 2);
      if (Math.random() > 0.7) {
        setLeadsToday((prev) => prev + 1);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Efeito para animar elementos ao rolar a tela (Vai e Volta)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-8");
          } else {
            entry.target.classList.remove("opacity-100", "translate-y-0");
            entry.target.classList.add("opacity-0", "translate-y-8");
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    const hiddenElements = document.querySelectorAll(".reveal-on-scroll");
    hiddenElements.forEach((el) => observer.observe(el));

    return () => hiddenElements.forEach((el) => observer.unobserve(el));
  }, []);

  // Handlers para abrir os Modals (com stopPropagation)
  const handleOpenTerms = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTermsPopup(true);
  };

  const handleOpenPrivacy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPrivacyPopup(true);
  };

  const handleOpenContact = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContactPopup(true);
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-[#6be12f] selection:text-black font-sans overflow-x-hidden">
      {/* GRADE GLOBAL (fundo) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* CONTEÚDO */}
      <div className="relative z-10">
        {/* animações customizadas */}
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
          }
          @keyframes sweep {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(860%) skewX(-50deg); }
          }
        `}</style>

        {/* Navbar */}
<nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300">
  <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-6 py-2">
    {/* Logo */}
    <Link
      href="/login"
      className="flex items-center transition-transform duration-300 hover:scale-105 hover:opacity-80"
    >
      <img
        src="/Nexa-logo.png"
        alt="Logo da Empresa"
        className="h-14 md:h-20 w-auto object-contain"
      />
    </Link>

    {/* MENU DESKTOP */}
    <div className="hidden md:flex items-center gap-6">
      <Link
        href="/cliente/dashboard"
        className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
      >
        Portal do Cliente
      </Link>
      <a
        href="https://wa.me/77988656394"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-black bg-[#6be12f] px-5 py-2.5 rounded-xl hover:opacity-90 hover:shadow-[0_0_20px_rgba(107,225,47,0.6)] transition-all duration-300"
      >
        Falar com um consultor Nexa
      </a>
    </div>

    {/* BOTÃO MOBILE – CHAMATIVO */}
    <button
      type="button"
      className="md:hidden flex items-center gap-2 px-3 py-2 rounded-full bg-[#6be12f] text-black text-[11px] font-extrabold shadow-[0_0_18px_rgba(107,225,47,0.7)] active:scale-95 transition-all"
      onClick={() => setMobileQuickOpen((prev) => !prev)}
    >
      <span className="w-2 h-2 rounded-full bg-black/80" />
      <span>Portal / Consultor</span>
      {/* ícone hambúrguer minúsculo */}
      <span className="flex flex-col justify-between h-3">
        <span className="w-3 h-[2px] bg-black rounded" />
        <span className="w-3 h-[2px] bg-black rounded" />
      </span>
    </button>
  </div>

  {/* DROPDOWN MOBILE (abre ao clicar no botão verde) */}
  {mobileQuickOpen && (
    <div className="md:hidden border-t border-white/10 bg-black/95">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-3">
        <Link
          href="/cliente/dashboard"
          className="w-full text-xs font-bold text-gray-200 py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#6be12f] hover:bg-white/10 transition-colors text-left"
          onClick={() => setMobileQuickOpen(false)}
        >
          Portal do Cliente
        </Link>
        <a
          href="https://wa.me/77988656394"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-xs font-bold text-black py-2.5 px-3 rounded-lg bg-[#6be12f] hover:bg-[#8cf059] hover:shadow-[0_0_22px_rgba(107,225,47,0.7)] transition-all text-center"
          onClick={() => setMobileQuickOpen(false)}
        >
          Falar com um consultor Nexa
        </a>
      </div>
    </div>
  )}
</nav>

        {/* Hero */}
        <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-6 pt-32 md:pt-40 pb-16 md:pb-20 max-w-7xl mx-auto gap-10 md:gap-16">
          {/* Coluna Esquerda */}
          <div className="w-full max-w-[640px]">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[#8cf059] text-xs sm:text-sm font-bold mb-6 sm:mb-8 shadow-[0_0_30px_rgba(107,225,47,0.1)] hover:border-[#6be12f]/50 transition-all cursor-default">
              <span className="w-2 h-2 rounded-full bg-[#6be12f] animate-ping" />
              {landingConfig.badge_topo}
            </div>

<h1 className="mb-8 max-w-[640px] leading-[0.95] tracking-[-0.04em]">
    <span className="block whitespace-nowrap text-white text-[clamp(2rem,3vw,4rem)] font-extrabold">
    {landingConfig.hero_titulo_linha_1}
  </span>

  <span className="block mt-3 whitespace-nowrap">
    {landingConfig.hero_titulo_linha_2_estilo === 'faixa' ? (
      <span className="inline-block whitespace-nowrap bg-[#6be12f] text-black px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-[4px] text-[clamp(2.2rem,3.8vw,4.4rem)] font-extrabold leading-[0.95]">
        {landingConfig.hero_titulo_linha_2}
      </span>
    ) : (
      <span className="inline-block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-[#8cff4a] via-[#6be12f] to-[#47c91a] text-[clamp(2.2rem,3.8vw,4.4rem)] font-extrabold leading-[0.95]">
        {landingConfig.hero_titulo_linha_2}
      </span>
    )}
  </span>

  <span className="block mt-3 max-w-[640px] text-white text-[clamp(2rem,3vw,4rem)] font-extrabold leading-[0.95] break-words">
    {landingConfig.hero_titulo_linha_3}
  </span>
</h1>

<div className="mb-8 md:mb-10 max-w-[640px]">
    <p className="text-white text-[clamp(1.08rem,1.5vw,1.52rem)] leading-[1.42] font-bold">
        {landingConfig.hero_subtitulo_linha_1}
  </p>

  <p className="text-white/62 text-[clamp(0.98rem,1.24vw,1.2rem)] leading-[1.5] mt-2 font-medium">
    {landingConfig.hero_subtitulo_linha_2}
  </p>
</div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full sm:w-auto justify-center lg:justify-start">
              <a
                href="#planos"
                className="group relative px-7 sm:px-8 py-3.5 sm:py-4 bg-[#6be12f] text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(107,225,47,0.6)] hover:shadow-[0_0_50px_rgba(107,225,47,0.6)] transition-all duration-300 hover:-translate-y-1 text-center overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {landingConfig.cta_primaria}
              </a>
              <a
                href="#como-funciona"
                className="px-7 sm:px-8 py-3.5 sm:py-4 bg-white/5 backdrop-blur-md text-white font-bold rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 text-center"
              >
                {landingConfig.cta_secundaria}
              </a>
            </div>

            
          </div>

          {/* Coluna Direita: Mockup */}
          <div
            className="flex-1 flex justify-center lg:justify-end relative"
            style={{ animation: "float 6s ease-in-out infinite" }}
          >
            <div className="absolute inset-0 bg-[#6be12f]/20 blur-[100px] rounded-full" />
            <img
             src={landingConfig.hero_imagem_url || '/mockup-celular.png'}
             alt="Mockup do Sistema"
             className="relative z-10 w-full max-w-[320px] sm:max-w-[350px] md:max-w-[400px] h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </main>
        

        {/* Alta Conversão */}
        <section
          id="alta-conversao"
          className="relative z-10 py-20 md:py-32 px-6 max-w-7xl mx-auto"
        >
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">


            
            {/* Imagem */}
            <div className="w-full md:w-1/2 relative">
              <div className="absolute inset-0 bg-[#6be12f]/10 blur-[80px] rounded-full" />
              {/* Badge Prova Social */}
            <div className=" relative overflow-hidden mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 bg-white/5 border border-white/10 backdrop-blur-md px-4 sm:px-8 md:px-12 py-5 rounded-2xl shadow-2xl w-full sm:w-auto mx-auto lg:mx-0">
              <div
                className="absolute top-0 left-0 h-full w-[80px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                style={{animation: "sweep 3s ease-in-out infinite alternate" }}
              />

              {/* Pessoas Online */}
              <div className="relative z-10 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6be12f] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6be12f]" />
                </span>
                <p className="text-gray-400 text-sm font-medium">
                  <strong className="text-white text-lg sm:text-xl font-black">
                    {onlineUsers}
                  </strong>{" "}
                  online agora
                </p>
              </div>

              <div className="relative z-10 w-px h-8 bg-white/10 hidden sm:block" />

              {/* Leads Gerados */}
              <div className="relative z-10 flex items-center gap-3">
                <span className="text-[#6be12f] bg-[#6be12f]/10 p-1.5 rounded-lg">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </span>
                <p className="text-gray-400 text-sm font-medium">
                  <strong className="text-white text-lg sm:text-xl font-black">
                    {leadsToday}
                  </strong>{" "}
                  leads hoje
                </p>
              </div>
            </div>
            <p> </p>
              <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
                <img
                  src="/ambiente-real.jpg"
                  alt="Pessoa conectando ao Wi-Fi"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 
             bg-white/10 backdrop-blur-md px-6 py-3 rounded-full 
             border border-white/20 text-white font-bold text-sm 
             shadow-lg group-hover:scale-105 transition-transform duration-300
             inline-flex items-center justify-center whitespace-nowrap"
                  >
              +15.000 conexões mensais!
             </div>
              </div>
            </div>

            {/* Textos */}
            <div className="w-full md:w-1/2 text-left mt-8 md:mt-0">
              <span className="text-[#6be12f] font-mono text-xs sm:text-sm font-bold tracking-widest mb-4 block">
                ALTA CONVERSÃO
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                O outdoor que ninguém consegue ignorar...
              </h2>
              <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed mb-8">
                A NexaWi transforma Wi-Fi em pontos estratégicos de publicidade.
                <p>A sua marca aparece <b>na tela dele</b></p>
                <p>Sem disputa.</p>
                <p>Sem distração.</p>
                 <p>Sem algoritmo.</p>
                 <p><b>Só você… e a atenção dele.</b></p>
                 </p>
              <ul className="space-y-4 text-gray-300 text-sm sm:text-base md:text-lg">
               
                <li className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-[#6be12f]"
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
                  Anúncios impossíveis de pular.
                </li>
                <li className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-[#6be12f]"
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
                  Resultados mensuráveis e transparentes.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section
          id="como-funciona"
          className="py-20 md:py-32 bg-black relative overflow-hidden"
        >
          {/* grade */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[600px] bg-[#6be12f]/5 blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16 md:mb-24 reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 md:mb-6 tracking-tight">
                Como o sistema funciona?
              </h2>
              <p className="text-gray-400 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto">
                Um fluxo invisível, automático e altamente lucrativo.
              </p>
            </div>

           <div className="relative bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-10 md:p-24 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px]" />
  <div className="absolute left-[40px] sm:left-[55px] md:left-1/2 top-24 bottom-24 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent md:-translate-x-1/2" />

  {/* FASE 01 */}
  <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-16 md:mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
    <div className="md:w-1/2 md:pr-24 text-left pl-16 sm:pl-20 md:pl-0">
      <span className="text-[#6be12f] font-mono text-xs sm:text-sm md:text-[20px] font-bold tracking-widest mb-3 sm:mb-4 block">
        FASE 01
      </span>
      <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
        A Busca por Conexão
      </h3>
      <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed">
        O público na sua região precisa de internet ou não quer usar os dados móveis e encontra a
        rede aberta da NexaWi disponível.
      </p>
    </div>

    <div
      className="absolute 
                 left-[20px] sm:left-[55px] md:left-1/2 
                 -translate-x-1/2 md:-translate-x-1/2
                 top-16 sm:top-14 md:top-0
                 w-10 h-10 sm:w-12 sm:h-12
                 bg-black border-2 border-white/10 rounded-full z-10
                 flex items-center justify-center
                 group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)]
                 transition-all duration-500"
    >
      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500" />
    </div>
  
                <div className="hidden md:block md:w-1/2" />
              </div>

              {/* FASE 02 */}
              <div className="relative flex flex-col md:flex-row-reverse items-start md:items-center justify-between mb-16 md:mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pl-24 text-left pl-16 sm:pl-20 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-xs sm:text-sm md:text-[20px] font-bold tracking-widest mb-3 sm:mb-4 block">
                    FASE 02
                  </span>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
                    Wi-Fi Grátis Nexa
                  </h3>
                  <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed">
                    A NexaWi fornece o acesso gratuito, atraindo a atenção
                    imediata do cliente.
                  </p>
                </div>
                <div className="absolute 
            left-[20px] sm:left-[55px] md:left-1/2 
            -translate-x-1/2 md:-translate-x-1/2
            top-16 sm:top-14 md:top-0
            w-10 h-10 sm:w-12 sm:h-12
            bg-black border-2 border-white/10 rounded-full z-10
            flex items-center justify-center
            group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)]
            transition-all duration-500">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500" />
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>

              {/* FASE 03 */}
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-16 md:mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pr-24 text-left pl-16 sm:pl-20 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-xs sm:text-sm md:text-[20px] font-bold tracking-widest mb-3 sm:mb-4 block">
                    FASE 03
                  </span>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
                    Captura de Dados
                  </h3>
                  <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed">
                    Para conectar, o cliente preenche um cadastro rápido (Nome, WhatsApp, E-mail) e assina o termo LGPD.
                  </p>
                </div>
                <div className="absolute 
            left-[20px] sm:left-[55px] md:left-1/2 
            -translate-x-1/2 md:-translate-x-1/2
            top-16 sm:top-14 md:top-0
            w-10 h-10 sm:w-12 sm:h-12
            bg-black border-2 border-white/10 rounded-full z-10
            flex items-center justify-center
            group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)]
            transition-all duration-500">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500" />
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>

              {/* FASE 04 */}
              <div className="relative flex flex-col md:flex-row-reverse items-start md:items-center justify-between mb-16 md:mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pl-24 text-left pl-16 sm:pl-20 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-xs sm:text-sm md:text-[20px] font-bold tracking-widest mb-3 sm:mb-4 block">
                    FASE 04
                  </span>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
                    Anúncio Inpulável
                  </h3>
                  <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed">
                    A NexaWi exibe o anúncio da sua empresa. O cliente assiste
                    com 100% de atenção. E sabemos exatamente quem clicou no seu anúcio.
                  </p>
                </div>
                <div className="absolute 
            left-[20px] sm:left-[55px] md:left-1/2 
            -translate-x-1/2 md:-translate-x-1/2
            top-16 sm:top-14 md:top-0
            w-10 h-10 sm:w-12 sm:h-12
            bg-black border-2 border-white/10 rounded-full z-10
            flex items-center justify-center
            group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)]
            transition-all duration-500">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500" />
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>

              {/* FASE 05 */}
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-16 md:mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pr-24 text-left pl-16 sm:pl-20 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-xs sm:text-sm md:text-[20px] font-bold tracking-widest mb-3 sm:mb-4 block">
                    FASE 05
                  </span>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
                    Redirecionamento
                  </h3>
                  <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed">
                    Após o anúncio, ele tem a opção de ser direcionado para o
                    seu site ou WhatsApp. Depois de qualquer uma das ações, a internet será liberada.
                  </p>
                </div>
                <div className="absolute 
            left-[20px] sm:left-[55px] md:left-1/2 
            -translate-x-1/2 md:-translate-x-1/2
            top-16 sm:top-14 md:top-0
            w-10 h-10 sm:w-12 sm:h-12
            bg-black border-2 border-white/10 rounded-full z-10
            flex items-center justify-center
            group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)]
            transition-all duration-500">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500" />
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>

              {/* FASE 06 */}
              <div className="relative flex flex-col md:flex-row-reverse items-start md:items-center justify-between group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pl-24 text-left pl-16 sm:pl-20 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-xs sm:text-sm md:text-[20px] font-bold tracking-widest mb-3 sm:mb-4 block">
                    FASE 06
                  </span>
                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#6be12f] mb-3 sm:mb-4">
                    Internet Liberada
                  </h3>
                  <p className="text-gray-300 text-lg sm:text-xl md:text-2xl leading-relaxed">
                    O cliente navega feliz, e você ganha um lead qualificado e
                    alto impacto de marca. A cada 10 minutos um novo anúcio para o usuário.
                  </p>
                </div>
                <div className="absolute 
            left-[20px] sm:left-[55px] md:left-1/2 
            -translate-x-1/2 md:-translate-x-1/2
            top-16 sm:top-14 md:top-0
            w-10 h-10 sm:w-12 sm:h-12
            bg-black border-2 border-white/10 rounded-full z-10
            flex items-center justify-center
            group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)]
            transition-all duration-500">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#6be12f] rounded-full shadow-[0_0_10px_#6be12f]" />
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>
            </div>
          </div>
        </section>


 {/* Seção de Benefícios */}
        <section
          id="beneficios"
          className="relative z-10 px-6 py-16 md:py-20 max-w-7xl mx-auto text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Por que anunciar com a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8cf059] to-[#46a31a]">
              NexaWi ADS
            </span>
            ?
          </h2>
          <p className="text-base sm:text-lg text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Mais do que um anúncio, uma estratégia inteligente para o seu
            negócio.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {/* Benefício 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 delay-100">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8cf059] to-[#46a31a] text-black text-3xl font-bold mb-6 mx-auto shadow-[0_0_20px_rgba(107,225,47,0.6)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-target"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Público Altamente Segmentado
              </h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Seu anúncio é exibido para pessoas que estão fisicamente
                próximas ao seu negócio, aumentando a relevância e a chance de
                conversão.
              </p>
            </div>

            {/* Benefício 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 delay-200">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8cf059] to-[#46a31a] text-black text-3xl font-bold mb-6 mx-auto shadow-[0_0_20px_rgba(107,225,47,0.6)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-trending-up"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Aumento de Visibilidade e Vendas
              </h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Transforme o tempo de espera do cliente em oportunidade de
                venda, apresentando sua marca de forma impactante e direta.
              </p>
            </div>

            {/* Benefício 3 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 delay-300">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8cf059] to-[#46a31a] text-black text-3xl font-bold mb-6 mx-auto shadow-[0_0_20px_rgba(107,225,47,0.6)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-bar-chart-2"
                >
                  <line x1="18" x2="18" y1="20" y2="10" />
                  <line x1="12" x2="12" y1="20" y2="4" />
                  <line x1="6" x2="6" y1="20" y2="14" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Métricas e Resultados Reais
              </h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Acompanhe o desempenho dos seus anúncios com relatórios
                detalhados, otimizando suas campanhas para o máximo ROI.
              </p>
            </div>

            {/* Benefício 4 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 delay-400">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8cf059] to-[#46a31a] text-black text-3xl font-bold mb-6 mx-auto shadow-[0_0_20px_rgba(107,225,47,0.6)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-users"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Geração de Leads Qualificados
              </h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Capture dados de contato de clientes interessados, construindo
                sua base de leads para futuras ações de marketing.
              </p>
            </div>

            {/* Benefício 5 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 delay-500">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8cf059] to-[#46a31a] text-black text-3xl font-bold mb-6 mx-auto shadow-[0_0_20px_rgba(107,225,47,0.6)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-map-pin"
                >
                  <path d="M12 12a5 5 0 1 0 0-10a5 5 0 0 0 0 10Z" />
                  <path d="M12 22s-8-4-8-10a8 8 0 0 1 16 0c0 6-8 10-8 10Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Marketing Localizado e Eficaz
              </h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Alcance consumidores no momento e local certos, quando estão
                mais propensos a interagir com ofertas e serviços locais.
              </p>
            </div>

            {/* Benefício 6 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 delay-600">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8cf059] to-[#46a31a] text-black text-3xl font-bold mb-6 mx-auto shadow-[0_0_20px_rgba(107,225,47,0.6)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-dollar-sign"
                >
                  <line x1="12" x2="12" y1="2" y2="22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Excelente Retorno sobre Investimento
              </h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Com um custo-benefício superior às mídias tradicionais, você
                maximiza seu investimento em publicidade com resultados
                mensuráveis.
              </p>
            </div>
          </div>
        </section>


        {/* Planos */}
        <PlanosSection />


 {/* SEÇÃO DE FAQ em caixa de videro */}
        <section className="relative z-20 py-16 md:py-24">
  <div className="max-w-4xl mx-auto px-6 ">   
    <div className=" bg-white/5 bg-opacity-20 border border-[#6be12f] rounded-3xl p-8 md:p-12 shadow-1xl ">
     
      {/* SEÇÃO DE FAQ dentro da seção caixa de videro */}
        <section
          id="faq"
          className="relative z-10 px-6 py-16 md:py-20 max-w-7xl mx-auto reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-12 text-center leading-tight">
            Perguntas Frequentes
          </h2>

          <div className="max-w-3xl mx-auto">
            {faqs.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>
        </section>
      <div className="flex justify-center">
        <a
          href="#contato"
          className="px-8 py-4 bg-[#6be12f] text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(107,225,47,0.6)] hover:shadow-[0_0_50px_rgba(107,225,47,0.6)] transition-all duration-300 hover:-translate-y-1"
        >
          Fale com um dos nossos consultores!
        </a>
      </div>
    </div>
  </div>
</section>


        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md py-4 mt-16 md:mt-20">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <Link
                href="/login"
                className="flex items-center transition-transform duration-300 hover:scale-105 hover:opacity-80"
              >
                <img
                  src="/NexaWI-logo-simplificada.png"
                  alt="Logo da Empresa"
                  className="h-14 md:h-20 w-auto object-contain"
                />
              </Link>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm text-center">
              © 2026 NexaWi ADS. Todos os direitos reservados.
            </p>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-gray-400">
              <a
                href="#"
                onClick={handleOpenTerms}
                className="hover:text-[#8cf059] transition-colors"
              >
                Termos de Uso
              </a>
              <a
                href="#"
                onClick={handleOpenPrivacy}
                className="hover:text-[#8cf059] transition-colors"
              >
                Privacidade
              </a>
              <a
                href="#"
                onClick={handleOpenContact}
                className="hover:text-[#8cf059] transition-colors"
              >
                Contato
              </a>
            </div>
          </div>
        </footer>

        {/* Botão Flutuante WhatsApp */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group">
          <div className="absolute inset-0 bg-[#6be12f] rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
          <a
            href="https://wa.me/77988656394"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[#6be12f] text-black rounded-full shadow-[0_0_20px_rgba(107,225,47,0.4)] hover:shadow-[0_0_40px_rgba(107,225,47,0.8)] transition-all duration-300 hover:-translate-y-2"
          >
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>

          <div className="absolute right-20 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-2 bg-black/90 backdrop-blur-md border border-white/10 text-white text-xs sm:text-sm font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-2xl">
            Fale com um consultor
          </div>
        </div>
      </div>



      

      {/* Modals */}
      <Modal
        isOpen={showTermsPopup}
        onClose={() => setShowTermsPopup(false)}
        title="Termos de Uso"
      >
        <p className="mb-4">
          Bem-vindo aos Termos de Uso da NexaWi ADS. Ao acessar e utilizar
          nossos serviços, você concorda em cumprir e estar vinculado aos
          seguintes termos e condições.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          1. Aceitação dos Termos
        </h3>
        <p className="mb-4">
          Estes Termos de Uso (&quot;Termos&quot;) regem seu acesso e uso dos
          serviços, websites e aplicativos oferecidos pela NexaWi ADS
          (&quot;NexaWi&quot;, &quot;nós&quot;, &quot;nosso&quot;). Ao acessar
          ou usar os Serviços, você concorda em estar vinculado a estes Termos
          e a todas as políticas e diretrizes incorporadas por referência.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          2. Alterações nos Termos
        </h3>
        <p className="mb-4">
          A NexaWi reserva-se o direito de modificar ou revisar estes Termos a
          qualquer momento, a seu exclusivo critério. Quaisquer alterações
          entrarão em vigor imediatamente após a publicação dos Termos revisados
          em nosso site. Seu uso continuado dos Serviços após a publicação de
          quaisquer alterações constitui sua aceitação dessas alterações.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">3. Uso dos Serviços</h3>
        <p className="mb-4">
          Você concorda em usar os Serviços apenas para fins lícitos e de
          maneira que não infrinja os direitos de, ou restrinja ou iniba o uso e
          o desfrute dos Serviços por terceiros. Comportamento proibido inclui
          assediar ou causar angústia ou inconveniência a qualquer outra pessoa,
          transmitir conteúdo obsceno ou ofensivo ou interromper o fluxo normal
          de diálogo dentro dos Serviços.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          4. Propriedade Intelectual
        </h3>
        <p className="mb-4">
          Todo o conteúdo e materiais disponíveis nos Serviços, incluindo, mas
          não se limitando a texto, gráficos, logotipos, ícones, imagens,
          clipes de áudio, downloads digitais, compilações de dados e software,
          são propriedade da NexaWi ou de seus fornecedores de conteúdo e são
          protegidos por leis de direitos autorais internacionais.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          5. Limitação de Responsabilidade
        </h3>
        <p className="mb-4">
          Em nenhuma circunstância a NexaWi será responsável por quaisquer
          danos diretos, indiretos, incidentais, especiais, consequenciais ou
          exemplares, incluindo, mas não se limitando a, danos por perda de
          lucros, boa vontade, uso, dados ou outras perdas intangíveis (mesmo
          que a NexaWi tenha sido avisada da possibilidade de tais danos),
          resultantes de:
        </p>
        <ul className="list-disc list-inside mb-4 pl-4">
          <li>O uso ou a incapacidade de usar os Serviços;</li>
          <li>
            O custo de aquisição de bens e serviços substitutos resultantes de
            quaisquer bens, dados, informações ou serviços adquiridos ou
            obtidos ou mensagens recebidas ou transações realizadas através ou a
            partir dos Serviços;
          </li>
          <li>Acesso não autorizado ou alteração de suas transmissões ou dados;</li>
          <li>Declarações ou conduta de qualquer terceiro nos Serviços; ou</li>
          <li>Qualquer outro assunto relacionado aos Serviços.</li>
        </ul>
        <h3 className="text-xl font-bold text-white mb-2">6. Indenização</h3>
        <p className="mb-4">
          Você concorda em indenizar e isentar a NexaWi e suas afiliadas,
          diretores, agentes, funcionários e parceiros de qualquer reivindicação
          ou demanda, incluindo honorários advocatícios razoáveis, feita por
          qualquer terceiro devido ou decorrente de seu uso dos Serviços, sua
          violação destes Termos ou sua violação de quaisquer direitos de outra
          pessoa ou entidade.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">7. Lei Aplicável</h3>
        <p className="mb-4">
          Estes Termos serão regidos e interpretados de acordo com as leis do
          Brasil, sem levar em consideração seus princípios de conflito de
          leis. Você concorda em se submeter à jurisdição pessoal e exclusiva
          dos tribunais localizados no Brasil para a resolução de quaisquer
          disputas decorrentes destes Termos ou dos Serviços.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">8. Contato</h3>
        <p>
          Se você tiver alguma dúvida sobre estes Termos, entre em contato
          conosco através do nosso formulário de contato ou e-mail.
        </p>
      </Modal>

      <Modal
        isOpen={showPrivacyPopup}
        onClose={() => setShowPrivacyPopup(false)}
        title="Política de Privacidade"
      >
        <p className="mb-4">
          A sua privacidade é de extrema importância para a NexaWi ADS. Esta
          Política de Privacidade descreve como coletamos, usamos, processamos e
          divulgamos suas informações, incluindo dados pessoais, em conexão com
          seu acesso e uso da plataforma NexaWi ADS.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          1. Informações que Coletamos
        </h3>
        <p className="mb-4">
          Coletamos informações para fornecer e melhorar nossos serviços. As
          categorias de informações que coletamos incluem:
        </p>
        <ul className="list-disc list-inside mb-4 pl-4">
          <li>
            <b>Informações de Contato:</b> Nome, endereço de e-mail, número de
            telefone.
          </li>
          <li>
            <b>Informações de Uso:</b> Dados sobre como você interage com nossos
            serviços, como páginas visitadas, tempo gasto, cliques e outras
            atividades.
          </li>
          <li>
            <b>Informações Técnicas:</b> Endereço IP, tipo de navegador, sistema
            operacional, informações do dispositivo.
          </li>
          <li>
            <b>Informações de Localização:</b> Se você nos conceder permissão,
            podemos coletar dados de localização para oferecer serviços baseados
            em localização.
          </li>
        </ul>
        <h3 className="text-xl font-bold text-white mb-2">
          2. Como Usamos Suas Informações
        </h3>
        <p className="mb-4">Utilizamos as informações coletadas para:</p>
        <ul className="list-disc list-inside mb-4 pl-4">
          <li>Fornecer, operar e manter nossos serviços.</li>
          <li>Melhorar, personalizar e expandir nossos serviços.</li>
          <li>Entender e analisar como você usa nossos serviços.</li>
          <li>
            Desenvolver novos produtos, serviços, recursos e funcionalidades.
          </li>
          <li>
            Comunicar-nos com você, diretamente ou através de um de nossos
            parceiros, para atendimento ao cliente, para fornecer atualizações e
            outras informações relacionadas ao serviço, e para fins de marketing
            e promoção.
          </li>
          <li>Processar suas transações e gerenciar seus pedidos.</li>
          <li>Detectar e prevenir fraudes.</li>
        </ul>
        <h3 className="text-xl font-bold text-white mb-2">
          3. Compartilhamento de Informações
        </h3>
        <p className="mb-4">
          Não compartilhamos suas informações pessoais com terceiros, exceto nas
          seguintes circunstâncias:
        </p>
        <ul className="list-disc list-inside mb-4 pl-4">
          <li>
            <b>Com Prestadores de Serviços:</b> Podemos compartilhar informações
            com terceiros que prestam serviços em nosso nome, como processamento
            de pagamentos, análise de dados, serviços de marketing e suporte ao
            cliente.
          </li>
          <li>
            <b>Para Conformidade Legal:</b> Podemos divulgar suas informações se
            exigido por lei ou em resposta a solicitações válidas de autoridades
            públicas (por exemplo, um tribunal ou agência governamental).
          </li>
          <li>
            <b>Com Seu Consentimento:</b> Podemos compartilhar suas informações
            com terceiros quando tivermos seu consentimento explícito para fazê-lo.
          </li>
        </ul>
        <h3 className="text-xl font-bold text-white mb-2">
          4. Segurança dos Dados
        </h3>
        <p className="mb-4">
          Implementamos medidas de segurança técnicas e organizacionais
          razoáveis projetadas para proteger a segurança de qualquer informação
          pessoal que processamos. No entanto, lembre-se que não podemos
          garantir que a internet em si seja 100% segura. Embora façamos o
          nosso melhor para proteger suas informações pessoais, a transmissão de
          informações pessoais para e de nossos Serviços é por sua conta e
          risco.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          5. Seus Direitos de Privacidade
        </h3>
        <p className="mb-4">
          Dependendo da sua localização, você pode ter os seguintes direitos em
          relação aos seus dados pessoais:
        </p>
        <ul className="list-disc list-inside mb-4 pl-4">
          <li>O direito de acessar suas informações pessoais.</li>
          <li>O direito de retificar informações imprecisas.</li>
          <li>O direito de solicitar a exclusão de suas informações pessoais.</li>
          <li>O direito de se opor ao processamento de suas informações pessoais.</li>
          <li>O direito à portabilidade dos dados.</li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, entre em contato conosco
          usando as informações fornecidas na seção &quot;Contato&quot; abaixo.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          6. Alterações a Esta Política de Privacidade
        </h3>
        <p className="mb-4">
          Podemos atualizar nossa Política de Privacidade de tempos em tempos.
          Notificaremos você sobre quaisquer alterações publicando a nova
          Política de Privacidade nesta página. Aconselhamos que você revise
          esta Política de Privacidade periodicamente para quaisquer alterações.
          As alterações a esta Política de Privacidade são efetivas quando são
          publicadas nesta página.
        </p>
        <h3 className="text-xl font-bold text-white mb-2">7. Contato</h3>
        <p>
          Se você tiver alguma dúvida ou preocupação sobre esta Política de
          Privacidade ou nossas práticas de dados, entre em contato conosco
          através do nosso formulário de contato ou e-mail.
        </p>
      </Modal>

      <Modal
  isOpen={showContactPopup}
  onClose={() => setShowContactPopup(false)}
  title="Contato"
>
  <form onSubmit={handleSubmitContact} className="space-y-4">
    <p className="text-sm text-gray-300">
      Preencha os dados abaixo e um consultor NexaWi entrará em contato com você.
    </p>

    <div>
      <label className="block text-sm font-semibold mb-1" htmlFor="contact-name">
        Nome
      </label>
      <input
        id="contact-name"
        type="text"
        required
        className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6be12f] focus:border-[#6be12f] placeholder:text-gray-500"
        placeholder="Seu nome completo"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-sm font-semibold mb-1" htmlFor="contact-phone">
        Telefone / WhatsApp
      </label>
      <input
        id="contact-phone"
        type="tel"
        required
        className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6be12f] focus:border-[#6be12f] placeholder:text-gray-500"
        placeholder="(77) 9 0000-0000"
        value={contactPhone}
        onChange={(e) => setContactPhone(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-sm font-semibold mb-1" htmlFor="contact-email">
        E-mail
      </label>
      <input
        id="contact-email"
        type="email"
        required
        className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6be12f] focus:border-[#6be12f] placeholder:text-gray-500"
        placeholder="seuemail@empresa.com"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-sm font-semibold mb-1" htmlFor="contact-city">
        Cidade
      </label>
      <input
        id="contact-city"
        type="text"
        required
        className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6be12f] focus:border-[#6be12f] placeholder:text-gray-500"
        placeholder="De qual cidade você está falando?"
        value={contactCity}
        onChange={(e) => setContactCity(e.target.value)}
      />
    </div>

    {contactError && (
      <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/40 rounded-lg px-3 py-2">
        {contactError}
      </p>
    )}

    {contactSuccess && (
      <p className="text-sm text-[#6be12f] bg-[#6be12f]/10 border border-[#6be12f]/40 rounded-lg px-3 py-2">
        {contactSuccess}
      </p>
    )}

    <button
      type="submit"
      disabled={isSendingContact}
      className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#6be12f] text-black text-sm font-extrabold shadow-[0_0_18px_rgba(107,225,47,0.7)] hover:shadow-[0_0_28px_rgba(107,225,47,0.9)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    >
      {isSendingContact ? "Enviando..." : "Enviar mensagem"}
    </button>
  </form>
</Modal>
    </div>
  );
}
