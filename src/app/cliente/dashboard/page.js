'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Eye, MousePointerClick, Activity, LayoutDashboard, KeyRound, PauseCircle, X, Check, Loader2 } from 'lucide-react';

const supabase = createClient();

export default function ClientDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados do Modal de Senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ new: '', confirm: '' });
  const [pwdStatus, setPwdStatus] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndFetchData() {
      try {
        // 1. Pega a sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.replace('/cliente/login');
          return;
        }

        if (isMounted) setUser(session.user);

        // 2. Busca o ID real do cliente na tabela 'clientes' usando o e-mail logado
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('id')
          .eq('email', session.user.email)
          .single();

        if (clienteError || !clienteData) {
          throw new Error('Perfil de cliente não encontrado no banco de dados.');
        }

        // 3. Busca os anúncios e CONTA as visualizações e cliques nas tabelas relacionadas
        const { data: anunciosData, error: anunciosError } = await supabase
          .from('anuncios')
          .select(`
            *,
            anuncio_views (count),
            anuncio_clicks (count)
          `)
          .eq('cliente_id', clienteData.id)
          .order('created_at', { ascending: false });

        if (anunciosError) throw anunciosError;

        // 4. Formata os dados para extrair os números corretamente à prova de falhas
        const anunciosFormatados = (anunciosData || []).map(ad => {
          const extrairNumero = (relacao) => {
            if (!relacao) return 0;
            if (Array.isArray(relacao)) return relacao[0]?.count || 0;
            return relacao.count || 0;
          };

          return {
            ...ad,
            visualizacoes: extrairNumero(ad.anuncio_views),
            cliques: extrairNumero(ad.anuncio_clicks)
          };
        });

        if (isMounted) {
          setAds(anunciosFormatados);
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.new !== pwdForm.confirm) {
      setPwdStatus({ loading: false, error: 'As senhas não coincidem.', success: '' });
      return;
    }
    if (pwdForm.new.length < 6) {
      setPwdStatus({ loading: false, error: 'A senha deve ter pelo menos 6 caracteres.', success: '' });
      return;
    }

    setPwdStatus({ loading: true, error: '', success: '' });

    const { error } = await supabase.auth.updateUser({ password: pwdForm.new });

    if (error) {
      setPwdStatus({ loading: false, error: error.message, success: '' });
    } else {
      setPwdStatus({ loading: false, error: '', success: 'Senha atualizada com sucesso!' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPwdForm({ new: '', confirm: '' });
        setPwdStatus({ loading: false, error: '', success: '' });
      }, 2000);
    }
  };

  // Cálculos das Métricas Globais
  const anunciosAtivos = ads.filter(ad => ad.ativo === true).length;
  const anunciosInativos = ads.filter(ad => ad.ativo === false).length;
  const totalVisualizacoes = ads.reduce((acc, ad) => acc + (ad.visualizacoes || 0), 0);
  const totalCliques = ads.reduce((acc, ad) => acc + (ad.cliques || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center mb-4">
          <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
          <Activity className="text-[#6be12f] animate-pulse" size={30} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6be12f]/30">

      {/* Efeitos de Luz de Fundo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* NAVBAR PREMIUM */}
      <nav className="sticky top-0 z-40 bg-[#050505]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">

            {/* LOGO */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img 
                  src="/Nexa-logo.png" 
                  alt="Nexa Logo" 
                  className="h-20 relative z-10 object-contain transition-all duration-500 group-hover:scale-105" 
                  onError={(e) => e.target.style.display = 'none'} 
                />
              </div>
            </div>

            {/* PERFIL E AÇÕES */}
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.05]">
                <div className="w-2 h-2 rounded-full bg-[#6be12f] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-xs font-medium text-gray-400">{user?.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
                >
                  <KeyRound size={16} />
                  <span className="hidden sm:inline">Senha</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
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

        {/* KPIS (AGORA COM 4 COLUNAS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

          {/* Card: Anúncios Ativos */}
          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6be12f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Anúncios Ativos</h3>
              <Activity className="text-[#6be12f]/80 group-hover:text-[#8cf059] transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">{anunciosAtivos}</p>
          </div>

          {/* Card: Anúncios Inativos */}
          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Anúncios Inativos</h3>
              <PauseCircle className="text-neutral-500/80 group-hover:text-neutral-400 transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">{anunciosInativos}</p>
          </div>

          {/* Card: Visualizações Totais */}
          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Visualizações</h3>
              <Eye className="text-blue-500/80 group-hover:text-blue-400 transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">{totalVisualizacoes}</p>
          </div>

          {/* Card: Cliques Totais */}
          <div className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">Cliques no CTA</h3>
              <MousePointerClick className="text-purple-500/80 group-hover:text-purple-400 transition-colors" size={20} />
            </div>
            <p className="relative z-10 text-5xl font-light text-white tracking-tight">{totalCliques}</p>
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
            <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">Nenhuma campanha encontrada</h3>
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
                {/* Imagem do Card */}
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

                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />

                  {/* Badge Dinâmico (Ativo/Inativo) */}
                  {ad.ativo ? (
                    <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6be12f] animate-pulse"></div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Ativo</span>
                    </div>
                  ) : (
                    <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
                      <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Inativo</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-8 relative z-10 -mt-6">
                  <h3 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-[#8cf059] transition-colors duration-300">{ad.titulo}</h3>
                  <p className="text-gray-500 text-sm mb-8 line-clamp-2 leading-relaxed">{ad.descricao}</p>

                  {/* Métricas Individuais */}
                  <div className="pt-5 border-t border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-300 transition-colors" title="Visualizações deste anúncio">
                      <Eye size={16} />
                      <span className="text-sm font-medium">{ad.visualizacoes || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-300 transition-colors" title="Cliques neste anúncio">
                      <MousePointerClick size={16} />
                      <span className="text-sm font-medium">{ad.cliques || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE TROCA DE SENHA */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden">

            <div className="flex items-center justify-between p-8 border-b border-white/[0.05]">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Trocar Senha</h2>
                <p className="text-sm text-neutral-500 mt-1.5 font-medium">Crie uma nova senha segura para seu acesso.</p>
              </div>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-8">
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Nova Senha</label>
                  <div className="relative group/input">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                    <input
                      type="password"
                      value={pwdForm.new}
                      onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Confirmar Nova Senha</label>
                  <div className="relative group/input">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                    <input
                      type="password"
                      value={pwdForm.confirm}
                      onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                      placeholder="Repita a nova senha"
                      required
                    />
                  </div>
                </div>
              </div>

              {pwdStatus.error && <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{pwdStatus.error}</div>}
              {pwdStatus.success && <div className="p-4 mb-6 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 text-[#8cf059] text-sm text-center flex items-center justify-center gap-2"><Check size={16} /> {pwdStatus.success}</div>}

              <button
                type="submit"
                disabled={pwdStatus.loading || pwdStatus.success}
                className="w-full bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {pwdStatus.loading ? <Loader2 size={20} className="animate-spin" /> : 'Atualizar Senha'}
              </button>
            </form>
          </div>
        </div>
      )}

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