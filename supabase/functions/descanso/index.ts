// Supabase Edge Function "descanso": manda el aviso de fin de descanso por Web Push a los
// que lo tienen vencido en public.rest_alarms (ver supabase/descanso.sql). La llama pg_cron
// cada 5 segundos, solo cuando hay alguno para mandar.
// Va sin "Verify JWT" (la llama la base, sin sesión). Llamarla de más no hace nada: solo
// manda los avisos que ya vencieron, y cada uno una sola vez (se borra al tomarlo).
// Usa los mismos secrets VAPID que notificar-cliente.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "Faltan las claves VAPID" }, 500);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@gize.ar", pub, priv);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Tomar y borrar de una los vencidos: si dos llamadas se pisan, cada aviso sale una vez.
  const { data: due, error } = await admin.from("rest_alarms").delete()
    .lte("send_at", new Date().toISOString()).select("user_id, endpoint");
  if (error) return json({ error: error.message }, 500);
  const users = [...new Set((due || []).map((r) => r.user_id))];
  if (!users.length) return json({ sent: 0 });

  const { data: all } = await admin.from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth").in("user_id", users).like("endpoint", "https://%");
  // Si el aviso tiene dispositivo, solo a ese; si no (versión vieja de la app), a todos los del usuario.
  const subs = (all || []).filter((s) => {
    const a = (due || []).find((r) => r.user_id === s.user_id);
    return !a || !a.endpoint || a.endpoint === s.endpoint;
  });
  const payload = JSON.stringify({ title: "¡Descanso terminado! 💪", body: "Volvé a la próxima serie.", tag: "rest-done", url: "./app/" });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all((subs || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 120, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.id);
      else console.error("push descanso", code, (e as Error).message);
    }
  }));
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  return json({ sent });
});
