'use client'

import { useEffect, useState, useCallback } from 'react'
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

  useEffect(() => {
    buscarHotspot()
  }, [slug])

  async function buscarHotspot() {
    const { data, error } = await supabase
      .from('hotspots')
      .select('*')
      .eq('slug', slug)
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
    mostrarProximoAnuncio()
  }

  const mostrarProximoAnuncio = useCallback(() => {
    if (anuncios.length === 0) {
      setEtapa(ETAPAS.ACESSO)
      return
    }
    const aleatorio = anuncios[Math.floor(Math.random() * anuncios.length)]
    setAnuncioAtual(aleatorio)
    setContador(aleatorio.duracao_segundos || 15)
    setEtapa(ETAPAS.ANUNCIO)
  }, [anuncios])

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
    if (etapa !== ETAPAS.ACESSO) return
    const intervalo = setInterval(() => {
      mostrarProximoAnuncio()
    }, 20 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [etapa, mostrarProximoAnuncio])

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
          <h1 className="text-white text-xl font-bold mb-2">Hotspot não encontrado</h1>
          <p className="text-gray-400 text-sm">Verifique se o link está correto.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">

      {/* ETAPA 1 — CADASTRO */}
      {etapa === ETAPAS.CADASTRO && (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {hotspot?.logo_url ? (
              <img src={hotspot.logo_url} alt={hotspot.nome} className="h-14 mx-auto mb-4 object-contain" />
            ) : (
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-black" style={{ backgroundColor: cor }}>
                {hotspot?.nome?.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-white text-2xl font-bold">{hotspot?.nome}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {hotspot?.mensagem_boas_vindas || 'Faça seu cadastro para acessar o Wi-Fi gratuito'}
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            {erros.geral && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {erros.geral}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Nome completo</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${erros.nome ? 'border-red-500' : 'border-gray-700 focus:border-green-500'}`}
              />
              {erros.nome && <p className="text-red-400 text-xs mt-1">{erros.nome}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${erros.email ? 'border-red-500' : 'border-gray-700 focus:border-green-500'}`}
              />
              {erros.email && <p className="text-red-400 text-xs mt-1">{erros.email}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Telefone</label>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${erros.telefone ? 'border-red-500' : 'border-gray-700 focus:border-green-500'}`}
              />
              {erros.telefone && <p className="text-red-400 text-xs mt-1">{erros.telefone}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">CPF</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatarCPF(e.target.value) })}
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${erros.cpf ? 'border-red-500' : 'border-gray-700 focus:border-green-500'}`}
              />
              {erros.cpf && <p className="text-red-400 text-xs mt-1">{erros.cpf}</p>}
            </div>

            <div>
              <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${erros.aceite_lgpd ? 'border-red-500 bg-red-400/5' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                <input
                  type="checkbox"
                  checked={form.aceite_lgpd}
                  onChange={(e) => setForm({ ...form, aceite_lgpd: e.target.checked })}
                  className="mt-0.5 accent-green-500"
                />
                <span className="text-xs text-gray-400 leading-relaxed">
                  Concordo com a coleta e uso dos meus dados conforme a{' '}
                  <span className="text-green-400 underline cursor-pointer">Política de Privacidade</span>{' '}
                  e a Lei Geral de Proteção de Dados (LGPD).
                </span>
              </label>
              {erros.aceite_lgpd && <p className="text-red-400 text-xs mt-1">{erros.aceite_lgpd}</p>}
            </div>

            <button
              onClick={handleCadastro}
              disabled={salvando}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: cor }}
            >
              {salvando ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Continuar e acessar Wi-Fi'
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            Seus dados são protegidos e não serão compartilhados com terceiros.
          </p>
        </div>
      )}

      {/* ETAPA 2 — ANÚNCIO OBRIGATÓRIO */}
      {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-4">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Mensagem do patrocinador</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {anuncioAtual.imagem_url && (
              <div className="w-full aspect-video bg-gray-800">
                <img
                  src={anuncioAtual.imagem_url}
                  alt={anuncioAtual.titulo}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6">
              <h2 className="text-white text-xl font-bold mb-2">{anuncioAtual.titulo}</h2>
              {anuncioAtual.descricao && (
                <p className="text-gray-400 text-sm leading-relaxed">{anuncioAtual.descricao}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
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
                  onClick={() => setEtapa(ETAPAS.ACESSO)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-black transition-all block"
                  style={{ backgroundColor: cor }}
                >
                  Quero saber mais
                </a>
              )}
              <button
                onClick={() => setEtapa(ETAPAS.ACESSO)}
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