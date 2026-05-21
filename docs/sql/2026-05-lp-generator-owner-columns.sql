alter table public.lp_generator_pages
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.lp_generator_pages
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

alter table public.lp_generator_leads
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.lp_generator_leads
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

alter table public.lp_generator_views
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.lp_generator_views
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_lp_generator_pages_cliente_id
  on public.lp_generator_pages(cliente_id);

create index if not exists idx_lp_generator_pages_empresa_id
  on public.lp_generator_pages(empresa_id);

create index if not exists idx_lp_generator_leads_cliente_id
  on public.lp_generator_leads(cliente_id);

create index if not exists idx_lp_generator_leads_empresa_id
  on public.lp_generator_leads(empresa_id);

create index if not exists idx_lp_generator_views_cliente_id
  on public.lp_generator_views(cliente_id);

create index if not exists idx_lp_generator_views_empresa_id
  on public.lp_generator_views(empresa_id);
