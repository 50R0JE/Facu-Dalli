// "Lo que comiste": ventana de abajo que se abre desde el recuadro "Promedio 7 días" de
// Comida. Muestra lo que el cliente anotó cualquier día anterior: una tira con los últimos
// 7 días (con sus calorías) y flechas para ir más atrás. Es solo para ver: lo de hoy se
// sigue cargando y editando en la pantalla de Comida.
// Los días anteriores están en la nube (food_entries); en el celular solo queda el total de
// calorías de cada día (state.kcalLog). Lo que se trae queda en memoria mientras la app
// está abierta.
import { State, state } from '../core/state.js';
import { esc, fmtDate, today, ymd } from '../core/utils.js';

export const HistState = { date: null, open: false };
const cache = new Map(); // fecha → { status: "loading" | "done" | "error", items, msg }

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
const yesterday = () => addDays(today(), -1);

function dayLabel(s) {
  if (s === yesterday()) return "Ayer";
  if (s === addDays(today(), -2)) return "Anteayer";
  const d = new Date(s + "T12:00:00");
  return DIAS[d.getDay()] + " " + fmtDate(s);
}

export function openFoodHist(rerender) {
  HistState.open = true;
  HistState.date = HistState.date && HistState.date < today() ? HistState.date : yesterday();
  loadDay(HistState.date, rerender);
}

export function goFoodHist(date, rerender) {
  if (!date || date >= today()) return;
  HistState.date = date;
  loadDay(date, rerender);
}

export function stepFoodHist(n, rerender) {
  const d = addDays(HistState.date || yesterday(), n);
  if (d >= today()) return;
  goFoodHist(d, rerender);
}

async function loadDay(date, rerender) {
  const c = cache.get(date);
  if (c && c.status === "done") { rerender(); return; }
  cache.set(date, { status: "loading", items: [] });
  rerender();
  if (!State.sb || !State.cloudUser) {
    cache.set(date, { status: "error", items: [], msg: "Iniciá sesión para ver los días anteriores." });
    rerender(); return;
  }
  try {
    const r = await State.sb.from("food_entries").select("name, grams, kcal, protein, carbs, fat, unit")
      .eq("client_id", State.cloudUser.id).eq("log_date", date).order("pos");
    if (r.error) throw r.error;
    const items = (r.data || []).map(x => ({
      name: x.name, grams: Number(x.grams) || 0, unit: x.unit || "g", kcal: Math.round(Number(x.kcal) || 0),
      p: Number(x.protein) || 0, c: Number(x.carbs) || 0, f: Number(x.fat) || 0,
    }));
    cache.set(date, { status: "done", items });
    // Si el total guardado en el celular no estaba (otro dispositivo), se completa.
    const tot = items.reduce((a, e) => a + e.kcal, 0);
    if (tot > 0 && !(state.kcalLog && state.kcalLog[date])) state.kcalLog = Object.assign({}, state.kcalLog || {}, { [date]: tot });
  } catch (e) {
    cache.set(date, { status: "error", items: [], msg: "No se pudo cargar ese día. Revisá tu conexión y volvé a intentar." });
  }
  if (HistState.open && HistState.date === date) rerender();
}

const r1 = n => (Math.round(n * 10) / 10).toLocaleString("es-AR");

export function renderFoodHist() {
  if (!HistState.open) return "";
  const sel = HistState.date || yesterday();
  const log = state.kcalLog || {};
  // Tira de 7 días que termina en ayer, o en el día elegido si es más viejo.
  const end = sel > addDays(yesterday(), -7) ? yesterday() : addDays(sel, 3);
  const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(end, -i));
  const max = Math.max(1, ...days.map(d => log[d] || 0));
  const strip = days.map(d => {
    const k = log[d] || 0, h = k ? Math.max(8, Math.round(k / max * 100)) : 0;
    const dd = new Date(d + "T12:00:00");
    return `<button class="fh-day${d === sel ? " on" : ""}" data-action="food-hist-day" data-date="${d}" aria-pressed="${d === sel}">
      <span class="fh-bar"><i style="height:${h}%"></i></span>
      <span class="fh-dn">${DIAS[dd.getDay()]}</span><span class="fh-dk">${k ? k.toLocaleString("es-AR") : "—"}</span></button>`;
  }).join("");

  const c = cache.get(sel) || { status: "loading", items: [] };
  let body;
  if (c.status === "loading") body = '<div class="cal-hint">Cargando…</div>';
  else if (c.status === "error") body = `<div class="cal-hint">${esc(c.msg)}</div>`;
  else if (!c.items.length) body = '<div class="cal-hint">No anotaste comidas ese día.</div>';
  else {
    const t = c.items.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });
    body = `<div class="fh-tot"><b>${t.kcal.toLocaleString("es-AR")} kcal</b><span>P ${r1(t.p)} g · C ${r1(t.c)} g · G ${r1(t.f)} g</span></div>` +
      c.items.map(e => `<div class="diary-item fh-item"><div class="diary-name">${esc(e.name)}<span>${e.grams} ${e.unit === "ml" ? "ml" : "g"} · P ${r1(e.p)} · C ${r1(e.c)} · G ${r1(e.f)}</span></div><div class="diary-kcal">${e.kcal} kcal</div></div>`).join("");
  }
  const canNext = addDays(sel, 1) < today();
  return `
    <div class="sheet-bg" data-action="food-hist-close"></div>
    <div class="sheet fh-sheet" role="dialog" aria-label="Lo que comiste">
      <div class="fh-head">
        <button class="fh-arrow" data-action="food-hist-prev" aria-label="Día anterior">‹</button>
        <div class="fh-title"><span class="sheet-title">${dayLabel(sel)}</span><span class="fh-sub">Lo que comiste</span></div>
        <button class="fh-arrow" data-action="food-hist-next" aria-label="Día siguiente"${canNext ? "" : " disabled"}>›</button>
      </div>
      <div class="fh-strip">${strip}</div>
      <div class="fh-list">${body}</div>
      <button class="ctrl fh-close" data-action="food-hist-close">Cerrar</button>
    </div>`;
}
