// src/app/admin/login/page.js
// ============================================================
// Login antigo do painel administrativo.
// Agora redireciona para o login oficial.
// ============================================================

import { redirect } from 'next/navigation'

export default function AdminLoginRedirectPage() {
  redirect('/login')
}