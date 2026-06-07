alter table public.wifi_pix_planos
  add column if not exists recomendado boolean not null default false;

create index if not exists wifi_pix_planos_hotspot_recomendado_idx
  on public.wifi_pix_planos(hotspot_id, recomendado, ativo);

comment on column public.wifi_pix_planos.recomendado is
  'Highlights the recommended Wi-Fi no Pix plan for a hotspot.';
