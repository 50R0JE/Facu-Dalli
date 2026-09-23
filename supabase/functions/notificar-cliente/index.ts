// Supabase Edge Function "notificar-cliente": el coach le manda un mensaje a un cliente
// y le llega como notificación al celular (Web Push), como un mensaje de WhatsApp.
//
// Cómo publicarla (una sola vez):
//   1. Supabase → Edge Functions → Deploy a new function → Via Editor.
//      Nombre: notificar-cliente. Pegar este archivo entero y Deploy.
//   2. Supabase → Edge Functions → Secrets → agregar:
//        VAPID_PUBLIC_KEY   (la misma que está en app/core/push.js)
//        VAPID_PRIVATE_KEY  (la privada, nunca va en el código de la app)
//        VAPID_SUBJECT      mailto:tu-mail@ejemplo.com
//   SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya vienen puestas.
//
// Recibe { client_id, body } con el token del coach logueado (supabase.functions.invoke).
// Devuelve { delivered, devices }: a cuántos dispositivos llegó de cuántos tenía.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "Faltan las claves VAPID en los Secrets de la función" }, 500);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@gize.app", pub, priv);

  // Quién llama: el coach logueado (su token viene en Authorization).
  const asCoach = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: u } = await asCoach.auth.getUser();
  if (!u || !u.user) return json({ error: "Sesión vencida. Volvé a iniciar sesión." }, 401);
  const coachId = u.user.id;

  let input: { client_id?: string; body?: string };
  try { input = await req.json(); } catch { return json({ error: "Pedido inválido" }, 400); }
  const clientId = String(input.client_id || "");
  const body = String(input.body || "").trim().slice(0, 500);
  if (!clientId || !body) return json({ error: "Falta el mensaje" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Solo a clientes propios.
  const { data: client } = await admin.from("profiles").select("id, coach_id").eq("id", clientId).maybeSingle();
  if (!client || client.coach_id !== coachId) return json({ error: "Ese cliente no es tuyo" }, 403);

  const { data: coach } = await admin.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
  const title = (coach && coach.full_name) ? coach.full_name + " · tu coach" : "Tu coach";

  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", clientId);
  const payload = JSON.stringify({ title, body, tag: "coach-" + Date.now(), url: "./" });

  let delivered = 0;
  const gone: string[] = [];
  await Promise.all((subs || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
      delivered++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410: el celular ya no tiene esa suscripción (desinstaló, borró datos…).
      if (code === 404 || code === 410) gone.push(s.id);
      else console.error("push", code, (e as Error).message);
    }
  }));
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);

  await admin.from("coach_messages").insert({ coach_id: coachId, client_id: clientId, body, delivered });

  return json({ delivered, devices: (subs || []).length - gone.length });
});
