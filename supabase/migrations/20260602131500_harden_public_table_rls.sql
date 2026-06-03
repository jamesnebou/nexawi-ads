do $$
declare
  table_name text;
  tables_to_protect text[] := array[
    'admin_audit_logs',
    'admin_notifications',
    'anuncio_clicks',
    'anuncio_device_history',
    'anuncio_views',
    'auth_sessions',
    'cliente_access_logs',
    'crm_prospects',
    'empresa_contrato_events',
    'empresa_contratos',
    'empresa_usuarios',
    'lp_generator_assets',
    'lp_generator_leads',
    'lp_generator_pages',
    'lp_generator_views',
    'network_policies',
    'network_policy_domains',
    'network_routers',
    'pagamentos',
    'portal_ad_rotations',
    'router_action_logs',
    'support_ticket_messages',
    'support_tickets'
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

comment on schema public is
  'NexaWi: tabelas operacionais sensiveis usam RLS e acesso server-side via APIs. Nao liberar anon/authenticated sem politica especifica.';
