alter table public.hotspots
  add column if not exists portal_promocoes_optin_ativo boolean not null default false,
  add column if not exists portal_promocoes_texto text not null default 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.';

alter table public.leads
  add column if not exists aceitou_promocoes boolean not null default false,
  add column if not exists data_aceite_promocoes timestamptz;

create index if not exists idx_leads_aceitou_promocoes
  on public.leads(aceitou_promocoes);

update public.hotspots
set
  portal_promocoes_optin_ativo = true,
  portal_promocoes_texto = 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.'
where slug = 'candido-sales';
