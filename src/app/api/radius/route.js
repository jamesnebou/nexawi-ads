// src/app/api/radius/route.js

import { NextResponse } from 'next/server';
import radius from 'radius';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// A "secret" é a chave compartilhada entre o Mikrotik e o servidor RADIUS.
// Você precisará configurar a mesma chave no seu Mikrotik.
// !!! IMPORTANTE: Em produção, certifique-se de que RADIUS_SECRET esteja SEMPRE definido nas variáveis de ambiente.
const RADIUS_SECRET = process.env.RADIUS_SECRET; // Removido o fallback para evitar uso em produção

export async function POST(request) {
  try {
    const buffer = await request.arrayBuffer();
    const packet = Buffer.from(buffer);

    // Tenta decodificar o pacote RADIUS
    // É crucial que RADIUS_SECRET esteja definido e seja o mesmo do Mikrotik
    if (!RADIUS_SECRET) {
      console.error('RADIUS_SECRET não está definido. Verifique suas variáveis de ambiente.');
      return NextResponse.json({ error: 'RADIUS_SECRET not configured' }, { status: 500 });
    }

    const decoded = radius.decode({ packet: packet, secret: RADIUS_SECRET });

    if (!decoded) {
      console.error('Erro ao decodificar pacote RADIUS. Chave secreta incorreta ou pacote malformado.');
      return NextResponse.json({ error: 'Invalid RADIUS packet or incorrect secret' }, { status: 400 });
    }

    console.log('Pacote RADIUS recebido:', decoded);

    // Extrair username e password
    let userName = decoded.attributes['User-Name'];
    let userPassword = decoded.attributes['User-Password'];

    if (decoded.code === 'Access-Request') {
      // --- Aprimoramento: Limpar User-Name e User-Password antes de consultar o Supabase ---
      const cleanedUserName = String(userName || '').replace(/\D/g, ''); // Remove não-dígitos
      const cleanedUserPassword = String(userPassword || '').replace(/\D/g, ''); // Remove não-dígitos

      if (!cleanedUserName || !cleanedUserPassword) {
        console.log('User-Name ou User-Password vazios após limpeza.');
        const responsePacket = radius.encode_response({
          packet: decoded,
          code: 'Access-Reject',
          secret: RADIUS_SECRET
        });
        return new NextResponse(responsePacket, {
          status: 200,
          headers: { 'Content-Type': 'application/x-radius' }
        });
      }

      // Lógica de autenticação: verificar no Supabase
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('telefone', cleanedUserName) // Assumimos que o telefone é o User-Name
        .eq('cpf', cleanedUserPassword)   // Assumimos que o CPF é o User-Password
        .single();

      if (error || !lead) {
        console.log(`Autenticação falhou para User-Name: ${cleanedUserName}`);
        // Construir e enviar um Access-Reject
        const responsePacket = radius.encode_response({
          packet: decoded,
          code: 'Access-Reject',
          secret: RADIUS_SECRET
        });
        return new NextResponse(responsePacket, {
          status: 200,
          headers: { 'Content-Type': 'application/x-radius' }
        });
      }

      console.log(`Autenticação bem-sucedida para User-Name: ${cleanedUserName}`);
      // Construir e enviar um Access-Accept
      const responsePacket = radius.encode_response({
        packet: decoded,
        code: 'Access-Accept',
        secret: RADIUS_SECRET,
        attributes: [
          ['Reply-Message', 'Bem-vindo ao Wi-Fi!']
        ]
      });
      return new NextResponse(responsePacket, {
        status: 200,
        headers: { 'Content-Type': 'application/x-radius' }
      });

    } else {
      console.log('Tipo de pacote RADIUS não suportado:', decoded.code);
      const responsePacket = radius.encode_response({
        packet: decoded,
        code: 'Access-Reject', // Rejeita tipos não suportados
        secret: RADIUS_SECRET
      });
      return new NextResponse(responsePacket, {
        status: 400, // 400 Bad Request para tipo não suportado
        headers: { 'Content-Type': 'application/x-radius' }
      });
    }

  } catch (error) {
    console.error('Erro no servidor RADIUS:', error);
    // Em caso de erro interno, também rejeita o acesso
    const dummyPacket = { identifier: 0, authenticator: Buffer.alloc(16), attributes: [] }; // Cria um pacote dummy para encode_response
    const responsePacket = radius.encode_response({
      packet: dummyPacket, // Usa um pacote dummy se o original não pôde ser decodificado
      code: 'Access-Reject',
      secret: RADIUS_SECRET || 'fallback_secret' // Usa um fallback para secret se não estiver definido
    });
    return new NextResponse(responsePacket, {
      status: 500,
      headers: { 'Content-Type': 'application/x-radius' }
    });
  }
}

// Para requisições GET (apenas para teste, não é usado pelo Mikrotik)
export async function GET() {
  return NextResponse.json({ message: 'RADIUS API endpoint is running. Send a POST request with RADIUS packet.' });
}