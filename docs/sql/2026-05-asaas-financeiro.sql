-- Integracao Asaas para financeiro SaaS NexaWi.
-- Execute no Supabase antes de criar cobrancas recorrentes pelo painel.

alter table public.clientes
  add column if not exists asaas_customer_id text;

alter table public.pagamentos
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists gateway_pagamento text,
  add column if not exists gateway_payment_id text,
  add column if not exists gateway_subscription_id text,
  add column if not exists gateway_status text,
  add column if not exists gateway_invoice_url text,
  add column if not exists gateway_bank_slip_url text,
  add column if not exists gateway_payload jsonb,
  add column if not exists external_reference text;

create index if not exists idx_clientes_asaas_customer_id
  on public.clientes (asaas_customer_id);

create index if not exists idx_pagamentos_gateway_payment_id
  on public.pagamentos (gateway_payment_id);

create index if not exists idx_pagamentos_gateway_subscription_id
  on public.pagamentos (gateway_subscription_id);

create index if not exists idx_pagamentos_external_reference
  on public.pagamentos (external_reference);
