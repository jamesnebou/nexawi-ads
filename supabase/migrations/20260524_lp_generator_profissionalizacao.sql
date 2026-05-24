alter table public.planos
  add column if not exists max_lps integer not null default 0,
  add column if not exists max_leads_mes integer not null default 0,
  add column if not exists templates_premium boolean not null default true;

create table if not exists public.lp_generator_assets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.lp_generator_pages(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  bucket text not null default 'landing-assets',
  path text not null,
  public_url text not null,
  filename text,
  content_type text,
  size_bytes bigint,
  field text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_lp_generator_assets_page_id
  on public.lp_generator_assets(page_id);

create index if not exists idx_lp_generator_assets_cliente_id
  on public.lp_generator_assets(cliente_id);

create index if not exists idx_lp_generator_assets_empresa_id
  on public.lp_generator_assets(empresa_id);

create index if not exists idx_lp_generator_assets_created_at
  on public.lp_generator_assets(created_at desc);

create unique index if not exists idx_lp_generator_assets_path_unique
  on public.lp_generator_assets(path);
