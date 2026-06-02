alter table public.portal_ad_rotations
  add column if not exists duration_seconds integer not null default 15,
  add column if not exists eligible_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.portal_ad_rotations
  drop constraint if exists portal_ad_rotations_duration_seconds_check;

alter table public.portal_ad_rotations
  add constraint portal_ad_rotations_duration_seconds_check
  check (duration_seconds between 5 and 120);

update public.portal_ad_rotations
set eligible_at = seen_at + (duration_seconds * interval '1 second')
where eligible_at is null;

create index if not exists portal_ad_rotations_completion_idx
  on public.portal_ad_rotations(lead_id, hotspot_id, anuncio_id, completed_at);

create index if not exists portal_ad_rotations_session_guard_idx
  on public.portal_ad_rotations(id, lead_id, hotspot_id, anuncio_id);

create index if not exists portal_ad_rotations_eligible_idx
  on public.portal_ad_rotations(eligible_at, completed_at);

alter table public.portal_ad_rotations enable row level security;

revoke all on table public.portal_ad_rotations from anon;
revoke all on table public.portal_ad_rotations from authenticated;

comment on column public.portal_ad_rotations.duration_seconds is
  'Tempo obrigatorio do anuncio usado para calcular quando a liberacao pode ser concluida.';

comment on column public.portal_ad_rotations.eligible_at is
  'Momento minimo em que a sessao do anuncio pode ser marcada como concluida.';

comment on column public.portal_ad_rotations.completed_at is
  'Momento em que o portal confirmou server-side que o usuario cumpriu o anuncio.';
