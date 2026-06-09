-- Final operational hardening pass for sensitive SaaS tables.
-- This migration is intentionally additive/idempotent: it only enables RLS,
-- revokes direct client access, and adds indexes used by audit/alert screens.

do $$
declare
  table_name text;
  tables_to_protect text[] := array[
    'admin_audit_logs',
    'admin_notifications',
    'crm_prospects',
    'cliente_access_logs',
    'empresa_usuarios',
    'contrato_events',
    'empresa_contrato_events',
    'support_tickets',
    'support_ticket_messages',
    'asaas_webhook_events',
    'lp_generator_pages',
    'lp_generator_assets',
    'lp_generator_views',
    'landing_native_views',
    'landing_native_clicks',
    'wifi_pix_planos',
    'wifi_pix_vendas',
    'wifi_pix_acessos'
  ];
begin
  foreach table_name in array tables_to_protect loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public', table_name);
      execute format('revoke all on table public.%I from anon', table_name);
      execute format('revoke all on table public.%I from authenticated', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.admin_audit_logs') is not null then
    execute 'create index if not exists idx_admin_audit_logs_action_created_at on public.admin_audit_logs(action, created_at desc)';
    execute 'comment on table public.admin_audit_logs is ''Operational audit log. Direct anon/authenticated access is revoked; use server/admin APIs only.''';
  end if;

  if to_regclass('public.admin_notifications') is not null then
    execute 'create index if not exists idx_admin_notifications_dedup_key on public.admin_notifications(dedup_key) where dedup_key is not null';
    execute 'create index if not exists idx_admin_notifications_active_created_at on public.admin_notifications(active, created_at desc)';
    execute 'comment on table public.admin_notifications is ''Operational alert inbox. Direct anon/authenticated access is revoked; use server/admin APIs only.''';
  end if;
end $$;

notify pgrst, 'reload schema';
