'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Wifi, UserPlus, DollarSign,
  TrendingUp, AlertTriangle, Clock, CheckCircle2, Eye, Activity // Adicionado Activity para Pessoas Online
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import toast, { Toaster } from 'react-hot-toast' // Importa toast e Toaster

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [hotspots, setHotspots] = useState([])
  const [selectedHotspotId, setSelectedHotspotId] = useState('')
  const [selectedHotspotName, setSelectedHotspotName] = useState('Nenhum Hotspot') // Novo estado para o nome do hotspot
  const [totalVisualizacoesHotspot, setTotalVisualizacoesHotspot] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0) // Novo estado para pessoas online
  const [metricas, setMetricas] = useState({
    totalClientes: 0, clientesAtivos: 0,
    totalHotspots: 0, hotspotsAtivos: 0,
    totalLeads: 0, leadsHoje: 0,
    recebidoMes: 0, pendenteTotal: 0, vencidoTotal: 0,
  })
  const [leadsPorDiaGeral, setLeadsPorDiaGeral] = useState([])
  const [leadsUnicosPorDiaHotspot, setLeadsUnicosPorDiaHotspot] = useState([])
  const [receitaPorMes, setReceitaPorMes] = useState([])
  const [clientesPorStatus, setClientesPorStatus] = useState([])
  const [leadsPorHotspotGeral, setLeadsPorHotspotGeral] = useState([])
  const [pagamentosRecentes, setPagamentosRecentes] = useState([])
  const [leadsRecentes, setLeadsRecentes] = useState([])

  // Função para formatar valores monetários
  const fmt = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Função para determinar a cor do status
  const corStatus = (status) => {
    switch (status) {
      case 'Pago': return 'text-green-400'
      case 'Pendente': return 'text-yellow-400'
      case 'Vencido': return 'text-red-400'
      case 'Ativo': return 'text-green-400'
      case 'Inativo': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  // Função para buscar dados
  const buscarDados = useCallback(async () => {
    setLoading(true)

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const hojeStr = hoje.toISOString().slice(0, 10)

    let currentHotspots = hotspots;
    if (currentHotspots.length === 0) {
      const { data: allHotspots, error: hotspotsError } = await supabase
        .from('hotspots')
        .select('id, nome, visualizacoes')
        .order('nome', { ascending: true })

      if (hotspotsError) {
        console.error('Erro ao buscar hotspots:', hotspotsError)
      } else {
        currentHotspots = allHotspots || [];
        setHotspots(currentHotspots);
        if (currentHotspots.length > 0 && !selectedHotspotId) {
          setSelectedHotspotId(currentHotspots[0].id);
        }
      }
    }

    // Atualiza o nome do hotspot selecionado
    const currentSelectedHotspot = currentHotspots.find(h => h.id === selectedHotspotId);
    setSelectedHotspotName(currentSelectedHotspot?.nome || 'Nenhum Hotspot');
    setTotalVisualizacoesHotspot(currentSelectedHotspot?.visualizacoes || 0);

    // Fetch Online Users for selected hotspot (initial count)
    let onlineUsersCount = 0;
    if (selectedHotspotId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: sessions, error: sessionsError } = await supabase
        .from('hotspot_sessions')
        .select('id')
        .eq('hotspot_id', selectedHotspotId)
        .gte('last_active_at', fiveMinutesAgo);

      if (sessionsError) {
        console.error('Erro ao buscar sessões online:', sessionsError);
      } else {
        onlineUsersCount = sessions?.length || 0;
      }
    }
    setOnlineUsers(onlineUsersCount);


    // Promise.all para buscar os dados gerais da dashboard
    const [
      { data: clientes },
      { data: hotspotsData },
      { data: leadsGeral },
      { data: pagamentos },
      { data: leadsHoje },
    ] = await Promise.all([
      supabase.from('clientes').select('status, created_at'),
      supabase.from('hotspots').select('status'),
      supabase.from('leads').select('id, nome, email, created_at, hotspot_id, cpf, hotspots(nome)').order('created_at', { ascending: false }),
      supabase.from('pagamentos').select('valor, status, data_vencimento, created_at, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('leads').select('id').gte('created_at', hojeStr),
    ])

    const recebidoMes = (pagamentos || [])
      .filter(p => p.status === 'Pago' && p.created_at >= inicioMes)
      .reduce((acc, p) => acc + Number(p.valor), 0)
    const pendenteTotal = (pagamentos || [])
      .filter(p => p.status === 'Pendente')
      .reduce((acc, p) => acc + Number(p.valor), 0)
    const vencidoTotal = (pagamentos || [])
      .filter(p => p.status === 'Vencido' && new Date(p.data_vencimento) < hoje)
      .reduce((acc, p) => acc + Number(p.valor), 0)

    setMetricas({
      totalClientes: clientes?.length || 0,
      clientesAtivos: clientes?.filter(c => c.status === 'Ativo').length || 0,
      totalHotspots: hotspotsData?.length || 0,
      hotspotsAtivos: hotspotsData?.filter(h => h.status === 'Ativo').length || 0,
      totalLeads: leadsGeral?.length || 0,
      leadsHoje: leadsHoje?.length || 0,
      recebidoMes, pendenteTotal, vencidoTotal,
    })

    // Lógica para leadsPorDiaGeral (leads capturados - gráfico geral)
    const ultimos14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
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

    // Lógica para leadsUnicosPorDiaHotspot (gráfico por hotspot)
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
      return d.toISOString().slice(0, 7) // YYYY-MM
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

    setLoading(false)
  }, [selectedHotspotId, hotspots]) // Dependências para useCallback

  // useEffect para buscar dados na montagem e quando o hotspot selecionado muda
  useEffect(() => {
    buscarDados()
  }, [buscarDados]) // Dependência para useEffect

  // useEffect para a Realtime Subscription
  useEffect(() => {
    if (!selectedHotspotId) return;

    // Função para re-contar usuários online
    const reCountOnlineUsers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: sessions, error: sessionsError } = await supabase
        .from('hotspot_sessions')
        .select('id')
        .eq('hotspot_id', selectedHotspotId)
        .gte('last_active_at', fiveMinutesAgo);

      if (sessionsError) {
        console.error('Erro ao re-contar sessões online:', sessionsError);
      } else {
        setOnlineUsers(sessions?.length || 0);
      }
    };

    // Configura o canal Realtime
    const channel = supabase
      .channel(`hotspot_sessions_channel_${selectedHotspotId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'hotspot_sessions',
          filter: `hotspot_id=eq.${selectedHotspotId}`
        },
        (payload) => {
          console.log('Realtime change received!', payload);
          reCountOnlineUsers(); // Re-conta usuários online em qualquer mudança

          if (payload.eventType === 'INSERT') {
            // Notificação para novo acesso
            toast.success(`Hotspot ${selectedHotspotName} recebeu um novo acesso!`, {
              position: 'bottom-right',
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #22c55e',
              },
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            });
          }
        }
      )
      .subscribe();

    // Limpeza do canal Realtime ao desmontar ou mudar o hotspot
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedHotspotId, selectedHotspotName]); // Dependências para o useEffect do Realtime

  const cards = [
    { label: 'Clientes Ativos', valor: metricas.clientesAtivos, icon: Users, cor: 'text-green-400', bg: 'bg-green-400/5 border-green-400/20' },
    { label: 'Hotspots Ativos', valor: metricas.hotspotsAtivos, icon: Wifi, cor: 'text-blue-400', bg: 'bg-blue-400/5 border-blue-400/20' },
    { label: 'Leads Hoje', valor: metricas.leadsHoje, icon: UserPlus, cor: 'text-orange-400', bg: 'bg-orange-400/5 border-orange-400/20' },
    { label: 'Recebido no Mês', valor: fmt(metricas.recebidoMes), icon: DollarSign, cor: 'text-purple-400', bg: 'bg-purple-400/5 border-purple-400/20' },
    { label: 'Total de acessos ao portal', valor: totalVisualizacoesHotspot, icon: Eye, cor: 'text-red-400', bg: 'bg-red-400/5 border-red-400/20' },
    { label: 'Pessoas Online', valor: onlineUsers, sub: `No hotspot: ${selectedHotspotName}`, icon: Activity, cor: 'text-cyan-400', bg: 'bg-cyan-400/5 border-cyan-400/20' }, // Novo card
  ];

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 bg-gray-950 text-white">
      <Toaster /> {/* Adiciona o componente Toaster aqui */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <select
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
            {cards.map((card, index) => {
              console.log(`Processando card ${index}: ${card.label} ${card.valor}`);
              return (
                <div key={index} className={`bg-gray-900 border ${card.bg} rounded-2xl p-5 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400">{card.label}</h3>
                    <card.icon size={20} className={card.cor} />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{card.valor}</p>
                  {card.sub && <p className="text-xs text-gray-500">{card.sub}</p>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Leads por Dia (Geral) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Capturados (Geral)</h2>
              <p className="text-xs text-gray-500 mb-5">Últimos 14 dias</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={leadsPorDiaGeral} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#22c55e' }} />
                  <Area type="monotone" dataKey="leads" stroke="#22c55e" fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Leads por Dia (Hotspot Selecionado) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Capturados ({selectedHotspotName})</h2>
              <p className="text-xs text-gray-500 mb-5">Últimos 14 dias</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={leadsUnicosPorDiaHotspot} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeadsHotspot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeadsHotspot)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Receita por Mês */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Receita por Mês</h2>
              <p className="text-xs text-gray-500 mb-5">Últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={receitaPorMes} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} formatter={(v) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                  <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Clientes por Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Clientes por Status</h2>
              <p className="text-xs text-gray-500 mb-4">Distribuição atual</p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={clientesPorStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {clientesPorStatus.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                  {clientesPorStatus.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES[i % CORES.length] }} />
                        <span className="text-xs text-gray-400">{item.name}</span>
                      </div>
                      <span className="text-xs font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Gráfico de Top Hotspots GERAL */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Top Hotspots (Geral)</h2>
              <p className="text-xs text-gray-500 mb-5">Por leads capturados</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsPorHotspotGeral} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Últimos Pagamentos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Últimos Pagamentos</h2>
              <p className="text-xs text-gray-500 mb-4">5 mais recentes</p>
              <div className="space-y-3">
                {pagamentosRecentes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 font-semibold text-xs flex-shrink-0">
                        {p.clientes?.nome?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{p.clientes?.nome || '—'}</p>
                        <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-semibold text-white">{fmt(p.valor)}</p>
                      <p className={`text-xs ${corStatus(p.status)}`}>{p.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Últimos Leads Capturados */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Últimos Leads Capturados</h2>
            <p className="text-xs text-gray-500 mb-4">5 mais recentes</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-medium pb-3">Lead</th>
                    <th className="text-left text-xs text-gray-500 font-medium pb-3">Hotspot</th>
                    <th className="text-left text-xs text-gray-500 font-medium pb-3">Capturado em</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsRecentes.map((l) => (
                    <tr key={l.id} className="border-b border-gray-800 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400 font-semibold text-xs">
                            {l.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-xs text-white">{l.nome || '—'}</p>
                            <p className="text-xs text-gray-500">{l.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-400">{l.hotspots?.nome || '—'}</td>
                      <td className="py-3 text-xs text-gray-500">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  )
}