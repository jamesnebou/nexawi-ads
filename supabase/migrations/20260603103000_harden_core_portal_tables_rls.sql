-- Harden core portal tables that are accessed through server-side APIs.
-- Public browser flows must use /api/portal/* routes, which run with the
-- service role. Do not expose lead, ad, hotspot or metric tables directly to
-- anon/authenticated clients.

do $$
declare
  table_name text;
  tables_to_protect text[] := array[
    'leads',
    'anuncios',
    'hotspots',
    'anuncio_hotspots',
    'anuncio_views',
    'anuncio_clicks',
    'portal_ad_rotations',
    'anuncio_device_history'
  ];
begin
  foreach table_name in array tables_to_protect loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon', table_name);
      execute format('revoke all on table public.%I from authenticated', table_name);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

comment on table public.leads is
  'Lead data is private. Access must go through server-side NexaWi APIs using service role.';

comment on table public.portal_ad_rotations is
  'Portal ad rotation/session state is private and controlled server-side.';

