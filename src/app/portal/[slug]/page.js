// src/app/portal/[slug]/page.js
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ETAPAS = {
  LOADING: 'loading',
  CADASTRO: 'cadastro',
  ANUNCIO: 'anuncio',
  CTA: 'cta',
  ACESSO: 'acesso',
  ERRO: 'erro',
}

export default function Portal() {
  const { slug } = useParams()
  const [etapa, setEtapa] = useState(ETAPAS.LOADING)
  const [hotspot, setHotspot] = useState(null)
  const [anuncioAtual, setAnuncioAtual] = useState(null)
  const [anuncios, setAnuncios] = useState([])
  const [contador, setContador] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [leadId, setLeadId] = useState(null)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    aceite_lgpd: false,
  })
  const [erros, setErros] = useState({})

  const anunciosMostradosRef = useRef(new Set());
  const intervaloAnuncioRef = useRef(null);

  useEffect(() => {
    buscarHotspot()
  }, [slug])

  async function buscarHotspot() {
    const { data, error } = await supabase
      .from('hotspots')
      .select('*')
      .eq('id', slug)
      .single()

    if (error || !data) {
      setEtapa(ETAPAS.ERRO)
      return
    }

    setHotspot(data)

    const { data: anunciosData } = await supabase
      .from('anuncios')
      .select('*')
      .eq('hotspot_id', data.id)
      .eq('ativo', true)

    setAnuncios(anunciosData || [])
    setEtapa(ETAPAS.CADASTRO)
  }

  function validarForm() {
    const novosErros = {}
    if (!form.nome.trim()) novosErros.nome = 'Nome obrigatório'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) novosErros.email = 'E-mail inválido'
    if (!form.telefone.trim() || form.telefone.replace(/\D/g, '').length < 10) novosErros.telefone = 'Telefone inválido'
    if (!form.cpf.trim() || form.cpf.replace(/\D/g, '').length !== 11) novosErros.cpf = 'CPF inválido'
    if (!form.aceite_lgpd) novosErros.aceite_lgpd = 'Você precisa aceitar os termos'
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function handleCadastro() {
    if (!validarForm()) return
    setSalvando(true)

    const { data, error } = await supabase.from('leads').insert([{
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      cpf: form.cpf.replace(/\D/g, ''),
      hotspot_id: hotspot.id,
      aceite_lgpd: true,
      data_aceite_lgpd: new Date().toISOString(),
      ip: null,
    }]).select().single()

    setSalvando(false)

    if (error) {
      setErros({ geral: 'Erro ao salvar cadastro. Tente novamente.' })
      return
    }

    setLeadId(data.id)
    anunciosMostradosRef.current.clear();
    mostrarProximoAnuncio();
  }

  // Nova função para registrar a visualização do anúncio
  const registrarVisualizacaoAnuncio = useCallback(async (anuncioId, leadId, hotspotId) => {
    if (!anuncioId || !leadId || !hotspotId) {
      console.error("Dados incompletos para registrar visualização de anúncio.");
      return;
    }
    const { error } = await supabase.from('visualizacoes_anuncios').insert([{
      anuncio_id: anuncioId,
      lead_id: leadId,
      hotspot_id: hotspotId,
    }]);
    if (error) {
      console.error("Erro ao registrar visualização de anúncio:", error);
    } else {
      console.log(`Visualização do anúncio ${anuncioId} registrada.`);
    }
  }, []);


  const mostrarProximoAnuncio = useCallback(() => {
    const anunciosDisponiveis = anuncios.filter(anuncio => !anunciosMostradosRef.current.has(anuncio.id));

    if (anunciosDisponiveis.length === 0) {
      if (anuncios.length > 0) {
        anunciosMostradosRef.current.clear();
        console.log("Todos os anúncios foram mostrados. Reiniciando o ciclo de anúncios.");
        mostrarProximoAnuncio();
        return;
      } else {
        setEtapa(ETAPAS.ACESSO);
        return;
      }
    }

    const aleatorio = anunciosDisponiveis[Math.floor(Math.random() * anunciosDisponiveis.length)];
    setAnuncioAtual(aleatorio);
    setContador(aleatorio.duracao_segundos || 15);
    setEtapa(ETAPAS.ANUNCIO);

    anunciosMostradosRef.current.add(aleatorio.id);

    // Registra a visualização do anúncio aqui
    if (leadId && hotspot?.id) { // Garante que leadId e hotspot.id estão disponíveis
      registrarVisualizacaoAnuncio(aleatorio.id, leadId, hotspot.id);
    }


  }, [anuncios, leadId, hotspot?.id, registrarVisualizacaoAnuncio]); // Adicionado dependências


  useEffect(() => {
    if (etapa !== ETAPAS.ANUNCIO) return
    if (contador <= 0) {
      setEtapa(ETAPAS.CTA)
      return
    }
    const timer = setTimeout(() => setContador((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [etapa, contador])

  useEffect(() => {
    if (intervaloAnuncioRef.current) {
      clearInterval(intervaloAnuncioRef.current);
      intervaloAnuncioRef.current = null;
    }

    if (etapa === ETAPAS.ACESSO) {
      intervaloAnuncioRef.current = setInterval(() => {
        console.log("20 minutos se passaram. Forçando novo anúncio.");
        mostrarProximoAnuncio();
      }, 10 * 1000); // Mantenho 10 segundos para teste, lembre-se de ajustar para 20 * 60 * 1000
    }

    return () => {
      if (intervaloAnuncioRef.current) {
        clearInterval(intervaloAnuncioRef.current);
        intervaloAnuncioRef.current = null;
      }
    };
  }, [etapa, mostrarProximoAnuncio]);

  const handleCtaClick = useCallback(() => {
    setEtapa(ETAPAS.ACESSO);
  }, []);

  function formatarCPF(v) {
    const n = v.replace(/\D/g, '').slice(0, 11)
    if (n.length <= 3) return n
    if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`
    if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`
    return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`
  }

  function formatarTelefone(v) {
    const n = v.replace(/\D/g, '').slice(0, 11)
    if (n.length <= 2) return n
    if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`
    return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  }

  const cor = hotspot?.cor_primaria || '#22c55e'

  if (etapa === ETAPAS.LOADING) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: cor }} />
      </div>
    )
  }

  if (etapa === ETAPAS.ERRO) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-4xl mb-4">📡</div>
          <h1 className="text-white text-xl font-bold mb-2">Erro ao carregar Hotspot</h1>
          <p className="text-gray-400 text-sm">
            Não foi possível encontrar as informações do hotspot. Verifique o link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">

      {/* ETAPA 1 — CADASTRO */}
      {etapa === ETAPAS.CADASTRO && (
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${cor}20` }}
            >
              👋
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Bem-vindo ao Wi-Fi de {hotspot?.nome}!</h1>
            <p className="text-gray-400 text-sm">
              Preencha seus dados para acessar a internet.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label htmlFor="nome" className="block text-left text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Seu nome completo"
                />
                {erros.nome && <p className="text-red-500 text-xs mt-1 text-left">{erros.nome}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-left text-sm font-medium text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="seu@email.com"
                />
                {erros.email && <p className="text-red-500 text-xs mt-1 text-left">{erros.email}</p>}
              </div>
              <div>
                <label htmlFor="telefone" className="block text-left text-sm font-medium text-gray-300 mb-1">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  value={formatarTelefone(form.telefone)}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="(99) 99999-9999"
                />
                {erros.telefone && <p className="text-red-500 text-xs mt-1 text-left">{erros.telefone}</p>}
              </div>
              <div>
                <label htmlFor="cpf" className="block text-left text-sm font-medium text-gray-300 mb-1">CPF</label>
                <input
                  type="text"
                  id="cpf"
                  value={formatarCPF(form.cpf)}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="999.999.999-99"
                />
                {erros.cpf && <p className="text-red-500 text-xs mt-1 text-left">{erros.cpf}</p>}
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="aceite_lgpd"
                  checked={form.aceite_lgpd}
                  onChange={(e) => setForm({ ...form, aceite_lgpd: e.target.checked })}
                  className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-600 rounded"
                />
                <label htmlFor="aceite_lgpd" className="ml-2 block text-sm text-gray-400 text-left">
                  Li e aceito a <a href="#" className="text-green-500 hover:underline">política de privacidade</a>.
                </label>
              </div>
              {erros.aceite_lgpd && <p className="text-red-500 text-xs mt-1 text-left">{erros.aceite_lgpd}</p>}
              {erros.geral && <p className="text-red-500 text-xs mt-4 text-left">{erros.geral}</p>}
            </div>
            <button
              onClick={handleCadastro}
              disabled={salvando}
              className="w-full py-3.5 rounded-xl font-semibold text-base text-black transition-all shadow-lg"
              style={{ backgroundColor: cor }}
            >
              {salvando ? 'Salvando...' : 'Continuar'}
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2 — ANÚNCIO */}
      {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
        <div className="fixed inset-0 flex flex-col items-center justify-end z-50 bg-black">
          {/* Mídia do Anúncio (Vídeo ou Imagem) */}
          {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' ? (
            <video
              key={anuncioAtual.media_url}
              src={anuncioAtual.media_url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={() => setContador(0)} // Avança se o vídeo terminar antes do contador
            />
          ) : anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' ? (
            <img
              key={anuncioAtual.media_url}
              src={anuncioAtual.media_url}
              alt={anuncioAtual.titulo || 'Anúncio'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-lg">
              Nenhuma mídia disponível para este anúncio.
            </div>
          )}

          {/* Overlay Escuro */}
          <div className="absolute inset-0 bg-black opacity-50 z-10"></div>

          {/* Conteúdo do Anúncio (Contador e Texto) */}
          <div className="relative z-20 flex flex-col items-center justify-end h-full w-full p-6">
            {contador > 0 ? (
              <div className="flex flex-col items-center gap-2 mb-8">
                <div
                  className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  style={{ borderColor: cor }}
                >
                  {contador}
                </div>
                <p className="text-gray-200 text-sm font-medium">Aguarde para continuar</p>
              </div>
            ) : (
              // Este bloco só aparece quando o contador <= 0
              <>
                {/* Título e descrição visíveis apenas após o contador zerar */}
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 text-center mb-8 max-w-md w-full">
                  {anuncioAtual.titulo && (
                    <h2 className="text-white text-2xl font-bold mb-2">{anuncioAtual.titulo}</h2>
                  )}
                  {anuncioAtual.descricao && (
                    <p className="text-gray-300 text-base leading-relaxed">{anuncioAtual.descricao}</p>
                  )}
                </div>
                <button
                  onClick={() => setEtapa(ETAPAS.CTA)}
                  className="w-full max-w-xs py-3.5 rounded-xl font-semibold text-base text-black transition-all shadow-lg"
                  style={{ backgroundColor: cor }}
                >
                  Continuar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 3 — CTA DO ANUNCIANTE (NOVA IMPLEMENTAÇÃO) */}
      {etapa === ETAPAS.CTA && anuncioAtual && (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black">
          {/* Mídia do Anúncio (Vídeo ou Imagem) com opacidade de 60% */}
          {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' ? (
            <video
              key={anuncioAtual.media_url}
              src={anuncioAtual.media_url}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              autoPlay
              muted
              playsInline
              loop
            />
          ) : anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' ? (
            <img
              key={anuncioAtual.media_url}
              src={anuncioAtual.media_url}
              alt={anuncioAtual.titulo || 'Anúncio'}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-lg opacity-60">
              Nenhuma mídia disponível para este anúncio.
            </div>
          )}

          {/* Overlay Escuro sobre a mídia esmaecida */}
          <div className="absolute inset-0 bg-black opacity-70 z-10"></div>

          {/* Popup Centralizado para o CTA */}
          <div className="relative z-20 w-full max-w-md text-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-white text-2xl font-bold mb-2">Oferta especial para você!</h2>
              <p className="text-gray-300 text-base mb-6 leading-relaxed">
                {anuncioAtual.titulo} — clique abaixo para saber mais e aproveitar a oferta.
              </p>

              <div className="flex flex-col gap-3">
                {anuncioAtual.url_destino && (
                  <a
                    href={anuncioAtual.url_destino}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCtaClick}
                    className="w-full py-3.5 rounded-xl font-semibold text-base text-black transition-all block shadow-lg"
                    style={{ backgroundColor: cor }}
                  >
                    Quero saber mais
                  </a>
                )}
                <button
                  onClick={handleCtaClick}
                  className="w-full py-3 rounded-xl font-medium text-base text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Não, obrigado — ir para o Wi-Fi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 4 — ACESSO LIBERADO */}
      {etapa === ETAPAS.ACESSO && (
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${cor}20` }}
            >
              ✅
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Wi-Fi liberado!</h1>
            <p className="text-gray-400 text-sm">
              Você já tem acesso à internet. Aproveite sua conexão em <strong className="text-white">{hotspot?.nome}</strong>.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-left">
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: cor }}
              />
              <span className="text-sm text-gray-300">Conexão ativa</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}