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

// --- Funções de Validação (Reutilizadas e aprimoradas) ---
const validatePhoneNumber = (phone) => {
  const cleanedPhone = String(phone).replace(/\D/g, '');
  return cleanedPhone.length === 11; // Exatamente 11 dígitos (DDD + 9 + 8 dígitos)
};

const validateCpf = (cpf) => {
  const cleanedCpf = String(cpf).replace(/\D/g, '');
  // CORREÇÃO FINAL E DEFINITIVA AQUI: A regex agora está em uma única linha e formatada corretamente
  if (cleanedCpf.length !== 11 || 


$
/test(cleanedCpf)) { // A regex está completamente em uma única linha
    return false; // Verifica 11 dígitos e CPFs repetidos
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanedCpf.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanedCpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanedCpf.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanedCpf.substring(10, 11))) return false;

  return true;
};
// --- Fim das Funções de Validação ---

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

  // --- Função de Validação do Formulário (Aprimorada) ---
  function validarForm() {
    const novosErros = {}

    if (!form.nome.trim()) {
      novosErros.nome = 'Nome é obrigatório.';
    }

    if (!form.email.trim()) {
      novosErros.email = 'E-mail é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      novosErros.email = 'E-mail inválido.';
    }

    if (!form.telefone.trim()) {
      novosErros.telefone = 'Telefone é obrigatório.';
    } else if (!validatePhoneNumber(form.telefone)) {
      novosErros.telefone = 'Telefone inválido. Deve ter 11 dígitos (DDD + 9 + 8 dígitos).';
    }

    if (!form.cpf.trim()) {
      novosErros.cpf = 'CPF é obrigatório.';
    } else if (!validateCpf(form.cpf)) {
      novosErros.cpf = 'CPF inválido.';
    }

    if (!form.aceite_lgpd) {
      novosErros.aceite_lgpd = 'Você precisa aceitar os termos da LGPD.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }
  // --- Fim da Função de Validação do Formulário ---

  // --- Manipulador de Mudança de Input (Aprimorado com máscaras e validação em tempo real) ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm(prevForm => ({
      ...prevForm,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpa o erro ao começar a digitar
    setErros(prevErros => ({
      ...prevErros,
      [name]: ''
    }));

    // Validação em tempo real para telefone e CPF
    if (name === 'telefone') {
      const cleanedValue = value.replace(/\D/g, '');
      if (cleanedValue.length > 0 && !validatePhoneNumber(cleanedValue)) {
        setErros(prevErros => ({ ...prevErros, telefone: 'Telefone inválido. Deve ter 11 dígitos.' }));
      } else if (cleanedValue.length === 0) {
        setErros(prevErros => ({ ...prevErros, telefone: 'Telefone é obrigatório.' }));
      } else {
        setErros(prevErros => ({ ...prevErros, telefone: '' }));
      }
    }

    if (name === 'cpf') {
      const cleanedValue = value.replace(/\D/g, '');
      if (cleanedValue.length > 0 && !validateCpf(cleanedValue)) {
        setErros(prevErros => ({ ...prevErros, cpf: 'CPF inválido.' }));
      } else if (cleanedValue.length === 0) {
        setErros(prevErros => ({ ...prevErros, cpf: 'CPF é obrigatório.' }));
      } else {
        setErros(prevErros => ({ ...prevErros, cpf: '' }));
      }
    }

    if (name === 'aceite_lgpd' && checked) {
      setErros(prevErros => ({ ...prevErros, aceite_lgpd: '' }));
    }
  };
  // --- Fim do Manipulador de Mudança de Input ---

  async function handleCadastro() {
    if (!validarForm()) return
    setSalvando(true)

    const { data, error } = await supabase.from('leads').insert([{
      nome: form.nome,
      email: form.email,
      telefone: form.telefone.replace(/\D/g, ''), // Garante que só números sejam salvos
      cpf: form.cpf.replace(/\D/g, ''), // Garante que só números sejam salvos
      hotspot_id: hotspot.id,
      aceite_lgpd: true,
      data_aceite_lgpd: new Date().toISOString(),
      ip: null, // O IP deve ser capturado no lado do servidor ou por outra forma
    }]).select().single()

    setSalvando(false)

    if (error) {
      console.error("Erro ao salvar cadastro:", error);
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
      data_visualizacao: new Date().toISOString(),
    }]);

    if (error) {
      console.error("Erro ao registrar visualização de anúncio:", error);
    }
  }, []);

  const mostrarProximoAnuncio = useCallback(() => {
    if (anuncios.length === 0) {
      setEtapa(ETAPAS.ACESSO);
      return;
    }

    const anunciosNaoMostrados = anuncios.filter(
      (anuncio) => !anunciosMostradosRef.current.has(anuncio.id)
    );

    if (anunciosNaoMostrados.length === 0) {
      setEtapa(ETAPAS.ACESSO);
      return;
    }

    const proximoAnuncio = anunciosNaoMostrados[0]; // Pega o primeiro da lista
    setAnuncioAtual(proximoAnuncio);
    anunciosMostradosRef.current.add(proximoAnuncio.id);
    setEtapa(ETAPAS.ANUNCIO);
    setContador(proximoAnuncio.tempo_exibicao || 5); // Tempo padrão de 5 segundos

    if (leadId) {
      registrarVisualizacaoAnuncio(proximoAnuncio.id, leadId, hotspot.id);
    }

    // Limpa qualquer intervalo anterior
    if (intervaloAnuncioRef.current) {
      clearInterval(intervaloAnuncioRef.current);
    }

    // Inicia o novo intervalo
    intervaloAnuncioRef.current = setInterval(() => {
      setContador((prevContador) => {
        if (prevContador <= 1) {
          clearInterval(intervaloAnuncioRef.current);
          setEtapa(ETAPAS.CTA); // Vai para a etapa de CTA após o contador zerar
          return 0;
        }
        return prevContador - 1;
      });
    }, 1000);
  }, [anuncios, leadId, hotspot, registrarVisualizacaoAnuncio]);

  const handleCtaClick = useCallback(async () => {
    // Aqui você pode registrar o clique no CTA se necessário
    // Por exemplo: supabase.from('cliques_cta').insert(...)
    setEtapa(ETAPAS.ACESSO);
  }, []);

  const cor = hotspot?.cor_primaria || '#007bff'; // Cor padrão azul

  if (etapa === ETAPAS.ERRO) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Erro</h1>
          <p className="text-gray-400">Não foi possível carregar o hotspot. Verifique o link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* ETAPA 1 — LOADING */}
        {etapa === ETAPAS.LOADING && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Carregando...</p>
          </div>
        )}

        {/* ETAPA 2 — CADASTRO */}
        {etapa === ETAPAS.CADASTRO && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h1 className="text-white text-2xl font-bold mb-2">Acesse o Wi-Fi de {hotspot?.nome}</h1>
              <p className="text-gray-400 text-sm">
                Preencha seus dados para liberar sua conexão.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCadastro(); }} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.nome ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'} focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="Seu nome completo"
                  required
                />
                {erros.nome && <p className="text-red-500 text-xs mt-1">{erros.nome}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'} focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="seu@email.com"
                  required
                />
                {erros.email && <p className="text-red-500 text-xs mt-1">{erros.email}</p>}
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.telefone ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'} focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="DDD + Número (ex: 11987654321)"
                  maxLength={11}
                  required
                />
                {erros.telefone && <p className="text-red-500 text-xs mt-1">{erros.telefone}</p>}
              </div>

              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-300 mb-1">CPF</label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  value={form.cpf}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.cpf ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'} focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="Apenas números (ex: 12345678900)"
                  maxLength={11}
                  required
                />
                {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="aceite_lgpd"
                  name="aceite_lgpd"
                  checked={form.aceite_lgpd}
                  onChange={handleChange}
                  className={`h-4 w-4 text-blue-600 rounded border-gray-700 focus:ring-blue-500 ${erros.aceite_lgpd ? 'border-red-500' : ''}`}
                  required
                />
                <label htmlFor="aceite_lgpd" className="ml-2 block text-sm text-gray-300">
                  Eu aceito os termos da <a href="#" className="text-blue-400 hover:underline">LGPD</a>.
                </label>
              </div>
              {erros.aceite_lgpd && <p className="text-red-500 text-xs mt-1">{erros.aceite_lgpd}</p>}


              <button
                type="submit"
                disabled={salvando || Object.keys(erros).some(key => erros[key] !== '') || !form.nome.trim() || !form.email.trim() || !form.telefone.trim() || !form.cpf.trim() || !form.aceite_lgpd}
                className="w-full py-3.5 rounded-xl font-semibold text-base text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: cor }}
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Acessar Wi-Fi'
                )}
              </button>
              {erros.geral && <p className="text-red-500 text-xs mt-2 text-center">{erros.geral}</p>}
            </form>
          </div>
        )}

        {/* ETAPA 3 — ANÚNCIO / CTA */}
        {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
            {/* Mídia de fundo esmaecida */}
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
            <div className="absolute inset-0 bg-black opacity-70 z-10" />

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
    </div>
  )
}