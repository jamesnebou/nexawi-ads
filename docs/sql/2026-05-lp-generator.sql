create table if not exists public.lp_generator_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cliente_id uuid references public.clientes(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  config jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lp_generator_pages
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.lp_generator_pages
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_lp_generator_pages_status
  on public.lp_generator_pages(status);

create index if not exists idx_lp_generator_pages_cliente_id
  on public.lp_generator_pages(cliente_id);

create index if not exists idx_lp_generator_pages_empresa_id
  on public.lp_generator_pages(empresa_id);

create index if not exists idx_lp_generator_pages_updated_at
  on public.lp_generator_pages(updated_at desc);

create table if not exists public.lp_generator_leads (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.lp_generator_pages(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  page_slug text,
  nome text,
  email text,
  telefone text,
  mensagem text,
  origem text default 'lp_generator',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.lp_generator_leads
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.lp_generator_leads
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_lp_generator_leads_page_id
  on public.lp_generator_leads(page_id);

create index if not exists idx_lp_generator_leads_cliente_id
  on public.lp_generator_leads(cliente_id);

create index if not exists idx_lp_generator_leads_empresa_id
  on public.lp_generator_leads(empresa_id);

create index if not exists idx_lp_generator_leads_created_at
  on public.lp_generator_leads(created_at desc);

create table if not exists public.lp_generator_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.lp_generator_pages(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  page_slug text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.lp_generator_views
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.lp_generator_views
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_lp_generator_views_page_id
  on public.lp_generator_views(page_id);

create index if not exists idx_lp_generator_views_cliente_id
  on public.lp_generator_views(cliente_id);

create index if not exists idx_lp_generator_views_empresa_id
  on public.lp_generator_views(empresa_id);

create index if not exists idx_lp_generator_views_created_at
  on public.lp_generator_views(created_at desc);

create or replace function public.set_lp_generator_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lp_generator_pages_updated_at on public.lp_generator_pages;

create trigger trg_lp_generator_pages_updated_at
before update on public.lp_generator_pages
for each row execute function public.set_lp_generator_pages_updated_at();
