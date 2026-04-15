/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Aqui nós substituímos o verde padrão pela sua cor personalizada
        green: {
          400: '#8cf059', // Um tom levemente mais claro para efeitos de hover
          500: '#6be12f', // A SUA COR EXATA (Principal)
          600: '#46a31a', // Um tom levemente mais escuro para gradientes
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        // Atualizei o brilho neon para a sua nova cor testes (RGB: 107, 225, 47)
        'green-glow': '0 0 20px rgba(100, 224, 38, 0.99)', 
      },
    },
  },
  plugins: [],
}
