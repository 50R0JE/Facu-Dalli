// Entreno del historial que se abre al tocarlo: fecha/día arriba y, adentro, cada
// ejercicio con sus series (kg × reps), los totales de la sesión y el feedback que el
// cliente mandó al guardar. Lo usan el cliente (Progreso → Historial de entrenos) y el
// coach (ficha del cliente → Historial de entrenos), así los dos ven exactamente lo mismo.
//
// Va con <details>/<summary> nativos a propósito: abrir/cerrar no pasa por renderApp()
// ni necesita estado propio, funciona con teclado y el lector de pantalla lo anuncia
// como expandible. El botón de borrar queda FUERA del <summary>: adentro, tocarlo
// también abriría/cerraría el entreno.

import { esc, fmtDate } from '../core/utils.js';

const fmtKg = n => { const v = Number(n) || 0; return (Math.round(v * 100) / 100).toString().replace(".", ","); };

function exerciseBlock(ex){
  const sets = ex.sets || [];
  const vol = sets.reduce((t, s) => t + (Number(s.kg) || 0) * (Number(s.reps) || 0), 0);
  const best = sets.reduce((b, s) => (Number(s.kg) || 0) > (Number(b && b.kg) || 0) ? s : b, null);
  const rows = sets.map((s, i) =>
    '<div class="sd-set"><span class="sd-n">' + (i + 1) + '</span>' +
    '<span class="sd-kg">' + fmtKg(s.kg) + '<small>kg</small></span>' +
    '<span class="sd-x">×</span>' +
    '<span class="sd-reps">' + (Number(s.reps) || 0) + '<small>reps</small></span></div>'
  ).join("");
  const meta = [sets.length + (sets.length === 1 ? " serie" : " series")];
  if (best && Number(best.kg) > 0) meta.push("mejor " + fmtKg(best.kg) + " kg");
  if (vol > 0) meta.push("vol. " + fmtKg(Math.round(vol)) + " kg");
  return '<div class="sd-ex"><div class="sd-ex-h"><span class="sd-ex-name">' + esc(ex.name || "") + '</span>' +
    '<span class="sd-ex-meta">' + meta.join(" · ") + '</span></div>' + rows + '</div>';
}

function feedbackChips(se){
  const chips = [];
  if (se.rpe) chips.push('<span class="sd-chip">Fatiga <b>' + se.rpe + '/5</b></span>');
  if (se.pump) chips.push('<span class="sd-chip">Pump <b>' + se.pump + '/5</b></span>');
  if (typeof se.joint === "boolean") chips.push('<span class="sd-chip' + (se.joint ? ' warn' : '') + '">Dolor articular <b>' + (se.joint ? "Sí" : "No") + '</b></span>');
  return chips.length ? '<div class="sd-fb">' + chips.join("") + '</div>' : "";
}

// opts.removeBtn: HTML del botón de borrar (solo el cliente borra sus entrenos).
// opts.open: arranca desplegado (el coach lo muestra así al elegirlo en el selector).
export function renderSessionItem(se, opts){
  opts = opts || {};
  const exs = se.exercises || [];
  const nSets = exs.reduce((t, e) => t + (e.sets || []).length, 0);
  const vol = exs.reduce((t, e) => t + (e.sets || []).reduce((u, s) => u + (Number(s.kg) || 0) * (Number(s.reps) || 0), 0), 0);
  const names = exs.map(e => e.name).join(", ");
  const totals = '<div class="sd-tot">' +
    '<div><b>' + exs.length + '</b><span>ejercicio' + (exs.length === 1 ? "" : "s") + '</span></div>' +
    '<div><b>' + nSets + '</b><span>serie' + (nSets === 1 ? "" : "s") + '</span></div>' +
    '<div><b>' + fmtKg(Math.round(vol)) + '</b><span>kg de volumen</span></div></div>';
  const rm = opts.removeBtn || "";
  return '<div class="sess-item sess-det-wrap">' +
    '<details class="sess-det"' + (opts.open ? ' open' : '') + '><summary class="sess-sum"><div class="sess-main">' +
      '<div class="sess-date">' + fmtDate(se.date) + ' · ' + esc(se.day || "") + ' <span class="sess-n">(' + nSets + (nSets === 1 ? ' serie' : ' series') + ')</span></div>' +
      '<div class="sess-exs">' + esc(names) + '</div></div>' +
      '<span class="sess-chev" aria-hidden="true"></span></summary>' +
    '<div class="sess-body">' + totals + feedbackChips(se) + exs.map(exerciseBlock).join("") + '</div></details>' +
    rm + '</div>';
}
