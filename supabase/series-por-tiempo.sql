-- Series por tiempo (plancha, isométricos, colgado de barra…): además de kg y reps, cada
-- serie guarda los segundos que duró. Null en las series de siempre.
-- Correr ANTES de publicar la versión de la app que lee esta columna (la pide en el select).
alter table public.session_entries
  add column if not exists secs int;

alter table public.session_entries
  drop constraint if exists session_entries_secs_ok;
alter table public.session_entries
  add constraint session_entries_secs_ok check (secs is null or secs between 0 and 36000);

notify pgrst, 'reload schema';
