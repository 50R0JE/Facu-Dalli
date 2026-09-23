-- Foto de perfil para clientes y coaches.
-- Correr UNA vez en Supabase → SQL Editor. Se puede volver a correr sin problema.
-- Mientras no se corra, la app sigue mostrando las iniciales.

-- 1) Dónde queda guardada la foto de cada perfil.
alter table public.profiles add column if not exists avatar_path text;

-- 2) Bucket PRIVADO para las fotos (se ven con links firmados, no públicos).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- 3) Cada usuario sube, cambia y borra solo lo de su carpeta ({su id}/...).
drop policy if exists "avatar: subir la propia" on storage.objects;
create policy "avatar: subir la propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar: cambiar la propia" on storage.objects;
create policy "avatar: cambiar la propia" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar: borrar la propia" on storage.objects;
create policy "avatar: borrar la propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Quién la puede ver: el propio usuario, su coach y los clientes de ese coach.
drop policy if exists "avatar: ver propia, coach y clientes" on storage.objects;
create policy "avatar: ver propia, coach y clientes" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      -- el coach ve las fotos de sus clientes
      or exists (select 1 from public.profiles p
                 where p.id::text = (storage.foldername(name))[1] and p.coach_id = auth.uid())
      -- el cliente ve la foto de su coach
      or (storage.foldername(name))[1] = (select p.coach_id::text from public.profiles p where p.id = auth.uid())
    )
  );

notify pgrst, 'reload schema';
