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
  if (cleanedCpf.length !== 11 || /
^
(\d)\1{10}
$
/.test(cleanedCpf)) return false; // Verifica 11 dígitos e CPFs repetidos

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

    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
      // Limpa o erro da LGPD se for marcado
      if (name === 'aceite_lgpd' && checked) {
        setErros(prev => {
          const newErros = { ...prev };
          delete newErros.aceite_lgpd;
          return newErros;
        });
      }
      return;
    }

    let cleanedValue = value;
    let error = '';

    if (name === 'telefone') {
      cleanedValue = value.replace(/\D/g, '').substring(0, 11); // Apenas números, max 11
      if (cleanedValue.length > 0 && !validatePhoneNumber(cleanedValue)) {
        error = 'Telefone inválido (11 dígitos).';
      }
    } else if (name === 'cpf') {
      cleanedValue = value.replace(/\D/g, '').substring(0, 11); // Apenas números, max 11
      if (cleanedValue.length > 0 && !validateCpf(cleanedValue)) {
        error = 'CPF inválido.';
      }
    }

    setForm(prev => ({ ...prev, [name]: cleanedValue }));
    setErros(prev => ({ ...prev, [name]: error }));
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
      ip: null, // Você pode adicionar lógica para capturar o IP aqui
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
        // Se todos foram mostrados, reinicia o ciclo e tenta mostrar o primeiro novamente
        const primeiroAnuncio = anuncios[0];
        if (primeiroAnuncio) {
          setAnuncioAtual(primeiroAnuncio);
          setContador(primeiroAnuncio.tempo_exibicao || 5);
          setEtapa(ETAPAS.ANUNCIO);
          registrarVisualizacaoAnuncio(primeiroAnuncio.id, leadId, hotspot.id);
        } else {
          setEtapa(ETAPAS.ACESSO); // Se não há anúncios, vai direto para acesso
        }
      } else {
        setEtapa(ETAPAS.ACESSO); // Se não há anúncios, vai direto para acesso
      }
      return;
    }

    const proximoAnuncio = anunciosDisponiveis[Math.floor(Math.random() * anunciosDisponiveis.length)];

    if (proximoAnuncio) {
      setAnuncioAtual(proximoAnuncio);
      setContador(proximoAnuncio.tempo_exibicao || 5);
      setEtapa(ETAPAS.ANUNCIO);
      anunciosMostradosRef.current.add(proximoAnuncio.id);
      registrarVisualizacaoAnuncio(proximoAnuncio.id, leadId, hotspot.id);
    } else {
      setEtapa(ETAPAS.ACESSO);
    }
  }, [anuncios, leadId, hotspot, registrarVisualizacaoAnuncio]);


  useEffect(() => {
    if (etapa === ETAPAS.ANUNCIO && contador > 0) {
      intervaloAnuncioRef.current = setInterval(() => {
        setContador(prev => prev - 1);
      }, 1000);
    } else if (contador === 0 && etapa === ETAPAS.ANUNCIO) {
      clearInterval(intervaloAnuncioRef.current);
    }
    return () => clearInterval(intervaloAnuncioRef.current);
  }, [etapa, contador, mostrarProximoAnuncio]);

  const handleCtaClick = () => {
    // Aqui você pode registrar o clique no CTA se necessário
    setEtapa(ETAPAS.ACESSO);
  };

  if (etapa === ETAPAS.ERRO) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erro ao carregar hotspot</h1>
          <p className="text-gray-400">Verifique o link ou tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  if (!hotspot && etapa !== ETAPAS.ERRO) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  const cor = hotspot?.cor_primaria || '#10B981'; // Cor padrão verde esmeralda

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 text-white relative overflow-hidden"
      style={{ backgroundColor: hotspot?.cor_fundo || '#111827' }}
    >
      <Toaster position="top-center" reverseOrder={false} />

      {/* Imagem de fundo do Hotspot (se existir) */}
      {hotspot?.imagem_fundo_url && (
        <img
          src={hotspot.imagem_fundo_url}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      )}

      {/* Overlay para escurecer a imagem de fundo */}
      <div className="absolute inset-0 bg-black opacity-60"></div>

      {/* Conteúdo principal centralizado */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md">

        {/* Logo do Hotspot */}
        {hotspot?.logo_url && (
          <img src={hotspot.logo_url} alt="Logo" className="h-20 mb-8" />
        )}

        {/* ETAPA 1 — CADASTRO DE LEAD */}
        {etapa === ETAPAS.CADASTRO && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl w-full">
            <h1 className="text-white text-2xl font-bold mb-2 text-center">Bem-vindo ao Wi-Fi!</h1>
            <p className="text-gray-400 text-sm mb-6 text-center">
              Para acessar a internet em <strong className="text-white">{hotspot?.nome}</strong>, por favor, preencha seus dados.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleCadastro(); }} className="space-y-4">
              {/* Campo: Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${erros.nome ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 ${erros.nome ? 'focus:ring-red-500' : 'focus:ring-green-500'} transition-colors`}
                  placeholder="Seu nome completo"
                  required
                />
                {erros.nome && <p className="text-red-500 text-xs mt-1">{erros.nome}</p>}
              </div>

              {/* Campo: E-mail */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${erros.email ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 ${erros.email ? 'focus:ring-red-500' : 'focus:ring-green-500'} transition-colors`}
                  placeholder="seu@email.com"
                  required
                />
                {erros.email && <p className="text-red-500 text-xs mt-1">{erros.email}</p>}
              </div>

              {/* Campo: Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  maxLength={11} // Limita a entrada a 11 caracteres numéricos
                  className={`w-full bg-gray-800 border ${erros.telefone ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 ${erros.telefone ? 'focus:ring-red-500' : 'focus:ring-green-500'} transition-colors`}
                  placeholder="DDD + Número (ex: 11987654321)"
                  required
                />
                {erros.telefone && <p className="text-red-500 text-xs mt-1">{erros.telefone}</p>}
              </div>

              {/* Campo: CPF */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-300 mb-1">CPF</label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  value={form.cpf}
                  onChange={handleChange}
                  maxLength={11} // Limita a entrada a 11 caracteres numéricos
                  className={`w-full bg-gray-800 border ${erros.cpf ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 ${erros.cpf ? 'focus:ring-red-500' : 'focus:ring-green-500'} transition-colors`}
                  placeholder="Apenas números (ex: 12345678900)"
                  required
                />
                {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
              </div>

              {/* Checkbox: Aceite LGPD */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="aceite_lgpd"
                  name="aceite_lgpd"
                  checked={form.aceite_lgpd}
                  onChange={handleChange}
                  className={`h-4 w-4 text-green-500 bg-gray-800 border ${erros.aceite_lgpd ? 'border-red-500' : 'border-gray-700'} rounded focus:ring-green-500`}
                  required
                />
                <label htmlFor="aceite_lgpd" className="ml-2 text-sm text-gray-300">
                  Eu concordo com a <a href="#" className="text-green-500 hover:underline">Política de Privacidade</a> e os Termos de Uso.
                </label>
              </div>
              {erros.aceite_lgpd && <p className="text-red-500 text-xs mt-1">{erros.aceite_lgpd}</p>}


              {erros.geral && <p className="text-red-500 text-sm text-center">{erros.geral}</p>}

              <button
                type="submit"
                disabled={salvando || Object.keys(erros).some(key => erros[key] !== '') || !form.nome.trim() || !form.email.trim() || !form.telefone.trim() || !form.cpf.trim() || !form.aceite_lgpd}
                className="w-full py-3.5 rounded-xl font-semibold text-base text-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: cor }}
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Acessar Wi-Fi'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 2 — EXIBIÇÃO DE ANÚNCIO */}
        {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
          <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black">
            {/* Mídia do Anúncio (Vídeo ou Imagem) */}
            {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' ? (
              <video
                key={anuncioAtual.media_url}
                src={anuncioAtual.media_url}
                className="absolute inset-0 w-full h-full object-cover"
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
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-lg">
                Nenhuma mídia disponível para este anúncio.
              </div>
            )}

            {/* Overlay Escuro */}
            <div className="absolute inset-0 bg-black opacity-70 z-10"></div>

            {/* Conteúdo do Anúncio (Contador e Botão) */}
            {contador > 0 ? (
              <div className="relative z-20 text-center flex flex-col items-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4"
                  style={{ backgroundColor: `${cor}20`, color: cor }}
                >
                  {contador}
                </div>
                <p className="text-gray-200 text-sm font-medium">Aguarde para continuar</p>
              </div>
            ) : (
              // Este bloco só aparece quando o contador <= 0
              <>
                {/* Título e descrição visíveis apenas após o contador zerar */}
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 text-center mb-8 max-w-md w-full relative z-20">
                  {anuncioAtual.titulo && (
                    <h2 className="text-white text-2xl font-bold mb-2">{anuncioAtual.titulo}</h2>
                  )}
                  {anuncioAtual.descricao && (
                    <p className="text-gray-300 text-base leading-relaxed">{anuncioAtual.descricao}</p>
                  )}
                </div>
                <button
                  onClick={() => setEtapa(ETAPAS.CTA)}
                  className="w-full max-w-xs py-3.5 rounded-xl font-semibold text-base text-black transition-all shadow-lg relative z-20"
                  style={{ backgroundColor: cor }}
                >
                  Continuar
                </button>
              </>
            )}
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
    </div>
  )
}