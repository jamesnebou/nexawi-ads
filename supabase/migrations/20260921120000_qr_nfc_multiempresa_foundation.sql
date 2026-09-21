-- Fundação multiempresa para QR Codes dinâmicos e placas QR + NFC.
-- Migration aditiva: preserva slugs e URLs /q/{slug} já impressos.

create extension if not exists pgcrypto;

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  type text not null default 'link',
  target_url text,
  status text not null default 'active',
  customer_name text,
  location_name text,
  campaign_name text,
  wifi_ssid text,
  wifi_security text default 'nopass',
  wifi_password text,
  wifi_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists qr_codes_slug_uidx
  on public.qr_codes (slug);

alter table public.qr_codes
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists hotspot_id uuid references public.hotspots(id) on delete set null,
  add column if not exists destination_type text,
  add column if not exists google_place_id text,
  add column if not exists google_review_url text,
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.qr_codes
set destination_type = case when type = 'wifi' then 'wifi' else 'link' end
where destination_type is null;

update public.qr_codes
set public_token = gen_random_uuid()
where public_token is null;

alter table public.qr_codes
  alter column destination_type set default 'link',
  alter column destination_type set not null,
  alter column public_token set default gen_random_uuid(),
  alter column public_token set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'qr_codes_destination_type_check'
  ) then
    alter table public.qr_codes
      add constraint qr_codes_destination_type_check
      check (destination_type in (
        'link', 'wifi', 'google_review', 'whatsapp', 'instagram',
        'maps', 'cardapio', 'campanha'
      ));
  end if;
end
$$;

create unique index if not exists qr_codes_public_token_uidx
  on public.qr_codes (public_token);
create index if not exists qr_codes_empresa_created_idx
  on public.qr_codes (empresa_id, created_at desc);
create index if not exists qr_codes_cliente_created_idx
  on public.qr_codes (cliente_id, created_at desc);
create index if not exists qr_codes_hotspot_idx
  on public.qr_codes (hotspot_id);

create table if not exists public.qr_assets (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null unique references public.qr_codes(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  serial_number text not null unique,
  status text not null default 'production',
  location_label text,
  nfc_status text not null default 'unprogrammed',
  nfc_programmed_at timestamptz,
  nfc_verified_at timestamptz,
  installed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'qr_assets_status_check'
  ) then
    alter table public.qr_assets
      add constraint qr_assets_status_check
      check (status in ('production', 'provisioned', 'installed', 'inactive', 'replaced'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'qr_assets_nfc_status_check'
  ) then
    alter table public.qr_assets
      add constraint qr_assets_nfc_status_check
      check (nfc_status in ('unprogrammed', 'programmed', 'verified', 'locked'));
  end if;
end
$$;

create index if not exists qr_assets_empresa_status_idx
  on public.qr_assets (empresa_id, status, created_at desc);
create index if not exists qr_assets_cliente_idx
  on public.qr_assets (cliente_id);

create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  referrer text
);

alter table public.qr_scans
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists asset_id uuid references public.qr_assets(id) on delete set null,
  add column if not exists channel text not null default 'legacy',
  add column if not exists visitor_hash text,
  add column if not exists bot_detected boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'qr_scans_channel_check'
  ) then
    alter table public.qr_scans
      add constraint qr_scans_channel_check
      check (channel in ('legacy', 'qr', 'nfc'));
  end if;
end
$$;

create index if not exists qr_scans_qr_scanned_idx
  on public.qr_scans (qr_code_id, scanned_at desc);
create index if not exists qr_scans_empresa_scanned_idx
  on public.qr_scans (empresa_id, scanned_at desc);
create index if not exists qr_scans_asset_channel_scanned_idx
  on public.qr_scans (asset_id, channel, scanned_at desc);

create or replace function public.validate_qr_code_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.cliente_id is not null and (
    new.empresa_id is null or not exists (
      select 1
      from public.clientes c
      where c.id = new.cliente_id
        and c.empresa_id = new.empresa_id
    )
  ) then
    raise exception 'Cliente fora do escopo da empresa do QR Code.';
  end if;

  if new.hotspot_id is not null and (
    new.empresa_id is null or not exists (
      select 1
      from public.hotspots h
      where h.id = new.hotspot_id
        and h.empresa_id = new.empresa_id
    )
  ) then
    raise exception 'Hotspot fora do escopo da empresa do QR Code.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_qr_code_scope on public.qr_codes;
create trigger validate_qr_code_scope
before insert or update of empresa_id, cliente_id, hotspot_id on public.qr_codes
for each row execute function public.validate_qr_code_scope();

create or replace function public.set_qr_asset_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  qr_empresa_id uuid;
  qr_cliente_id uuid;
begin
  select q.empresa_id, q.cliente_id
    into qr_empresa_id, qr_cliente_id
  from public.qr_codes q
  where q.id = new.qr_code_id;

  if not found then
    raise exception 'QR Code do ativo não encontrado.';
  end if;

  if new.empresa_id is distinct from qr_empresa_id then
    raise exception 'Empresa do ativo difere da empresa do QR Code.';
  end if;

  if new.cliente_id is distinct from qr_cliente_id then
    raise exception 'Cliente do ativo difere do cliente do QR Code.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_qr_asset_scope on public.qr_assets;
create trigger set_qr_asset_scope
before insert or update of qr_code_id, empresa_id, cliente_id on public.qr_assets
for each row execute function public.set_qr_asset_scope();

create or replace function public.set_qr_scan_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  qr_empresa_id uuid;
begin
  select q.empresa_id
    into qr_empresa_id
  from public.qr_codes q
  where q.id = new.qr_code_id;

  if not found then
    raise exception 'QR Code do acesso não encontrado.';
  end if;

  new.empresa_id := qr_empresa_id;

  if new.asset_id is not null and not exists (
    select 1
    from public.qr_assets a
    where a.id = new.asset_id
      and a.qr_code_id = new.qr_code_id
  ) then
    raise exception 'Ativo físico não pertence ao QR Code informado.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_qr_scan_scope on public.qr_scans;
create trigger set_qr_scan_scope
before insert or update of qr_code_id, empresa_id, asset_id on public.qr_scans
for each row execute function public.set_qr_scan_scope();

create or replace function public.set_qr_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_qr_codes_updated_at on public.qr_codes;
create trigger set_qr_codes_updated_at
before update on public.qr_codes
for each row execute function public.set_qr_updated_at();

drop trigger if exists set_qr_assets_updated_at on public.qr_assets;
create trigger set_qr_assets_updated_at
before update on public.qr_assets
for each row execute function public.set_qr_updated_at();

create or replace function public.create_qr_asset(
  p_qr jsonb,
  p_asset jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_qr public.qr_codes%rowtype;
  created_asset public.qr_assets%rowtype;
begin
  insert into public.qr_codes (
    name,
    slug,
    type,
    destination_type,
    target_url,
    google_place_id,
    google_review_url,
    wifi_ssid,
    wifi_security,
    wifi_password,
    wifi_hidden,
    empresa_id,
    cliente_id,
    hotspot_id,
    customer_name,
    location_name,
    campaign_name,
    created_by,
    updated_by,
    status
  ) values (
    p_qr->>'name',
    p_qr->>'slug',
    coalesce(nullif(p_qr->>'type', ''), 'link'),
    coalesce(nullif(p_qr->>'destination_type', ''), 'link'),
    nullif(p_qr->>'target_url', ''),
    nullif(p_qr->>'google_place_id', ''),
    nullif(p_qr->>'google_review_url', ''),
    nullif(p_qr->>'wifi_ssid', ''),
    nullif(p_qr->>'wifi_security', ''),
    nullif(p_qr->>'wifi_password', ''),
    coalesce((p_qr->>'wifi_hidden')::boolean, false),
    nullif(p_qr->>'empresa_id', '')::uuid,
    nullif(p_qr->>'cliente_id', '')::uuid,
    nullif(p_qr->>'hotspot_id', '')::uuid,
    nullif(p_qr->>'customer_name', ''),
    nullif(p_qr->>'location_name', ''),
    nullif(p_qr->>'campaign_name', ''),
    nullif(p_qr->>'created_by', '')::uuid,
    nullif(p_qr->>'updated_by', '')::uuid,
    coalesce(nullif(p_qr->>'status', ''), 'active')
  )
  returning * into created_qr;

  insert into public.qr_assets (
    qr_code_id,
    empresa_id,
    cliente_id,
    serial_number,
    status,
    location_label,
    nfc_status,
    metadata
  ) values (
    created_qr.id,
    created_qr.empresa_id,
    created_qr.cliente_id,
    p_asset->>'serial_number',
    coalesce(nullif(p_asset->>'status', ''), 'production'),
    nullif(p_asset->>'location_label', ''),
    coalesce(nullif(p_asset->>'nfc_status', ''), 'unprogrammed'),
    coalesce(p_asset->'metadata', '{}'::jsonb)
  )
  returning * into created_asset;

  return jsonb_build_object(
    'qr_code', to_jsonb(created_qr),
    'asset', to_jsonb(created_asset)
  );
end;
$$;

create or replace view public.qr_code_stats as
select
  q.id,
  q.name,
  q.slug,
  q.type,
  q.target_url,
  q.status,
  q.customer_name,
  q.location_name,
  q.campaign_name,
  q.wifi_ssid,
  q.wifi_security,
  q.wifi_password,
  q.wifi_hidden,
  q.created_at,
  q.updated_at,
  count(s.id)::integer as total_scans,
  (count(s.id) filter (where s.scanned_at >= current_date))::integer as scans_today,
  (count(s.id) filter (where s.scanned_at >= now() - interval '7 days'))::integer as scans_7d,
  (count(s.id) filter (where s.scanned_at >= now() - interval '30 days'))::integer as scans_30d,
  max(s.scanned_at) as last_scan_at,
  q.empresa_id,
  q.cliente_id,
  q.hotspot_id,
  q.destination_type,
  q.google_place_id,
  q.google_review_url,
  q.public_token,
  (count(s.id) filter (where s.channel = 'qr'))::integer as qr_scans,
  (count(s.id) filter (where s.channel = 'nfc'))::integer as nfc_scans,
  (count(s.id) filter (where s.channel = 'legacy'))::integer as legacy_scans
from public.qr_codes q
left join public.qr_scans s on s.qr_code_id = q.id and s.bot_detected is not true
group by q.id;

alter table public.qr_codes enable row level security;
alter table public.qr_assets enable row level security;
alter table public.qr_scans enable row level security;

revoke all on table public.qr_codes from public, anon, authenticated;
revoke all on table public.qr_assets from public, anon, authenticated;
revoke all on table public.qr_scans from public, anon, authenticated;
revoke all on table public.qr_code_stats from public, anon, authenticated;
revoke all on function public.validate_qr_code_scope() from public, anon, authenticated;
revoke all on function public.set_qr_asset_scope() from public, anon, authenticated;
revoke all on function public.set_qr_scan_scope() from public, anon, authenticated;
revoke all on function public.set_qr_updated_at() from public, anon, authenticated;
revoke all on function public.create_qr_asset(jsonb, jsonb) from public, anon, authenticated;

grant select, insert, update, delete on table public.qr_codes to service_role;
grant select, insert, update, delete on table public.qr_assets to service_role;
grant select, insert, update, delete on table public.qr_scans to service_role;
grant select on table public.qr_code_stats to service_role;
grant execute on function public.create_qr_asset(jsonb, jsonb) to service_role;

comment on table public.qr_assets is
  'Inventário físico de placas NexaWi com QR e NFC, uma URL dinâmica por ativo.';
comment on column public.qr_scans.channel is
  'Canal de entrada: legacy para /q/{slug}, qr ou nfc para ativos provisionados.';
