// app/page.js
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <main style={{ 
      fontFamily: 'Arial, sans-serif', 
      textAlign: 'center', 
      padding: '50px', 
      backgroundColor: '#f0f2f5', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <h1 style={{ color: '#333', fontSize: '3em', marginBottom: '20px' }}>
        Bem-vindo ao NexaWi!
      </h1>
      <p style={{ color: '#555', fontSize: '1.2em', marginBottom: '30px', maxWidth: '600px' }}>
        Sua plataforma para gerenciar anúncios, clientes e muito mais.
        Estamos felizes em ter você aqui.
      </p>
      <div style={{ display: 'flex', gap: '20px' }}>
        <Link href="/dashboard" style={{ 
          backgroundColor: '#0070f3', 
          color: 'white', 
          padding: '12px 25px', 
          borderRadius: '5px', 
          textDecoration: 'none', 
          fontSize: '1.1em', 
          fontWeight: 'bold', 
          transition: 'background-color 0.3s ease' 
        }}>
          Ir para o Dashboard
        </Link>
        <Link href="/admin" style={{ 
          backgroundColor: '#6c757d', 
          color: 'white', 
          padding: '12px 25px', 
          borderRadius: '5px', 
          textDecoration: 'none', 
          fontSize: '1.1em', 
          fontWeight: 'bold', 
          transition: 'background-color 0.3s ease' 
        }}>
          Área Administrativa
        </Link>
      </div>
      <footer style={{ marginTop: '50px', color: '#888', fontSize: '0.9em' }}>
        &copy; {new Date().getFullYear()} NexaWi. Todos os direitos reservados.
      </footer>
    </main>
  );
}