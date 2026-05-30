-- Configuracao por hotspot para captura progressiva no portal cativo.
-- Execute no Supabase SQL Editor antes de publicar a versao que usa estes campos.

alter table public.hotspots
  add column if not exists portal_email_obrigatorio boolean not null default true,
  add column if not exists portal_cpf_visivel boolean not null default true,
  add column if not exists portal_cpf_obrigatorio boolean not null default true,
  add column if not exists portal_promocoes_optin_ativo boolean not null default false,
  add column if not exists portal_promocoes_texto text not null default 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.';

alter table public.leads
  add column if not exists aceitou_promocoes boolean not null default false,
  add column if not exists data_aceite_promocoes timestamptz;

update public.hotspots
set
  portal_email_obrigatorio = true,
  portal_cpf_visivel = false,
  portal_cpf_obrigatorio = false,
  portal_promocoes_optin_ativo = true,
  portal_promocoes_texto = 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.'
where slug = 'candido-sales'
   or cidade ilike '%Candido Sales%'
   or cidade ilike '%Cândido Sales%'
   or nome ilike '%Candido Sales%'
   or nome ilike '%Cândido Sales%';

create index if not exists idx_leads_aceitou_promocoes
  on public.leads(aceitou_promocoes);
