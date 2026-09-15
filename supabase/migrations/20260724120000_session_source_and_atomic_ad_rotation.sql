-- Correlates temporary/paid authorizations with their source sale and makes
-- global ad selection atomic per hotspot.

alter table public.auth_sessions
  add column if not exists authorization_reason text,
  add column if not exists source_entity_id uuid,
  add column if not exists router_id uuid references public.network_routers(id) on delete set null;

create index if not exists auth_sessions_source_idx
  on public.auth_sessions(
    hotspot_id,
    client_mac,
    authorization_reason,
    source_entity_id,
    created_at desc
  );

create unique index if not exists auth_sessions_unique_source_idx
  on public.auth_sessions(authorization_reason, source_entity_id)
  where source_entity_id is not null;

create index if not exists auth_sessions_router_state_idx
  on public.auth_sessions(router_id, session_state, expires_at);

alter table public.wifi_pix_acessos
  add column if not exists router_id uuid references public.network_routers(id) on delete set null;

create index if not exists wifi_pix_acessos_router_state_idx
  on public.wifi_pix_acessos(router_id, status, expira_em);

with ranked_accesses as (
  select id,
         row_number() over (
           partition by venda_id
           order by created_at desc, id desc
         ) as row_number
    from public.wifi_pix_acessos
   where status = 'ativo'
)
update public.wifi_pix_acessos access
   set status = 'revogado',
       revogado_em = coalesce(access.revogado_em, now()),
       updated_at = now()
  from ranked_accesses duplicate
 where access.id = duplicate.id
   and duplicate.row_number > 1;

create unique index if not exists wifi_pix_acessos_one_active_sale_idx
  on public.wifi_pix_acessos(venda_id)
  where status = 'ativo';

comment on column public.auth_sessions.authorization_reason is
  'Fluxo que originou a autorização: anúncio, híbrido, janela de pagamento ou acesso pago.';

comment on column public.auth_sessions.source_entity_id is
  'Entidade que autorizou a sessão, como a venda de Wi-Fi no Pix.';

comment on column public.auth_sessions.router_id is
  'MikroTik efetivamente usado para criar e remover o acesso.';

comment on column public.wifi_pix_acessos.router_id is
  'MikroTik efetivamente usado para liberar e posteriormente remover o acesso pago.';

create or replace function public.claim_next_portal_ad(
  p_hotspot_id uuid,
  p_user_key text,
  p_lead_id uuid,
  p_ad_ids uuid[]
)
returns table (
  id uuid,
  anuncio_id uuid,
  eligible_at timestamptz,
  duration_seconds integer,
  cycle integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_rotation public.portal_ad_rotations%rowtype;
  selected_ad_id uuid;
  selected_duration integer;
  current_cycle integer;
begin
  if p_hotspot_id is null
     or nullif(trim(p_user_key), '') is null
     or p_lead_id is null
     or coalesce(array_length(p_ad_ids, 1), 0) = 0 then
    raise exception 'Parâmetros inválidos para selecionar anúncio';
  end if;

  -- Serializes retries and new queue claims inside this hotspot. The retry
  -- lookup must run after the lock, otherwise concurrent requests can both
  -- miss the pending rotation and create different sessions.
  perform pg_advisory_xact_lock(hashtextextended(p_hotspot_id::text, 0));

  -- A retry caused by a slow captive browser must return the same pending ad.
  select rotation.*
    into existing_rotation
    from public.portal_ad_rotations rotation
   where rotation.hotspot_id = p_hotspot_id
     and rotation.lead_id = p_lead_id
     and rotation.completed_at is null
     and rotation.created_at >= now() - interval '15 minutes'
     and rotation.anuncio_id = any(p_ad_ids)
   order by rotation.created_at desc
   limit 1;

  if found then
    return query
      select existing_rotation.id,
             existing_rotation.anuncio_id,
             existing_rotation.eligible_at,
             existing_rotation.duration_seconds,
             existing_rotation.cycle;
    return;
  end if;

  select candidate.ad_id,
         greatest(5, least(120, coalesce(ad.duracao_segundos, 15)))
    into selected_ad_id, selected_duration
    from unnest(p_ad_ids) as candidate(ad_id)
    join public.anuncios ad on ad.id = candidate.ad_id
    left join lateral (
      select max(rotation.seen_at) as last_seen_at
        from public.portal_ad_rotations rotation
       where rotation.hotspot_id = p_hotspot_id
         and rotation.anuncio_id = candidate.ad_id
    ) history on true
   where ad.ativo = true
     and ad.arquivado_em is null
   order by history.last_seen_at asc nulls first, ad.created_at asc, ad.id asc
   limit 1;

  if selected_ad_id is null then
    return;
  end if;

  select coalesce(max(rotation.cycle), 1)
    into current_cycle
    from public.portal_ad_rotations rotation
   where rotation.user_key = p_user_key
     and rotation.hotspot_id = p_hotspot_id;

  if exists (
    select 1
      from public.portal_ad_rotations rotation
     where rotation.user_key = p_user_key
       and rotation.hotspot_id = p_hotspot_id
       and rotation.cycle = current_cycle
       and rotation.anuncio_id = selected_ad_id
  ) then
    current_cycle := current_cycle + 1;
  end if;

  return query
    insert into public.portal_ad_rotations (
      user_key,
      hotspot_id,
      lead_id,
      anuncio_id,
      duration_seconds,
      eligible_at,
      cycle
    )
    values (
      p_user_key,
      p_hotspot_id,
      p_lead_id,
      selected_ad_id,
      selected_duration,
      now() + make_interval(secs => selected_duration),
      current_cycle
    )
    returning
      portal_ad_rotations.id,
      portal_ad_rotations.anuncio_id,
      portal_ad_rotations.eligible_at,
      portal_ad_rotations.duration_seconds,
      portal_ad_rotations.cycle;
end;
$$;

revoke all on function public.claim_next_portal_ad(uuid, text, uuid, uuid[]) from public;
revoke all on function public.claim_next_portal_ad(uuid, text, uuid, uuid[]) from anon;
revoke all on function public.claim_next_portal_ad(uuid, text, uuid, uuid[]) from authenticated;
grant execute on function public.claim_next_portal_ad(uuid, text, uuid, uuid[]) to service_role;

notify pgrst, 'reload schema';
