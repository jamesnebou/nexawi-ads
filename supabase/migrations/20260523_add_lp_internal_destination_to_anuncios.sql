-- Campos para permitir dois fluxos de CTA no portal:
-- 1) externo: libera internet e envia para link externo
-- 2) lp_interna: envia para /lp/:slug ainda dentro da NexaWi e libera após permanência

alter table public.anuncios
  add column if not exists tipo_destino text not null default 'externo',
  add column if not exists lp_slug text,
  add column if not exists tempo_liberacao_lp integer not null default 10;

alter table public.anuncios
  drop constraint if exists anuncios_tipo_destino_check;

alter table public.anuncios
  add constraint anuncios_tipo_destino_check
  check (tipo_destino in ('externo', 'lp_interna'));

alter table public.anuncios
  drop constraint if exists anuncios_tempo_liberacao_lp_check;

alter table public.anuncios
  add constraint anuncios_tempo_liberacao_lp_check
  check (tempo_liberacao_lp between 3 and 60);

comment on column public.anuncios.tipo_destino is 'Define o fluxo do CTA: externo libera internet antes do link; lp_interna abre LP NexaWi e libera depois.';
comment on column public.anuncios.lp_slug is 'Slug da landing page interna em /lp/:slug quando tipo_destino = lp_interna.';
comment on column public.anuncios.tempo_liberacao_lp is 'Tempo em segundos para liberar internet após abrir a LP interna.';
