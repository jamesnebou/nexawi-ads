-- docs/sql/2026-05-contratos-nexawi.sql
-- ============================================================
-- Sprint 6 — Gerador Automático de Contratos NexaWi
-- Execute este SQL no Supabase antes de usar o histórico/rascunhos.
-- ============================================================

create table if not exists public.empresa_contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid null references public.empresas(id) on delete set null,
  cliente_id uuid null references public.clientes(id) on delete set null,
  source text not null default 'empresa',
  status text not null default 'rascunho',
  titulo text not null default 'Contrato NexaWi',
  template_version text not null default 'nexawi-contract-v1',
  contrato_numero text null,
  fields_json jsonb not null default '{}'::jsonb,
  html_rendered text null,
  pdf_url text null,
  cliente_email text null,
  nexawi_email text null default 'contato@nexawi.com.br',
  sent_to_cliente_at timestamptz null,
  sent_to_nexawi_at timestamptz null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_empresa_contratos_empresa_id on public.empresa_contratos(empresa_id);
create index if not exists idx_empresa_contratos_cliente_id on public.empresa_contratos(cliente_id);
create index if not exists idx_empresa_contratos_status on public.empresa_contratos(status);
create index if not exists idx_empresa_contratos_created_at on public.empresa_contratos(created_at desc);

create or replace function public.set_empresa_contratos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_empresa_contratos_updated_at on public.empresa_contratos;
create trigger trg_empresa_contratos_updated_at
before update on public.empresa_contratos
for each row
execute function public.set_empresa_contratos_updated_at();

-- Opcional: se seu projeto usa RLS com service_role, esta tabela pode ficar sem RLS inicialmente,
-- pois as rotas admin usam supabaseAdmin e validam permissão no backend.
