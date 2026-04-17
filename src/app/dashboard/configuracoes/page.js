'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Building2, Globe, Shield, Bell, Lock, Check, Save } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const abas = [
  { id: 'empresa', label: 'Empresa', icon: Building2, desc: 'Dados comerciais' },
  { id: 'portal', label: 'Portal', icon: Globe, desc: 'Aparência do Wi-Fi' },
  { id: 'lgpd', label: 'LGPD', icon: Shield, desc: 'Termos de uso' },
  { id: 'notificacoes', label: 'Notificações', icon: Bell, desc: 'Avisos e alertas' },
  { id: 'seguranca', label: 'Segurança', icon: Lock, desc: 'Senha de acesso' },
]

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('empresa')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [configId, setConfigId] = useState(null)

  // Estados de Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaOk, setSenhaOk] = useState(false)

  const [form, setForm] = useState({
    nome_empresa: '', cnpj: '', email_contato: '', telefone_contato: '', endereco: '',
    titulo_portal: '', texto_boas_vindas: '', cor_principal: '#22c55e',
    texto_lgpd: '',
    email_notificacoes: '', notificar_novos_leads: true, notificar_relatorios: true
  })

  useEffect(() => { buscarConfiguracoes() }, [])

  async function buscarConfiguracoes() {
    setCarregando(true)
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
        email_notificacoes: data.email_notificacoes || '',
        notificar_novos_leads: data.notificar_novos_leads ?? true,
        notificar_relatorios: data.notificar_relatorios ?? true
      })
    }
    setCarregando(false)
  }

  async function salvarConfiguracoes() {
    setSalvando(true)
    setSalvo(false)
    if (configId) {
      await supabase.from('configuracoes').update(form).eq('id', configId)
    } else {
      const { data } = await supabase.from('configuracoes').insert([form]).select()
      if (data) setConfigId(data[0].id)
    }
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  async function alterarSenha() {
    setErroSenha('')
    setSenhaOk(false)
    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem.')
      return
    }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) {
      setErroSenha('Erro ao alterar senha. Tente novamente.')
    } else {
      setSenhaOk(true)
      setNovaSenha('')
      setConfirmarSenha('')
      setTimeout(() => setSenhaOk(false), 3000)
    }
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
          <Save className="text-[#6be12f] animate-pulse" size={24} />
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 animate-fade-in-up">

      {/* Luz ambiente de fundo */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight">Configurações</h1>
          <p className="text-sm text-neutral-500 mt-2 font-medium">Gerencie as preferências e a identidade do seu sistema</p>
        </div>

        {abaAtiva !== 'seguranca' && (
          <button
            onClick={salvarConfiguracoes}
            disabled={salvando}
            className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
          >
            {salvando ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : salvo ? (
              <><Check size={18} strokeWidth={2.5} /> Salvo com sucesso!</>
            ) : (
              <><Save size={18} strokeWidth={2.5} /> Salvar Alterações</>
            )}
          </button>
        )}
      </header>

      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl relative z-10">

        {/* Sidebar de Abas */}
        <div className="w-full md:w-80 flex-shrink-0 bg-white/[0.01] border-b md:border-b-0 md:border-r border-white/[0.05] p-6 space-y-3">
          {abas.map((aba) => {
            const Icon = aba.icon
            const ativo = abaAtiva === aba.id
            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 group ${
                  ativo 
                    ? 'bg-white/[0.05] border border-white/[0.05] shadow-sm' 
                    : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <div className={`p-3 rounded-xl transition-colors duration-300 ${ativo ? 'bg-[#6be12f]/10 text-[#6be12f] border border-[#6be12f]/20 shadow-inner' : 'bg-[#050505] text-neutral-500 border border-white/[0.05] group-hover:text-neutral-300 shadow-inner'}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className={`text-sm font-bold tracking-wide ${ativo ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                    {aba.label}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 font-medium">{aba.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 p-8 sm:p-12">

          {abaAtiva === 'empresa' && (
            <div className="space-y-8 max-w-3xl animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Dados da Empresa</h2>
                <p className="text-sm text-neutral-500 font-medium">Informações comerciais que aparecerão nos relatórios e rodapés.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Nome da Empresa</label>
                  <input
                    type="text" value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">CNPJ</label>
                  <input
                    type="text" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Telefone de Contato</label>
                  <input
                    type="text" value={form.telefone_contato} onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">E-mail de Contato</label>
                  <input
                    type="email" value={form.email_contato} onChange={(e) => setForm({ ...form, email_contato: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Endereço Completo</label>
                  <input
                    type="text" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'portal' && (
            <div className="space-y-8 max-w-3xl animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Aparência do Portal Wi-Fi</h2>
                <p className="text-sm text-neutral-500 font-medium">Personalize como os clientes verão a tela de login da rede.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Título do Portal</label>
                  <input
                    type="text" placeholder="Ex: Wi-Fi Grátis - Minha Empresa"
                    value={form.titulo_portal} onChange={(e) => setForm({ ...form, titulo_portal: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Texto de Boas-vindas</label>
                  <textarea
                    rows={4} placeholder="Ex: Cadastre-se para acessar a internet gratuitamente."
                    value={form.texto_boas_vindas} onChange={(e) => setForm({ ...form, texto_boas_vindas: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all resize-none shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Cor Principal (Botões e Destaques)</label>
                  <div className="flex items-center gap-5">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/[0.1] shadow-inner flex-shrink-0 bg-[#050505]">
                      <input
                        type="color" value={form.cor_principal} onChange={(e) => setForm({ ...form, cor_principal: e.target.value })}
                        className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer"
                      />
                    </div>
                    <input
                      type="text" value={form.cor_principal} onChange={(e) => setForm({ ...form, cor_principal: e.target.value })}
                      className="w-36 bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all uppercase shadow-inner font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'lgpd' && (
            <div className="space-y-8 max-w-4xl flex flex-col h-full animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Termos de Uso e LGPD</h2>
                <p className="text-sm text-neutral-500 font-medium">Defina o texto legal que os usuários precisam aceitar para usar a rede.</p>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Texto Completo dos Termos</label>
                <textarea
                  value={form.texto_lgpd} onChange={(e) => setForm({ ...form, texto_lgpd: e.target.value })}
                  className="w-full flex-1 min-h-[400px] bg-[#050505] border border-white/[0.05] rounded-2xl px-6 py-6 text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all resize-none custom-scrollbar leading-relaxed shadow-inner"
                  placeholder="Insira aqui os termos de uso, política de privacidade e adequação à LGPD..."
                />
              </div>
            </div>
          )}

          {abaAtiva === 'notificacoes' && (
            <div className="space-y-8 max-w-3xl animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Alertas e Notificações</h2>
                <p className="text-sm text-neutral-500 font-medium">Configure como e quando você deseja ser avisado pelo sistema.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">E-mail para Receber Alertas</label>
                  <input
                    type="email" placeholder="seu@email.com"
                    value={form.email_notificacoes} onChange={(e) => setForm({ ...form, email_notificacoes: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div className="pt-4 space-y-4">
                  {/* Toggle 1 */}
                  <div
                    onClick={() => setForm({ ...form, notificar_novos_leads: !form.notificar_novos_leads })}
                    className="flex items-center justify-between p-6 bg-[#050505] border border-white/[0.05] rounded-2xl cursor-pointer hover:border-white/[0.1] transition-all shadow-inner group"
                  >
                    <div>
                      <p className="text-base font-bold text-white group-hover:text-[#8cf059] transition-colors tracking-tight">Novos leads capturados</p>
                      <p className="text-sm text-neutral-500 mt-1 font-medium">Receber um resumo diário de novos cadastros na rede</p>
                    </div>
                    <div className={`w-14 h-7 rounded-full transition-colors duration-300 relative shadow-inner ${form.notificar_novos_leads ? 'bg-[#6be12f]' : 'bg-neutral-800'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${form.notificar_novos_leads ? 'left-8' : 'left-1'}`} />
                    </div>
                  </div>

                  {/* Toggle 2 */}
                  <div
                    onClick={() => setForm({ ...form, notificar_relatorios: !form.notificar_relatorios })}
                    className="flex items-center justify-between p-6 bg-[#050505] border border-white/[0.05] rounded-2xl cursor-pointer hover:border-white/[0.1] transition-all shadow-inner group"
                  >
                    <div>
                      <p className="text-base font-bold text-white group-hover:text-[#8cf059] transition-colors tracking-tight">Relatórios automáticos</p>
                      <p className="text-sm text-neutral-500 mt-1 font-medium">Receber relatórios de desempenho conforme o intervalo do plano</p>
                    </div>
                    <div className={`w-14 h-7 rounded-full transition-colors duration-300 relative shadow-inner ${form.notificar_relatorios ? 'bg-[#6be12f]' : 'bg-neutral-800'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${form.notificar_relatorios ? 'left-8' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'seguranca' && (
            <div className="space-y-8 max-w-md animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Segurança da Conta</h2>
                <p className="text-sm text-neutral-500 font-medium">Atualize sua senha de acesso ao painel administrativo.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Nova senha</label>
                  <input
                    type="password" placeholder="Mínimo 6 caracteres"
                    value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Confirmar nova senha</label>
                  <input
                    type="password" placeholder="Repita a nova senha"
                    value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                {erroSenha && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-sm font-bold text-red-400 text-center">{erroSenha}</p>
                  </div>
                )}
                {senhaOk && (
                  <div className="p-4 bg-[#6be12f]/10 border border-[#6be12f]/20 rounded-2xl">
                    <p className="text-sm font-bold text-[#8cf059] text-center">Senha alterada com sucesso!</p>
                  </div>
                )}

                <button
                  onClick={alterarSenha}
                  disabled={salvandoSenha || !novaSenha || !confirmarSenha}
                  className="w-full bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 mt-4 border border-white/[0.05] hover:border-white/[0.1] shadow-inner"
                >
                  {salvandoSenha ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Lock size={18} /> Atualizar Senha</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </main>
  )
}