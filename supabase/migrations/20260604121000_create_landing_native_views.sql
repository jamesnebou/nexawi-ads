create table if not exists public.landing_native_views (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null default 'home',
  page_url text,
  ip_address text,
  user_agent text,
  referer text,
  source_type text not null default 'direto',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists landing_native_views_created_at_idx
  on public.landing_native_views(created_at desc);

create index if not exists landing_native_views_page_created_at_idx
  on public.landing_native_views(page_slug, created_at desc);

create index if not exists landing_native_views_source_type_idx
  on public.landing_native_views(source_type);

alter table public.landing_native_views enable row level security;

revoke all on table public.landing_native_views from anon;
revoke all on table public.landing_native_views from authenticated;

comment on table public.landing_native_views is
  'Server-side analytics for the native NexaWi landing page.';
