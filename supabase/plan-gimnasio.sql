-- Plan Gimnasio: hasta 100 alumnos por $33.000 por mes (ver suscripciones.sql).
-- Agrega 'p100' a los planes permitidos de coach_billing. Se puede correr varias veces.
alter table public.coach_billing drop constraint if exists coach_billing_plan_check;
alter table public.coach_billing add constraint coach_billing_plan_check
  check (plan in ('trial','p10','p25','p50','p100','cortesia'));
notify pgrst, 'reload schema';
