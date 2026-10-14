-- 5.6 (5–6): máquina de estados (RN-19 a RN-22).
begin;
create extension if not exists pgtap with schema extensions;
\ir fixtures.psql

select plan(26);

-- Al insertar una orden se registra null → preparing desde Shopify.
select results_eq(
  $$select from_status::text, to_status::text, source, changed_by
    from public.store_order_status_events
    where order_id = 1001 and hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  $$values (null::text, 'preparing'::text, 'shopify'::text, null::uuid)$$,
  'La orden nueva queda en Preparando con evento de Shopify'
);

select tests.authenticate_as('11111111-1111-4111-8111-111111111111');

-- #1001 es pickup
select throws_ok(
  $$select tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_to_ship')$$,
  'P0001', 'invalid_status_transition',
  'Pickup no puede pasar a Listo para enviar'
);
select throws_ok(
  $$select tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'completed')$$,
  'P0001', 'invalid_status_transition',
  'Preparando no puede saltar a Entregado'
);
select throws_ok(
  $$select tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cancelled')$$,
  'P0001', 'invalid_status_transition',
  'La ferretería no puede cancelar'
);
select is(
  tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_for_pickup'),
  1,
  'Preparando → Listo para recoger (pickup)'
);
select results_eq(
  $$select status_changed_by, status_changed_at is not null from public.store_orders
    where order_id = 1001 and hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid, true)$$,
  'Guarda quién y cuándo cambió el estado'
);
select is(
  tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'preparing'),
  1,
  'Listo para recoger → Preparando (corrección)'
);
select is(
  tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_for_pickup'),
  1,
  'De nuevo a Listo para recoger'
);
select throws_ok(
  $$select tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'completed')$$,
  'P0001', 'pickup_not_verified',
  'Sin verificar al cliente no se puede marcar Entregado (RN-27)'
);

-- El servidor emite un código (sistema); regresar a Preparando lo invalida.
select tests.as_system();
insert into public.store_order_pickup_codes (order_id, hardware_store_id, code_hash, sent_at, send_count)
values (1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'hash', now(), 1);
select tests.authenticate_as('11111111-1111-4111-8111-111111111111');
select is(
  tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'preparing'),
  1,
  'Regresar a Preparando con un código emitido'
);
select tests.as_system();
select is_empty(
  $$select 1 from public.store_order_pickup_codes where order_id = 1001$$,
  'Regresar a Preparando invalida el código'
);
select tests.authenticate_as('11111111-1111-4111-8111-111111111111');
select is(
  tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_for_pickup'),
  1,
  'Otra vez Listo para recoger'
);

-- El servidor verifica el código y registra quién entregó.
select tests.as_system();
insert into public.store_order_pickup_codes
  (order_id, hardware_store_id, code_hash, sent_at, send_count, verified_at, verified_by, verification_method)
values (1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'hash', now(), 1, now(),
        '11111111-1111-4111-8111-111111111111', 'code');
select throws_ok(
  $$insert into public.store_order_pickup_codes (order_id, hardware_store_id, verified_at, verification_method, override_reason)
    values (1002, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), 'id_document', 'corto')$$,
  '23514', null,
  'Entregar con identificación exige un motivo'
);
select tests.authenticate_as('11111111-1111-4111-8111-111111111111');
select is(
  tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'completed'),
  1,
  'Listo para recoger → Entregado con el cliente verificado'
);
select throws_ok(
  $$select tests.set_status(1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'preparing')$$,
  'P0001', 'invalid_status_transition',
  'Completado es final para la ferretería (RN-21)'
);
select results_eq(
  $$select from_status::text, to_status::text, source, changed_by
    from public.store_order_status_events
    where order_id = 1001 and hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    order by id$$,
  $$values
    (null::text, 'preparing'::text, 'shopify'::text, null::uuid),
    ('preparing', 'ready_for_pickup', 'panel', '11111111-1111-4111-8111-111111111111'),
    ('ready_for_pickup', 'preparing', 'panel', '11111111-1111-4111-8111-111111111111'),
    ('preparing', 'ready_for_pickup', 'panel', '11111111-1111-4111-8111-111111111111'),
    ('ready_for_pickup', 'preparing', 'panel', '11111111-1111-4111-8111-111111111111'),
    ('preparing', 'ready_for_pickup', 'panel', '11111111-1111-4111-8111-111111111111'),
    ('ready_for_pickup', 'completed', 'panel', '11111111-1111-4111-8111-111111111111')$$,
  'Cada cambio deja un evento con su autor (RN-22)'
);

-- #1002 es envío
select throws_ok(
  $$select tests.set_status(1002, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_for_pickup')$$,
  'P0001', 'invalid_status_transition',
  'Envío no puede pasar a Listo para recoger'
);
select is(
  tests.set_status(1002, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_to_ship'),
  1,
  'Preparando → Listo para enviar (envío)'
);
select throws_ok(
  $$select tests.set_status(1002, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'completed')$$,
  'P0001', 'invalid_status_transition',
  'La ferretería no marca Enviado; lo hace LaFerrey en Shopify'
);
select is(
  tests.set_status(1002, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ready_to_ship'),
  1,
  'Repetir el mismo estado no falla'
);
select throws_ok(
  $$select tests.set_status(1004, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'preparing')$$,
  'P0001', 'invalid_status_transition',
  'Cancelado es final para la ferretería (RN-21)'
);

-- ---------------------------------------------------------------- Sistema (RN-20)
select tests.as_system();

select is(
  tests.set_status(1002, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'completed'),
  1,
  'El sistema marca Completado cuando LaFerrey prepara las líneas'
);
select is(
  tests.set_status(1003, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cancelled'),
  1,
  'El sistema puede cancelar desde cualquier estado'
);
select results_eq(
  $$select source, changed_by from public.store_order_status_events
    where order_id = 1003 and to_status = 'cancelled'$$,
  $$values ('shopify'::text, null::uuid)$$,
  'Los cambios del sistema se registran como Shopify'
);
select results_eq(
  $$select status_changed_by from public.store_orders where order_id = 1003$$,
  $$values (null::uuid)$$,
  'Sin usuario, status_changed_by queda vacío'
);

-- La matriz de src/lib/orders/status.ts debe coincidir con la de este trigger;
-- src/lib/orders/status.test.ts compara ambas con la lista de RN-19.
select has_function('private', 'guard_store_order_status', 'Existe el guard de transiciones');

select * from finish();
rollback;
