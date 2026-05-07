// src/app/admin/page.js
// ============================================================
// Rota antiga do painel administrativo.
// Agora redireciona para a dashboard premium.
// ============================================================

import { redirect } from 'next/navigation'

export default function AdminRedirectPage() {
  redirect('/dashboard')
}