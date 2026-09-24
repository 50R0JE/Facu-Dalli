// Supabase Edge Function "suscripcion": cobra el plan mensual de los coaches con
// Mercado Pago (suscripciones / preapproval) y mantiene al día public.coach_billing
// (ver supabase/suscripciones.sql).
//
// Cómo publicarla (una sola vez):
//   1. Supabase → Edge Functions → Deploy a new function → Via Editor.
//      Nombre: EXACTAMENTE "suscripcion". Pegar este archivo entero y Deploy.
//      En Settings de la función, APAGAR "Verify JWT": Mercado Pago avisa los pagos sin
//      sesión de Supabase. Los pedidos de la app se validan igual con auth.getUser().
//   2. Supabase → Edge Functions → Secrets → agregar:
//        MP_ACCESS_TOKEN  Access Token de PRODUCCIÓN de Mercado Pago
//                         (mercadopago.com.ar/developers → Tus integraciones → la app →
//                         Credenciales de producción). Es secreto: solo va acá.
//        APP_URL          (opcional) la dirección de la app. Si no está, https://gize.ar/app/
//   3. Mercado Pago → Tus integraciones → la app → Webhooks → Modo productivo:
//        URL: https://wegptuzhsrwppbknqstf.supabase.co/functions/v1/suscripcion?webhook=1
//        Eventos: "Planes y suscripciones" (suscripciones y pagos recurrentes).
//
// Qué recibe:
//   · Desde la app (con la sesión del coach):
//       { action: "checkout", plan: "p10"|"p25"|"p50"|"p100", mp_email? } → { url } para pagar
//       { action: "cancel" } → cancela la renovación (sigue activo hasta paid_until)
//   · Desde Mercado Pago (?webhook=1): el aviso de un cambio. No se confía en lo que dice
//     el aviso: se vuelve a pedir la suscripción a la API de Mercado Pago con el token,
//     así que un aviso falso no puede dar acceso.

import { createClient } from "npm:@supabase/supabase-js@2";

const PLANES: Record<string, { max: number; price: number; name: string }> = {
  p10: { max: 10, price: 9300, name: "GIZE Coach · hasta 10 clientes" },
  p25: { max: 25, price: 15000, name: "GIZE Coach · hasta 25 clientes" },
  p50: { max: 50, price: 20000, name: "GIZE Coach · hasta 50 clientes" },
  p100: { max: 100, price: 33000, name: "GIZE Gimnasio · hasta 100 alumnos" },
};
// Días de margen después de cada cobro, por si Mercado Pago reintenta un pago rechazado.
const MARGEN_DIAS = 3;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MP = "https://api.mercadopago.com";
async function mp(path: string, init: RequestInit = {}) {
  const r = await fetch(MP + path, {
    ...init,
    headers: { Authorization: "Bearer " + Deno.env.get("MP_ACCESS_TOKEN"), "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Mercado Pago " + r.status + ": " + (body.message || JSON.stringify(body)));
  return body;
}

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function addMonth(d: Date) { const x = new Date(d); x.setMonth(x.getMonth() + 1); return x; }

// Trae la suscripción de Mercado Pago y actualiza coach_billing.
async function syncPreapproval(id: string) {
  const pa = await mp("/preapproval/" + encodeURIComponent(id));
  const [coachId, plan] = String(pa.external_reference || "").split("|");
  if (!coachId || !PLANES[plan]) { console.error("preapproval sin referencia GIZE", id); return; }
  const db = admin();
  const { data: cur } = await db.from("coach_billing").select("*").eq("coach_id", coachId).maybeSingle();
  if (!cur) { console.error("coach sin coach_billing", coachId); return; }

  if (pa.status === "authorized") {
    // Pagado hasta: un mes después del último cobro (o la fecha del próximo), más el margen.
    const last = pa.summarized && pa.summarized.last_charged_date;
    const base = last ? addMonth(new Date(last)) : (pa.next_payment_date ? new Date(pa.next_payment_date) : null);
    let paidUntil = cur.paid_until ? new Date(cur.paid_until) : null;
    if (base) {
      const cand = new Date(base.getTime() + MARGEN_DIAS * 864e5);
      if (!paidUntil || cand > paidUntil) paidUntil = cand;
    }
    // Si cambió de plan, se da de baja la suscripción anterior (no cobrar dos veces).
    if (cur.mp_preapproval_id && cur.mp_preapproval_id !== id) {
      try { await mp("/preapproval/" + encodeURIComponent(cur.mp_preapproval_id), { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }); }
      catch (e) { console.error("no se pudo cancelar la anterior", (e as Error).message); }
    }
    await db.from("coach_billing").update({
      plan, max_clients: PLANES[plan].max, mp_preapproval_id: id, mp_status: "authorized",
      pending_plan: null, paid_until: paidUntil ? paidUntil.toISOString() : cur.paid_until, updated_at: new Date().toISOString(),
    }).eq("coach_id", coachId);
  } else if (id === cur.mp_preapproval_id) {
    // paused / cancelled de la suscripción vigente: queda activo hasta paid_until.
    await db.from("coach_billing").update({ mp_status: pa.status, updated_at: new Date().toISOString() }).eq("coach_id", coachId);
  }
}

async function webhook(req: Request, url: URL) {
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* algunos avisos vienen solo por query */ }
  const type = String(body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "");
  const id = String((body.data && body.data.id) || url.searchParams.get("data.id") || url.searchParams.get("id") || "");
  if (!id) return json({ ok: true });
  try {
    if (type.includes("authorized_payment")) {
      // Aviso de un cobro mensual: se busca a qué suscripción pertenece.
      const ap = await mp("/authorized_payments/" + encodeURIComponent(id));
      if (ap.preapproval_id) await syncPreapproval(String(ap.preapproval_id));
    } else if (type.includes("preapproval")) {
      await syncPreapproval(id);
    }
  } catch (e) {
    console.error("webhook", type, id, (e as Error).message);
    return json({ error: "reintentar" }, 500); // Mercado Pago reintenta
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!Deno.env.get("MP_ACCESS_TOKEN")) return json({ error: "Falta MP_ACCESS_TOKEN en los Secrets de la función" }, 500);

  const url = new URL(req.url);
  if (url.searchParams.get("webhook")) return webhook(req, url);

  // Pedido de la app: el coach logueado.
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: u } = await asUser.auth.getUser();
  if (!u || !u.user) return json({ error: "Sesión vencida. Volvé a iniciar sesión." }, 401);
  const coachId = u.user.id;

  let input: { action?: string; plan?: string; mp_email?: string };
  try { input = await req.json(); } catch { return json({ error: "Pedido inválido" }, 400); }

  const db = admin();
  const { data: prof } = await db.from("profiles").select("role").eq("id", coachId).maybeSingle();
  if (!prof || prof.role !== "coach") return json({ error: "Solo las cuentas de coach tienen plan" }, 403);
  const { data: bill } = await db.from("coach_billing").select("*").eq("coach_id", coachId).maybeSingle();
  if (!bill) return json({ error: "Falta configurar las suscripciones (supabase/suscripciones.sql)" }, 500);

  if (input.action === "cancel") {
    if (!bill.mp_preapproval_id) return json({ error: "No tenés una suscripción activa" }, 400);
    await mp("/preapproval/" + encodeURIComponent(bill.mp_preapproval_id), { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    await db.from("coach_billing").update({ mp_status: "cancelled", updated_at: new Date().toISOString() }).eq("coach_id", coachId);
    return json({ ok: true, paid_until: bill.paid_until });
  }

  if (input.action === "checkout") {
    const plan = String(input.plan || "");
    const p = PLANES[plan];
    if (!p) return json({ error: "Plan inválido" }, 400);
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("coach_id", coachId);
    if ((count || 0) > p.max) return json({ error: "Tenés " + count + " clientes: elegí un plan de más de " + p.max + "." }, 400);
    if (bill.plan === plan && bill.mp_status === "authorized") return json({ error: "Ya tenés ese plan" }, 400);

    const email = String(input.mp_email || u.user.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Poné el mail de tu cuenta de Mercado Pago" }, 400);
    const appUrl = Deno.env.get("APP_URL") || "https://gize.ar/app/";

    let pa;
    try {
      pa = await mp("/preapproval", {
        method: "POST",
        body: JSON.stringify({
          reason: p.name,
          external_reference: coachId + "|" + plan,
          payer_email: email,
          back_url: appUrl + "?pago=mp",
          status: "pending",
          auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: p.price, currency_id: "ARS" },
        }),
      });
    } catch (e) {
      const msg = (e as Error).message;
      console.error("checkout", msg);
      // Casos comunes: el mail no es de una cuenta de Mercado Pago, o es la misma cuenta que cobra.
      const same = /same user|mismo usuario|collector/i.test(msg);
      return json({ error: same
        ? "Ese mail es el de la cuenta que cobra. Poné el mail de la cuenta de Mercado Pago que va a pagar."
        : "Mercado Pago rechazó el pedido. Revisá que el mail sea el de la cuenta de Mercado Pago que va a pagar. (Detalle: " + msg.slice(0, 200) + ")" }, 502);
    }
    await db.from("coach_billing").update({ pending_plan: plan, updated_at: new Date().toISOString() }).eq("coach_id", coachId);
    return json({ url: pa.init_point });
  }

  return json({ error: "Acción desconocida" }, 400);
});
