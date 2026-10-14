-- Finanzas de la ferretería (RN-24 y tabla de métricas de reglas-de-negocio.md).
-- Solo cuentan sus líneas (ya agregadas en store_orders), sin órdenes canceladas y,
-- si p_include_test es falso, sin órdenes de prueba. Son SECURITY INVOKER: el RLS
-- sigue aplicando, así que una ferretería no puede consultar otra aunque cambie p_store_id.

create function public.store_sales_summary(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_include_test boolean default false
)
returns table (
  net_amount numeric,
  gross_amount numeric,
  discount_amount numeric,
  refunded_amount numeric,
  orders bigint,
  units bigint,
  avg_ticket numeric,
  pickup_net numeric,
  pickup_orders bigint,
  shipping_net numeric,
  shipping_orders bigint,
  pending_payment_net numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(o.net_amount), 0),
    coalesce(sum(o.gross_amount), 0),
    coalesce(sum(o.discount_amount), 0),
    coalesce(sum(o.refunded_amount), 0),
    count(*),
    coalesce(sum(o.units), 0),
    case when count(*) > 0 then round(sum(o.net_amount) / count(*), 2) else 0 end,
    coalesce(sum(o.net_amount) filter (where o.delivery_method = 'pickup'), 0),
    count(*) filter (where o.delivery_method = 'pickup'),
    coalesce(sum(o.net_amount) filter (where o.delivery_method <> 'pickup'), 0),
    count(*) filter (where o.delivery_method <> 'pickup'),
    coalesce(
      sum(o.net_amount) filter (where o.financial_status in ('PENDING', 'AUTHORIZED', 'PARTIALLY_PAID')),
      0
    )
  from public.store_orders o
  where o.hardware_store_id = p_store_id
    and o.processed_at >= p_from
    and o.processed_at < p_to
    and o.status <> 'cancelled'
    and (p_include_test or not o.is_test)
$$;

-- Agrupa por día, semana o mes en la zona horaria de la tienda. Los periodos sin
-- ventas no aparecen; la aplicación rellena los huecos.
create function public.store_sales_timeseries(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text default 'day',
  p_include_test boolean default false
)
returns table (
  bucket date,
  net_amount numeric,
  pickup_net numeric,
  shipping_net numeric,
  orders bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    date_trunc(p_bucket, o.processed_at at time zone 'America/Monterrey')::date as bucket,
    coalesce(sum(o.net_amount), 0),
    coalesce(sum(o.net_amount) filter (where o.delivery_method = 'pickup'), 0),
    coalesce(sum(o.net_amount) filter (where o.delivery_method <> 'pickup'), 0),
    count(*)
  from public.store_orders o
  where p_bucket in ('day', 'week', 'month')
    and o.hardware_store_id = p_store_id
    and o.processed_at >= p_from
    and o.processed_at < p_to
    and o.status <> 'cancelled'
    and (p_include_test or not o.is_test)
  group by 1
  order by 1
$$;

-- Ranking por venta neta (unidades actuales × precio con descuento) y por unidades.
create function public.store_top_products(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 10,
  p_include_test boolean default false
)
returns table (
  product_gid text,
  title text,
  units bigint,
  net_amount numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    min(l.product_gid) as product_gid,
    (array_agg(l.title order by o.processed_at desc))[1] as title,
    sum(l.current_quantity)::bigint as units,
    round(sum(l.current_quantity * l.discounted_unit_price), 2) as net_amount
  from public.shopify_order_lines l
  join public.store_orders o
    on o.order_id = l.order_id
   and o.hardware_store_id = l.hardware_store_id
  where o.hardware_store_id = p_store_id
    and o.processed_at >= p_from
    and o.processed_at < p_to
    and o.status <> 'cancelled'
    and (p_include_test or not o.is_test)
    and l.current_quantity > 0
  -- Un producto borrado en Shopify deja product_gid en null; se agrupa por título.
  group by coalesce(l.product_gid, l.title)
  order by net_amount desc, units desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100)
$$;

revoke all on function public.store_sales_summary(uuid, timestamptz, timestamptz, boolean)
  from public, anon;
revoke all on function public.store_sales_timeseries(uuid, timestamptz, timestamptz, text, boolean)
  from public, anon;
revoke all on function public.store_top_products(uuid, timestamptz, timestamptz, integer, boolean)
  from public, anon;

grant execute on function public.store_sales_summary(uuid, timestamptz, timestamptz, boolean)
  to authenticated, service_role;
grant execute on function public.store_sales_timeseries(uuid, timestamptz, timestamptz, text, boolean)
  to authenticated, service_role;
grant execute on function public.store_top_products(uuid, timestamptz, timestamptz, integer, boolean)
  to authenticated, service_role;
