import './globals.css'

export const metadata = {
  title: 'NexaWi ADS',
  description: 'Painel Administrativo NexaWi ADS',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}