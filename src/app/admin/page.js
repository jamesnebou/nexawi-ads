'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Dashboard() {
  const [metricas, setMetricas] = useState({
    totalHotspots: 0,
    totalAnuncios: 0,
    totalLeads: 0,
    leadsHoje: 0
  })
  const [leadsSemana, setLeadsSemana] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    try {
      // Contar hotspots
      const { count: hotspots } = await supabase
        .from('hotspots')
        .select('*', { count: 'exact', head: true })

      // Contar anúncios
      const { count: anuncios } = await supabase
        .from('anuncios')
        .select('*', { count: 'exact', head: true })

      // Contar leads totais
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      // Leads hoje
      const hoje = new Date().toISOString().split('T')[0]
      const { count: leadsHoje } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje)

      // Leads dos últimos 7 dias
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

      const { data: leadsRecentes } = await supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', seteDiasAtras.toISOString())
        .order('created_at', { ascending: true })

      // Processar dados para gráfico
      const leadsPorDia = {}
      for (let i = 6; i >= 0; i--) {
        const data = new Date()
        data.setDate(data.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        leadsPorDia[dataStr] = 0
      }

      leadsRecentes?.forEach(lead => {
        const dataLead = lead.created_at.split('T')[0]
        if (leadsPorDia.hasOwnProperty(dataLead)) {
          leadsPorDia[dataLead]++
        }
      })

      const dadosGrafico = Object.entries(leadsPorDia).map(([data, quantidade]) => ({
        data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        leads: quantidade
      }))

      setMetricas({
        totalHotspots: hotspots || 0,
        totalAnuncios: anuncios || 0,
        totalLeads: totalLeads || 0,
        leadsHoje: leadsHoje || 0
      })

      setLeadsSemana(dadosGrafico)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hotspots</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metricas.totalHotspots}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Anúncios</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metricas.totalAnuncios}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📢</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metricas.totalLeads}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leads Hoje</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metricas.leadsHoje}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de leads */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Leads dos Últimos 7 Dias</h2>
        <div className="space-y-4">
          {leadsSemana.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="text-sm text-gray-600 w-12">{item.data}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${leadsSemana.length > 0 ? (item.leads / Math.max(...leadsSemana.map(l => l.leads))) * 100 : 0}%` 
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-8">{item.leads}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}