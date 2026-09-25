-- Avisos de pagos a los socios (supabase/functions/suscripcion): qué avisos ya se mandaron,
-- para no repetir el mail cuando Mercado Pago reintenta el mismo aviso.
-- Solo la usa la función con la service role: sin políticas, nadie más la puede leer ni escribir.
-- Se puede correr varias veces.
create table if not exists public.mp_avisos (
  clave      text primary key,   -- "ap:<cobro>:<estado>" o "pa:<suscripción>:<estado>"
  created_at timestamptz not null default now()
);
alter table public.mp_avisos enable row level security;
revoke all on public.mp_avisos from anon, authenticated;
notify pgrst, 'reload schema';
