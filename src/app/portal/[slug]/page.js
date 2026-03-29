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
  // CORREÇÃO FINAL E DEFINITIVA AQUI: Usando construtor RegExp para evitar erro de literal
  const cpfRepeatedDigitsRegex = new RegExp('^(\\d)\\1{10}$');

  if (cleanedCpf.length !== 11 || cpfRepeatedDigitsRegex.test(cleanedCpf)) {
    return false; // Verifica 11 dígitos e CPFs com dígitos repetidos
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
      novosErros.aceite_lgpd = 'Você precisa aceitar os termos de privacidade.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;

    setForm(prevForm => {
      let newValue = value;
      if (name === 'telefone' || name === 'cpf') {
        newValue = value.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos para telefone e CPF
      }

      return {
        ...prevForm,
        [name]: type === 'checkbox' ? checked : newValue,
      };
    });

    // Limpa o erro ao digitar ou marcar/desmarcar
    setErros(prevErros => {
      const newErros = { ...prevErros };
      if (name === 'nome' && value.trim()) delete newErros.nome;
      if (name === 'email' && /\S+@\S+\.\S+/.test(value)) delete newErros.email;
      if (name === 'telefone' && validatePhoneNumber(value)) delete newErros.telefone;
      if (name === 'cpf' && validateCpf(value)) delete newErros.cpf;
      if (name === 'aceite_lgpd' && checked) delete newErros.aceite_lgpd;
      return newErros;
    });
  }, []);

  async function handleCadastro() {
    if (!validarForm()) return;
    setSalvando(true);

    try {
      const { data, error } = await supabase.from('leads').insert([{
        nome: form.nome,
        email: form.email,
        telefone: form.telefone.replace(/\D/g, ''), // Garante que só números sejam salvos
        cpf: form.cpf.replace(/\D/g, ''),           // Garante que só números sejam salvos
        hotspot_id: hotspot.id,
        aceite_lgpd: true,
        data_aceite_lgpd: new Date().toISOString(),
        ip: null, // O IP geralmente é capturado no lado do servidor ou por uma função edge
      }]).select().single();

      setSalvando(false);

      if (error) {
        console.error('Erro ao salvar cadastro:', error);
        setErros({ geral: 'Erro ao salvar cadastro. Tente novamente.' });
        return;
      }

      setLeadId(data.id);
      anunciosMostradosRef.current.clear();
      mostrarProximoAnuncio(); // Inicia a exibição dos anúncios
      setEtapa(ETAPAS.ANUNCIO);

    } catch (err) {
      console.error('Erro inesperado no cadastro:', err);
      setSalvando(false);
      setErros({ geral: 'Ocorreu um erro inesperado. Tente novamente.' });
    }
  }

  const mostrarProximoAnuncio = useCallback(() => {
    if (anuncios.length === 0) {
      setEtapa(ETAPAS.ACESSO);
      return;
    }

    let proximoAnuncio = null;
    const anunciosNaoMostrados = anuncios.filter(a => !anunciosMostradosRef.current.has(a.id));

    if (anunciosNaoMostrados.length > 0) {
      // Pega o próximo anúncio que ainda não foi mostrado
      proximoAnuncio = anunciosNaoMostrados[0];
    } else {
      // Se todos foram mostrados, reinicia o ciclo
      anunciosMostradosRef.current.clear();
      proximoAnuncio = anuncios[0];
    }

    if (proximoAnuncio) {
      setAnuncioAtual(proximoAnuncio);
      anunciosMostradosRef.current.add(proximoAnuncio.id);
      setContador(proximoAnuncio.tempo_exibicao || 5); // Tempo padrão de 5 segundos
      setEtapa(ETAPAS.ANUNCIO);
    } else {
      setEtapa(ETAPAS.ACESSO); // Se não houver anúncios, vai direto para o acesso
    }
  }, [anuncios]);

  const handleCtaClick = useCallback(async () => {
    // Registra o clique no CTA (se houver leadId e anuncioAtual)
    if (leadId && anuncioAtual) {
      await supabase.from('cliques_cta').insert([{
        lead_id: leadId,
        anuncio_id: anuncioAtual.id,
        hotspot_id: hotspot.id,
        data_clique: new Date().toISOString(),
      }]);
    }
    // Após o clique no CTA ou "Não, obrigado", o usuário deve ir para o Wi-Fi
    setEtapa(ETAPAS.ACESSO);
  }, [leadId, anuncioAtual, hotspot]);


  useEffect(() => {
    if (etapa === ETAPAS.ANUNCIO && contador > 0) {
      intervaloAnuncioRef.current = setInterval(() => {
        setContador(prev => prev - 1);
      }, 1000);
    } else if (etapa === ETAPAS.ANUNCIO && contador === 0) {
      clearInterval(intervaloAnuncioRef.current);
      mostrarProximoAnuncio();
    }
    return () => clearInterval(intervaloAnuncioRef.current);
  }, [etapa, contador, mostrarProximoAnuncio]);

  const cor = hotspot?.cor_primaria || '#16A34A'; // Cor padrão verde

  if (etapa === ETAPAS.LOADING) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        Carregando...
      </div>
    );
  }

  if (etapa === ETAPAS.ERRO) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Erro</h1>
        <p className="text-gray-400">Não foi possível encontrar o hotspot ou houve um erro inesperado.</p>
        <p className="text-gray-400">Por favor, tente novamente mais tarde ou entre em contato com o suporte.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ETAPA 1 — CADASTRO */}
        {etapa === ETAPAS.CADASTRO && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${cor}20` }}
            >
              👋
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Bem-vindo ao Wi-Fi de {hotspot?.nome}!</h1>
            <p className="text-gray-400 text-sm mb-8">Preencha seus dados para acessar a internet.</p>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
              <div className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.nome ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-green-500 focus:ring-green-500'} focus:outline-none focus:ring-1 transition-all`}
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
                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-green-500 focus:ring-green-500'} focus:outline-none focus:ring-1 transition-all`}
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
                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.telefone ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-green-500 focus:ring-green-500'} focus:outline-none focus:ring-1 transition-all`}
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
                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-800 text-white border ${erros.cpf ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-green-500 focus:ring-green-500'} focus:outline-none focus:ring-1 transition-all`}
                    placeholder="Apenas números (ex: 12345678900)"
                    maxLength={11}
                    required
                  />
                  {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
                </div>

                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="aceite_lgpd"
                    name="aceite_lgpd"
                    checked={form.aceite_lgpd}
                    onChange={handleChange}
                    className={`h-4 w-4 rounded border-gray-600 text-green-500 focus:ring-green-500 ${erros.aceite_lgpd ? 'border-red-500' : ''}`}
                    required
                  />
                  <label htmlFor="aceite_lgpd" className="ml-2 block text-sm text-gray-300">
                    Li e aceito a <a href="#" className="text-green-500 hover:underline">política de privacidade</a>.
                  </label>
                </div>
                {erros.aceite_lgpd && <p className="text-red-500 text-xs mt-1">{erros.aceite_lgpd}</p>}
                {erros.geral && <p className="text-red-500 text-sm mt-4">{erros.geral}</p>}
              </div>

              <button
                onClick={handleCadastro}
                disabled={salvando || Object.keys(erros).some(key => erros[key] !== '') || !form.nome.trim() || !form.email.trim() || !form.telefone.trim() || !form.cpf.trim() || !form.aceite_lgpd}
                className="w-full mt-6 py-3.5 rounded-xl font-semibold text-base text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: cor }}
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Continuar'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2 — ANÚNCIO */}
        {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
          <div className="relative w-full h-[calc(100vh-2rem)] max-w-md mx-auto rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-4">
            {anuncioAtual.tipo_midia === 'imagem' ? (
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

            {/* Contador de tempo */}
            <div className="absolute top-4 right-4 z-20 bg-gray-800 text-white text-sm font-medium px-3 py-1 rounded-full">
              {contador}s
            </div>

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