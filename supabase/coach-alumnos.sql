-- El coach maneja sus alumnos: desvincular a uno y cambiar su código de invitación.
-- Correr con el workflow "Supabase" → tarea sql → supabase/coach-alumnos.sql.
-- Se puede correr varias veces.
--
--   coach_remove_client(client uuid): el coach desvincula a un alumno suyo. El alumno no
--     pierde nada: conserva su rutina, entrenos y registros, y queda sin coach (puede
--     manejar su rutina él mismo o vincularse a otro coach con un código).
--   rotate_invite_code(): le da al coach un código nuevo y el viejo deja de servir. Los
--     alumnos ya vinculados siguen vinculados.
--
-- Las dos son SECURITY DEFINER porque profiles_guard_sensitive (base.sql) no deja cambiar
-- invite_code ni el coach_id de otro perfil con un UPDATE desde la app.

create or replace function public.coach_remove_client(client uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or client is null then return false; end if;
  update profiles set coach_id = null where id = client and coach_id = auth.uid();
  return found;
end $$;

create or replace function public.rotate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- mismo formato que my_invite_code
  b bytea;
  i int;
begin
  if auth.uid() is null then return null; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'coach') then return null; end if;
  loop
    b := substring(uuid_send(gen_random_uuid()) from 1 for 6) || substring(uuid_send(gen_random_uuid()) from 11 for 6);
    c := '';
    for i in 0..7 loop
      c := c || substr(alphabet, 1 + (get_byte(b, i) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from profiles where invite_code = c);
  end loop;
  update profiles set invite_code = c where id = auth.uid();
  return c;
end $$;

revoke execute on function public.coach_remove_client(uuid) from public, anon;
revoke execute on function public.rotate_invite_code()      from public, anon;
grant  execute on function public.coach_remove_client(uuid) to authenticated;
grant  execute on function public.rotate_invite_code()      to authenticated;

notify pgrst, 'reload schema';
