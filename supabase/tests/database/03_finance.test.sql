-- 5.6 (7): funciones de finanzas sobre fixtures conocidas.
begin;
create extension if not exists pgtap with schema extensions;
\ir fixtures.psql

select plan(8);

select tests.authenticate_as('11111111-1111-4111-8111-111111111111');

select results_eq(
  $$select net_amount, gross_amount, discount_amount, refunded_amount, orders, units, avg_ticket,
           pickup_net, pickup_orders, shipping_net, shipping_orders, pending_payment_net
    from public.store_sales_summary('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', false)$$,
  $$values (420::numeric, 500::numeric, 30::numeric, 50::numeric, 2::bigint, 6::bigint, 210::numeric,
            270::numeric, 1::bigint, 150::numeric, 1::bigint, 150::numeric)$$,
  'Resumen de A sin pruebas ni canceladas'
);
select results_eq(
  $$select net_amount, orders, avg_ticket, pickup_net, pickup_orders
    from public.store_sales_summary('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', true)$$,
  $$values (520::numeric, 3::bigint, 173.33::numeric, 370::numeric, 2::bigint)$$,
  'Resumen de A con órdenes de prueba'
);
select results_eq(
  $$select net_amount, orders
    from public.store_sales_summary('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-02 00:00-06', '2026-10-03 00:00-06', false)$$,
  $$values (150::numeric, 1::bigint)$$,
  'El rango usa la hora de Monterrey'
);
select results_eq(
  $$select bucket, net_amount, pickup_net, shipping_net, orders
    from public.store_sales_timeseries('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', 'day', false)$$,
  $$values ('2026-10-01'::date, 270::numeric, 270::numeric, 0::numeric, 1::bigint),
           ('2026-10-02'::date, 150::numeric, 0::numeric, 150::numeric, 1::bigint)$$,
  'Serie diaria agrupada en America/Monterrey'
);
select results_eq(
  $$select bucket, net_amount
    from public.store_sales_timeseries('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', 'month', false)$$,
  $$values ('2026-10-01'::date, 420::numeric)$$,
  'Serie mensual'
);
select is_empty(
  $$select * from public.store_sales_timeseries('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', 'hour', false)$$,
  'Solo acepta day, week o month'
);
select results_eq(
  $$select product_gid, title, units, net_amount
    from public.store_top_products('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', 10, false)$$,
  $$values ('gid://shopify/Product/1'::text, 'Martillo'::text, 3::bigint, 270::numeric),
           ('gid://shopify/Product/2', 'Clavos', 3, 150)$$,
  'Productos más vendidos de A'
);
select results_eq(
  $$select net_amount, orders
    from public.store_sales_summary('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '2026-10-01 00:00-06', '2026-11-01 00:00-06', true)$$,
  $$values (0::numeric, 0::bigint)$$,
  'A no obtiene cifras de B aunque pida su id'
);

select * from finish();
rollback;
