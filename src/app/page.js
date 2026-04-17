"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function LandingPage() {

  // Variáveis de Estado para a Barra de Status ao Vivo
  const [onlineUsers, setOnlineUsers] = useState(124);
  const [leadsToday, setLeadsToday] = useState(47);

  // Efeito para simular os números mudando em tempo real (Opcional, mas dá um toque premium)
  useEffect(() => {
    const interval = setInterval(() => {
      // Faz o número de usuários flutuar um pouco para cima ou para baixo
      setOnlineUsers(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 3500); // Atualiza a cada 3.5 segundos

    return () => clearInterval(interval);
  }, []);

  // Efeito para animar elementos ao rolar a tela (Vai e Volta)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Quando entra na tela: Aparece e sobe
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
        } else {
          // Quando sai da tela: Apaga e desce (preparando para a próxima vez)
          entry.target.classList.remove('opacity-100', 'translate-y-0');
          entry.target.classList.add('opacity-0', 'translate-y-8');
        }
      });
    }, { 
      threshold: 0.2, // Reduzi um pouco para a animação desativar mais rápido ao sair
      rootMargin: "0px 0px -100px 0px" // Cria uma margem invisível para o efeito ficar mais natural
    });

    const hiddenElements = document.querySelectorAll('.reveal-on-scroll');
    hiddenElements.forEach((el) => observer.observe(el));

    return () => hiddenElements.forEach((el) => observer.unobserve(el));
  }, []);

  // Efeito que simula a variação em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      // Faz o número de pessoas online variar um pouco para cima ou para baixo
      setOnlineUsers(prev => prev + Math.floor(Math.random() * 5) - 2);

      // Ocasionalmente adiciona um novo lead
      if (Math.random() > 0.7) {
        setLeadsToday(prev => prev + 1);
      }
    }, 4000); // Atualiza a cada 4 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-[#6be12f] selection:text-black font-sans overflow-hidden">

      {/* ========================================== */}
      {/* GRADE GLOBAL (Fica fixa no fundo do site todo) */}
      {/* ========================================== */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* ========================================== */}
      {/* CONTEÚDO DO SITE (Fica por cima da grade) */}
      {/* ========================================== */}
      <div className="relative z-10">

        {/* Animação customizada super sutil para o celular */}
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
          }
        `}</style>

        {/* Navbar Atualizada e Centralizada */}
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300">
          {/* Container invisível que centraliza o conteúdo */}
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-6 py-2">

            {/* Sua Logo */}
            <Link href="/login" className="flex items-center transition-transform duration-300 hover:scale-105 hover:opacity-80">
              <img 
                src="/Nexa-logo.png" 
                alt="Logo da Empresa" 
                className="h-20 w-auto object-contain" 
              />
            </Link>

            {/* Botões do Menu */}
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

          </div>
        </nav>

        {/* Hero Section */}
        <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-6 pt-40 pb-20 max-w-7xl mx-auto gap-16">

          {/* Coluna da Esquerda: Textos e Botões */}
          <div className="flex-1 text-left">
            <div className="inline-flex items-center gap-2 px-2 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[#8cf059] text-sm font-bold mb-8 shadow-[0_0_30px_rgba(107,225,47,0.1)] hover:border-[#6be12f]/50 transition-all cursor-default">
              <span className="w-2 h-2 rounded-full bg-[#6be12f] animate-ping"></span>
              O seu novo Outdoor Digital
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Apareça para <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8cf059] to-[#46a31a] text-size-300 whitespace-nowrap">QUEM ESTÁ AGORA</span> <br />
              usando Wifi.
            </h1>

            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed font-medium">
              Nós transformamos o Wi-Fi de praças, shoppings e comércios em um espaço publicitário exclusivo. 
              <strong className="text-white font-bold"> O cliente pede internet, a sua marca aparece na tela dele. </strong> 
              Simples, inevitável e 100% local.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <a href="#planos" className="group relative px-8 py-4 bg-[#6be12f] text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(107,225,47,0.6)] hover:shadow-[0_0_50px_rgba(107,225,47,0.6)] transition-all duration-300 hover:-translate-y-1 text-center overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                Ver Planos para Anunciantes
              </a>
              <a href="#como-funciona" className="px-8 py-4 bg-white/5 backdrop-blur-md text-white font-bold rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 text-center">
                Como Funciona?
              </a>
            </div>

            {/* Animação do Reflexo de Vidro */}
            <style>{`
              @keyframes sweep {
                0% { transform: translateX(-150%) skewX(-20deg); }
                100% { transform: translateX(860%) skewX(-50deg); }
              }
            `}</style>

            {/* Badge de Prova Social em Tempo Real */}
            <div className="relative overflow-hidden mt-12 flex flex-col sm:flex-row items-center justify-center gap-12 bg-white/5 border border-white/10 backdrop-blur-md px-12 py-5 rounded-2xl shadow-2xl sm:min-w-[500px]">

              {/* O Feixe de Luz (Reflexo Vai e Volta) */}
              <div 
                className="absolute top-0 left-0 h-full w-[80px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                style={{ animation: 'sweep 3s ease-in-out infinite alternate' }}
              ></div>

              {/* Pessoas Online */}
              <div className="relative z-10 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6be12f] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6be12f]"></span>
                </span>
                <p className="text-gray-400 text-sm font-medium">
                  <strong className="text-white text-xl font-black">{onlineUsers}</strong> online agora
                </p>
              </div>

              {/* Divisória */}
              <div className="relative z-10 w-px h-8 bg-white/10 hidden sm:block"></div>

              {/* Leads Gerados */}
              <div className="relative z-10 flex items-center gap-3">
                <span className="text-[#6be12f] bg-[#6be12f]/10 p-1.5 rounded-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                </span>
                <p className="text-gray-400 text-sm font-medium">
                  <strong className="text-white text-xl font-black">{leadsToday}</strong> leads hoje
                </p>
              </div>

            </div>
          </div>

          {/* Coluna da Direita: Seu Mockup Customizado */}
          <div className="flex-1 flex justify-center lg:justify-end relative" style={{ animation: 'float 6s ease-in-out infinite' }}>

            {/* Brilho neon no fundo (mantido e atualizado para sua cor) */}
            <div className="absolute inset-0 bg-[#6be12f]/20 blur-[100px] rounded-full"></div>

            {/* A sua imagem do Mockup */}
            <img 
              src="/mockup-celular.png" 
              alt="Mockup do Sistema" 
              className="relative z-10 w-full max-w-[350px] md:max-w-[400px] h-auto object-contain drop-shadow-2xl"
            />

          </div>

        </main>

        {/* NOVA SEÇÃO: Alta Conversão com Imagem Realista */}
        <section id="alta-conversao" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">

          <div className="flex flex-col md:flex-row items-center gap-16">

            {/* Imagem com Badge Flutuante */}
            <div className="w-full md:w-1/2 relative">
              <div className="absolute inset-0 bg-[#6be12f]/10 blur-[80px] rounded-full"></div>
              <div className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
                <img 
                  src="/ambiente-real.jpg" 
                  alt="Pessoa conectando ao Wi-Fi" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                {/* Badge Flutuante */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 text-white font-bold text-sm shadow-lg group-hover:scale-105 transition-transform duration-300">
                  +1.200 conexões por mês
                </div>
              </div>
            </div>

            {/* Textos da Seção */}
            <div className="w-full md:w-1/2 text-left">
              <span className="text-[#6be12f] font-mono text-sm font-bold tracking-widest mb-4 block">ALTA CONVERSÃO</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                Seu anúncio no lugar certo, na hora certa.
              </h2>
              <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-8">
                Chega de gastar com anúncios que ninguém vê. Com a NexaWi, sua marca aparece para quem está ativamente buscando conexão, no exato momento em que ele está mais receptivo.
              </p>
              <ul className="space-y-4 text-gray-300 text-base md:text-lg">
                <li className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Audiência engajada e local.
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Anúncios impossíveis de pular.
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Resultados mensuráveis e transparentes.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Seção: Como Funciona (Minimalista, Premium e com Grade) */}
        <section id="como-funciona" className="py-32 bg-black relative overflow-hidden">

          {/* 1. O Efeito de Grade (Grid) Restaurado */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]"></div>

          {/* Brilho verde suave no fundo para destacar a grade */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[600px] bg-[#6be12f]/5 blur-[120px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">

            {/* Título Maior */}
            <div className="text-center mb-24 reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">Como o sistema funciona?</h2>
              <p className="text-gray-400 text-xl md:text-2xl max-w-3xl mx-auto">Um fluxo invisível, automático e altamente lucrativo.</p>
            </div>

            {/* A Caixinha Minimalista (Agora com vidro fosco e fontes maiores) */}
            <div className="relative bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 md:p-24 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">

              {/* === GRADE INTERNA DISCRETA === */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px]"></div>

              {/* Linha Central Sutil */}
              <div className="absolute left-[55px] md:left-1/2 top-24 bottom-24 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent md:-translate-x-1/2"></div>

              {/* Passo 1 (Esquerda) */}
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pr-24 text-left pl-28 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-sm md:text-[20px] font-bold tracking-widest mb-4 block">FASE 01</span>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4">A Busca por Conexão</h3>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed">O público na sua região precisa de internet e encontra a rede aberta disponível.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 -translate-x-[2px] md:-translate-x-1/2 w-12 h-12 bg-black border-2 border-white/10 rounded-full z-10 flex items-center justify-center group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)] transition-all duration-500">
                  <div className="w-3 h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500"></div>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Passo 2 (Direita) */}
              <div className="relative flex flex-col md:flex-row-reverse items-start md:items-center justify-between mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pl-24 text-left pl-28 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-sm md:text-[20px] font-bold tracking-widest mb-4 block">FASE 02</span>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4">Wi-Fi Grátis Nexa</h3>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed">A sua empresa fornece o acesso gratuito, atraindo a atenção imediata do cliente.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 -translate-x-[2px] md:-translate-x-1/2 w-12 h-12 bg-black border-2 border-white/10 rounded-full z-10 flex items-center justify-center group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)] transition-all duration-500">
                  <div className="w-3 h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500"></div>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Passo 3 (Esquerda) */}
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pr-24 text-left pl-28 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-sm md:text-[20px] font-bold tracking-widest mb-4 block">FASE 03</span>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4">Captura de Dados</h3>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed">Para conectar, o cliente preenche um cadastro rápido (Nome, WhatsApp, E-mail).</p>
                </div>
                <div className="absolute left-0 md:left-1/2 -translate-x-[2px] md:-translate-x-1/2 w-12 h-12 bg-black border-2 border-white/10 rounded-full z-10 flex items-center justify-center group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)] transition-all duration-500">
                  <div className="w-3 h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500"></div>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Passo 4 (Direita) */}
              <div className="relative flex flex-col md:flex-row-reverse items-start md:items-center justify-between mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pl-24 text-left pl-28 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-sm md:text-[20px] font-bold tracking-widest mb-4 block">FASE 04</span>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4">Anúncio Inpulável</h3>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed">A NexaWi exibe o anúncio da sua empresa. O cliente assiste com 100% de atenção.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 -translate-x-[2px] md:-translate-x-1/2 w-12 h-12 bg-black border-2 border-white/10 rounded-full z-10 flex items-center justify-center group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)] transition-all duration-500">
                  <div className="w-3 h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500"></div>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Passo 5 (Esquerda) */}
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-32 group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pr-24 text-left pl-28 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-sm md:text-[20px] font-bold tracking-widest mb-4 block">FASE 05</span>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4">Redirecionamento</h3>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed">Após o anúncio, ele tem a opção de ser direcionado para o seu site ou WhatsApp.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 -translate-x-[2px] md:-translate-x-1/2 w-12 h-12 bg-black border-2 border-white/10 rounded-full z-10 flex items-center justify-center group-hover:border-[#6be12f] group-hover:shadow-[0_0_20px_rgba(107,225,47,0.4)] transition-all duration-500">
                  <div className="w-3 h-3 bg-white/30 rounded-full group-hover:bg-[#6be12f] transition-colors duration-500"></div>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Passo 6 (Direita - Final) */}
              <div className="relative flex flex-col md:flex-row-reverse items-start md:items-center justify-between group reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
                <div className="md:w-1/2 md:pl-24 text-left pl-28 md:pl-0">
                  <span className="text-[#6be12f] font-mono text-sm md:text-[20px] font-bold tracking-widest mb-4 block">FASE 06</span>
                  <h3 className="text-4xl md:text-5xl font-black text-[#6be12f] mb-4">Internet Liberada</h3>
                  <p className="text-gray-300 text-xl md:text-2xl leading-relaxed">O cliente navega feliz, e você ganha um lead qualificado e alto impacto de marca.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 -translate-x-[2px] md:-translate-x-1/2 w-14 h-14 bg-[#6be12f]/20 border-2 border-[#6be12f] rounded-full z-10 flex items-center justify-center shadow-[0_0_30px_rgba(107,225,47,0.6)]">
                  <div className="w-4 h-4 bg-[#6be12f] rounded-full shadow-[0_0_10px_#6be12f]"></div>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

            </div>
          </div>
        </section>

        {/* Seção de Planos */}
        <section id="planos" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Escolha o seu plano</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Planos mensais sem fidelidade. Cancele quando quiser.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Plano Vitrine */}
            <div className="p-10 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-2 text-white">Vitrine</h3>
              <p className="text-gray-400 mb-8 h-12">Ideal para pequenos comércios locais.</p>
              <div className="text-5xl font-black mb-8 text-white">R$ 147<span className="text-xl text-gray-500 font-medium">/mês</span></div>
              <ul className="space-y-5 mb-10 text-gray-300 font-medium">
                <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> 1 Criativo (Imagem)</li>
                <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Exibição em 1 Ponto</li>
                <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Relatório Mensal</li>
              </ul>
                {/* BOTÃO ALTERADO AQUI */}
                <a
                  href="https://wa.me/77988656394?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Plano%20Vitrine%20da%20NexaWi%20ADS!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-xl border border-white/20 hover:bg-white/10 transition-all duration-300 font-bold text-lg text-center block"
                >
                  Assinar Vitrine
                </a>       
            </div>

            {/* Plano Comercial (Destaque com Reflexo de Vidro) */}
            <div className="p-10 rounded-3xl bg-gradient-to-b from-green-900/40 to-black backdrop-blur-xl border-2 border-[#6be12f] shadow-[0_0_20px_rgba(107,225,47,0.6)] transform md:-translate-y-6 relative hover:shadow-[0_0_60px_rgba(107,225,47,0.4)] transition-all duration-500">

              {/* 1. Camada do Reflexo (Contida dentro das bordas arredondadas) */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div 
                  className="absolute top-0 left-0 h-full w-[150px] bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  style={{ animation: 'sweep 3s ease-in-out infinite alternate' }}
                ></div>
              </div>

              {/* 2. Tag Mais Vendido (Com z-20 para ficar acima de tudo) */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#6be12f] text-black px-6 py-1.5 rounded-full text-sm font-black tracking-wider shadow-[0_0_20px_rgba(107,225,47,0.6)] z-20">
                MAIS VENDIDO
              </div>

              {/* 3. Conteúdo do Card (Envolvido em relative z-10 para a luz passar por trás das letras) */}
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2 text-[#8cf059]">Comercial</h3>
                <p className="text-gray-300 mb-8 h-12">Para negócios com bom fluxo que querem impacto em vídeo.</p>
                <div className="text-5xl font-black mb-8 text-white">R$ 297<span className="text-xl text-gray-400 font-medium">/mês</span></div>

                <ul className="space-y-5 mb-10 text-gray-200 font-medium">
                  <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Vídeo de 30 Segundos</li>
                  <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Botão "Pedir no WhatsApp"</li>
                  <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Alta Frequência de Exibição</li>
                </ul>

                {/* BOTÃO ALTERADO AQUI */}
                  <a
                    href="https://wa.me/77988656394?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Plano%20Comercial%20da%20NexaWi%20ADS!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-xl bg-[#6be12f] text-black hover:bg-[#8cf059] transition-all duration-300 font-black text-lg shadow-[0_0_20px_rgba(107,225,47,0.6)] hover:scale-105 text-center block"
                  >
                    Assinar Comercial
                  </a>
              </div>

            </div>

            {/* Plano VIP */}
            <div className="p-10 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-2 text-white">VIP / Exclusivo</h3>
              <p className="text-gray-400 mb-8 h-12">Para dominar a cidade e capturar contatos (leads).</p>
              <div className="text-5xl font-black mb-8 text-white">R$ 697<span className="text-xl text-gray-500 font-medium">/mês</span></div>
              <ul className="space-y-5 mb-10 text-gray-300 font-medium">
                <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Exclusividade no Nicho</li>
                <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Captura de Leads (Lista)</li>
                <li className="flex items-center gap-4"><svg className="w-6 h-6 text-[#6be12f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Logo Fixo na Tela de Login</li>
              </ul>
                 {/* BOTÃO ALTERADO AQUI */}
                <a
                  href="https://wa.me/77988656394?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Plano%20VIP%20da%20NexaWi%20ADS!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-xl border border-white/20 hover:bg-white/10 transition-all duration-300 font-bold text-lg text-center block"
                >
                  Assinar VIP
                </a>            </div>
          </div>
        </section>

        {/* Footer Simples */}
        <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md py-1 mt-20">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <Link href="/login" className="flex items-center transition-transform duration-300 hover:scale-105 hover:opacity-80">
                <img 
                  src="/Nexa-logo.png" 
                  alt="Logo da Empresa" 
                  className="h-20 w-auto object-contain" 
                />
              </Link>
            </div>
            <p className="text-gray-500 text-sm">© 2026 NexaWi ADS. Todos os direitos reservados.</p>
            <div className="flex gap-6 text-sm font-medium text-gray-400">
              <a href="#" className="hover:text-[#8cf059] transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-[#8cf059] transition-colors">Privacidade</a>
              <a href="#" className="hover:text-[#8cf059] transition-colors">Contato</a>
            </div>
          </div>
        </footer>

        {/* Botão Flutuante do WhatsApp (Moderno) */}
        <div className="fixed bottom-8 right-8 z-50 group">

          {/* Efeito de Radar (Pulso) */}
          <div className="absolute inset-0 bg-[#6be12f] rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>

          {/* O Botão Principal */}
          <a 
            href="https://wa.me/77988656394" 
            target="_blank" 
            rel="noopener noreferrer"
            className="relative flex items-center justify-center w-16 h-16 bg-[#6be12f] text-black rounded-full shadow-[0_0_20px_rgba(107,225,47,0.4)] hover:shadow-[0_0_40px_rgba(107,225,47,0.8)] transition-all duration-300 hover:-translate-y-2"
          >
            {/* Ícone Oficial do WhatsApp em SVG */}
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>

          {/* Balão de Texto (Aparece ao passar o mouse) */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 px-4 py-2 bg-black/90 backdrop-blur-md border border-white/10 text-white text-sm font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-2xl">
            Fale com um consultor
          </div>

        </div>

      </div> {/* Fim do container de conteúdo (z-10) */}
    </div> /* Fim do wrapper principal */
  );
}