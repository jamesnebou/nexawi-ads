/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      // ESTA SEÇÃO ABAIXO É A MAIS IMPORTANTE PARA VERIFICAR
      boxShadow: {
        'green-glow': '0 0 15px rgba(34, 197, 94, 0.6)', // Verde padrão (green-500) com 60% de opacidade
      },
    },
  },
  plugins: [],
}