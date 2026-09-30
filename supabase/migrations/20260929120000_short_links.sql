-- Encurtador de links independente dos QR Codes e das placas físicas.
-- Os códigos são globais porque www e go compartilham a mesma rota /l/{codigo}.

create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  target_url text not null check (char_length(target_url) <= 2048 and target_url ~* '^https?://'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  click_count bigint not null default 0 check (click_count >= 0),
  last_clicked_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists short_links_empresa_created_idx
  on public.short_links (empresa_id, created_at desc);

create or replace function public.set_short_link_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.short_links'::regclass
      and tgname = 'set_short_links_updated_at'
  ) then
    create trigger set_short_links_updated_at
    before update of title, target_url, status on public.short_links
    for each row execute function public.set_short_link_updated_at();
  end if;
end;
$$;

-- A atualização do contador é atômica e não altera o horário da última edição.
create or replace function public.resolve_short_link(p_slug text, p_count boolean default true)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resolved_url text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
    return null;
  end if;

  if p_count then
    update public.short_links
       set click_count = click_count + 1,
           last_clicked_at = now()
     where slug = p_slug
       and status = 'active'
    returning target_url into resolved_url;
  else
    select target_url into resolved_url
      from public.short_links
     where slug = p_slug
       and status = 'active';
  end if;

  return resolved_url;
end;
$$;

alter table public.short_links enable row level security;

revoke all on table public.short_links from public, anon, authenticated;
revoke all on function public.set_short_link_updated_at() from public, anon, authenticated;
revoke all on function public.resolve_short_link(text, boolean) from public, anon, authenticated;

grant select, insert, update on table public.short_links to service_role;
grant execute on function public.resolve_short_link(text, boolean) to service_role;

comment on table public.short_links is
  'Links curtos editáveis da NexaWi, separados dos ativos QR/NFC físicos.';
