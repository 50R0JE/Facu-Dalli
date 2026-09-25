// Festejo de récord personal (PR): al tildar una serie con más kg que la mejor marca de ese
// ejercicio en entrenos anteriores. Destello en la fila, chispas desde el ✓ y un chip
// "PR +2,5 kg" que se va solo (~2 s). No tapa la pantalla: todo pasa dentro de la fila.
// Una vez por ejercicio en el día; la serie queda con un trofeo chiquito mientras dure la
// sesión (no se guarda en la rutina).
import { state } from '../core/state.js';
import { today } from '../core/utils.js';
import { bestKgBefore } from '../screens/progreso.js';
import { trophySvg } from '../core/icons.js';

// Series que fueron récord en esta sesión (para el trofeo junto al número de serie).
export const prSets = new Set();
// Ejercicios ya festejados hoy: "fecha|nombre".
const celebrated = new Set();

const fmtKg = n => (Math.round(n * 10) / 10).toLocaleString("es-AR", { maximumFractionDigits: 1 });

// ¿Esta serie recién tildada es récord? Devuelve cuántos kg más que la mejor marca, o null.
// Hace falta una marca anterior (si nunca lo hizo, no hay nada que superar) y reps > 0.
export function checkSetPR(ex, s) {
  if (!ex || !s || !s.done) return null;
  const kg = +s.kg || 0, reps = parseInt(s.reps) || 0;
  if (kg <= 0 || reps <= 0) return null;
  const key = today() + "|" + ex.name;
  if (celebrated.has(key)) return null;
  // Los entrenos de hoy ya guardados no cuentan como "antes" (si guardó y sigue cargando).
  const t = today();
  const prev = bestKgBefore(ex.name, (state.sessions || []).filter(se => se.date !== t));
  if (prev === null || kg <= prev) return null;
  celebrated.add(key);
  prSets.add(s.id);
  return kg - prev;
}

// Anima la fila de la serie (ya dibujada). Sin movimiento si el celular pide reducirlo.
export function playPR(setId, diff) {
  const btn = document.querySelector('[data-action="toggle"][data-set="' + CSS.escape(setId) + '"]');
  const row = btn && btn.closest(".set");
  if (!row) return;
  try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) {}
  const chip = document.createElement("span");
  chip.className = "pr-chip";
  chip.setAttribute("role", "status");
  chip.innerHTML = trophySvg + 'PR <span class="pr-chip-kg">+' + fmtKg(diff) + ' kg</span>';
  row.appendChild(chip);
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const extras = [chip];
  if (!reduced) {
    const edge = document.createElement("span");
    edge.className = "pr-edge";
    row.appendChild(edge);
    extras.push(edge);
    const colors = ["#2FA0FF", "#A65CFF", "#FF3DAE", "#25E8C8", "#FFC940", "#FFC940"];
    for (let i = 0; i < 8; i++) {
      const sp = document.createElement("span");
      sp.className = "pr-spark";
      const ang = (Math.PI * 2 * i) / 8 + 0.3, dist = 22 + (i % 3) * 6;
      sp.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      sp.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      sp.style.background = colors[i % colors.length];
      btn.appendChild(sp);
      extras.push(sp);
    }
  }
  row.classList.add("pr-play");
  setTimeout(() => { extras.forEach(x => x.remove()); row.classList.remove("pr-play"); }, 2000);
}

// Duración del festejo antes de que el ejercicio terminado se colapse.
export const PR_HOLD_MS = 1300;
