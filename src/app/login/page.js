'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Supondo que signIn retorna { data, error }
    const { data, error } = await signIn(email, password)

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12"> {/* Adicionado py-12 para espaçamento vertical em telas pequenas */}
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Image
            src="/Nexa-logo.png"
            alt="Sua Logo"
            width={200} // Largura padrão para telas pequenas
            height={100} // Altura padrão para telas pequenas
            sizes="(max-width: 640px) 200px, 280px" // Define largura para diferentes breakpoints
            priority
            className="mx-auto object-contain w-[200px] sm:w-[280px] h-auto" // Ajusta largura da imagem com Tailwind
          />
          <p className="text-gray-400 mt-4 text-sm sm:text-base">Painel Administrativo ADS</p> {/* Ajuste de tamanho de texto */}
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800"> {/* Ajuste de padding */}
          <h2 className="text-white text-xl sm:text-2xl font-semibold mb-6">Entrar na sua conta</h2> {/* Ajuste de tamanho de título */}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Sua Empresa © 2026 — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}