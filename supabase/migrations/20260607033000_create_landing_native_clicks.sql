create table if not exists public.landing_native_clicks (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null default 'home',
  page_url text,
  target_label text,
  target_url text,
  ip_address text,
  user_agent text,
  referer text,
  source_type text not null default 'direto',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists landing_native_clicks_created_at_idx
  on public.landing_native_clicks(created_at desc);

create index if not exists landing_native_clicks_page_created_at_idx
  on public.landing_native_clicks(page_slug, created_at desc);

create index if not exists landing_native_clicks_source_type_idx
  on public.landing_native_clicks(source_type);

create index if not exists landing_native_clicks_target_label_idx
  on public.landing_native_clicks(target_label);

alter table public.landing_native_clicks enable row level security;

revoke all on table public.landing_native_clicks from anon;
revoke all on table public.landing_native_clicks from authenticated;

comment on table public.landing_native_clicks is
  'Server-side click analytics for the native NexaWi landing page.';
