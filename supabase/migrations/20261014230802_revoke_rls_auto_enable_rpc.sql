-- Los proyectos hospedados con "RLS automático" traen public.rls_auto_enable(), una
-- función SECURITY DEFINER de trigger de eventos. Al estar en public, la Data API la
-- expone como RPC para anon y authenticated (advisors 0028 y 0029). Solo debe correr
-- como trigger de eventos, así que se le quita EXECUTE. Si la función no existe (por
-- ejemplo, en local), no hace nada.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
