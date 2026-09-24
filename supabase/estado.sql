-- Estado de la base (solo lectura): tamaño, archivos, usuarios y actividad.
-- Se corre con el workflow "Supabase" → tarea sql → supabase/estado.sql.
select json_build_object(
  'base_de_datos', pg_size_pretty(pg_database_size(current_database())),
  'base_bytes', pg_database_size(current_database()),
  'tablas_mas_grandes', (
    select json_agg(t) from (
      select c.relname as tabla, pg_size_pretty(pg_total_relation_size(c.oid)) as tamano
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'
       order by pg_total_relation_size(c.oid) desc limit 8) t),
  'archivos', (
    select json_agg(a) from (
      select bucket_id as bucket, count(*) as cantidad,
             pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as tamano,
             coalesce(sum((metadata->>'size')::bigint), 0) as bytes
        from storage.objects group by bucket_id order by 4 desc) a),
  'usuarios', (select count(*) from auth.users),
  'usuarios_ultimos_30_dias', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
  'por_rol', (select json_object_agg(coalesce(role, 'sin rol'), n) from (select role, count(*) n from public.profiles group by role) r),
  'planes_coach', (select json_object_agg(plan, n) from (select plan, count(*) n from public.coach_billing group by plan) p),
  'entrenos', (select count(*) from public.sessions),
  'dispositivos_notificaciones', (select json_object_agg(tipo, n) from (
      select split_part(endpoint, ':', 1) tipo, count(*) n from public.push_subscriptions group by 1) d)
) as estado;
