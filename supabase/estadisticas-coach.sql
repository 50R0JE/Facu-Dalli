-- Cantidad de entrenos y último entreno de cada cliente, para la lista del panel del coach.
-- Correr UNA vez en Supabase → SQL Editor. Se puede volver a correr sin problema.
-- Mientras no se corra, la app sigue andando: cuenta en el celular (más lento).
--
-- Antes la app traía TODAS las sesiones de todos los clientes solo para contarlas, y
-- Supabase devuelve como máximo 1000 filas por pedido: pasadas las 1000, los conteos
-- daban de menos y algunos clientes aparecían "Sin entrenos aún".

-- SECURITY INVOKER (lo normal): corre con los permisos del coach que la llama, así que
-- las políticas RLS de sessions y profiles siguen decidiendo qué puede ver. El join con
-- profiles además limita a los clientes propios.
-- last_session como texto AAAA-MM-DD: es el formato que ya usa la app.
create or replace function public.coach_client_stats()
returns table (client_id uuid, n_sessions bigint, last_session text)
language sql
stable
security invoker
set search_path = public
as $$
  select s.client_id, count(*), max(s.performed_on)::text
    from public.sessions s
    join public.profiles p on p.id = s.client_id
   where p.coach_id = auth.uid()
   group by s.client_id;
$$;

revoke execute on function public.coach_client_stats() from public, anon;
grant  execute on function public.coach_client_stats() to authenticated;

-- Índice para leer las sesiones de un cliente en orden (lo usan esta función, el arranque
-- del cliente y la ficha del cliente en el panel del coach).
create index if not exists sessions_client_created_idx on public.sessions (client_id, created_at, id);

notify pgrst, 'reload schema';
