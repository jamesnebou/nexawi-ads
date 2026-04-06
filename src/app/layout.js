import './globals.css'

export const metadata = {
  title: 'NexaWi ADS',
  description: 'Painel Administrativo NexaWi ADS',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="bg-[#050505]">
      <body className="bg-[#050505] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}