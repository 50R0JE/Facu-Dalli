-- El aviso de fin de descanso va solo al dispositivo donde se empezó (antes iba a todos los
-- del usuario y llegaba repetido: otro celular, la compu o el registro del dominio viejo).
-- Se puede correr varias veces.
alter table public.rest_alarms add column if not exists endpoint text;

create or replace function public.schedule_rest_alarm(p_seconds int, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 1800 then
    raise exception 'Descanso inválido' using errcode = '22023';
  end if;
  -- Solo un dispositivo propio (si no está registrado, a todos los del usuario).
  if p_endpoint is not null and not exists (
    select 1 from push_subscriptions where user_id = auth.uid() and endpoint = p_endpoint) then
    p_endpoint := null;
  end if;
  insert into rest_alarms (user_id, send_at, endpoint)
  values (auth.uid(), now() + make_interval(secs => p_seconds), p_endpoint)
  on conflict (user_id) do update set send_at = excluded.send_at, endpoint = excluded.endpoint;
end $$;

revoke execute on function public.schedule_rest_alarm(int, text) from public, anon;
grant execute on function public.schedule_rest_alarm(int, text) to authenticated;

notify pgrst, 'reload schema';
