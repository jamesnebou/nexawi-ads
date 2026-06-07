-- Wi-Fi no Pix MVP.
-- Adds paid access plans and purchases without changing the ad-sponsored flow.

alter table public.hotspots
  add column if not exists portal_modo_acesso text not null default 'anuncios',
  add column if not exists wifi_pix_ativo boolean not null default false;

alter table public.hotspots
  drop constraint if exists hotspots_portal_modo_acesso_check;

alter table public.hotspots
  add constraint hotspots_portal_modo_acesso_check
  check (portal_modo_acesso in ('anuncios', 'pix', 'hibrido'));

create table if not exists public.wifi_pix_planos (
  id uuid primary key default gen_random_uuid(),
  hotspot_id uuid not null references public.hotspots(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  nome text not null,
  descricao text,
  valor numeric(10,2) not null,
  duracao_minutos integer not null,
  velocidade_download text not null default '15M',
  velocidade_upload text not null default '15M',
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wifi_pix_planos_valor_check check (valor > 0),
  constraint wifi_pix_planos_duracao_check check (duracao_minutos between 1 and 10080)
);

create table if not exists public.wifi_pix_vendas (
  id uuid primary key default gen_random_uuid(),
  hotspot_id uuid not null references public.hotspots(id) on delete cascade,
  plano_id uuid references public.wifi_pix_planos(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  telefone text not null,
  cpf_cnpj text,
  nome text,
  mac_address text,
  ip_address text,
  metodo_pagamento text not null default 'PIX',
  valor numeric(10,2) not null,
  duracao_minutos integer not null,
  velocidade_download text not null default '15M',
  velocidade_upload text not null default '15M',
  status text not null default 'pendente',
  asaas_customer_id text,
  asaas_payment_id text,
  asaas_invoice_url text,
  asaas_payload jsonb not null default '{}'::jsonb,
  external_reference text,
  pago_em timestamptz,
  autorizado_em timestamptz,
  expira_em timestamptz,
  erro_autorizacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wifi_pix_vendas_status_check
    check (status in ('pendente', 'pago', 'autorizado', 'expirado', 'cancelado', 'erro')),
  constraint wifi_pix_vendas_metodo_pagamento_check
    check (metodo_pagamento in ('PIX', 'CREDIT_CARD')),
  constraint wifi_pix_vendas_valor_check check (valor > 0),
  constraint wifi_pix_vendas_duracao_check check (duracao_minutos between 1 and 10080)
);

create table if not exists public.wifi_pix_acessos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.wifi_pix_vendas(id) on delete cascade,
  hotspot_id uuid not null references public.hotspots(id) on delete cascade,
  mac_address text not null,
  ip_address text,
  router_binding_id text,
  router_queue_name text,
  autorizado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  revogado_em timestamptz,
  status text not null default 'ativo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wifi_pix_acessos_status_check
    check (status in ('ativo', 'expirado', 'revogado', 'erro'))
);

create index if not exists wifi_pix_planos_hotspot_ativo_idx
  on public.wifi_pix_planos(hotspot_id, ativo, ordem);

create index if not exists wifi_pix_vendas_payment_idx
  on public.wifi_pix_vendas(asaas_payment_id);

create index if not exists wifi_pix_vendas_external_reference_idx
  on public.wifi_pix_vendas(external_reference);

create index if not exists wifi_pix_vendas_status_idx
  on public.wifi_pix_vendas(status, created_at desc);

create index if not exists wifi_pix_vendas_mac_hotspot_idx
  on public.wifi_pix_vendas(hotspot_id, mac_address, created_at desc);

create index if not exists wifi_pix_acessos_expira_idx
  on public.wifi_pix_acessos(status, expira_em);

alter table public.wifi_pix_planos enable row level security;
alter table public.wifi_pix_vendas enable row level security;
alter table public.wifi_pix_acessos enable row level security;

revoke all on table public.wifi_pix_planos from public;
revoke all on table public.wifi_pix_planos from anon;
revoke all on table public.wifi_pix_planos from authenticated;

revoke all on table public.wifi_pix_vendas from public;
revoke all on table public.wifi_pix_vendas from anon;
revoke all on table public.wifi_pix_vendas from authenticated;

revoke all on table public.wifi_pix_acessos from public;
revoke all on table public.wifi_pix_acessos from anon;
revoke all on table public.wifi_pix_acessos from authenticated;

notify pgrst, 'reload schema';

comment on column public.hotspots.portal_modo_acesso is
  'Modo comercial do portal: anuncios, pix ou hibrido.';

comment on table public.wifi_pix_planos is
  'Planos pagos de acesso Wi-Fi por hotspot.';

comment on table public.wifi_pix_vendas is
  'Checkout e status de pagamentos Pix para acesso Wi-Fi.';

comment on table public.wifi_pix_acessos is
  'Acessos liberados pelo Wi-Fi no Pix e sua expiração.';
