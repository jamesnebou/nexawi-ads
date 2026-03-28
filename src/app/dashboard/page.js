// src/app/dashboard/page.js
'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs/client'
import { useEffect, useState, useCallback } from 'react' // Adicionado useCallback
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [hotspots, setHotspots] = useState([])
  const [leadsCount, setLeadsCount] = useState({})
  const [anunciosVisualizadosCount, setAnunciosVisualizadosCount] = useState({});
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null); // Novo estado para erros

  // Função para buscar a contagem de leads
  const fetchLeadsCount = useCallback(async (hotspotsData) => {
    const counts = {}
    for (const hotspot of hotspotsData) {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('hotspot_id', hotspot.id)
      if (error) {
        console.error(`Erro ao buscar leads para hotspot ${hotspot.id}:`, error)
        setError(`Erro ao carregar leads: ${error.message}`);
      } else {
        counts[hotspot.id] = count
      }
    }
    setLeadsCount(counts)
  }, [supabase]); // Dependência: supabase

  // Função para buscar a contagem de anúncios visualizados
  const fetchAnunciosVisualizadosCount = useCallback(async (hotspotsData) => {
    const counts = {};
    for (const hotspot of hotspotsData) {
      const { count, error } = await supabase
        .from('visualizacoes_anuncios')
        .select('*', { count: 'exact', head: true })
        .eq('hotspot_id', hotspot.id);
      if (error) {
        console.error(`Erro ao buscar visualizações de anúncios para hotspot ${hotspot.id}:`, error);
        setError(`Erro ao carregar visualizações de anúncios: ${error.message}`);
      } else {
        counts[hotspot.id] = count;
      }
    }
    setAnunciosVisualizadosCount(counts);
  }, [supabase]); // Dependência: supabase

  // Função principal para buscar hotspots e dados relacionados
  const fetchHotspots = useCallback(async (userId) => {
    setLoading(true)
    setError(null); // Limpa erros anteriores
    const { data, error } = await supabase
      .from('hotspots')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao buscar hotspots:', error)
      setError(`Erro ao carregar hotspots: ${error.message}`);
      setLoading(false)
      return
    }

    setHotspots(data)
    await fetchLeadsCount(data) // Usar await para garantir que os dados estejam prontos
    await fetchAnunciosVisualizadosCount(data); // Usar await
    setLoading(false)
  }, [supabase, fetchLeadsCount, fetchAnunciosVisualizadosCount]); // Dependências: supabase, fetchLeadsCount, fetchAnunciosVisualizadosCount

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchHotspots(user.id)
      }
    }
    getUser()
  }, [supabase, router, fetchHotspots]) // Dependências: supabase, router, fetchHotspots

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Erro ao carregar dados</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Sair
        </button>
      </header>

      <h2 className="text-2xl font-semibold mb-6">Seus Hotspots</h2>

      {hotspots.length === 0 ? (
        <p className="text-gray-400">Nenhum hotspot cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotspots.map((hotspot) => (
            <div key={hotspot.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-3" style={{ color: hotspot.cor_primaria }}>{hotspot.nome}</h3>
              <p className="text-gray-400 mb-4">{hotspot.descricao}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <span className="text-gray-300">Leads Capturados:</span>
                  <span className="font-semibold text-lg">{leadsCount[hotspot.id] || 0}</span>
                </div>
                {/* Card para Anúncios Visualizados */}
                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <span className="text-gray-300">Anúncios Visualizados:</span>
                  <span className="font-semibold text-lg">{anunciosVisualizadosCount[hotspot.id] || 0}</span>
                </div>
                <a
                  href={`/portal/${hotspot.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg font-semibold text-sm text-black text-center transition-all block"
                  style={{ backgroundColor: hotspot.cor_primaria }}
                >
                  Ver Portal
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}