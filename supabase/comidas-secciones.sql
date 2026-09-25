-- Comida del día de cada alimento anotado (desayuno, almuerzo, merienda, cena), para
-- mostrarlos por sección como en Fitia. Lo anotado antes queda sin comida (null) y la app
-- lo muestra en "Otras comidas".
-- Correr con el workflow "Supabase" → tarea sql → supabase/comidas-secciones.sql, ANTES de
-- publicar la app que manda "meal" (si no, el envío de comidas falla). Se puede volver a correr.

alter table public.food_entries add column if not exists meal text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'food_entries_meal_check') then
    alter table public.food_entries add constraint food_entries_meal_check
      check (meal is null or meal in ('desayuno', 'almuerzo', 'merienda', 'cena'));
  end if;
end $$;

notify pgrst, 'reload schema';
