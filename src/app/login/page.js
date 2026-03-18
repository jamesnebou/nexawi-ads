'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image' // Importe o componente Image do Next.js
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

    const { data, error } = await signIn(email, password)

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          {/* Aqui você vai colocar sua logo */}
          <Image
            src="/Nexa-logo.png" // <--- SUBSTITUA ESTE CAMINHO PELA URL DA SUA LOGO
            alt="Sua Logo"
            width={280} // Ajuste a largura conforme o tamanho da sua logo
            height={150} // Ajuste a altura conforme o tamanho da sua logo
            priority // Opcional: para carregar a logo mais rápido
            className="mx-auto object-contain" // Centraliza a imagem e garante que se ajuste
          />
          {/* Se quiser manter um subtítulo, pode adicionar aqui, ou remover */}
          <p className="text-gray-400 mt-4 text-sm">Painel Administrativo ADS</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-white text-xl font-semibold mb-6">Entrar na sua conta</h2>

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