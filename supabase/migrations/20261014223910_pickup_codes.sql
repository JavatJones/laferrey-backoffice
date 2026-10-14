-- Código de recogida para pedidos de pickup (RN-27).
-- Tabla interna: solo el servidor (service role) la lee y escribe. La ferretería nunca
-- ve el código; el panel le muestra el estado a través del servidor.

create table public.store_order_pickup_codes (
  order_id bigint not null,
  hardware_store_id uuid not null,
  -- HMAC-SHA256 del código con una llave del servidor; null si no se pudo emitir.
  code_hash text,
  -- Correo enmascarado al que se envió (p. ej. j***@gmail.com), para mostrarlo en el panel.
  sent_to_masked text,
  sent_at timestamptz,
  send_count integer not null default 0 check (send_count >= 0),
  last_send_error text,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  verification_method text check (verification_method in ('code', 'id_document')),
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (order_id, hardware_store_id),
  foreign key (order_id, hardware_store_id)
    references public.store_orders (order_id, hardware_store_id) on delete cascade,
  constraint store_order_pickup_codes_override_reason
    check (verification_method is distinct from 'id_document' or length(btrim(override_reason)) >= 10)
);

create trigger store_order_pickup_codes_set_updated_at
  before update on public.store_order_pickup_codes
  for each row execute function private.set_updated_at();

alter table public.store_order_pickup_codes enable row level security;
revoke all on public.store_order_pickup_codes from anon, authenticated;
grant select, insert, update, delete on public.store_order_pickup_codes to service_role;

-- ¿Se verificó al cliente de esta orden de pickup? SECURITY DEFINER porque la tabla es
-- interna; solo responde por las ferreterías de la cuenta actual.
create function private.pickup_verified(p_order_id bigint, p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_order_pickup_codes c
    where c.order_id = p_order_id
      and c.hardware_store_id = p_store_id
      and c.verified_at is not null
      and c.hardware_store_id in (select private.current_user_store_ids())
  )
$$;
revoke all on function private.pickup_verified(bigint, uuid) from public;
grant execute on function private.pickup_verified(bigint, uuid) to authenticated;

-- Máquina de estados (RN-19 a RN-21) con la verificación de RN-27: la ferretería solo
-- puede marcar Entregado un pickup verificado. El sistema (sync) no la necesita.
create or replace function private.guard_store_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  is_pickup boolean := new.delivery_method = 'pickup';
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if actor is not null then
    if not (
         (old.status = 'preparing' and new.status = 'ready_for_pickup' and is_pickup)
      or (old.status = 'preparing' and new.status = 'ready_to_ship' and not is_pickup)
      or (old.status in ('ready_for_pickup', 'ready_to_ship') and new.status = 'preparing')
      or (old.status = 'ready_for_pickup' and new.status = 'completed' and is_pickup)
    ) then
      raise exception 'invalid_status_transition'
        using errcode = 'P0001',
              detail = format('%s -> %s (%s)', old.status, new.status, new.delivery_method);
    end if;

    if new.status = 'completed' and is_pickup
       and not private.pickup_verified(new.order_id, new.hardware_store_id) then
      raise exception 'pickup_not_verified'
        using errcode = 'P0001',
              detail = 'Verifica al cliente con su código de recogida antes de entregar.';
    end if;
  end if;

  new.status_changed_at := now();
  new.status_changed_by := actor;
  return new;
end;
$$;

-- Si la orden deja de estar lista, el código deja de servir; al volver a marcarla
-- lista se emite uno nuevo.
create function private.reset_pickup_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.store_order_pickup_codes c
  where c.order_id = new.order_id
    and c.hardware_store_id = new.hardware_store_id
    and c.verified_at is null;
  return null;
end;
$$;
revoke all on function private.reset_pickup_code() from public;

create trigger store_orders_reset_pickup_code
  after update of status on public.store_orders
  for each row
  when (old.status = 'ready_for_pickup' and new.status = 'preparing')
  execute function private.reset_pickup_code();
