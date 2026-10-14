-- La matriz de transiciones del trigger private.guard_store_order_status() debe
-- coincidir con la de src/lib/orders/status.ts. Este archivo prueba el trigger contra
-- la matriz de abajo, y src/lib/orders/status.test.ts prueba que la matriz de abajo
-- es la que produce status.ts. Si cambias una regla, regenera el bloque.
begin;
create extension if not exists pgtap with schema extensions;
\ir fixtures.psql

select plan(1);

-- Pone #1001 de A en p_from con el método p_method (como sistema) e intenta pasar a
-- p_to como el usuario A. Devuelve si el trigger lo permitió.
create function tests.panel_can_transition(
  p_from public.preparation_status,
  p_to public.preparation_status,
  p_method public.delivery_method
)
returns boolean
language plpgsql
as $$
begin
  perform tests.as_system();
  update public.store_orders set delivery_method = p_method, status = p_from
  where order_id = 1001 and hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  perform tests.authenticate_as('11111111-1111-4111-8111-111111111111');
  begin
    update public.store_orders set status = p_to
    where order_id = 1001 and hardware_store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    perform tests.as_system();
    return true;
  exception when sqlstate 'P0001' then
    perform tests.as_system();
    return false;
  end;
end;
$$;

-- La matriz es la topología de RN-19; la verificación de RN-27 se prueba en 02.
insert into public.store_order_pickup_codes
  (order_id, hardware_store_id, code_hash, verified_at, verified_by, verification_method)
values (1001, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'hash', now(), '11111111-1111-4111-8111-111111111111', 'code');

create temp table expected_transitions (
  from_status text,
  to_status text,
  method text,
  allowed boolean
);

insert into expected_transitions (from_status, to_status, method, allowed) values
-- BEGIN MATRIX (generado desde src/lib/orders/status.ts)
  ('preparing', 'ready_for_pickup', 'pickup', true),
  ('preparing', 'ready_to_ship', 'pickup', false),
  ('preparing', 'completed', 'pickup', false),
  ('preparing', 'cancelled', 'pickup', false),
  ('ready_for_pickup', 'preparing', 'pickup', true),
  ('ready_for_pickup', 'ready_to_ship', 'pickup', false),
  ('ready_for_pickup', 'completed', 'pickup', true),
  ('ready_for_pickup', 'cancelled', 'pickup', false),
  ('ready_to_ship', 'preparing', 'pickup', true),
  ('ready_to_ship', 'ready_for_pickup', 'pickup', false),
  ('ready_to_ship', 'completed', 'pickup', false),
  ('ready_to_ship', 'cancelled', 'pickup', false),
  ('completed', 'preparing', 'pickup', false),
  ('completed', 'ready_for_pickup', 'pickup', false),
  ('completed', 'ready_to_ship', 'pickup', false),
  ('completed', 'cancelled', 'pickup', false),
  ('cancelled', 'preparing', 'pickup', false),
  ('cancelled', 'ready_for_pickup', 'pickup', false),
  ('cancelled', 'ready_to_ship', 'pickup', false),
  ('cancelled', 'completed', 'pickup', false),
  ('preparing', 'ready_for_pickup', 'shipping', false),
  ('preparing', 'ready_to_ship', 'shipping', true),
  ('preparing', 'completed', 'shipping', false),
  ('preparing', 'cancelled', 'shipping', false),
  ('ready_for_pickup', 'preparing', 'shipping', true),
  ('ready_for_pickup', 'ready_to_ship', 'shipping', false),
  ('ready_for_pickup', 'completed', 'shipping', false),
  ('ready_for_pickup', 'cancelled', 'shipping', false),
  ('ready_to_ship', 'preparing', 'shipping', true),
  ('ready_to_ship', 'ready_for_pickup', 'shipping', false),
  ('ready_to_ship', 'completed', 'shipping', false),
  ('ready_to_ship', 'cancelled', 'shipping', false),
  ('completed', 'preparing', 'shipping', false),
  ('completed', 'ready_for_pickup', 'shipping', false),
  ('completed', 'ready_to_ship', 'shipping', false),
  ('completed', 'cancelled', 'shipping', false),
  ('cancelled', 'preparing', 'shipping', false),
  ('cancelled', 'ready_for_pickup', 'shipping', false),
  ('cancelled', 'ready_to_ship', 'shipping', false),
  ('cancelled', 'completed', 'shipping', false),
  ('preparing', 'ready_for_pickup', 'local_delivery', false),
  ('preparing', 'ready_to_ship', 'local_delivery', true),
  ('preparing', 'completed', 'local_delivery', false),
  ('preparing', 'cancelled', 'local_delivery', false),
  ('ready_for_pickup', 'preparing', 'local_delivery', true),
  ('ready_for_pickup', 'ready_to_ship', 'local_delivery', false),
  ('ready_for_pickup', 'completed', 'local_delivery', false),
  ('ready_for_pickup', 'cancelled', 'local_delivery', false),
  ('ready_to_ship', 'preparing', 'local_delivery', true),
  ('ready_to_ship', 'ready_for_pickup', 'local_delivery', false),
  ('ready_to_ship', 'completed', 'local_delivery', false),
  ('ready_to_ship', 'cancelled', 'local_delivery', false),
  ('completed', 'preparing', 'local_delivery', false),
  ('completed', 'ready_for_pickup', 'local_delivery', false),
  ('completed', 'ready_to_ship', 'local_delivery', false),
  ('completed', 'cancelled', 'local_delivery', false),
  ('cancelled', 'preparing', 'local_delivery', false),
  ('cancelled', 'ready_for_pickup', 'local_delivery', false),
  ('cancelled', 'ready_to_ship', 'local_delivery', false),
  ('cancelled', 'completed', 'local_delivery', false)

-- END MATRIX
;

select results_eq(
  $$select from_status, to_status, method,
           tests.panel_can_transition(from_status::public.preparation_status,
                                      to_status::public.preparation_status,
                                      method::public.delivery_method)
    from expected_transitions
    order by method, from_status, to_status$$,
  $$select from_status, to_status, method, allowed
    from expected_transitions
    order by method, from_status, to_status$$,
  'El trigger aplica exactamente la matriz de RN-19 de status.ts'
);

select * from finish();
rollback;
