-- Final defensive RLS audit for NexaWi core tables.
--
-- These tables contain leads, campaign delivery, hotspot configuration,
-- customer contracts, and payment/Asaas data. Browser flows must access them
-- only through server-side NexaWi APIs using the service role.

do $$
declare
  table_name text;
  tables_to_protect text[] := array[
    'leads',
    'anuncios',
    'anuncio_views',
    'anuncio_clicks',
    'portal_ad_rotations',
    'hotspots',
    'clientes',
    'empresa_contratos',
    'empresa_contrato_events',
    'contratos',
    'contrato_events',
    'pagamentos',
    'asaas_webhook_events'
  ];
begin
  foreach table_name in array tables_to_protect loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public', table_name);
      execute format('revoke all on table public.%I from anon', table_name);
      execute format('revoke all on table public.%I from authenticated', table_name);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

comment on schema public is
  'NexaWi: core SaaS data is private by default. Public/cliente/admin browser access must go through server-side API routes, not direct anon/authenticated table access.';

do $$
begin
  if to_regclass('public.leads') is not null then
    comment on table public.leads is
      'Private portal lead data. Access only through server-side NexaWi APIs.';
  end if;

  if to_regclass('public.anuncios') is not null then
    comment on table public.anuncios is
      'Private campaign/ad configuration. Portal delivery is mediated by server-side APIs.';
  end if;

  if to_regclass('public.hotspots') is not null then
    comment on table public.hotspots is
      'Private hotspot and network configuration. Access only through server-side NexaWi APIs.';
  end if;

  if to_regclass('public.portal_ad_rotations') is not null then
    comment on table public.portal_ad_rotations is
      'Private ad queue/session state controlled server-side.';
  end if;

  if to_regclass('public.clientes') is not null then
    comment on table public.clientes is
      'Private customer/account data. Access only through server-side NexaWi APIs.';
  end if;

  if to_regclass('public.pagamentos') is not null then
    comment on table public.pagamentos is
      'Private financial/Asaas payment data. Access only through server-side NexaWi APIs and verified webhooks.';
  end if;
end $$;
