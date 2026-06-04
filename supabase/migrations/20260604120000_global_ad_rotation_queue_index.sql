create index if not exists portal_ad_rotations_hotspot_queue_idx
  on public.portal_ad_rotations(hotspot_id, anuncio_id, seen_at desc);
