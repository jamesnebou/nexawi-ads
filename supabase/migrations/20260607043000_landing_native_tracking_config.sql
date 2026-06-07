alter table public.configuracoes
  add column if not exists lp_meta_pixel_id text,
  add column if not exists lp_ga4_measurement_id text,
  add column if not exists lp_google_tag_manager_id text,
  add column if not exists lp_google_ads_id text,
  add column if not exists lp_google_ads_conversion_label text,
  add column if not exists lp_meta_conversions_api_enabled boolean not null default false,
  add column if not exists lp_google_ads_enhanced_conversions_enabled boolean not null default false;

comment on column public.configuracoes.lp_meta_pixel_id is
  'Meta Pixel ID used by the native NexaWi landing page.';

comment on column public.configuracoes.lp_ga4_measurement_id is
  'GA4 measurement ID used by the native NexaWi landing page.';

comment on column public.configuracoes.lp_google_tag_manager_id is
  'Google Tag Manager container ID used by the native NexaWi landing page.';

comment on column public.configuracoes.lp_google_ads_id is
  'Google Ads tag ID used by the native NexaWi landing page.';

comment on column public.configuracoes.lp_google_ads_conversion_label is
  'Google Ads conversion label used for native landing CTA clicks.';

comment on column public.configuracoes.lp_meta_conversions_api_enabled is
  'Operational flag for future server-side Meta Conversions API integration.';

comment on column public.configuracoes.lp_google_ads_enhanced_conversions_enabled is
  'Operational flag for future Google Ads Enhanced Conversions integration.';
