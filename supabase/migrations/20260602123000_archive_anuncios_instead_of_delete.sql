alter table public.anuncios
  add column if not exists arquivado_em timestamptz,
  add column if not exists arquivado_por uuid;

create index if not exists idx_anuncios_arquivado_em
  on public.anuncios (arquivado_em);

comment on column public.anuncios.arquivado_em is
  'Data/hora em que o anuncio foi arquivado pelo painel. Anuncios arquivados nao aparecem na listagem operacional nem no portal.';

comment on column public.anuncios.arquivado_por is
  'Usuario administrativo que arquivou o anuncio, quando disponivel.';
