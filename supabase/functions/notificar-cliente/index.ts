// Supabase Edge Function "notificar-cliente": el coach le manda un mensaje a un cliente
// y le llega como notificación al celular, como un mensaje de WhatsApp: Web Push para la
// app instalada desde el navegador y Firebase (FCM) para la app de Android.
//
// Cómo publicarla (una sola vez):
//   1. Supabase → Edge Functions → Deploy a new function → Via Editor.
//      Nombre: notificar-cliente (la app también prueba "rapid-worker", el nombre que
//      pone Supabase si no se cambia). Pegar este archivo entero y Deploy.
//      En Settings de la función, "Verify JWT with legacy secret" puede ir apagado:
//      la función ya chequea la sesión del coach con auth.getUser().
//   2. Supabase → Edge Functions → Secrets → agregar:
//        VAPID_PUBLIC_KEY   (la misma que está en app/core/push.js)
//        VAPID_PRIVATE_KEY  (la privada, nunca va en el código de la app)
//        VAPID_SUBJECT      mailto:tu-mail@ejemplo.com
//        FCM_SERVICE_ACCOUNT  el JSON entero de la cuenta de servicio de Firebase
//                             (Configuración del proyecto → Cuentas de servicio →
//                             Generar nueva clave privada). Es para la app de Android.
//   SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya vienen puestas.
//
// Recibe { client_id, body } con el token del coach logueado (supabase.functions.invoke).
// Devuelve { delivered, devices, saved }: a cuántos dispositivos llegó de cuántos tenía, y
// si quedó guardado en el historial (coach_messages).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { importPKCS8, SignJWT } from "npm:jose@5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// La app de Android guarda su token de Firebase como endpoint "fcm:<token>".
// Para mandarle se usa la API HTTP v1 de FCM con un token OAuth de la cuenta de servicio.
type ServiceAccount = { project_id: string; client_email: string; private_key: string };
function serviceAccount(): ServiceAccount | null {
  try {
    const sa = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") || "");
    return sa && sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch { return null; }
}
async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("OAuth FCM: " + JSON.stringify(j));
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  const hasVapid = !!(pub && priv);
  if (hasVapid) webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@gize.app", pub!, priv!);

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
  // Con el plan vencido no se mandan mensajes (ver supabase/suscripciones.sql). Si la
  // función coach_active todavía no existe (falta ese SQL), no se bloquea.
  const { data: active, error: actErr } = await admin.rpc("coach_active", { cid: coachId });
  if (!actErr && active === false) return json({ error: "Tu plan de GIZE está vencido. Renovalo para seguir mandando mensajes." }, 402);

  const { data: coach } = await admin.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
  const title = (coach && coach.full_name) ? coach.full_name + " · tu coach" : "Tu coach";

  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", clientId);
  const payload = JSON.stringify({ title, body, tag: "coach-" + Date.now(), url: "./app/" });

  const all = subs || [];
  const web = all.filter((s) => !s.endpoint.startsWith("fcm:"));
  const fcm = all.filter((s) => s.endpoint.startsWith("fcm:"));
  if (web.length && !hasVapid && !fcm.length) return json({ error: "Faltan las claves VAPID en los Secrets de la función" }, 500);

  let delivered = 0;
  const gone: string[] = [];
  await Promise.all((hasVapid ? web : []).map(async (s) => {
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

  const sa = fcm.length ? serviceAccount() : null;
  if (fcm.length && !sa) console.error("fcm: falta el secret FCM_SERVICE_ACCOUNT");
  if (sa) {
    let access = "";
    try { access = await fcmAccessToken(sa); } catch (e) { console.error((e as Error).message); }
    if (access) await Promise.all(fcm.map(async (s) => {
      const r = await fetch("https://fcm.googleapis.com/v1/projects/" + sa.project_id + "/messages:send", {
        method: "POST",
        headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
        body: JSON.stringify({ message: {
          token: s.endpoint.slice(4),
          notification: { title, body },
          android: { priority: "HIGH", ttl: "86400s", notification: { sound: "default", color: "#2FA0FF" } },
        } }),
      });
      if (r.ok) { delivered++; return; }
      const t = await r.text();
      // 404/UNREGISTERED: desinstaló la app o el token ya no vale.
      if (r.status === 404 || t.includes("UNREGISTERED")) gone.push(s.id);
      else console.error("fcm", r.status, t);
    }));
  }
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);

  // El push ya salió: si guardar el historial falla no se devuelve error (el coach
  // reintentaría y al cliente le llegaría dos veces), pero se avisa con saved:false para
  // que la app no diga "guardado" ni lo muestre en el historial como si estuviera.
  const { error: saveErr } = await admin.from("coach_messages").insert({ coach_id: coachId, client_id: clientId, body, delivered });
  if (saveErr) console.error("coach_messages", saveErr.code, saveErr.message);

  return json({ delivered, devices: (subs || []).length - gone.length, saved: !saveErr });
});
