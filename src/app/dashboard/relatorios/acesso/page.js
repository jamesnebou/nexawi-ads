'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  MapPin,
  User,
  Eye,
  MousePointerClick,
  BarChart3,
  Copy,
  ExternalLink,
  RefreshCw,
  CalendarDays,
  Activity,
  TrendingUp,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

// Cliente Supabase usado apenas para pegar a sessão do admin logado.
// O relatório agora carrega por /api/admin/relatorios/acesso.
const supabase = createBrowserSupabaseClient()

const periodos = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_7', label: 'Últimos 7 dias' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'todos', label: 'Todo período' },
]

// ============================================================
// Chamada padrão para APIs administrativas.
// Essa função pega o token do usuário logado e envia para a API.
// A API valida se o usuário é admin antes de consultar o banco.
// ============================================================

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
  }

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Erro na API administrativa')
  }

  return data
}

export default function RelatorioAcesso() {
  const [relatorio, setRelatorio] = useState([])
  const [resumo, setResumo] = useState({
    totalHotspots: 0,
    hotspotsComAcesso: 0,
    totalViews: 0,
    totalClicks: 0,
    totalCopias: 0,
    totalTentativasAbrir: 0,
  })
  const [periodo, setPeriodo] = useState('ultimos_30')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarRelatorio()
  }, [periodo])

  async function buscarRelatorio() {
    setCarregando(true)

    try {
      // Agora o relatório não consulta view/tabela direto pelo navegador.
      // A API admin calcula tudo usando service_role no servidor.
      const params = new URLSearchParams()
      params.set('periodo', periodo)

      const data = await adminApiFetch(`/api/admin/relatorios/acesso?${params.toString()}`)

      setRelatorio(data.relatorio || [])
      setResumo(data.resumo || {
        totalHotspots: 0,
        hotspotsComAcesso: 0,
        totalViews: 0,
        totalClicks: 0,
        totalCopias: 0,
        totalTentativasAbrir: 0,
      })
    } catch (error) {
      console.error('Erro ao buscar relatório de acesso:', error)
      toast.error(error.message || 'Erro ao carregar o relatório.')
    } finally {
      setCarregando(false)
    }
  }

  const taxaGeral =
    resumo.totalViews > 0
      ? ((resumo.totalClicks / resumo.totalViews) * 100).toFixed(1)
      : '0.0'

  const cards = [
    {
      label: 'Visualizações',
      valor: resumo.totalViews,
      sub: 'Visitantes impactados',
      icon: Eye,
      text: 'text-[#8cf059]',
      bg: 'bg-[#6be12f]/20',
    },
    {
      label: 'Cliques totais',
      valor: resumo.totalClicks,
      sub: `${taxaGeral}% de taxa geral`,
      icon: MousePointerClick,
      text: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'Copiaram link',
      valor: resumo.totalCopias,
      sub: 'Ação segura no portal',
      icon: Copy,
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
    },
    {
      label: 'Tentaram abrir',
      valor: resumo.totalTentativasAbrir,
      sub: 'Cliques no CTA',
      icon: ExternalLink,
      text: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
    {
      label: 'Hotspots com acesso',
      valor: resumo.hotspotsComAcesso,
      sub: `de ${resumo.totalHotspots} cadastrados`,
      icon: Activity,
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
    },
  ]

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <BarChart3 className="text-[#6be12f]" size={24} />
              </div>
              Relatório de Acesso
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Métricas agregadas de visualizações, cliques, cópias e CTAs por hotspot
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group/select">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full sm:w-56 bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 block pl-5 pr-12 py-3.5 transition-all cursor-pointer shadow-inner hover:border-white/[0.1] outline-none appearance-none"
              >
                {periodos.map((item) => (
                  <option key={item.value} value={item.value} className="bg-[#0a0a0a]">
                    {item.label}
                  </option>
                ))}
              </select>

              <CalendarDays
                size={18}
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-500 group-hover/select:text-[#6be12f] transition-colors"
              />
            </div>

            <button
              onClick={buscarRelatorio}
              className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Cards principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-10">
          {cards.map((card, index) => (
            <div
              key={card.label}
              className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 ${card.bg}`}></div>

              <div className="relative z-10 flex items-center justify-between mb-6">
                <h3 className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  {card.label}
                </h3>
                <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <card.icon size={18} className={card.text} />
                </div>
              </div>

              <div className="relative z-10">
                <p className="text-4xl font-light text-white tracking-tight">
                  {card.valor}
                </p>
                <p className="text-xs text-neutral-500 mt-2 font-medium">
                  {card.sub}
                </p>
              </div>
            </div>
          ))}
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
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum dado de acesso encontrado
            </h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md mx-auto">
              Assim que usuários visualizarem anúncios no portal, os dados aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {relatorio.map((item, index) => (
              <div
                key={item.hotspot_id}
                className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6 sm:p-8 hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#6be12f]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                {/* Informações do Hotspot */}
                <div className="flex items-center gap-5 w-full xl:w-[320px] relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#050505] border border-white/[0.05] flex items-center justify-center shadow-inner group-hover:border-[#6be12f]/30 transition-all duration-300 flex-shrink-0">
                    <MapPin size={24} className="text-neutral-500 group-hover:text-[#6be12f] transition-colors duration-300" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#8cf059] transition-colors truncate tracking-tight">
                      {item.hotspot_nome}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1.5 font-medium">
                      <User size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        {item.cliente_nome || 'Sem cliente vinculado'}
                      </span>
                    </div>

                    {item.cidade && (
                      <p className="text-xs text-neutral-600 mt-1">
                        {item.cidade}
                      </p>
                    )}
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full xl:flex-1 relative z-10">
                  <MetricBox
                    label="Visualizações"
                    value={item.total_unique_views}
                    icon={Eye}
                    color="text-white"
                  />

                  <MetricBox
                    label="Cliques"
                    value={item.total_unique_clicks}
                    icon={MousePointerClick}
                    color="text-[#8cf059]"
                  />

                  <MetricBox
                    label="Copiaram"
                    value={item.total_links_copiados}
                    icon={Copy}
                    color="text-orange-400"
                  />

                  <MetricBox
                    label="Abriram CTA"
                    value={item.total_tentativas_abrir}
                    icon={ExternalLink}
                    color="text-blue-400"
                  />

                  <MetricBox
                    label="CTR"
                    value={`${item.taxa_clique}%`}
                    icon={TrendingUp}
                    color="text-purple-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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

function MetricBox({ label, value, icon: Icon, color }) {
  return (
    <div className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-4 shadow-inner group/metric hover:border-white/[0.1] transition-colors">
      <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover/metric:bg-white/[0.05] transition-colors">
        <Icon size={18} className={color} />
      </div>

      <div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-white leading-none tracking-tight">
          {value}
        </p>
      </div>
    </div>
  )
}