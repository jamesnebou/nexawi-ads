-- Reforça a integridade multiempresa dos ativos QR/NFC.
-- Migration aditiva e idempotente para ambientes onde a fundação já foi aplicada.

create or replace function public.validate_qr_code_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.cliente_id is not null and (
    new.empresa_id is null or not exists (
      select 1
      from public.clientes c
      where c.id = new.cliente_id
        and c.empresa_id = new.empresa_id
    )
  ) then
    raise exception 'Cliente fora do escopo da empresa do QR Code.';
  end if;

  if new.hotspot_id is not null and (
    new.empresa_id is null or not exists (
      select 1
      from public.hotspots h
      where h.id = new.hotspot_id
        and h.empresa_id = new.empresa_id
    )
  ) then
    raise exception 'Hotspot fora do escopo da empresa do QR Code.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_qr_code_scope on public.qr_codes;
create trigger validate_qr_code_scope
before insert or update of empresa_id, cliente_id, hotspot_id on public.qr_codes
for each row execute function public.validate_qr_code_scope();

create or replace function public.set_qr_asset_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  qr_empresa_id uuid;
  qr_cliente_id uuid;
begin
  select q.empresa_id, q.cliente_id
    into qr_empresa_id, qr_cliente_id
  from public.qr_codes q
  where q.id = new.qr_code_id;

  if not found then
    raise exception 'QR Code do ativo não encontrado.';
  end if;

  if new.empresa_id is distinct from qr_empresa_id then
    raise exception 'Empresa do ativo difere da empresa do QR Code.';
  end if;

  if new.cliente_id is distinct from qr_cliente_id then
    raise exception 'Cliente do ativo difere do cliente do QR Code.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_qr_asset_scope on public.qr_assets;
create trigger set_qr_asset_scope
before insert or update of qr_code_id, empresa_id, cliente_id on public.qr_assets
for each row execute function public.set_qr_asset_scope();

create or replace function public.set_qr_scan_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  qr_empresa_id uuid;
begin
  select q.empresa_id
    into qr_empresa_id
  from public.qr_codes q
  where q.id = new.qr_code_id;

  if not found then
    raise exception 'QR Code do acesso não encontrado.';
  end if;

  new.empresa_id := qr_empresa_id;

  if new.asset_id is not null and not exists (
    select 1
    from public.qr_assets a
    where a.id = new.asset_id
      and a.qr_code_id = new.qr_code_id
  ) then
    raise exception 'Ativo físico não pertence ao QR Code informado.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_qr_scan_scope on public.qr_scans;
create trigger set_qr_scan_scope
before insert or update of qr_code_id, empresa_id, asset_id on public.qr_scans
for each row execute function public.set_qr_scan_scope();

revoke all on function public.validate_qr_code_scope() from public, anon, authenticated;
revoke all on function public.set_qr_asset_scope() from public, anon, authenticated;
revoke all on function public.set_qr_scan_scope() from public, anon, authenticated;

comment on function public.validate_qr_code_scope() is
  'Impede vínculos de cliente ou hotspot pertencentes a outra empresa.';
comment on function public.set_qr_asset_scope() is
  'Garante que o ativo físico permaneça no mesmo tenant do QR Code.';
comment on function public.set_qr_scan_scope() is
  'Deriva o tenant do acesso pelo QR Code e valida o ativo físico informado.';
