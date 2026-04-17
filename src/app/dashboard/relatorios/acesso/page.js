'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapPin, User, Eye, MousePointerClick, BarChart3 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function RelatorioAcesso() {
  const [relatorio, setRelatorio] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarRelatorio()
  }, [])

  async function buscarRelatorio() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('hotspot_access_report')
      .select('*')
      .order('hotspot_nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar relatório de acesso:', error)
      alert('Erro ao carregar o relatório. Por favor, tente novamente.')
    } else {
      setRelatorio(data || [])
    }
    setCarregando(false)
  }

  return (
    <>
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <BarChart3 className="text-[#6be12f]" size={24} />
              </div>
              Relatório de Acesso
            </h1>
            <p className="text-sm text-neutral-500 mt-2 font-medium">Métricas agregadas de visualizações e cliques por hotspot</p>
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
              <BarChart3 className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : relatorio.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <BarChart3 size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Nenhum dado de acesso encontrado</h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md mx-auto">Certifique-se de que há anúncios ativos e que a lógica de rastreamento está funcionando corretamente nos seus hotspots.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {relatorio.map((item, index) => (
              <div 
                key={item.hotspot_id} 
                className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8 hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Efeito de luz sutil no hover */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#6be12f]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                {/* Informações do Hotspot */}
                <div className="flex items-center gap-5 w-full lg:w-auto relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#050505] border border-white/[0.05] flex items-center justify-center shadow-inner group-hover:border-[#6be12f]/30 transition-all duration-300 flex-shrink-0">
                    <MapPin size={24} className="text-neutral-500 group-hover:text-[#6be12f] transition-colors duration-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#8cf059] transition-colors truncate tracking-tight">
                      {item.hotspot_nome}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1.5 font-medium">
                      <User size={14} className="flex-shrink-0" />
                      <span className="truncate">{item.cliente_nome || 'Sem cliente vinculado'}</span>
                    </div>
                  </div>
                </div>

                {/* Blocos de Métricas */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto relative z-10">

                  {/* Visualizações */}
                  <div className="w-full sm:w-52 bg-[#050505] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-5 shadow-inner group/metric hover:border-white/[0.1] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover/metric:bg-white/[0.05] transition-colors">
                      <Eye size={20} className="text-neutral-400 group-hover/metric:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Visualizações</p>
                      <p className="text-2xl font-extrabold text-white leading-none tracking-tight">{item.total_unique_views}</p>
                    </div>
                  </div>

                  {/* Cliques */}
                  <div className="w-full sm:w-52 bg-[#050505] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-5 shadow-inner group/metric hover:border-[#6be12f]/20 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0 group-hover/metric:bg-[#6be12f]/20 transition-colors">
                      <MousePointerClick size={20} className="text-[#6be12f]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Cliques</p>
                      <p className="text-2xl font-extrabold text-white leading-none tracking-tight">{item.total_unique_clicks}</p>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Animações */}
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
    </>
  )
}