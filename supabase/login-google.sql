-- Registro con Google eligiendo "Soy coach".
-- Con email y contraseña el rol viaja en raw_user_meta_data y handle_new_user() (base.sql)
-- crea el perfil de coach. Con Google no hay forma de mandar ese dato: la cuenta nace como
-- 'client' y la app, apenas entra, llama a esta función para pasarla a coach.
-- Solo sirve para una cuenta recién creada (15 minutos), que sigue siendo cliente y no está
-- vinculada a ningún coach: no deja que una cuenta vieja se cambie el rol por su cuenta.
create or replace function public.become_coach_new_account()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and created_at > now() - interval '15 minutes') then
    return false; end if;
  update profiles set role = 'coach'
   where id = auth.uid() and role = 'client' and coach_id is null;
  if not found then return false; end if;
  -- La prueba gratis la crea el trigger de INSERT (suscripciones.sql), que acá no corre.
  insert into coach_billing (coach_id) values (auth.uid()) on conflict (coach_id) do nothing;
  return true;
end $$;

revoke execute on function public.become_coach_new_account() from public, anon;
grant  execute on function public.become_coach_new_account() to authenticated;
