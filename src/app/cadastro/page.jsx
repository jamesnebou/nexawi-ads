'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Building, User, Mail, Phone, MapPin, CreditCard, Briefcase, Check, ArrowRight, ShieldCheck } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function CadastroCliente() {
  const [estadosIBGE, setEstadosIBGE] = useState([])
  const [cidadesIBGE, setCidadesIBGE] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    nome: '', nome_empresa: '', nome_responsavel: '', email: '', telefone: '',
    cpf_cnpj: '', endereco: '', cidade: '', estado: '', status: 'Ativo' // Entra como Ativo por padrão
  })

  const [cpfCnpjError, setCpfCnpjError] = useState('')
  const [telefoneError, setTelefoneError] = useState('')
  const [nomeEmpresarioError, setNomeEmpresarioError] = useState('')
  const [nomeEmpresaError, setNomeEmpresaError] = useState('')
  const [nomeResponsavelError, setNomeResponsavelError] = useState('')

  // --- EFEITOS DO IBGE ---
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((dados) => setEstadosIBGE(dados))
      .catch(err => console.error("Erro ao buscar estados:", err));
  }, []);

  useEffect(() => {
    if (!form.estado) {
      setCidadesIBGE([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`)
      .then((res) => res.json())
      .then((dados) => setCidadesIBGE(dados))
      .catch(err => console.error("Erro ao buscar cidades:", err));
  }, [form.estado]);

  // --- VALIDAÇÕES ---
  const validarCpfCnpj = (valor) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length > 0 && numeros.length !== 11 && numeros.length !== 14) {
      return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.'
    }
    return ''
  }

  const validarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length > 0 && numeros.length < 10) {
      return 'Telefone inválido. Inclua o DDD.'
    }
    return ''
  }

  const validarNome = (valor, campo) => {
    if (valor.trim().length > 0 && valor.trim().length < 3) {
      return `${campo} deve ter pelo menos 3 caracteres.`
    }
    return ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let newValue = value

    if (name === 'cpf_cnpj') {
      newValue = value.replace(/\D/g, '').slice(0, 14)
      setCpfCnpjError(validarCpfCnpj(newValue))
    } else if (name === 'telefone') {
      newValue = value.replace(/\D/g, '').slice(0, 11)
      setTelefoneError(validarTelefone(newValue))
    } else if (name === 'nome') {
      setNomeEmpresarioError(validarNome(newValue, 'Nome do empresário'))
    } else if (name === 'nome_empresa') {
      setNomeEmpresaError(validarNome(newValue, 'Nome da empresa'))
    } else if (name === 'nome_responsavel') {
      setNomeResponsavelError(validarNome(newValue, 'Nome do responsável'))
    }

    if (name === 'estado') {
      setForm({ ...form, [name]: newValue, cidade: '' })
    } else {
      setForm({ ...form, [name]: newValue })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (cpfCnpjError || telefoneError || nomeEmpresarioError || nomeEmpresaError || nomeResponsavelError) {
      toast.error('Por favor, corrija os erros no formulário.')
      return
    }
    if (!form.nome.trim() || !form.nome_empresa.trim() || !form.nome_responsavel.trim() || !form.telefone.trim() || !form.cpf_cnpj.trim() || !form.estado || !form.cidade) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase.from('clientes').insert([form])
      if (error) throw error

      // Mostra a tela de sucesso
      setSucesso(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })

    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Ocorreu um erro ao enviar seu cadastro. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // TELA DE SUCESSO
  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-700">
        <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-lg p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
            <Check size={40} className="text-green-500" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">Cadastro Concluído!</h2>
          <p className="text-neutral-400 mb-10 leading-relaxed">
            Seus dados foram recebidos com sucesso. Nossa equipe já foi notificada e sua conta está sendo configurada em nosso sistema.
          </p>
          <button 
  onClick={() => window.location.href = 'https://www.nexawiads.com'} 
  className="w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
>
  Acessar o site! <ArrowRight size={18} />
</button>
        </div>
      </div>
    )
  }

  // TELA DO FORMULÁRIO
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-8 selection:bg-green-500/30">
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { background: '#0a0a0a', color: '#fff', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' } }
        }} 
      />

      <div className="w-full max-w-4xl animate-fade-in-up">

        {/* Cabeçalho da Página */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl mb-6 shadow-inner">
            <ShieldCheck size={28} className="text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight mb-3">
            Seja nosso Parceiro
          </h1>
          <p className="text-neutral-500 font-medium max-w-xl mx-auto">
            Preencha os dados abaixo para criar sua conta em nossa plataforma. É rápido, seguro e 100% digital.
          </p>
        </div>

        {/* Container do Formulário */}
        <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-10">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campo: Empresário */}
              <div>
                <label htmlFor="nome" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Nome Completo *</label>
                <div className="relative group/input">
                  <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="text" id="nome" name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome completo"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {nomeEmpresarioError && <p className="text-red-400 text-xs mt-2 font-medium">{nomeEmpresarioError}</p>}
              </div>

              {/* Campo: Empresa */}
              <div>
                <label htmlFor="nome_empresa" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Nome da Empresa *</label>
                <div className="relative group/input">
                  <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="text" id="nome_empresa" name="nome_empresa" value={form.nome_empresa} onChange={handleChange} placeholder="Razão Social ou Nome Fantasia"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {nomeEmpresaError && <p className="text-red-400 text-xs mt-2 font-medium">{nomeEmpresaError}</p>}
              </div>

              {/* Campo: Responsável */}
              <div>
                <label htmlFor="nome_responsavel" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Pessoa de Contato *</label>
                <div className="relative group/input">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="text" id="nome_responsavel" name="nome_responsavel" value={form.nome_responsavel} onChange={handleChange} placeholder="Quem vai gerenciar a conta"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {nomeResponsavelError && <p className="text-red-400 text-xs mt-2 font-medium">{nomeResponsavelError}</p>}
              </div>

              {/* Campo: CPF/CNPJ */}
              <div>
                <label htmlFor="cpf_cnpj" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">CPF ou CNPJ *</label>
                <div className="relative group/input">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="text" id="cpf_cnpj" name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="Apenas números" maxLength={14}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {cpfCnpjError && <p className="text-red-400 text-xs mt-2 font-medium">{cpfCnpjError}</p>}
              </div>

              {/* Campo: Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">E-mail Profissional *</label>
                <div className="relative group/input">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="email" id="email" name="email" value={form.email} onChange={handleChange} placeholder="contato@suaempresa.com"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                    required
                  />
                </div>
              </div>

              {/* Campo: Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">WhatsApp / Telefone *</label>
                <div className="relative group/input">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="text" id="telefone" name="telefone" value={form.telefone} onChange={handleChange} placeholder="DDD + Número" maxLength={11}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {telefoneError && <p className="text-red-400 text-xs mt-2 font-medium">{telefoneError}</p>}
              </div>

              {/* Campo: Endereço */}
              <div className="md:col-span-2">
                <label htmlFor="endereco" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Endereço Completo</label>
                <div className="relative group/input">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-green-500 transition-colors duration-300" />
                  <input
                    type="text" id="endereco" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número, complemento, bairro"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Campo: Estado (IBGE) */}
              <div>
                <label htmlFor="estado" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Estado *</label>
                <div className="relative group/select">
                  <select
                    id="estado" name="estado" value={form.estado} onChange={handleChange} required
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                  >
                    <option value="" className="bg-[#050505]">Selecione o UF</option>
                    {estadosIBGE.map(estado => (
                      <option key={estado.id} value={estado.sigla} className="bg-[#050505]">
                        {estado.nome} ({estado.sigla})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Campo: Cidade (IBGE com Datalist) */}
              <div>
                <label htmlFor="cidade" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Cidade *</label>
                <input
                  list="lista-cidades-cadastro"
                  type="text" id="cidade" name="cidade" value={form.cidade} onChange={handleChange} required
                  placeholder={form.estado ? "Digite para buscar a cidade" : "Selecione o estado primeiro"}
                  disabled={!form.estado}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <datalist id="lista-cidades-cadastro">
                  {cidadesIBGE.map((cidade) => (
                    <option key={cidade.id} value={cidade.nome} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Botão de Submit */}
            <div className="mt-10 pt-8 border-t border-white/[0.05]">
              <button
                type="submit"
                disabled={salvando || nomeEmpresarioError || nomeEmpresaError || nomeResponsavelError || telefoneError || cpfCnpjError || !form.nome.trim() || !form.nome_empresa.trim() || !form.nome_responsavel.trim() || !form.telefone.trim() || !form.cpf_cnpj.trim() || !form.estado || !form.cidade}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold py-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Finalizar Cadastro <ArrowRight size={20} strokeWidth={2.5} /></>
                )}
              </button>
              <p className="text-center text-neutral-600 text-xs mt-4 font-medium">
                Seus dados estão seguros e criptografados.
              </p>
            </div>

          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </div>
  )
}