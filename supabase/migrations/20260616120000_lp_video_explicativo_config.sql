alter table public.configuracoes
  add column if not exists lp_video_explicativo_ativo boolean not null default false,
  add column if not exists lp_video_explicativo_url text,
  add column if not exists lp_video_explicativo_titulo text,
  add column if not exists lp_video_explicativo_descricao text;
