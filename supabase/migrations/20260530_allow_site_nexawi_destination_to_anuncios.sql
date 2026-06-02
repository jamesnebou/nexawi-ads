alter table public.anuncios
  drop constraint if exists anuncios_tipo_destino_check;

alter table public.anuncios
  add constraint anuncios_tipo_destino_check
  check (tipo_destino in ('externo', 'lp_interna', 'site_nexawi'));

comment on column public.anuncios.tipo_destino is 'Define o fluxo do CTA: externo libera internet antes do link; lp_interna abre caminho interno NexaWi e libera depois; site_nexawi abre a home NexaWi e libera depois do timer.';
comment on column public.anuncios.lp_slug is 'Caminho interno quando tipo_destino = lp_interna. Exemplos: /, /anunciar ou /lp/slug.';