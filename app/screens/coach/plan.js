// Plan del coach: 14 días de prueba y después una suscripción mensual por Mercado Pago
// que define cuántos clientes puede tener (supabase/suscripciones.sql y
// supabase/functions/suscripcion). Acá solo se muestra el estado y se manda a pagar:
// los límites los hace cumplir la base, no la app.
//
// Dentro de la app de Android (Capacitor) no hay botones de pago: Google Play no permite
// cobrar suscripciones digitales por fuera de su sistema. Ahí solo se ve el estado.

import { State } from '../../core/state.js';

import { esc, fmtDate } from '../../core/utils.js';

import { CoachState } from './state.js';

import { renderCoach } from './index.js';

// Precios: los que cobra de verdad la función (PLANES en suscripcion/index.ts).
export const PLANS = [
  { id: "p10", max: 10, price: 9300 },
  { id: "p25", max: 25, price: 15000, best: true },
  { id: "p50", max: 50, price: 20000 },
];
const TRIAL_MAX = 10;

const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const money = n => "$" + Number(n).toLocaleString("es-AR");

// billing: la fila de coach_billing. null + missing = todavía no se corrió el SQL (no se
// bloquea nada en ese caso, así la app sigue andando mientras se configura).
const B = { row: null, missing: false, loaded: false, busy: false, open: false, mpEmail: null, confirming: false };

export async function loadBilling(){
  if(!State.sb || !State.cloudUser) return;
  try{
    const r = await State.sb.from("coach_billing").select("*").eq("coach_id", State.cloudUser.id).maybeSingle();
    if(r.error){ B.missing = true; B.row = null; }
    else { B.missing = !r.data; B.row = r.data || null; }
  }catch(e){ B.missing = true; }
  B.loaded = true;
}

export function billing(){
  const r = B.row, now = Date.now();
  const count = CoachState.coachClients.length;
  if(!r) return { known: false, active: true, count, max: Infinity, atCap: false };
  const trialEnd = new Date(r.trial_ends_at).getTime();
  const paidUntil = r.paid_until ? new Date(r.paid_until).getTime() : 0;
  const comp = r.plan === "cortesia";
  const paid = paidUntil > now;
  const trial = !paid && !comp && trialEnd > now;
  const active = comp || paid || trial;
  const max = r.max_clients || TRIAL_MAX;
  return {
    known: true, active, trial, paid, comp, count, max,
    atCap: count >= max,
    daysLeft: trial ? Math.max(1, Math.ceil((trialEnd - now) / 864e5)) : 0,
    plan: PLANS.find(p => p.id === r.plan) || null,
    until: paid ? r.paid_until : (trial ? r.trial_ends_at : null),
    renews: r.mp_status === "authorized",
    pending: r.pending_plan,
  };
}

function ymd(iso){ const d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

// Tira debajo del código de invitación.
export function renderPlanBanner(){
  const b = billing(); if(!b.known) return "";
  let txt, cls = "";
  if(b.comp) txt = "Plan cortesía · " + b.count + "/" + b.max + " clientes";
  else if(b.trial){ txt = "Prueba gratis · te quedan <b>" + b.daysLeft + " día" + (b.daysLeft === 1 ? "" : "s") + "</b> · " + b.count + "/" + b.max + " clientes"; if(b.daysLeft <= 3) cls = " warn"; }
  else txt = "Plan " + b.max + " clientes · " + b.count + "/" + b.max + (b.renews ? "" : " · vence el " + fmtDate(ymd(b.until)));
  const cap = b.atCap ? '<div class="pl-cap">Llegaste al máximo de tu plan: nadie más se puede vincular con tu código. ' + (IS_NATIVE ? '' : 'Pasate a un plan más grande.') + '</div>' : "";
  return '<button class="pl-banner' + cls + (b.atCap ? " warn" : "") + '" data-plan="open"><span>' + txt + '</span><span class="pl-banner-go">' + (b.trial ? "Ver planes" : "Mi plan") + ' ›</span></button>' + cap;
}

function planCards(b){
  if(IS_NATIVE) return '<div class="pl-note">Los planes se gestionan desde tu cuenta en la web de GIZE.</div>';
  const mail = B.mpEmail != null ? B.mpEmail : ((State.cloudUser && State.cloudUser.email) || "");
  const cards = PLANS.map(p => {
    const current = b.paid && b.plan && b.plan.id === p.id && b.renews;
    const tooSmall = b.count > p.max;
    const dis = current || tooSmall || B.busy;
    return '<div class="pl-card' + (p.best ? " best" : "") + (current ? " current" : "") + '">' +
      (p.best ? '<div class="pl-tag">Más elegido</div>' : '') +
      '<div class="pl-max">Hasta <b>' + p.max + '</b> clientes</div>' +
      '<div class="pl-price">' + money(p.price) + '<span>/mes</span></div>' +
      '<button class="pl-choose" data-plan="choose" data-id="' + p.id + '"' + (dis ? " disabled" : "") + '>' +
        (current ? "Tu plan actual" : tooSmall ? "Tenés " + b.count + " clientes" : B.busy === p.id ? "Abriendo Mercado Pago…" : "Elegir") + '</button>' +
    '</div>';
  }).join("");
  return '<div class="cs-field pl-mail"><label>Mail de tu cuenta de Mercado Pago</label>' +
    '<input class="co-note" type="email" data-plan="mail" value="' + esc(mail) + '" placeholder="tu-mail@ejemplo.com" autocomplete="email">' +
    '<div class="pl-fine">Tiene que ser el mail con el que entrás a Mercado Pago. Se cobra una vez por mes con tarjeta o dinero en cuenta, y lo podés cancelar cuando quieras.</div></div>' +
    '<div class="pl-cards">' + cards + '</div>';
}

function statusLine(b){
  if(!b.known) return "";
  if(b.comp) return '<div class="pl-status ok">Tenés un plan de cortesía, sin vencimiento.</div>';
  if(b.paid) return '<div class="pl-status ok">Plan de ' + b.max + ' clientes · ' + (b.renews ? 'se renueva solo cada mes' : 'cancelado, sigue activo hasta el ' + fmtDate(ymd(b.until))) + '.</div>';
  if(b.trial) return '<div class="pl-status">Estás en la prueba gratis: te quedan ' + b.daysLeft + ' día' + (b.daysLeft === 1 ? '' : 's') + ' (hasta ' + TRIAL_MAX + ' clientes). Elegí un plan para seguir después.</div>';
  return '<div class="pl-status warn">Tu ' + (B.row && B.row.paid_until ? 'plan venció' : 'prueba gratis terminó') + '.</div>';
}

// Hoja "Mi plan" (desde la tira o desde Configuración).
export function renderPlanSheet(){
  let host = document.getElementById("planSheetHost");
  if(!host){ host = document.createElement("div"); host.id = "planSheetHost"; document.body.appendChild(host); }
  if(!B.open){ host.innerHTML = ""; return; }
  const b = billing();
  const cancel = (!IS_NATIVE && b.paid && b.renews) ? '<button class="pl-cancel" data-plan="cancel">Cancelar la renovación</button>' : "";
  host.innerHTML = '<div class="cp-bg" data-plan="close"></div><div class="cp-ccard pl-sheet">' +
    '<div class="cp-head"><div class="cp-title">Mi plan</div><button class="cp-x" data-plan="close">✕</button></div>' +
    statusLine(b) + planCards(b) + cancel +
  '</div>';
}

// Pantalla completa cuando no hay prueba ni plan vigente.
export function renderPaywall(){
  const b = billing();
  return '<div class="co-wrap pl-wall">' +
    '<div class="co-head"><div class="co-brand"><img class="brand-logo" src="brand/logo/gize-firma-horizontal.svg" alt="GIZE"><span class="co-brand-dash">-</span><span class="co-brand-tag">Panel de coach</span></div><div class="co-head-actions"><button class="co-logout" data-auth="logout">Salir</button></div></div>' +
    '<div class="pl-wall-hero"><div class="pl-wall-t">' + (B.row && B.row.paid_until ? 'Tu plan venció' : 'Terminó tu prueba gratis') + '</div>' +
    '<div class="pl-wall-s">Tus ' + b.count + ' cliente' + (b.count === 1 ? '' : 's') + ', rutinas y registros están guardados. ' +
    (IS_NATIVE ? 'Renová tu plan desde la web de GIZE para volver a verlos.' : 'Elegí un plan para volver a verlos y seguir sumando clientes.') + '</div>' +
    (B.confirming ? '<div class="pl-status">Confirmando tu pago con Mercado Pago…</div>' : '') + '</div>' +
    planCards(b) +
  '</div>';
}

async function choose(plan, btn){
  const input = document.querySelector('[data-plan="mail"]');
  const mail = ((input && input.value) || "").trim();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){ alert("Poné el mail de tu cuenta de Mercado Pago."); if(input) input.focus(); return; }
  B.mpEmail = mail; B.busy = plan; rerender();
  let err = "";
  try{
    const r = await State.sb.functions.invoke("suscripcion", { body: { action: "checkout", plan, mp_email: mail } });
    if(r.error){
      try{ const j = await r.error.context.json(); err = j && j.error; }catch(e){}
      err = err || (r.error.name === "FunctionsFetchError" ? "No se encontró la función de pagos (suscripcion) en Supabase." : r.error.message);
    } else if(r.data && r.data.url){ window.location.href = r.data.url; return; }
    else err = "Mercado Pago no devolvió el link de pago.";
  }catch(e){ err = (e && e.message) || String(e); }
  B.busy = false; rerender();
  alert("No se pudo abrir el pago: " + err);
}

async function cancelRenewal(){
  const b = billing();
  if(!confirm("¿Cancelar la renovación? Tu plan sigue activo hasta el " + fmtDate(ymd(b.until)) + " y después se corta.")) return;
  const r = await State.sb.functions.invoke("suscripcion", { body: { action: "cancel" } });
  if(r.error){ alert("No se pudo cancelar. Probá de nuevo o cancelala desde Mercado Pago → Suscripciones."); return; }
  await loadBilling(); rerender();
}

function rerender(){ renderPlanSheet(); renderCoach(); }

// Vuelta de Mercado Pago (?pago=mp): el aviso del pago llega a la función en segundos,
// así que se relee el plan unas veces hasta verlo activo.
export async function checkPaymentReturn(){
  const u = new URL(location.href);
  if(!u.searchParams.has("pago")) return;
  u.searchParams.delete("pago"); u.searchParams.delete("preapproval_id");
  history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
  B.confirming = true; renderCoach();
  for(let i = 0; i < 12; i++){
    await new Promise(r => setTimeout(r, 4000));
    await loadBilling();
    if(billing().paid) break;
  }
  B.confirming = false; renderCoach();
  if(billing().paid) alert("¡Listo! Tu plan de " + billing().max + " clientes está activo.");
}

export function openPlan(){ B.open = true; renderPlanSheet(); }

document.body.addEventListener("click", e => {
  const b = e.target.closest("[data-plan]"); if(!b || b.disabled) return;
  const a = b.dataset.plan;
  if(a === "open"){ openPlan(); return; }
  if(a === "close"){ B.open = false; renderPlanSheet(); return; }
  if(a === "choose"){ choose(b.dataset.id, b); return; }
  if(a === "cancel"){ cancelRenewal(); return; }
});

document.body.addEventListener("input", e => {
  const t = e.target.closest('[data-plan="mail"]'); if(t) B.mpEmail = t.value;
});
