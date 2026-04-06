'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Eye, MousePointerClick, Activity, LayoutDashboard } from 'lucide-react';

const supabase = createClient();

export default function ClientDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndFetchData() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.replace('/cliente/login');
          return;
        }

        if (isMounted) setUser(session.user);

        const { data: anunciosData, error: anunciosError } = await supabase
          .from('anuncios')
          .select('*')
          .eq('cliente_id', session.user.id)
          .order('created_at', { ascending: false });

        if (anunciosError) throw anunciosError;

        if (isMounted) {
          setAds(anunciosData || []);
          setLoading(false);
        }

      } catch (err) {
        console.error("Erro ao carregar painel:", err);
        if (isMounted) {
          setError('Não foi possível carregar seus dados.');
          setLoading(false);
        }
      }
    }

    checkAuthAndFetchData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/cliente/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center mb-4">
          <div className="absolute inset-0 border-t-2 border-green-500/50 rounded-full animate-spin"></div>
          <Activity className="text-green-500 animate-pulse" size={30} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">

      {/* Efeitos de Luz de Fundo (Minimalistas) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* NAVBAR PREMIUM */}
      <nav className="sticky top-0 z-50 bg-[#050505]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">

            {/* LOGO COM EFEITO BLUR NO HOVER */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                {/* Efeito de Blur/Glow que aparece no hover */}
                <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img 
                  src="/Nexa-logo.png" 
                  alt="Nexa Logo" 
                  className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105" 
                  onError={(e) => e.target.style.display = 'none'} 
                />
              </div>
            </div>

            {/* PERFIL E LOGOUT */}
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.05]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-xs font-medium text-gray-400">{user?.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">

        {/* CABEÇALHO */}
        <div className="mb-12 animate-fade-in-up">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
            Visão Geral
          </h1>
          <p className="text-gray-500 font-medium">Acompanhe o desempenho das suas campanhas na rede Nexa.</p>
        </div>

        {/* KPIS (CAIXAS MINIMALISTAS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Anúncios Ativos</h3>
              <Activity className="text-green-500/80 group-hover:text-green-400 transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">{ads.length}</p>
          </div>

          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Visualizações</h3>
              <Eye className="text-blue-500/80 group-hover:text-blue-400 transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">--</p>
          </div>

          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Cliques no CTA</h3>
              <MousePointerClick className="text-purple-500/80 group-hover:text-purple-400 transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">--</p>
          </div>

        </div>

        {/* LISTA DE ANÚNCIOS */}
        <h2 className="text-2xl font-bold text-white mb-8 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Suas Campanhas</h2>

        {error && (
          <div className="p-4 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {ads.length === 0 && !error ? (
          <div className="bg-white/[0.01] border border-white/[0.03] rounded-[2.5rem] p-16 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-24 h-24 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-8 border border-white/[0.05]">
              <LayoutDashboard size={32} className="text-gray-600" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">Nenhuma campanha ativa</h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Você ainda não possui anúncios vinculados à sua conta. Entre em contato com o suporte para iniciar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ads.map((ad, index) => (
              <div 
                key={ad.id} 
                className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden hover:border-white/[0.15] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up"
                style={{ animationDelay: `${0.3 + (index * 0.1)}s` }}
              >
                {/* Imagem do Card com Efeito Blur no Hover */}
                <div className="relative h-56 overflow-hidden bg-[#0a0a0a]">
                  {ad.media_url ? (
                    ad.tipo_media === 'video' ? (
                      <video src={ad.media_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" muted loop playsInline />
                    ) : (
                      <img src={ad.media_url} alt={ad.titulo} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-sm">Sem mídia</div>
                  )}

                  {/* Degradê interno */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />

                  {/* Badge Minimalista */}
                  <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Ativo</span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-8 relative z-10 -mt-6">
                  <h3 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-green-400 transition-colors duration-300">{ad.titulo}</h3>
                  <p className="text-gray-500 text-sm mb-8 line-clamp-2 leading-relaxed">{ad.descricao}</p>

                  {/* Métricas Minimalistas */}
                  <div className="pt-5 border-t border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-300 transition-colors">
                      <Eye size={16} />
                      <span className="text-sm font-medium">--</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-300 transition-colors">
                      <MousePointerClick size={16} />
                      <span className="text-sm font-medium">--</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </div>
  );
}