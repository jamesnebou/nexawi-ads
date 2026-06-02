create table if not exists public.portal_ad_rotations (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  hotspot_id uuid not null references public.hotspots(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  cycle integer not null default 1,
  seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists portal_ad_rotations_user_hotspot_idx
  on public.portal_ad_rotations(user_key, hotspot_id, cycle, seen_at);

create unique index if not exists portal_ad_rotations_cycle_unique_idx
  on public.portal_ad_rotations(user_key, hotspot_id, cycle, anuncio_id);
