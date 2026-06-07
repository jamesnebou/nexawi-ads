-- Final security hardening for public-exposed Supabase schema.
-- Public browser flows must go through Next.js API routes using service role.

do $$
declare
  table_name text;
  protected_tables text[] := array[
    'leads',
    'anuncios',
    'anuncio_views',
    'anuncio_clicks',
    'portal_ad_rotations',
    'hotspots',
    'clientes',
    'contratos',
    'empresa_contratos',
    'pagamentos',
    'financeiro_eventos',
    'auth_sessions',
    'router_action_logs',
    'wifi_pix_planos',
    'wifi_pix_vendas',
    'wifi_pix_acessos',
    'landing_native_views',
    'landing_native_clicks',
    'lp_generator_leads'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon', table_name);
      execute format('revoke all on table public.%I from authenticated', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.router_action_logs') is not null then
    comment on table public.router_action_logs is
      'Operational audit trail for MikroTik/RouterOS session actions. Access only through server-side admin/control APIs.';
  end if;

  if to_regclass('public.auth_sessions') is not null then
    comment on table public.auth_sessions is
      'Controlled hotspot authorization sessions. Public clients must not access this table directly.';
  end if;

  if to_regclass('public.wifi_pix_vendas') is not null then
    comment on table public.wifi_pix_vendas is
      'Wi-Fi no Pix sales and payment state. Public clients must use /api/portal/pix/* routes.';
  end if;
end $$;
