// Aviso de fin de descanso con la pantalla apagada o la app en segundo plano.
//
//   · Apps de las tiendas (Capacitor): el celular programa una notificación con sonido
//     para la hora de fin (plugin LocalNotifications), sin internet. En Android además se
//     muestra una notificación fija con una barra que se va llenando y el tiempo que queda
//     (plugin propio RestTimer, android/…/RestTimerService.java), que se va sola al terminar.
//   · Web / app instalada desde el navegador: el navegador no puede sonar con la pantalla
//     apagada, así que se le pide al servidor que mande una notificación push a la hora de
//     fin (supabase/descanso.sql + función "descanso"). Solo si ya activó las
//     notificaciones en Configuración.
//
// Todo es "mejor esfuerzo": si algo falla, el descanso sigue funcionando igual en la app.

import { State } from '../core/state.js';

import { pushOnHere } from '../core/push.js';

const NOTIF_ID = 4101;
const CHANNEL = "descanso_fin";
let channelDone = false;

function cap(){ try { return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor : null; } catch (e) { return null; } }
function platform(){ try { return window.Capacitor.getPlatform(); } catch (e) { return "web"; } }
function hhmm(ms){ const d = new Date(ms); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

async function nativeSchedule(C, endAt){
  const LN = C.Plugins.LocalNotifications; if (!LN) return;
  let p = await LN.checkPermissions();
  if (p.display === "prompt" || p.display === "prompt-with-rationale") p = await LN.requestPermissions();
  if (p.display !== "granted") return;
  if (platform() === "android" && !channelDone) {
    try { await LN.createChannel({ id: CHANNEL, name: "Fin del descanso", description: "Suena cuando termina el descanso entre series.", importance: 5, visibility: 1, vibration: true }); } catch (e) {}
    channelDone = true;
  }
  await LN.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(() => {});
  await LN.schedule({ notifications: [{
    id: NOTIF_ID,
    title: "¡Descanso terminado! 💪",
    body: "Volvé a la próxima serie.",
    schedule: { at: new Date(endAt), allowWhileIdle: true },
    channelId: CHANNEL,
    smallIcon: "ic_stat_gize",
    iconColor: "#2FA0FF",
  }] });
  const RT = C.Plugins.RestTimer;
  if (RT) RT.show({ endAt, total: Math.max(1, Math.round((endAt - Date.now()) / 1000)), title: "Descanso · termina " + hhmm(endAt) }).catch(() => {});
}

async function nativeCancel(C){
  const LN = C.Plugins.LocalNotifications;
  if (LN) await LN.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(() => {});
  const RT = C.Plugins.RestTimer; if (RT) RT.hide().catch(() => {});
}

// Llamar al empezar un descanso (endAt = hora de fin en ms).
export function scheduleRestAlert(endAt){
  const C = cap();
  if (C) { nativeSchedule(C, endAt).catch(e => console.error("rest notif", e)); return; }
  if (!State.sb || !State.cloudUser || !pushOnHere()) return;
  // Solo a este dispositivo: el usuario puede tener varios registrados (otro celular, la
  // compu, o el registro del dominio viejo) y el aviso le llegaba repetido.
  webEndpoint().then(ep => {
    if (!ep) return;
    const secs = Math.max(1, Math.round((endAt - Date.now()) / 1000));
    return State.sb.rpc("schedule_rest_alarm", { p_seconds: secs, p_endpoint: ep });
  }).catch(() => {});
}

async function webEndpoint(){
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? sub.endpoint : null;
}

// Llamar al saltear el descanso, o al terminar con la app a la vista (no hace falta avisar).
export function cancelRestAlert(){
  const C = cap();
  if (C) { nativeCancel(C).catch(() => {}); return; }
  if (!State.sb || !State.cloudUser || !pushOnHere()) return;
  Promise.resolve(State.sb.rpc("cancel_rest_alarm")).catch(() => {});
}
