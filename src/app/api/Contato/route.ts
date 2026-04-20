// src/app/api/Contato/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { name, phone, email, city } = await request.json();

    if (!name || !phone || !email || !city) {
      return NextResponse.json(
        { ok: false, message: "Campos obrigatórios ausentes." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const htmlBody = `
      <h2>Novo lead do formulário de contato</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Telefone:</strong> ${phone}</p>
      <p><strong>E-mail:</strong> ${email}</p>
      <p><strong>Cidade:</strong> ${city}</p>
    `;

    await transporter.sendMail({
      from: `"Site NexaWi" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: "Novo lead - Formulário de Contato",
      html: htmlBody,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao enviar e-mail de contato:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao enviar mensagem. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}