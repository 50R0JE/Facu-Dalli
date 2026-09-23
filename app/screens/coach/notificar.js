// "Notificación al cliente": el coach escribe un mensaje en la ficha del cliente y le
// llega al celular en el momento, como un WhatsApp (Web Push, ver app/core/push.js y
// supabase/functions/notificar-cliente). Arriba se ve si el cliente tiene las
// notificaciones activadas, así el coach sabe antes de escribir si le va a llegar.
// Abajo, los últimos mensajes enviados.
//
// El texto se guarda en CoachState.notifDraft mientras se escribe, sin re-dibujar (mismo
// criterio que los campos del editor de preguntas: re-dibujar sacaría el foco).

import { State } from '../../core/state.js';

import { esc, fmtDate } from '../../core/utils.js';

import { CoachState } from './state.js';

import { renderCoach } from './index.js';

const MAX = 500;
const FN_NAMES = ["rapid-worker", "notificar-cliente"];

// Estado de notificaciones + últimos mensajes de un cliente. Se llama al abrir la ficha.
export async function loadClientNotify(id){
  const out = { devices: null, msgs: [], setupMissing: false };
  try{
    const [dv, ms] = await Promise.all([
      State.sb.rpc("client_push_devices", { p_client: id }),
      State.sb.from("coach_messages").select("id, body, delivered, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(10)
    ]);
    if(dv.error || ms.error) out.setupMissing = true;
    else { out.devices = typeof dv.data === "number" ? dv.data : 0; out.msgs = ms.data || []; }
  }catch(e){ out.setupMissing = true; }
  return out;
}

function when(iso){
  const d = new Date(iso); if(isNaN(d)) return "";
  const hm = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const ymd = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return fmtDate(ymd) + " · " + hm;
}

function statusLine(n, name){
  if(n.setupMissing) return '<div class="nt-status warn"><span>Para usar esto falta configurar las notificaciones en Supabase (supabase/notificaciones.sql y la función notificar-cliente).</span></div>';
  if(n.devices == null) return '<div class="nt-status"><span>Revisando si ' + esc(name) + ' tiene las notificaciones activadas…</span></div>';
  if(n.devices > 0) return '<div class="nt-status ok"><span class="nt-dot" aria-hidden="true"></span><span>Le llega <b>ahora mismo</b> al celular' + (n.devices > 1 ? ' (' + n.devices + ' dispositivos)' : '') + '.</span></div>';
  return '<div class="nt-status warn"><span>' + esc(name) + ' todavía no activó las notificaciones. Pedile que entre a <b>Configuración → Notificaciones</b> y las prenda. Mientras tanto el mensaje queda guardado pero no le suena en el celular.</span></div>';
}

export function renderCoachNotify(d){
  const n = d.notify || { devices: null, msgs: [] };
  const first = String(d.name || "el cliente").split(" ")[0];
  const draft = CoachState.notifDraft || "";
  const sending = !!CoachState.notifSending;
  const msgs = (n.msgs || []).slice(0, 5).map(m =>
    '<div class="nt-msg"><div class="nt-msg-body">' + esc(m.body) + '</div>' +
    '<div class="nt-msg-meta">' + when(m.created_at) + ' · ' + (m.delivered > 0 ? '<span class="ok">Entregado ✓</span>' : '<span class="warn">No le llegó al celular</span>') + '</div></div>').join("");
  return '<div class="co-panel nt-panel"><div class="co-sec">Notificación al cliente</div>' +
    statusLine(n, first) +
    '<textarea class="co-note nt-text" rows="3" maxlength="' + MAX + '" data-coach="nt-text" placeholder="Escribile a ' + esc(first) + '… (ej: ¡Hoy toca pierna, a romperla!)"' + (n.setupMissing ? ' disabled' : '') + '>' + esc(draft) + '</textarea>' +
    '<div class="nt-row"><span class="nt-count" id="ntCount">' + draft.length + '/' + MAX + '</span>' +
    '<button class="nt-send" data-coach="nt-send"' + (sending || n.setupMissing ? ' disabled' : '') + '>' + (sending ? 'Enviando…' : 'Enviar ahora') + '</button></div>' +
    (msgs ? '<div class="nt-hist"><div class="nt-hist-t">Últimos mensajes</div>' + msgs + '</div>' : '') +
  '</div>';
}

async function send(){
  const d = CoachState.coachData; if(!d || !d.id || CoachState.notifSending) return;
  const body = (CoachState.notifDraft || "").trim();
  if(!body){ const t = document.querySelector(".nt-text"); if(t) t.focus(); return; }
  CoachState.notifSending = true; renderCoach();
  let res, errMsg = "";
  try{
    // La función se publicó desde el editor de Supabase con el nombre que genera solo
    // ("rapid-worker"); el nombre no se puede cambiar después. Va primero ese y, si no
    // existe, "notificar-cliente". Ojo: para una función que no existe, Supabase responde
    // 404 SIN encabezados CORS, así que el navegador lo ve como error de red
    // (FunctionsFetchError, sin status) — también se pasa al siguiente nombre en ese caso.
    for(const fn of FN_NAMES){
      res = await State.sb.functions.invoke(fn, { body: { client_id: d.id, body: body } });
      const er = res.error;
      const st = er && er.context && er.context.status;
      if(!er || !(st === 404 || er.name === "FunctionsFetchError")) break;
    }
    if(res.error){
      let detail = "";
      try{ const ctx = res.error.context; if(ctx && ctx.json){ const j = await ctx.json(); detail = j && j.error; } }catch(e){}
      const st = res.error.context && res.error.context.status;
      errMsg = detail || (st === 404 ? "No se encontró la función de notificaciones en Supabase." :
        res.error.name === "FunctionsFetchError" ? "La función de Supabase no respondió. Revisá que rapid-worker tenga el código de supabase/functions/notificar-cliente/index.ts (no el de ejemplo) y esté publicada." :
        (res.error.message || String(res.error)));
    }
  }catch(e){ errMsg = (e && e.message) || String(e); }
  CoachState.notifSending = false;
  if(errMsg){ renderCoach(); alert("No se pudo enviar: " + errMsg); return; }
  const r = res.data || {};
  CoachState.notifDraft = "";
  if(CoachState.coachData === d){
    d.notify = d.notify || { msgs: [] };
    d.notify.devices = typeof r.devices === "number" ? r.devices : d.notify.devices;
    d.notify.msgs = [{ id: "new-" + Date.now(), body: body, delivered: r.delivered || 0, created_at: new Date().toISOString() }].concat(d.notify.msgs || []);
  }
  renderCoach();
  if(!(r.delivered > 0)) alert("Mensaje guardado, pero no le llegó al celular: " + (d.name || "el cliente") + " no tiene las notificaciones activadas.");
}

document.body.addEventListener("click", e => {
  const b = e.target.closest('[data-coach="nt-send"]'); if(!b || b.disabled) return;
  send();
});

document.body.addEventListener("input", e => {
  const t = e.target.closest('[data-coach="nt-text"]'); if(!t) return;
  CoachState.notifDraft = t.value;
  const c = document.getElementById("ntCount"); if(c) c.textContent = t.value.length + "/" + MAX;
});
