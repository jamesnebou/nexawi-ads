'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

const supabase = createClient();

export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Limpa a senha: se o cliente digitar com pontos/traços, o sistema remove e deixa só os números
    // (Isso evita erros se ele colar o CPF formatado)
    const senhaLimpa = password.replace(/\D/g, '').trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senhaLimpa || password.trim(), // Usa a limpa, se ficar vazia usa a original
      });

      if (error) throw error;

      console.log("Login efetuado com sucesso!", data);
      window.location.href = '/cliente/dashboard';

    } catch (err) {
      console.error("Erro detalhado no login:", err);

      // Identifica exatamente qual foi o erro do Supabase
      if (err.message.includes('Email not confirmed')) {
        setError('Acesso bloqueado: O e-mail deste cliente está aguardando confirmação no Supabase.');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else {
        setError(`Erro ao conectar: ${err.message}`);
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden selection:bg-green-500/30 font-sans">

      {/* Efeitos de Luz no Fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-green-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-[2.5rem] p-10 sm:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.4)] text-center">

          <div className="flex justify-center mb-10 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              <img 
                src="/Nexa-logo.png" 
                alt="Nexa Logo" 
                className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105" 
                onError={(e) => e.target.style.display = 'none'} 
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
            Acesso Restrito
          </h1>
          <p className="text-gray-500 text-sm mb-10 font-medium">
            Entre para gerenciar o desempenho dos seus anúncios.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-green-500/30 focus:ring-1 focus:ring-green-500/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium shadow-inner"
                placeholder="Seu e-mail de acesso"
                required
              />
            </div>

            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-green-500/30 focus:ring-1 focus:ring-green-500/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium shadow-inner"
                placeholder="Sua senha (CPF/CNPJ)"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Acessar Painel <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>

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