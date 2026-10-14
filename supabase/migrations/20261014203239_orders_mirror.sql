-- Copia de las órdenes de Shopify y estado de preparación por ferretería (RN-14 a RN-22).
-- Solo el proceso de sincronización (service role) escribe aquí; la ferretería lee
-- sus filas con RLS y solo puede cambiar store_orders.status.

-- Viene de FulfillmentOrder.deliveryMethod.methodType. Para las reglas y la interfaz,
-- "pickup" es pickup y "envío" es todo lo demás.
create type public.delivery_method as enum (
  'pickup', 'shipping', 'local_delivery', 'pickup_point', 'retail', 'none'
);

create type public.preparation_status as enum (
  'preparing', 'ready_for_pickup', 'ready_to_ship', 'completed', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Órdenes (interna: solo service role)
-- ---------------------------------------------------------------------------
create table public.shopify_orders (
  id bigint primary key, -- legacyResourceId
  gid text not null unique,
  name text not null,
  processed_at timestamptz not null,
  shopify_created_at timestamptz not null,
  shopify_updated_at timestamptz not null,
  cancelled_at timestamptz,
  cancel_reason text,
  closed_at timestamptz,
  is_test boolean not null default false,
  financial_status text,
  fulfillment_status text,
  currency text not null default 'MXN',
  customer_display_name text,
  source_name text,
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Líneas (la ferretería solo lee las suyas)
-- ---------------------------------------------------------------------------
create table public.shopify_order_lines (
  gid text primary key,
  order_id bigint not null references public.shopify_orders (id) on delete cascade,
  -- null si el proveedor no corresponde a ninguna ferretería (p. ej. Aldevaram).
  hardware_store_id uuid references public.hardware_stores (id) on delete set null,
  vendor text,
  product_gid text,
  variant_gid text,
  title text not null,
  variant_title text,
  sku text,
  image_url text,
  quantity integer not null check (quantity >= 0),
  current_quantity integer not null check (current_quantity >= 0),
  unfulfilled_quantity integer not null check (unfulfilled_quantity >= 0),
  original_unit_price numeric(12, 2) not null,
  discounted_unit_price numeric(12, 2) not null,
  original_total numeric(12, 2) not null,
  discounted_total numeric(12, 2) not null,
  delivery_method public.delivery_method,
  fulfillment_order_gid text,
  fulfillment_order_line_item_gid text,
  location_gid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopify_order_lines_store_order_idx
  on public.shopify_order_lines (hardware_store_id, order_id);
create index shopify_order_lines_order_id_idx
  on public.shopify_order_lines (order_id);

create trigger shopify_order_lines_set_updated_at
  before update on public.shopify_order_lines
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orden de cada ferretería
-- ---------------------------------------------------------------------------
create table public.store_orders (
  order_id bigint not null references public.shopify_orders (id) on delete cascade,
  hardware_store_id uuid not null references public.hardware_stores (id) on delete cascade,
  -- Copia de la orden
  order_name text not null,
  processed_at timestamptz not null,
  customer_display_name text,
  financial_status text,
  is_test boolean not null default false,
  order_cancelled_at timestamptz,
  delivery_method public.delivery_method not null,
  currency text not null default 'MXN',
  -- Agregados de sus líneas (RN-15)
  lines_count integer not null default 0 check (lines_count >= 0),
  units integer not null default 0 check (units >= 0),
  gross_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  refunded_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  -- Estado de preparación
  status public.preparation_status not null default 'preparing',
  status_changed_at timestamptz,
  status_changed_by uuid,
  -- Reflejo opcional en Shopify (Fase 5b)
  shopify_push_status text check (shopify_push_status in ('pending', 'ok', 'failed', 'skipped')),
  shopify_push_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (order_id, hardware_store_id)
);

create index store_orders_store_processed_idx
  on public.store_orders (hardware_store_id, processed_at desc);
create index store_orders_store_status_idx
  on public.store_orders (hardware_store_id, status);

create trigger store_orders_set_updated_at
  before update on public.store_orders
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Historial de estados (RN-22)
-- ---------------------------------------------------------------------------
create table public.store_order_status_events (
  id bigint generated always as identity primary key,
  order_id bigint not null,
  hardware_store_id uuid not null,
  from_status public.preparation_status,
  to_status public.preparation_status not null,
  changed_by uuid,
  source text not null check (source in ('panel', 'shopify')),
  created_at timestamptz not null default now(),
  foreign key (order_id, hardware_store_id)
    references public.store_orders (order_id, hardware_store_id) on delete cascade
);

create index store_order_status_events_order_idx
  on public.store_order_status_events (order_id, hardware_store_id, created_at);

-- ---------------------------------------------------------------------------
-- Webhooks (interna; da idempotencia) y estado de la sincronización
-- ---------------------------------------------------------------------------
create table public.shopify_webhook_events (
  event_id text primary key,
  topic text not null,
  shop_domain text not null,
  resource_gid text,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.shopify_sync_state (
  key text primary key,
  -- updatedAt máximo sincronizado
  cursor timestamptz,
  last_run_at timestamptz,
  last_error text
);

-- ---------------------------------------------------------------------------
-- Máquina de estados (RN-19 a RN-21)
-- ---------------------------------------------------------------------------
create function private.guard_store_order_status()
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

  -- actor nulo = proceso del sistema (sync con service role): aplica RN-20.
  -- Con usuario autenticado solo se permiten las transiciones de RN-19; desde
  -- Completado y Cancelado no hay salida (RN-21).
  if actor is not null and not (
       (old.status = 'preparing' and new.status = 'ready_for_pickup' and is_pickup)
    or (old.status = 'preparing' and new.status = 'ready_to_ship' and not is_pickup)
    or (old.status in ('ready_for_pickup', 'ready_to_ship') and new.status = 'preparing')
    or (old.status = 'ready_for_pickup' and new.status = 'completed' and is_pickup)
  ) then
    raise exception 'invalid_status_transition'
      using errcode = 'P0001',
            detail = format('%s -> %s (%s)', old.status, new.status, new.delivery_method);
  end if;

  new.status_changed_at := now();
  new.status_changed_by := actor;
  return new;
end;
$$;
revoke all on function private.guard_store_order_status() from public;

create trigger store_orders_guard_status
  before update of status on public.store_orders
  for each row execute function private.guard_store_order_status();

-- Registra cada cambio de estado. SECURITY DEFINER porque la ferretería no puede
-- insertar en el historial directamente.
create function private.log_store_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  insert into public.store_order_status_events
    (order_id, hardware_store_id, from_status, to_status, changed_by, source)
  values (
    new.order_id,
    new.hardware_store_id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    actor,
    case when actor is null then 'shopify' else 'panel' end
  );
  return null;
end;
$$;
revoke all on function private.log_store_order_status() from public;

create trigger store_orders_log_insert
  after insert on public.store_orders
  for each row execute function private.log_store_order_status();

create trigger store_orders_log_status_change
  after update of status on public.store_orders
  for each row
  when (old.status is distinct from new.status)
  execute function private.log_store_order_status();

-- ---------------------------------------------------------------------------
-- RLS y permisos
-- ---------------------------------------------------------------------------
alter table public.shopify_orders enable row level security;
alter table public.shopify_order_lines enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_status_events enable row level security;
alter table public.shopify_webhook_events enable row level security;
alter table public.shopify_sync_state enable row level security;

create policy "store members can read their lines" on public.shopify_order_lines
  for select to authenticated
  using (hardware_store_id in (select private.current_user_store_ids()));

create policy "store members can read their orders" on public.store_orders
  for select to authenticated
  using (hardware_store_id in (select private.current_user_store_ids()));

-- La ferretería solo puede escribir la columna status (ver grants); el trigger
-- store_orders_guard_status valida la transición.
create policy "store members can update status" on public.store_orders
  for update to authenticated
  using (hardware_store_id in (select private.current_user_store_ids()))
  with check (hardware_store_id in (select private.current_user_store_ids()));

create policy "store members can read their history" on public.store_order_status_events
  for select to authenticated
  using (hardware_store_id in (select private.current_user_store_ids()));

-- Tablas internas: RLS activo, sin políticas y sin acceso para anon/authenticated.
revoke all on
  public.shopify_orders,
  public.shopify_order_lines,
  public.store_orders,
  public.store_order_status_events,
  public.shopify_webhook_events,
  public.shopify_sync_state
  from anon, authenticated;

grant select on public.shopify_order_lines, public.store_orders, public.store_order_status_events
  to authenticated;
grant update (status) on public.store_orders to authenticated;

grant select, insert, update, delete on
  public.shopify_orders,
  public.shopify_order_lines,
  public.store_orders,
  public.store_order_status_events,
  public.shopify_webhook_events,
  public.shopify_sync_state
  to service_role;
