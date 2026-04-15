import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-green-500 selection:text-black font-sans overflow-hidden">

      {/* Animação customizada super sutil para o celular */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* Background Animado e Profundo */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-green-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none mask-image:linear-gradient(to_bottom,white,transparent)"></div>

      {/* Navbar Atualizada */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300">
        <div className="text-2xl font-extrabold tracking-tighter flex items-center gap-2">
          NexaWi <span className="text-green-500 drop-shadow-[0_0_10px_rgba(107,225,47,0.8)]">ADS</span>
        </div>

        {/* Botões do Menu */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            href="/login" 
            className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
          >
            Portal do Cliente
          </Link>
          <a 
            href="https://wa.me/SEUNUMERO" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-black bg-green-500 px-5 py-2.5 rounded-xl hover:bg-green-400 hover:shadow-green-glow transition-all duration-300"
          >
            Falar com um consultor Nexa
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-6 pt-40 pb-20 max-w-7xl mx-auto gap-16">

        {/* Coluna da Esquerda: Textos e Botões */}
        <div className="flex-1 text-left">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-green-400 text-sm font-bold mb-8 shadow-[0_0_30px_rgba(107,225,47,0.1)] hover:border-green-500/50 transition-all cursor-default">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            O seu novo Outdoor Digital
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Anuncie no <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Wi-Fi Grátis</span> <br />
            da sua cidade.
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed font-medium">
            Nós transformamos o Wi-Fi de praças, shoppings e comércios em um espaço publicitário exclusivo. 
            <strong className="text-white font-bold"> O cliente pede internet, a sua marca aparece na tela dele. </strong> 
            Simples, inevitável e 100% local.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
            <a href="#planos" className="group relative px-8 py-4 bg-green-500 text-black font-extrabold rounded-xl shadow-green-glow hover:shadow-[0_0_50px_rgba(107,225,47,0.6)] transition-all duration-300 hover:-translate-y-1 text-center overflow-hidden">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              Ver Planos para Anunciantes
            </a>
            <a href="#como-funciona" className="px-8 py-4 bg-white/5 backdrop-blur-md text-white font-bold rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 text-center">
              Como Funciona?
            </a>
          </div>
        </div>

        {/* Coluna da Direita: Celular Realista */}
        <div className="flex-1 flex justify-center lg:justify-end relative" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <div className="absolute inset-0 bg-green-500/20 blur-[100px] rounded-full"></div>

          {/* Estrutura do Celular */}
          <div className="relative w-[300px] h-[600px] bg-black rounded-[3rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden z-10 ring-1 ring-white/10">
            {/* Notch (Câmera) */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-3xl z-20"></div>

            {/* Botões Laterais */}
            <div className="absolute top-24 -left-[10px] w-1 h-12 bg-gray-700 rounded-l-md"></div>
            <div className="absolute top-40 -left-[10px] w-1 h-12 bg-gray-700 rounded-l-md"></div>
            <div className="absolute top-32 -right-[10px] w-1 h-16 bg-gray-700 rounded-r-md"></div>

            {/* Imagem do seu Dashboard */}
            <img 
              src="/dashboard.jpeg" 
              alt="Painel NexaWi ADS" 
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </main>

      {/* NOVA SEÇÃO: Alta Conversão com Imagem Realista */}
      <section id="como-funciona" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-16">

          {/* Imagem com Badge Flutuante */}
          <div className="w-full md:w-1/2 relative">
            <div className="absolute inset-0 bg-green-500/10 blur-[80px] rounded-full"></div>
            <div className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
              <img 
                src="/ambiente-real.jpg" 
                alt="Pessoa conectando ao Wi-Fi" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

              {/* Badge Flutuante */}
              <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 shadow-xl transform transition-transform hover:-translate-y-2">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-xl shadow-green-glow">
                  +
                </div>
                <div>
                  <p className="text-white font-bold text-lg">1.200 conexões</p>
                  <p className="text-gray-400 text-sm">Neste estabelecimento hoje</p>
                </div>
              </div>
            </div>
          </div>

          {/* Textos de Persuasão */}
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              A sua marca onde a <span className="text-green-400">atenção</span> das pessoas realmente está.
            </h2>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              Esqueça panfletos ignorados e outdoors invisíveis. A NexaWi coloca o seu anúncio na tela do celular do seu cliente no exato momento em que ele está relaxando e pedindo internet.
            </p>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500 mt-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">100% de Visualização</h4>
                  <p className="text-gray-500">O anúncio é obrigatório para liberar a internet.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500 mt-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Público Hiperlocal</h4>
                  <p className="text-gray-500">Fale com quem está a poucos metros da sua loja.</p>
                </div>
              </li>
            </ul>
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
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> 1 Criativo (Imagem)</li>
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Exibição em 1 Ponto</li>
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Relatório Mensal</li>
            </ul>
            <button className="w-full py-4 rounded-xl border border-white/20 hover:bg-white/10 transition-all duration-300 font-bold text-lg">Assinar Vitrine</button>
          </div>

          {/* Plano Comercial (Destaque) */}
          <div className="p-10 rounded-3xl bg-gradient-to-b from-green-900/40 to-black backdrop-blur-xl border-2 border-green-500 shadow-green-glow transform md:-translate-y-6 relative hover:shadow-[0_0_60px_rgba(107,225,47,0.4)] transition-all duration-500">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-black px-6 py-1.5 rounded-full text-sm font-black tracking-wider shadow-green-glow">MAIS VENDIDO</div>
            <h3 className="text-2xl font-bold mb-2 text-green-400">Comercial</h3>
            <p className="text-gray-300 mb-8 h-12">Para negócios com bom fluxo que querem impacto em vídeo.</p>
            <div className="text-5xl font-black mb-8 text-white">R$ 297<span className="text-xl text-gray-400 font-medium">/mês</span></div>
            <ul className="space-y-5 mb-10 text-gray-200 font-medium">
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Vídeo de 30 Segundos</li>
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Botão "Pedir no WhatsApp"</li>
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Alta Frequência de Exibição</li>
            </ul>
            <button className="w-full py-4 rounded-xl bg-green-500 text-black hover:bg-green-400 transition-all duration-300 font-black text-lg shadow-green-glow hover:scale-105">Assinar Comercial</button>
          </div>

          {/* Plano VIP */}
          <div className="p-10 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-2">
            <h3 className="text-2xl font-bold mb-2 text-white">VIP / Exclusivo</h3>
            <p className="text-gray-400 mb-8 h-12">Para dominar a cidade e capturar contatos (leads).</p>
            <div className="text-5xl font-black mb-8 text-white">R$ 697<span className="text-xl text-gray-500 font-medium">/mês</span></div>
            <ul className="space-y-5 mb-10 text-gray-300 font-medium">
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Exclusividade no Nicho</li>
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Captura de Leads (Lista)</li>
              <li className="flex items-center gap-4"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Logo Fixo na Tela de Login</li>
            </ul>
            <button className="w-full py-4 rounded-xl border border-white/20 hover:bg-white/10 transition-all duration-300 font-bold text-lg">Assinar VIP</button>
          </div>
        </div>
      </section>

      {/* Footer Simples */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md py-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xl font-extrabold tracking-tighter">
            NexaWi <span className="text-green-500">ADS</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 NexaWi ADS. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-green-400 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-green-400 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-green-400 transition-colors">Contato</a>
          </div>
        </div>
      </footer>

    </div>
  );
}