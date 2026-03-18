'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Building2, Globe, Shield, Bell, Lock, Check, Save } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const abas = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'portal', label: 'Portal', icon: Globe },
  { id: 'lgpd', label: 'LGPD', icon: Shield },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Lock },
]

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('empresa')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [configId, setConfigId] = useState(null)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaOk, setSenhaOk] = useState(false)

  const [form, setForm] = useState({
    nome_empresa: '',
    cnpj: '',
    email_contato: '',
    telefone_contato: '',
    endereco: '',
    titulo_portal: '',
    texto_boas_vindas: '',
    cor_principal: '#22c55e',
    texto_lgpd: '',
    email_notificacao: '',
    notificar_novos_leads: true,
    notificar_relatorios: true,
  })

  useEffect(() => { buscarConfiguracoes() }, [])

  async function buscarConfiguracoes() {
    setLoading(true)
    const { data } = await supabase.from('configuracoes').select('*').limit(1).single()
    if (data) {
      setConfigId(data.id)
      setForm({
        nome_empresa: data.nome_empresa || '',
        cnpj: data.cnpj || '',
        email_contato: data.email_contato || '',
        telefone_contato: data.telefone_contato || '',
        endereco: data.endereco || '',
        titulo_portal: data.titulo_portal || '',
        texto_boas_vindas: data.texto_boas_vindas || '',
        cor_principal: data.cor_principal || '#22c55e',
        texto_lgpd: data.texto_lgpd || '',
        email_notificacao: data.email_notificacao || '',
        notificar_novos_leads: data.notificar_novos_leads ?? true,
        notificar_relatorios: data.notificar_relatorios ?? true,
      })
    }
    setLoading(false)
  }

  async function salvarConfiguracoes() {
    setSalvando(true)
    if (configId) {
      await supabase.from('configuracoes').update(form).eq('id', configId)
    } else {
      const { data } = await supabase.from('configuracoes').insert([form]).select().single()
      if (data) setConfigId(data.id)
    }
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  async function alterarSenha() {
    setErroSenha('')
    if (!novaSenha || !confirmarSenha) return setErroSenha('Preencha todos os campos.')
    if (novaSenha.length < 6) return setErroSenha('A senha deve ter pelo menos 6 caracteres.')
    if (novaSenha !== confirmarSenha) return setErroSenha('As senhas não coincidem.')
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) return setErroSenha('Erro ao alterar senha. Tente novamente.')
    setSenhaOk(true)
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setTimeout(() => setSenhaOk(false), 3000)
  }

  const campo = (label, key, placeholder, type = 'text') => (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
      />
    </div>
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="flex-1 px-8 py-8 overflow-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie as configurações do sistema</p>
        </div>
        {abaAtiva !== 'seguranca' && (
          <button
            onClick={salvarConfiguracoes}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            {salvando ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : salvo ? (
              <><Check size={16} />Salvo!</>
            ) : (
              <><Save size={16} />Salvar alterações</>
            )}
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {abas.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAbaAtiva(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-2xl">

        {abaAtiva === 'empresa' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white mb-4">Dados da Empresa</h2>
            {campo('Nome da Empresa', 'nome_empresa', 'Ex: NexaWi Tecnologia')}
            {campo('CNPJ', 'cnpj', 'Ex: 00.000.000/0001-00')}
            {campo('E-mail de Contato', 'email_contato', 'Ex: contato@empresa.com', 'email')}
            {campo('Telefone', 'telefone_contato', 'Ex: (11) 99999-9999')}
            {campo('Endereço', 'endereco', 'Ex: Rua das Flores, 123 - São Paulo/SP')}
          </div>
        )}

        {abaAtiva === 'portal' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white mb-4">Personalização do Portal</h2>
            {campo('Título de Boas-vindas', 'titulo_portal', 'Ex: Bem-vindo ao Wi-Fi gratuito!')}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Texto de apresentação</label>
              <textarea
                placeholder="Ex: Conecte-se gratuitamente e aproveite nossos serviços."
                value={form.texto_boas_vindas}
                onChange={(e) => setForm({ ...form, texto_boas_vindas: e.target.value })}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Cor principal do portal</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.cor_principal}
                  onChange={(e) => setForm({ ...form, cor_principal: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={form.cor_principal}
                  onChange={(e) => setForm({ ...form, cor_principal: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'lgpd' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white mb-1">Texto de LGPD</h2>
            <p className="text-xs text-gray-500 mb-4">Este texto será exibido no portal do hotspot antes do usuário se conectar.</p>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Política de Privacidade / Termos de Uso</label>
              <textarea
                placeholder="Ex: Ao se conectar, você concorda com nossa política de privacidade e o uso dos seus dados conforme a LGPD (Lei 13.709/2018)..."
                value={form.texto_lgpd}
                onChange={(e) => setForm({ ...form, texto_lgpd: e.target.value })}
                rows={10}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {abaAtiva === 'notificacoes' && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-white mb-4">Notificações</h2>
            {campo('E-mail para notificações', 'email_notificacao', 'Ex: alertas@empresa.com', 'email')}
            <div className="space-y-3 pt-2">
              <label className="text-xs text-gray-400 block">Alertas ativos</label>
              <div
                onClick={() => setForm({ ...form, notificar_novos_leads: !form.notificar_novos_leads })}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">Novos leads</p>
                  <p className="text-xs text-gray-500 mt-0.5">Receber e-mail quando um novo lead for capturado</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${form.notificar_novos_leads ? 'bg-green-500' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.notificar_novos_leads ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
              <div
                onClick={() => setForm({ ...form, notificar_relatorios: !form.notificar_relatorios })}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">Relatórios automáticos</p>
                  <p className="text-xs text-gray-500 mt-0.5">Receber relatórios conforme o intervalo do plano</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${form.notificar_relatorios ? 'bg-green-500' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.notificar_relatorios ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'seguranca' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white mb-4">Alterar Senha</h2>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Nova senha</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Confirmar nova senha</label>
              <input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            {erroSenha && <p className="text-xs text-red-400">{erroSenha}</p>}
            {senhaOk && <p className="text-xs text-green-400">Senha alterada com sucesso!</p>}
            <button
              onClick={alterarSenha}
              disabled={salvandoSenha || !novaSenha || !confirmarSenha}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm mt-2"
            >
              {salvandoSenha ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Lock size={15} />Alterar senha</>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}