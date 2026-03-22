'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
// Removidas as importações diretas de BarChart e PieChart
// import { BarChart, PieChart } from '@tremor/react'; // Assumindo que você usa Tremor para gráficos
import { MapPin, User, Zap } from 'lucide-react'; // Ícones para os novos cards
import dynamic from 'next/dynamic'; // Importa dynamic do Next.js

// Importações dinâmicas para os componentes do Tremor
const BarChart = dynamic(() => import('@tremor/react').then((mod) => mod.BarChart), { ssr: false });
const PieChart = dynamic(() => import('@tremor/react').then((mod) => mod.PieChart), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ... (o restante do seu código permanece o mesmo) ...

export default function DashboardPage() {
  const [leadsCaptured, setLeadsCaptured] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [clientsByStatus, setClientsByStatus] = useState([]);
  const [topHotspotsData, setTopHotspotsData] = useState([]); // Dados para a nova lista de Top Hotspots
  const [onlineHotspotsData, setOnlineHotspotsData] = useState([]); // Dados para Pessoas Online
  const [latestPayments, setLatestPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    // --- Fetch Leads Capturados (mantido) ---
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('created_at');
    if (leadsError) console.error('Erro ao buscar leads:', leadsError);
    // Processar leadsData para o gráfico de Leads Capturados
    const leadsLast14Days = leadsData
      ? leadsData.filter(lead => {
          const date = new Date(lead.created_at);
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          return date >= fourteenDaysAgo;
        })
      : [];
    const leadsByDay = leadsLast14Days.reduce((acc, lead) => {
      const day = new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
    const chartDataLeads = Array.from({ length: 14 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { date: day, leads: leadsByDay[day] || 0 };
    });
    setLeadsCaptured(chartDataLeads);

    // --- Fetch Receita Mensal (mantido) ---
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('pagamentos') // Assumindo tabela 'pagamentos'
      .select('valor, status, created_at');
    if (paymentsError) console.error('Erro ao buscar pagamentos para receita:', paymentsError);

    const monthlyRevenueData = paymentsData
      ? paymentsData.filter(payment => {
          const date = new Date(payment.created_at);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return date >= sixMonthsAgo;
        })
      : [];

    const revenueByMonth = monthlyRevenueData.reduce((acc, payment) => {
      const monthYear = new Date(payment.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!acc[monthYear]) {
        acc[monthYear] = { Pendente: 0, Recebido: 0 };
      }
      acc[monthYear][payment.status] += payment.valor;
      return acc;
    }, {});

    const chartDataRevenue = Object.keys(revenueByMonth).map(monthYear => ({
      name: monthYear,
      Pendente: revenueByMonth[monthYear].Pendente,
      Recebido: revenueByMonth[monthYear].Recebido,
    }));
    setMonthlyRevenue(chartDataRevenue);

    // --- Fetch Clientes por Status (mantido) ---
    const { data: clientsData, error: clientsError } = await supabase
      .from('clientes')
      .select('ativo'); // Assumindo coluna 'ativo' na tabela 'clientes'
    if (clientsError) console.error('Erro ao buscar clientes por status:', clientsError);

    const activeClients = clientsData ? clientsData.filter(c => c.ativo).length : 0;
    const inactiveClients = clientsData ? clientsData.filter(c => !c.ativo).length : 0;
    setClientsByStatus([
      { name: 'Ativo', value: activeClients },
      { name: 'Inativo', value: inactiveClients },
    ]);

    // --- Fetch Últimos Pagamentos (mantido) ---
    const { data: latestPaymentsData, error: latestPaymentsError } = await supabase
      .from('pagamentos')
      .select('id, valor, status, created_at, clientes(nome)') // Assumindo relação com clientes
      .order('created_at', { ascending: false })
      .limit(5);
    if (latestPaymentsError) console.error('Erro ao buscar últimos pagamentos:', latestPaymentsError);
    setLatestPayments(latestPaymentsData || []);


    // --- NOVO: Fetch para Top Hotspots ---
    const { data: hotspotsFullData, error: hotspotsFullError } = await supabase
      .from('hotspots')
      .select('id, nome, clientes(nome)'); // Seleciona o nome do cliente associado
    if (hotspotsFullError) console.error('Erro ao buscar hotspots completos:', hotspotsFullError);

    // Contar leads por hotspot
    const { data: allLeadsData, error: allLeadsError } = await supabase
      .from('leads')
      .select('hotspot_id');
    if (allLeadsError) console.error('Erro ao buscar todos os leads:', allLeadsError);

    const leadsCountMap = (allLeadsData || []).reduce((acc, lead) => {
      acc[lead.hotspot_id] = (acc[lead.hotspot_id] || 0) + 1;
      return acc;
    }, {});

    const processedTopHotspots = (hotspotsFullData || []).map(hotspot => ({
      id: hotspot.id,
      nome: hotspot.nome,
      clienteNome: hotspot.clientes ? hotspot.clientes.nome : 'N/A',
      leadsCount: leadsCountMap[hotspot.id] || 0,
    }));
    setTopHotspotsData(processedTopHotspots);


    // --- NOVO: Fetch para Pessoas Online por Hotspot ---
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('hotspot_sessions') // Assumindo tabela 'hotspot_sessions'
      .select('hotspot_id')
      .gte('last_active_at', fiveMinutesAgo); // Filtra sessões ativas nos últimos 5 minutos
    if (sessionsError) console.error('Erro ao buscar sessões online:', sessionsError);

    const onlineUsersMap = (sessionsData || []).reduce((acc, session) => {
      acc[session.hotspot_id] = (acc[session.hotspot_id] || 0) + 1;
      return acc;
    }, {});

    const processedOnlineHotspots = (hotspotsFullData || []).map(hotspot => ({
      id: hotspot.id,
      nome: hotspot.nome,
      onlineCount: onlineUsersMap[hotspot.id] || 0,
    }));
    setOnlineHotspotsData(processedOnlineHotspots);


    setLoading(false);
  }

  return (
    <div className="p-6 bg-gray-950 min-h-screen text-gray-100">
      <h1 className="text-2xl font-bold text-white mb-6">Visão Geral</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Card: Leads Capturados */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Leads Capturados</h2>
            <p className="text-gray-500 text-sm mb-4">Últimos 14 dias</p>
            <BarChart
              data={leadsCaptured}
              index="date"
              categories={['leads']}
              colors={['green']}
              yAxisWidth={48}
              showAnimation={true}
              className="h-48"
            />
          </div>

          {/* Card: Receita Mensal */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Receita Mensal</h2>
            <p className="text-gray-500 text-sm mb-4">Últimos 6 meses</p>
            <BarChart
              data={monthlyRevenue}
              index="name"
              categories={['Pendente', 'Recebido']}
              colors={['orange', 'green']}
              yAxisWidth={48}
              stack={true}
              showAnimation={true}
              className="h-48"
            />
          </div>

          {/* Card: Clientes por Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Clientes por Status</h2>
            <p className="text-gray-500 text-sm mb-4">Distribuição atual</p>
            <div className="flex items-center justify-center h-48">
              <PieChart
                data={clientsByStatus}
                category="value"
                index="name"
                valueFormatter={(number) => `${number}`}
                colors={['blue', 'green']}
                className="w-32 h-32"
              />
              <div className="ml-8 space-y-2">
                {clientsByStatus.map((item) => (
                  <div key={item.name} className="flex items-center text-sm">
                    <span className={`w-3 h-3 rounded-full mr-2 ${item.name === 'Ativo' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                    <span className="text-gray-300">{item.name}:</span>
                    <span className="ml-2 font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NOVO Card: Top Hotspots (substitui o antigo gráfico) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Top Hotspots</h2>
            <p className="text-gray-500 text-sm mb-4">Hotspots cadastrados, clientes e leads</p>
            {topHotspotsData.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum hotspot encontrado.</p>
            ) : (
              <ul className="space-y-3">
                {topHotspotsData.map((hotspot) => (
                  <li key={hotspot.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col items-start">
                      <span className="text-gray-300 font-medium">{hotspot.nome}</span>
                      <span className="text-gray-500 text-xs">Cliente: {hotspot.clienteNome || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-green-400 font-medium flex items-center gap-1">
                        <User size={14} /> {hotspot.leadsCount} Leads
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* NOVO Card: Pessoas Online por Hotspot */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Pessoas Online por Hotspot</h2>
            <p className="text-gray-500 text-sm mb-4">Últimos 5 minutos</p>
            {onlineHotspotsData.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma pessoa online no momento.</p>
            ) : (
              <ul className="space-y-3">
                {onlineHotspotsData.map((hotspot) => (
                  <li key={hotspot.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 font-medium">{hotspot.nome}</span>
                    <span className="text-blue-400 font-medium flex items-center gap-1">
                      <Zap size={14} /> {hotspot.onlineCount} Online
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Card: Últimos Pagamentos (mantido) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Últimos Pagamentos</h2>
            <p className="text-gray-500 text-sm mb-4">5 mais recentes</p>
            {latestPayments.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum pagamento recente.</p>
            ) : (
              <ul className="space-y-4">
                {latestPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white mr-3">
                        {payment.clientes?.nome ? payment.clientes.nome.charAt(0).toUpperCase() : 'N/A'}
                      </div>
                      <div>
                        <p className="text-gray-300 font-medium">{payment.clientes?.nome || 'Cliente Desconhecido'}</p>
                        <p className="text-gray-500 text-xs">{new Date(payment.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">R$ {payment.valor.toFixed(2).replace('.', ',')}</p>
                      <p className={`text-xs ${payment.status === 'Pendente' ? 'text-orange-400' : 'text-green-400'}`}>
                        {payment.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Card: Últimos Leads Capturados (mantido, se houver espaço ou necessidade) */}
          {/* Você pode ajustar a posição ou remover este card se preferir, dado os novos cards */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Últimos Leads Capturados</h2>
            <p className="text-gray-500 text-sm mb-4">5 mais recentes</p>
            {/* Conteúdo para Últimos Leads Capturados, se você tiver essa funcionalidade */}
            <p className="text-gray-500 text-sm">Funcionalidade a ser implementada.</p>
          </div>
        </div>
      )}
    </div>
  );
}