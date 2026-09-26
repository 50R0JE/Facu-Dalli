-- Duración del entreno: segundos desde la primera serie tildada hasta "Guardar entreno de
-- hoy". La usa el resumen al terminar y el historial (la app la manda si la tiene; las
-- versiones viejas no la mandan y queda vacía).
-- Correr con el workflow "Supabase" → tarea sql → supabase/duracion-entreno.sql.
alter table public.sessions add column if not exists duration_s integer;
alter table public.sessions drop constraint if exists sessions_duration_s_check;
alter table public.sessions add constraint sessions_duration_s_check check (duration_s is null or duration_s between 0 and 43200);
select 'duration_s' as columna, count(*) filter (where duration_s is not null) as con_dato from public.sessions;
