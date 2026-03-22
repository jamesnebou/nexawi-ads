'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapPin, User, Eye, MousePointerClick } from 'lucide-react'

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
    // Buscando dados da View criada no Supabase
    const { data, error } = await supabase
      .from('hotspot_access_report') // Nome da View
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pl-4 sm:pl-6 md:pl-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-white">Relatório de Acesso</h1>
          <p className="text-gray-400 text-sm mt-1">Métricas agregadas de visualizações e cliques por hotspot</p>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : relatorio.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-white font-semibold mb-1">Nenhum dado de acesso encontrado</h3>
          <p className="text-gray-500 text-sm mb-4">Certifique-se de que há anúncios ativos e que a lógica de rastreamento está funcionando.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {relatorio.map((item) => (
            <div key={item.hotspot_id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 w-full">
              <div className="flex-1 min-w-0 flex flex-col gap-1 items-center sm:items-start w-full sm:w-auto">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                  <h3 className="text-white font-semibold text-base">{item.hotspot_nome}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1 justify-center sm:justify-start">
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <User size={11} className="flex-shrink-0" />
                    <span>Cliente: {item.cliente_nome || 'N/A'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Eye size={11} className="flex-shrink-0" />
                    <span>Visualizações Únicas: {item.total_unique_views}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <MousePointerClick size={11} className="flex-shrink-0" />
                    <span>Cliques Únicos: {item.total_unique_clicks}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}