// src/app/dashboard/[...not-found]/page.js
// ============================================================
// Catch-all para rotas inexistentes dentro da dashboard.
// Exemplo:
// /dashboard/teste404
// /dashboard/rota/errada
//
// Isso força o Next a renderizar o not-found.js da dashboard.
// ============================================================

import { notFound } from 'next/navigation'

export default function DashboardCatchAllNotFound() {
  notFound()
}