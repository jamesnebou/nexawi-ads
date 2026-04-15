'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Wifi, DollarSign, UserPlus, Eye, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'
import toast, { Toaster } from 'react-hot-toast';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const [metricas, setMetricas] = useState({
    clientesAtivos: 0,
    hotspotsAtivos: 0,
    leadsHoje: 0,
    leadsMes: 0,
    pessoasOnline: 0,
    recebidoMes: 0,
  })
  const [leadsPorDiaGeral, setLeadsPorDiaGeral] = useState([])
  const [leadsUnicosPorDiaHotspot, setLeadsUnicosPorDiaHotspot] = useState([])
  const [receitaPorMes, setReceitaPorMes] = useState([])
  const [clientesPorStatus, setClientesPorStatus] = useState([])
  const [leadsPorHotspotGeral, setLeadsPorHotspotGeral] = useState([])
  const [pagamentosRecentes, setPagamentosRecentes] = useState([])
  const [leadsRecentes, setLeadsRecentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [hotspots, setHotspots] = useState([])
  const [selectedHotspotId, setSelectedHotspotId] = useState('')

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  const corStatus = (s) => s === 'Pago' ? 'text-green-400' : s === 'Pendente' ? 'text-yellow-400' : 'text-red-400'

  const selectedHotspotName = hotspots.find(h => h.id === selectedHotspotId)?.nome || 'Todos';

  // Adicionado parâmetro "silent" para atualizar em tempo real sem piscar a tela
  const buscarDados = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0)).toISOString()
    const quinzeMinutosAtras = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    // 1. Buscar Hotspots para o Select
    if (hotspots.length === 0) {
      const { data: hotspotsData, error: hotspotsError } = await supabase
        .from('hotspots')
        .select('id, nome')
        .eq('status', 'Ativo')
        .order('nome');
      if (hotspotsError) console.error('Erro ao buscar hotspots:', hotspotsError);
      else {
        setHotspots(hotspotsData || []);
        if (hotspotsData && hotspotsData.length > 0 && !selectedHotspotId) {
          setSelectedHotspotId(hotspotsData[0].id);
        }
      }
    }

    // 2. Montar as queries de contagem baseadas no Hotspot selecionado
    let queryLeadsHoje = supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioHoje);
    let queryLeadsMes = supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes);
    let queryPessoasOnline = supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', quinzeMinutosAtras);

    if (selectedHotspotId) {
      queryLeadsHoje = queryLeadsHoje.eq('hotspot_id', selectedHotspotId);
      queryLeadsMes = queryLeadsMes.eq('hotspot_id', selectedHotspotId);
      queryPessoasOnline = queryPessoasOnline.eq('hotspot_id', selectedHotspotId);
    }

    // 3. Buscar dados gerais simultaneamente
    const [
      { count: clientesAtivos },
      { count: hotspotsAtivos },
      { count: leadsHoje },
      { count: leadsMes },
      { count: pessoasOnline },
      { data: pagamentos },
      { data: clientes },
      { data: leadsGeral }
    ] = await Promise.all([
      supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('status', 'Ativo'),
      supabase.from('hotspots').select('*', { count: 'exact', head: true }).eq('status', 'Ativo'),
      queryLeadsHoje,
      queryLeadsMes,
      queryPessoasOnline,
      supabase.from('pagamentos').select('*, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('status'),
      supabase.from('leads').select('*, hotspots(nome)').order('created_at', { ascending: false })
    ])

    const recebidoMes = (pagamentos || [])
      .filter(p => p.status === 'Pago' && p.created_at >= inicioMes)
      .reduce((acc, p) => acc + Number(p.valor), 0)

    setMetricas({ 
      clientesAtivos: clientesAtivos || 0, 
      hotspotsAtivos: hotspotsAtivos || 0, 
      leadsHoje: leadsHoje || 0, 
      leadsMes: leadsMes || 0,
      pessoasOnline: pessoasOnline || 0,
      recebidoMes 
    })

    // Lógica para leadsPorDiaGeral
    const ultimos14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(hoje.getDate() - (13 - i))
      return d.toISOString().slice(0, 10)
    })
    const leadsPorDiaMap = {}
    ultimos14.forEach(d => leadsPorDiaMap[d] = 0);
    (leadsGeral || []).forEach(l => {
      const d = l.created_at?.slice(0, 10)
      if (leadsPorDiaMap[d] !== undefined) leadsPorDiaMap[d]++
    })
    setLeadsPorDiaGeral(ultimos14.map(d => ({
      data: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      leads: leadsPorDiaMap[d]
    })))

    // Lógica para leadsUnicosPorDiaHotspot
    let leadsUnicosPorDiaHotspotData = [];
    if (selectedHotspotId) {
      const { data: leadsHotspot, error: leadsHotspotError } = await supabase
        .from('leads')
        .select('created_at')
        .eq('hotspot_id', selectedHotspotId);

      if (leadsHotspotError) {
        console.error('Erro ao buscar leads por hotspot:', leadsHotspotError);
      } else {
        const leadsPorDiaHotspotMap = {};
        ultimos14.forEach(d => leadsPorDiaHotspotMap[d] = 0);
        (leadsHotspot || []).forEach(l => {
          const d = l.created_at?.slice(0, 10);
          if (leadsPorDiaHotspotMap[d] !== undefined) leadsPorDiaHotspotMap[d]++;
        });
        leadsUnicosPorDiaHotspotData = ultimos14.map(d => ({
          data: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          leads: leadsPorDiaHotspotMap[d]
        }));
      }
    }
    setLeadsUnicosPorDiaHotspot(leadsUnicosPorDiaHotspotData);

    // Lógica para receitaPorMes
    const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(hoje.getMonth() - (5 - i))
      return d.toISOString().slice(0, 7)
    })
    const receitaPorMesMap = {}
    ultimos6Meses.forEach(m => receitaPorMesMap[m] = { recebido: 0, pendente: 0 });
    (pagamentos || []).forEach(p => {
      const mes = p.created_at?.slice(0, 7)
      if (receitaPorMesMap[mes]) {
        if (p.status === 'Pago') receitaPorMesMap[mes].recebido += Number(p.valor)
        else if (p.status === 'Pendente') receitaPorMesMap[mes].pendente += Number(p.valor)
      }
    })
    setReceitaPorMes(ultimos6Meses.map(m => ({
      label: new Date(m + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      recebido: receitaPorMesMap[m]?.recebido || 0,
      pendente: receitaPorMesMap[m]?.pendente || 0,
    })))

    // Lógica para clientesPorStatus
    const clientesPorStatusMap = (clientes || []).reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})
    setClientesPorStatus(Object.entries(clientesPorStatusMap).map(([status, count]) => ({
      name: status,
      value: count,
    })))

    // Lógica para leadsPorHotspotGeral
    const leadsPorHotspotMap = (leadsGeral || []).reduce((acc, l) => {
      const hotspotNome = l.hotspots?.nome || 'Desconhecido'
      acc[hotspotNome] = (acc[hotspotNome] || 0) + 1
      return acc
    }, {})
    setLeadsPorHotspotGeral(Object.entries(leadsPorHotspotMap).map(([name, leads]) => ({
      name, leads
    })).sort((a, b) => b.leads - a.leads).slice(0, 5))

    // Pagamentos Recentes
    setPagamentosRecentes((pagamentos || []).slice(0, 5))

    // Leads Recentes
    setLeadsRecentes((leadsGeral || []).slice(0, 5))

    if (!silent) setLoading(false)
  }, [selectedHotspotId, hotspots])

  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  // Atualização em Tempo Real baseada na tabela LEADS
  useEffect(() => {
    if (!selectedHotspotId) return;

    const channel = supabase
      .channel(`leads_channel_${selectedHotspotId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `hotspot_id=eq.${selectedHotspotId}`
        },
        (payload) => {
          // Atualiza os dados silenciosamente (sem loading)
          buscarDados(true);

          toast.success(`Novo acesso registrado em ${selectedHotspotName}!`, {
            position: 'bottom-right',
            duration: 4000,
            style: {
              background: '#0a0a0a',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
            },
            iconTheme: {
              primary: '#22c55e',
              secondary: '#0a0a0a',
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedHotspotId, selectedHotspotName, buscarDados]);

  const cards = [
    { label: 'Clientes Ativos', valor: metricas.clientesAtivos, icon: Users, text: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Hotspots Ativos', valor: metricas.hotspotsAtivos, icon: Wifi, text: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Acessos Hoje', valor: metricas.leadsHoje, sub: selectedHotspotName, icon: UserPlus, text: 'text-orange-400', bg: 'bg-orange-500/20' },
    { label: 'Acessos no Mês', valor: metricas.leadsMes, sub: selectedHotspotName, icon: Eye, text: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Pessoas Online', valor: metricas.pessoasOnline, sub: 'Últimos 15 min', icon: Activity, text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Recebido no Mês', valor: fmt(metricas.recebidoMes), icon: DollarSign, text: 'text-purple-400', bg: 'bg-purple-500/20' },
  ];

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 bg-[#050505] text-white min-h-screen relative overflow-hidden selection:bg-green-500/30 font-sans">

      {/* Efeitos de Luz no Fundo (Ambient Glow Minimalista) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-green-500/5 rounded-full blur-[150px] pointer-events-none z-0"></div>

      <Toaster />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tight">Dashboard Admin</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Visão geral e métricas do seu sistema</p>
        </div>

        <div className="relative min-w-[260px] group/select">
          <select
            className="appearance-none w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] text-white text-sm font-medium rounded-2xl focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 block pl-5 pr-12 py-3.5 transition-all cursor-pointer shadow-inner hover:border-white/[0.1] outline-none"
            value={selectedHotspotId}
            onChange={(e) => setSelectedHotspotId(e.target.value)}
          >
            {hotspots.length === 0 ? (
              <option value="">Carregando Hotspots...</option>
            ) : (
              hotspots.map((hotspot) => (
                <option key={hotspot.id} value={hotspot.id}>
                  {hotspot.nome}
                </option>
              ))
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-500 group-hover/select:text-green-500 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="relative z-10 flex items-center justify-center h-[60vh]">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 border-t-2 border-green-500/50 rounded-full animate-spin"></div>
            <Activity className="text-green-500 animate-pulse" size={30} />
          </div>
        </div>
      ) : (
        <div className="relative z-10">
          {/* Cards de Métricas Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-10">
            {cards.map((card, index) => (
              <div key={index} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>

                {/* Glow interno no hover */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 ${card.bg}`}></div>

                <div className="relative z-10 flex items-center justify-between mb-6">
                  <h3 className="text-gray-500 text-xs font-bold tracking-widest uppercase">{card.label}</h3>
                  <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <card.icon size={18} className={card.text} />
                  </div>
                </div>
                <div className="relative z-10">
                  <p className="text-4xl font-light text-white tracking-tight">{card.valor}</p>
                  {card.sub && <p className="text-xs text-gray-500 mt-2 font-medium">{card.sub}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Leads por Dia (Geral) */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white tracking-tight">Leads Capturados (Geral)</h2>
                <p className="text-sm text-gray-500 mt-1">Evolução nos últimos 14 dias</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={leadsPorDiaGeral} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} itemStyle={{ color: '#22c55e', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Leads por Dia (Hotspot Selecionado) */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white tracking-tight">Leads Capturados ({selectedHotspotName})</h2>
                <p className="text-sm text-gray-500 mt-1">Evolução nos últimos 14 dias</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={leadsUnicosPorDiaHotspot} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeadsHotspot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeadsHotspot)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Receita por Mês */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white tracking-tight">Receita por Mês</h2>
                <p className="text-sm text-gray-500 mt-1">Comparativo dos últimos 6 meses</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={receitaPorMes} margin={{ top: 10, right: 0, left: -10, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} formatter={(v) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af', paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Clientes por Status */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 flex flex-col animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white tracking-tight">Clientes por Status</h2>
                <p className="text-sm text-gray-500 mt-1">Distribuição atual da base</p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={clientesPorStatus} cx="50%" cy="50%" innerRadius={65} outerRadius={85} dataKey="value" paddingAngle={5} stroke="none">
                      {clientesPorStatus.map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} itemStyle={{ fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {clientesPorStatus.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-2xl border border-white/[0.02] shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES[i % CORES.length], boxShadow: `0 0 10px ${CORES[i % CORES.length]}80` }} />
                        <span className="text-xs font-medium text-gray-400">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {/* Gráfico de Top Hotspots GERAL */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white tracking-tight">Top Hotspots (Geral)</h2>
                <p className="text-sm text-gray-500 mt-1">Ranking por leads capturados</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={leadsPorHotspotGeral} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }} />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Últimos Pagamentos */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white tracking-tight">Últimos Pagamentos</h2>
                <p className="text-sm text-gray-500 mt-1">Movimentações recentes</p>
              </div>
              <div className="space-y-3">
                {pagamentosRecentes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.02] border border-transparent hover:border-white/[0.05] transition-all duration-300 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center text-gray-400 font-bold text-sm flex-shrink-0 shadow-inner group-hover:text-white group-hover:border-white/[0.1] transition-colors">
                        {p.clientes?.nome?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate group-hover:text-white transition-colors">{p.clientes?.nome || '—'}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-white">{fmt(p.valor)}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${corStatus(p.status)}`}>{p.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Últimos Leads Capturados */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 hover:border-white/[0.1] transition-all duration-500 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white tracking-tight">Últimos Leads Capturados</h2>
              <p className="text-sm text-gray-500 mt-1">Novos contatos registrados na base</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-xs font-bold text-gray-600 uppercase tracking-widest pb-4 pl-2">Lead</th>
                    <th className="text-xs font-bold text-gray-600 uppercase tracking-widest pb-4">Hotspot</th>
                    <th className="text-xs font-bold text-gray-600 uppercase tracking-widest pb-4 pr-2 text-right">Data e Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {leadsRecentes.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center text-gray-400 font-bold text-sm shadow-inner group-hover:text-white group-hover:border-white/[0.1] transition-colors">
                            {l.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{l.nome || '—'}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{l.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-gray-400">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-white/[0.05] text-xs font-medium shadow-inner">
                          {l.hotspots?.nome || '—'}
                        </span>
                      </td>
                      <td className="py-4 pr-2 text-sm text-gray-500 text-right font-medium">
                        {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </main>
  )
}