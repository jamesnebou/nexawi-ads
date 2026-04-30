import Link from 'next/link'

export default function CidadeNotFound() {
  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-[#6be12f]/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl w-full text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[#8cf059] text-xs sm:text-sm font-bold mb-8">
          <span className="w-2 h-2 rounded-full bg-[#6be12f] animate-pulse" />
          Cidade não encontrada
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Essa página ainda não foi
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#8cf059] to-[#46a31a]">
            ativada para essa cidade
          </span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
          A campanha ou a landing dessa cidade ainda não foi cadastrada na NexaWi.
          Você pode voltar para a página principal ou falar com um consultor agora.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-4 bg-[#6be12f] text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(107,225,47,0.6)] hover:shadow-[0_0_50px_rgba(107,225,47,0.6)] transition-all duration-300 hover:-translate-y-1 text-center"
          >
            Voltar para a página principal
          </Link>

          <a
            href="https://wa.me/77988656394"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-md text-white font-bold rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 text-center"
          >
            Falar com um consultor
          </a>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 text-left">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6be12f] font-bold mb-3">
            O que isso significa?
          </p>

          <div className="space-y-3 text-sm sm:text-base text-gray-300 leading-relaxed">
            <p>• A URL da cidade foi acessada, mas ainda não existe cadastro ativo para ela.</p>
            <p>• Quando a cidade for criada na dashboard, essa página passa a abrir automaticamente.</p>
            <p>• Isso evita que campanhas caiam em páginas erradas ou com preços genéricos.</p>
          </div>
        </div>
      </div>
    </main>
  )
}