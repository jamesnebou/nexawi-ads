// src/app/dashboard/page.js
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs/client' // Importação CORRIGIDA
import { useRouter } from 'next/navigation'
import {
  Users, Wifi, UserPlus, DollarSign,
  TrendingUp, AlertTriangle, Clock, CheckCircle2, Eye, Activity // Adicionado Activity para Pessoas Online
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import toast, { Toaster } from 'react-hot-toast'

// Inicialização do Supabase Client (CORRIGIDA para usar createClientComponentClient)
// As variáveis de ambiente devem ser passadas como strings, não como process.env diretamente aqui.
// Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
// estejam configuradas corretamente no seu ambiente Vercel e local.
const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

const CORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [hotspots, setHotspots] = useState([])
  const [selectedHotspotId, setSelectedHotspotId] = useState('')
  const [selectedHotspotName, setSelectedHotspotName] = useState('Nenhum Hotspot')
  const [totalVisualizacoesHotspot, setTotalVisualizacoesHotspot] = useState(0) // Estado para visualizações do hotspot selecionado
  const [onlineUsers, setOnlineUsers] = useState(0)
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
  const [anunciosVisualizadosCount, setAnunciosVisualizadosCount] = useState({}); // Para armazenar contagens por hotspot

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

  // Função para buscar a contagem de anúncios visualizados por hotspot
  const fetchAnunciosVisualizadosCount = useCallback(async (hotspotsData) => {
    const counts = {};
    for (const hotspot of hotspotsData) {
      const { count, error } = await supabase
        .from('visualizacoes_anuncios')
        .select('*', { count: 'exact', head: true })
        .eq('hotspot_id', hotspot.id);
      if (error) {
        console.error(`Erro ao buscar visualizações de anúncios para hotspot ${hotspot.id}:`, error);
        toast.error(`Erro ao carregar visualizações de anúncios para ${hotspot.nome}: ${error.message}`);
      } else {
        counts[hotspot.id] = count;
      }
    }
    setAnunciosVisualizadosCount(counts);
    // Atualiza a contagem do hotspot selecionado
    if (selectedHotspotId && counts[selectedHotspotId] !== undefined) {
      setTotalVisualizacoesHotspot(counts[selectedHotspotId]);
    } else if (hotspotsData.length > 0 && counts[hotspotsData[0].id] !== undefined) {
      setTotalVisualizacoesHotspot(counts[hotspotsData[0].id]);
    } else {
      setTotalVisualizacoesHotspot(0);
    }
  }, [supabase, selectedHotspotId]);


  // Função principal para buscar todos os dados da dashboard
  const fetchDashboardData = useCallback(async (userId) => {
    setLoading(true)
    try {
      // 1. Buscar Hotspots
      const { data: hotspotsData, error: hotspotsError } = await supabase
        .from('hotspots')
        .select('*')
        .eq('user_id', userId)

      if (hotspotsError) throw hotspotsError
      setHotspots(hotspotsData)

      if (hotspotsData.length > 0) {
        const initialHotspotId = selectedHotspotId || hotspotsData[0].id;
        setSelectedHotspotId(initialHotspotId);
        setSelectedHotspotName(hotspotsData.find(h => h.id === initialHotspotId)?.nome || 'Nenhum Hotspot');
      } else {
        setSelectedHotspotId('');
        setSelectedHotspotName('Nenhum Hotspot');
      }

      // 2. Buscar Métricas Gerais (Clientes, Hotspots, Leads)
      const { count: totalClientesCount, error: clientesError } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (clientesError) throw clientesError

      const { count: clientesAtivosCount, error: clientesAtivosError } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Ativo')
      if (clientesAtivosError) throw clientesAtivosError

      const { count: totalHotspotsCount, error: totalHotspotsError } = await supabase
        .from('hotspots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (totalHotspotsError) throw totalHotspotsError

      const { count: hotspotsAtivosCount, error: hotspotsAtivosError } = await supabase
        .from('hotspots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Ativo')
      if (hotspotsAtivosError) throw hotspotsAtivosError

      const { count: totalLeadsCount, error: totalLeadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (totalLeadsError) throw totalLeadsError

      const today = new Date().toISOString().split('T')[0]
      const { count: leadsHojeCount, error: leadsHojeError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today)
      if (leadsHojeError) throw leadsHojeError

      setMetricas(prev => ({
        ...prev,
        totalClientes: totalClientesCount,
        clientesAtivos: clientesAtivosCount,
        totalHotspots: totalHotspotsCount,
        hotspotsAtivos: hotspotsAtivosCount,
        totalLeads: totalLeadsCount,
        leadsHoje: leadsHojeCount,
      }))

      // 3. Buscar Dados Financeiros
      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('pagamentos')
        .select('valor, status, created_at, clientes(nome)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5) // Para pagamentos recentes
      if (pagamentosError) throw pagamentosError

      let recebidoMes = 0
      let pendenteTotal = 0
      let vencidoTotal = 0
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      const allPagamentos = await supabase
        .from('pagamentos')
        .select('valor, status, created_at')
        .eq('user_id', userId)

      allPagamentos.data.forEach(p => {
        const paymentDate = new Date(p.created_at)
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear && p.status === 'Pago') {
          recebidoMes += p.valor
        }
        if (p.status === 'Pendente') pendenteTotal += p.valor
        if (p.status === 'Vencido') vencidoTotal += p.valor
      })

      setMetricas(prev => ({
        ...prev,
        recebidoMes,
        pendenteTotal,
        vencidoTotal,
      }))
      setPagamentosRecentes(pagamentosData)

      // 4. Buscar Leads Recentes
      const { data: leadsRecentesData, error: leadsRecentesError } = await supabase
        .from('leads')
        .select('id, nome, email, created_at, hotspots(nome)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
      if (leadsRecentesError) throw leadsRecentesError
      setLeadsRecentes(leadsRecentesData)

      // 5. Buscar Leads por Hotspot (Geral)
      const { data: leadsPorHotspotData, error: leadsPorHotspotError } = await supabase
        .from('hotspots')
        .select('id, nome, leads(id)')
        .eq('user_id', userId)
      if (leadsPorHotspotError) throw leadsPorHotspotError

      const formattedLeadsPorHotspot = leadsPorHotspotData.map(h => ({
        name: h.nome,
        leads: h.leads.length,
      })).sort((a, b) => b.leads - a.leads)
      setLeadsPorHotspotGeral(formattedLeadsPorHotspot)

      // 6. Buscar Clientes por Status para o gráfico de pizza
      const { data: clientesStatusData, error: clientesStatusError } = await supabase
        .from('clientes')
        .select('status', { count: 'exact' })
        .eq('user_id', userId)
      if (clientesStatusError) throw clientesStatusError

      const statusCounts = clientesStatusData.reduce((acc, cliente) => {
        acc[cliente.status] = (acc[cliente.status] || 0) + 1;
        return acc;
      }, {});

      const formattedClientesPorStatus = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status],
      }));
      setClientesPorStatus(formattedClientesPorStatus);

      // 7. Buscar Leads por Dia (Geral) - Exemplo para os últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: leadsLast7Days, error: leadsLast7DaysError } = await supabase
        .from('leads')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());
      if (leadsLast7DaysError) throw leadsLast7DaysError;

      const dailyLeads = {};
      leadsLast7Days.forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        dailyLeads[date] = (dailyLeads[date] || 0) + 1;
      });

      const formattedLeadsPorDia = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(sevenDaysAgo);
        date.setDate(sevenDaysAgo.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        return {
          name: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          leads: dailyLeads[dateString] || 0,
        };
      });
      setLeadsPorDiaGeral(formattedLeadsPorDia);

      // 8. Chamar a função de visualizações de anúncios após carregar os hotspots
      await fetchAnunciosVisualizadosCount(hotspotsData);

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      toast.error(`Erro ao carregar dashboard: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedHotspotId, fetchAnunciosVisualizadosCount]) // Adicionado selectedHotspotId e fetchAnunciosVisualizadosCount como dependências

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchDashboardData(user.id)
      }
    }
    getUser()
  }, [supabase, router, fetchDashboardData])

  // Efeito para atualizar o nome do hotspot selecionado e a contagem de visualizações
  useEffect(() => {
    if (selectedHotspotId && hotspots.length > 0) {
      const currentHotspot = hotspots.find(h => h.id === selectedHotspotId);
      setSelectedHotspotName(currentHotspot?.nome || 'Nenhum Hotspot');
      setTotalVisualizacoesHotspot(anunciosVisualizadosCount[selectedHotspotId] || 0);
    } else if (hotspots.length === 0) {
      setSelectedHotspotName('Nenhum Hotspot');
      setTotalVisualizacoesHotspot(0);
    }
  }, [selectedHotspotId, hotspots, anunciosVisualizadosCount]);


  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#22c55e' }} />
      </div>
    )
  }

  if (!user) {
    return null; // Ou um componente de carregamento/redirecionamento
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-8">
      <Toaster />
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          {/* Dropdown para seleção de Hotspot */}
          <div className="relative">
            <select
              value={selectedHotspotId || ''}
              onChange={(e) => setSelectedHotspotId(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg appearance-none pr-8 cursor-pointer text-sm"
            >
              {hotspots.length === 0 ? (
                <option value="">Nenhum Hotspot</option>
              ) : (
                hotspots.map((hotspot) => (
                  <option key={hotspot.id} value={hotspot.id}>
                    {hotspot.nome}
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Sair
          </button>
        </div>
      </header>

      {hotspots.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-gray-400">
          <AlertTriangle className="w-16 h-16 mb-4 text-yellow-500" />
          <p className="text-lg font-semibold mb-2">Nenhum hotspot encontrado.</p>
          <p className="text-sm text-center">Por favor, crie um hotspot para começar a ver os dados da sua dashboard.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Card: Total de Clientes */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Clientes</p>
                <p className="text-2xl font-bold text-white">{metricas.totalClientes}</p>
              </div>
            </div>

            {/* Card: Clientes Ativos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20 text-green-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Clientes Ativos</p>
                <p className="text-2xl font-bold text-white">{metricas.clientesAtivos}</p>
              </div>
            </div>

            {/* Card: Total de Visualizações de Anúncios (MODIFICADO) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Visualizações de Anúncios</p>
                <p className="text-2xl font-bold text-white">{totalVisualizacoesHotspot}</p>
              </div>
            </div>

            {/* Card: Leads Capturados Hoje */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/20 text-orange-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Leads Capturados Hoje</p>
                <p className="text-2xl font-bold text-white">{metricas.leadsHoje}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Gráfico de Leads por Dia (Geral) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 lg:col-span-2">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Capturados (Últimos 7 Dias)</h2>
              <p className="text-xs text-gray-500 mb-5">Visão geral de novos leads</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={leadsPorDiaGeral} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#22c55e' }} />
                  <Area type="monotone" dataKey="leads" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Clientes por Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Clientes por Status</h2>
              <p className="text-xs text-gray-500 mb-5">Distribuição dos seus clientes</p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={clientesPorStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {clientesPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                    formatter={(value, entry, index) => <span style={{ color: CORES[index % CORES.length] }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
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
          </div>
        </>
      )}
    </main>
  )
}