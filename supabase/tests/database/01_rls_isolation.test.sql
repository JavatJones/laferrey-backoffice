-- 5.6 (1–4): aislamiento entre ferreterías.
begin;
create extension if not exists pgtap with schema extensions;
\ir fixtures.psql

select plan(28);

-- ---------------------------------------------------------------- Ferretería A
select tests.authenticate_as('11111111-1111-4111-8111-111111111111');

select results_eq(
  'select slug from public.hardware_stores',
  $$values ('ferreteria-a')$$,
  'A solo ve su ferretería'
);
select results_eq(
  'select hardware_store_id from public.hardware_store_members',
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  'A solo ve su membresía'
);
select results_eq(
  'select full_name from public.profiles',
  $$values ('Usuario A')$$,
  'A solo ve su perfil'
);
select results_eq(
  'select order_id from public.store_orders order by order_id',
  $$values (1001::bigint), (1002), (1003), (1004)$$,
  'A solo ve sus órdenes'
);
select is(
  (select count(*) from public.store_orders where hardware_store_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0::bigint,
  'A no ve órdenes de B'
);
select results_eq(
  'select gid from public.shopify_order_lines order by gid',
  $$values ('gid://shopify/LineItem/1'), ('gid://shopify/LineItem/4'), ('gid://shopify/LineItem/5'), ('gid://shopify/LineItem/6')$$,
  'A solo ve sus líneas (ni las de B ni las de Aldevaram)'
);
select is(
  (select count(*) from public.store_order_status_events where hardware_store_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0::bigint,
  'A no ve el historial de B'
);
select ok(
  (select count(*) from public.store_order_status_events) > 0,
  'A ve su historial'
);

-- Tablas internas
select throws_ok('select * from public.shopify_orders', '42501', null, 'A no puede leer shopify_orders');
select throws_ok('select * from public.shopify_webhook_events', '42501', null, 'A no puede leer shopify_webhook_events');
select throws_ok('select * from public.shopify_sync_state', '42501', null, 'A no puede leer shopify_sync_state');
select throws_ok('select * from public.store_order_pickup_codes', '42501', null, 'A no puede leer los códigos de recogida (RN-27)');

-- Escrituras
select is(
  tests.set_status(1001, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ready_to_ship'),
  0,
  'A no puede cambiar el estado de una orden de B (0 filas)'
);
select throws_ok(
  $$update public.store_orders set net_amount = 0 where hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'A no puede actualizar otras columnas'
);
select throws_ok(
  $$update public.store_orders set hardware_store_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where order_id = 1001$$,
  '42501', null,
  'A no puede reasignar una orden a otra ferretería'
);
select throws_ok(
  $$insert into public.store_order_status_events (order_id, hardware_store_id, to_status, source)
    values (1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'completed', 'panel')$$,
  '42501', null,
  'A no puede escribir el historial'
);
select throws_ok(
  $$delete from public.store_orders where hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'A no puede borrar órdenes'
);
select throws_ok(
  $$update public.profiles set must_change_password = false$$,
  '42501', null,
  'A no puede quitarse el cambio de contraseña obligatorio'
);
select throws_ok(
  $$insert into public.hardware_store_members (user_id, hardware_store_id)
    values ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'A no puede unirse a otra ferretería'
);

-- ---------------------------------------------------------------- Ferretería B
select tests.authenticate_as('22222222-2222-4222-8222-222222222222');

select results_eq(
  'select slug from public.hardware_stores',
  $$values ('ferreteria-b')$$,
  'B solo ve su ferretería'
);
select results_eq(
  'select order_id, net_amount from public.store_orders',
  $$values (1001::bigint, 999::numeric(12,2))$$,
  'B solo ve su parte de #1001'
);
select results_eq(
  'select gid from public.shopify_order_lines',
  $$values ('gid://shopify/LineItem/2')$$,
  'B solo ve su línea'
);
select is(
  (select count(*) from public.hardware_store_members),
  1::bigint,
  'B solo ve su membresía'
);

-- ---------------------------------------------------------------- Anónimo
select tests.as_system();
set local role anon;
select set_config('request.jwt.claims', '', true);

select throws_ok('select * from public.hardware_stores', '42501', null, 'anon no lee ferreterías');
select throws_ok('select * from public.store_orders', '42501', null, 'anon no lee órdenes');
select throws_ok('select * from public.shopify_order_lines', '42501', null, 'anon no lee líneas');
select throws_ok('select * from public.profiles', '42501', null, 'anon no lee perfiles');
select throws_ok(
  $$select * from public.store_sales_summary('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-01-01', '2027-01-01')$$,
  '42501', null,
  'anon no ejecuta funciones de finanzas'
);

select * from finish();
rollback;
