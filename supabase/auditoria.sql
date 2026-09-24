-- Auditoría de seguridad (solo lectura): RLS, políticas, permisos, funciones y buckets.
-- Se corre con el workflow "Supabase" → tarea sql → supabase/auditoria.sql.
-- No devuelve datos de usuarios, solo la configuración.
select json_build_object(
  'tablas_sin_rls', (
    select json_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity),
  'vistas_public', (
    select json_agg(json_build_object('vista', c.relname, 'opciones', c.reloptions)) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('v','m')),
  'politicas', (
    select json_agg(json_build_object('t', schemaname || '.' || tablename, 'n', policyname, 'cmd', cmd,
             'roles', roles, 'perm', permissive, 'using', qual, 'check', with_check) order by schemaname, tablename, policyname)
      from pg_policies where schemaname in ('public','storage')),
  'permisos_anon', (
    select json_agg(distinct table_name || ':' || privilege_type) from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon'),
  'columnas', (
    select json_object_agg(table_name, cols) from (
      select table_name, json_agg(column_name || ' ' || data_type || case when is_nullable = 'NO' then ' nn' else '' end order by ordinal_position) cols
        from information_schema.columns where table_schema = 'public' group by table_name) x),
  'funciones', (
    select json_agg(json_build_object('f', p.oid::regprocedure::text, 'definer', p.prosecdef,
             'config', p.proconfig,
             'anon', has_function_privilege('anon', p.oid, 'execute'),
             'auth', has_function_privilege('authenticated', p.oid, 'execute')) order by p.proname)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'),
  'definer_sin_search_path', (
    select json_agg(p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  'triggers', (
    select json_agg(tgrelid::regclass || ' ' || tgname || ' → ' || tgfoid::regproc order by 1)
      from pg_trigger where not tgisinternal and tgrelid::regclass::text not like 'storage.%'
       and tgrelid::regclass::text not like 'auth.%' or (not tgisinternal and tgrelid = 'auth.users'::regclass)),
  'buckets', (
    select json_agg(json_build_object('id', id, 'public', public, 'limite', file_size_limit, 'tipos', allowed_mime_types))
      from storage.buckets),
  'cron', (select json_agg(json_build_object('job', jobname, 'cada', schedule, 'activo', active)) from cron.job),
  'extensiones', (select json_agg(extname || ' ' || extversion) from pg_extension),
  'usuarios_sin_confirmar', (select count(*) from auth.users where email_confirmed_at is null),
  'roles_perfiles', (select json_object_agg(coalesce(role,'null'), n) from (select role, count(*) n from public.profiles group by role) r),
  'coach_billing_planes', (select json_object_agg(plan, n) from (select plan, count(*) n from public.coach_billing group by plan) r)
) as auditoria;
