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

  }, [anuncios]);

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
      }, 10 * 1000); // Lembre-se de ajustar para 20 * 60 * 1000 após os testes
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

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
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
            <h1 className="text-white text-2xl font-bold mb-2">Bem-vindo ao Wi-Fi!</h1>
            <p className="text-gray-400 text-sm">
              Preencha seus dados para ter acesso à internet em <strong className="text-white">{hotspot?.nome}</strong>.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <form onSubmit={(e) => { e.preventDefault(); handleCadastro(); }} className="flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  className={`w-full bg-gray-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 ${erros.nome ? 'border-red-500 ring-red-500' : 'border-gray-700 focus:border-transparent ring-green-500'}`}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
                {erros.nome && <p className="text-red-500 text-xs mt-1 text-left">{erros.nome}</p>}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="E-mail"
                  className={`w-full bg-gray-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 ${erros.email ? 'border-red-500 ring-red-500' : 'border-gray-700 focus:border-transparent ring-green-500'}`}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {erros.email && <p className="text-red-500 text-xs mt-1 text-left">{erros.email}</p>}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Telefone"
                  className={`w-full bg-gray-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 ${erros.telefone ? 'border-red-500 ring-red-500' : 'border-gray-700 focus:border-transparent ring-green-500'}`}
                  value={formatarTelefone(form.telefone)}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
                {erros.telefone && <p className="text-red-500 text-xs mt-1 text-left">{erros.telefone}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="CPF"
                  className={`w-full bg-gray-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 ${erros.cpf ? 'border-red-500 ring-red-500' : 'border-gray-700 focus:border-transparent ring-green-500'}`}
                  value={formatarCPF(form.cpf)}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
                {erros.cpf && <p className="text-red-500 text-xs mt-1 text-left">{erros.cpf}</p>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="aceite_lgpd"
                  className="form-checkbox h-4 w-4 text-green-500 rounded border-gray-700 focus:ring-green-500"
                  checked={form.aceite_lgpd}
                  onChange={(e) => setForm({ ...form, aceite_lgpd: e.target.checked })}
                />
                <label htmlFor="aceite_lgpd" className="text-gray-400 text-xs">
                  Eu concordo com a Política de Privacidade e Termos de Uso.
                </label>
              </div>
              {erros.aceite_lgpd && <p className="text-red-500 text-xs mt-1 text-left">{erros.aceite_lgpd}</p>}
              {erros.geral && <p className="text-red-500 text-xs mt-1 text-left">{erros.geral}</p>}

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-black transition-all"
                style={{ backgroundColor: cor }}
              >
                {salvando ? 'Salvando...' : 'Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ETAPA 2 — ANÚNCIO OBRIGATÓRIO */}
      {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black">
          {/* Mídia do Anúncio (Vídeo ou Imagem) */}
          {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' && (
            <video
              key={anuncioAtual.media_url} // Key para forçar re-render se a URL mudar
              src={anuncioAtual.media_url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={() => setContador(0)} // Opcional: avança se o vídeo terminar
            />
          )}
          {anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' && (
            <img
              key={anuncioAtual.media_url} // Key para forçar re-render se a URL mudar
              src={anuncioAtual.media_url}
              alt={anuncioAtual.titulo || 'Anúncio'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Fallback se não houver mídia */}
          {!anuncioAtual.media_url && (
            <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center text-gray-400 text-lg">
              Nenhuma mídia disponível para este anúncio.
            </div>
          )}

          {/* Overlay escuro para legibilidade */}
          <div className="absolute inset-0 bg-black opacity-50 z-10"></div>

          {/* Conteúdo do Anúncio (Contador e Texto) */}
          <div className="relative z-20 flex flex-col items-center justify-center p-4 text-center">
            {contador <= 0 && (
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 mb-6 max-w-md">
                {anuncioAtual.titulo && (
                  <h2 className="text-white text-2xl font-bold mb-2">{anuncioAtual.titulo}</h2>
                )}
                {anuncioAtual.descricao && (
                  <p className="text-gray-400 text-sm leading-relaxed">{anuncioAtual.descricao}</p>
                )}
              </div>
            )}

            {contador > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-14 h-14 rounded-full border-4 flex items-center justify-center text-xl font-bold text-white"
                  style={{ borderColor: cor }}
                >
                  {contador}
                </div>
                <p className="text-gray-500 text-xs">Aguarde para continuar</p>
              </div>
            ) : (
              <button
                onClick={() => setEtapa(ETAPAS.CTA)}
                className="w-full max-w-xs py-3.5 rounded-xl font-semibold text-sm text-black transition-all"
                style={{ backgroundColor: cor }}
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 3 — CTA DO ANUNCIANTE */}
      {etapa === ETAPAS.CTA && anuncioAtual && (
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${cor}20` }}
            >
              🎁
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Oferta especial para você!</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              {anuncioAtual.titulo} — clique abaixo para saber mais e aproveitar a oferta.
            </p>

            <div className="flex flex-col gap-3">
              {anuncioAtual.url_destino && (
                <a
                  href={anuncioAtual.url_destino}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCtaClick}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-black transition-all block"
                  style={{ backgroundColor: cor }}
                >
                  Quero saber mais
                </a>
              )}
              <button
                onClick={handleCtaClick}
                className="w-full py-3 rounded-xl font-medium text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Não, obrigado — ir para o Wi-Fi
              </button>
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