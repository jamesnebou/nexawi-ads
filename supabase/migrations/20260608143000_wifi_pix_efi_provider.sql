-- Normaliza campos do provider Efi no Wi-Fi no Pix sem remover compatibilidade Asaas.

alter table public.wifi_pix_vendas
  add column if not exists gateway_pagamento text not null default 'asaas',
  add column if not exists efi_txid text,
  add column if not exists efi_location_id text,
  add column if not exists efi_payload jsonb not null default '{}'::jsonb,
  add column if not exists efi_end_to_end_id text;

create index if not exists wifi_pix_vendas_gateway_idx
  on public.wifi_pix_vendas(gateway_pagamento, created_at desc);

create unique index if not exists wifi_pix_vendas_efi_txid_idx
  on public.wifi_pix_vendas(efi_txid)
  where efi_txid is not null;

create index if not exists wifi_pix_vendas_efi_end_to_end_idx
  on public.wifi_pix_vendas(efi_end_to_end_id)
  where efi_end_to_end_id is not null;

notify pgrst, 'reload schema';
