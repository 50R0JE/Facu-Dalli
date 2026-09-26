// Cartel de "hay una versión nueva" en las apps de las tiendas. La web se actualiza sola
// (service worker); la app de Android/iPhone no: los archivos viajan dentro de la app y
// quien no actualiza desde la tienda se queda con la versión vieja.
// La app lee https://gize.ar/app/version.json (en vivo, no el que viaja dentro de la app)
// y compara con su número de compilación (versionCode en Android):
//   · menor que "ultima"  → cartel abajo con "Actualizar" y "Después" (vuelve a los 3 días).
//   · menor que "minima"  → pantalla que no se puede cerrar (para un arreglo obligatorio).
// "ultima" se sube a mano recién cuando la versión ya está publicada en la tienda: si no,
// el cartel mandaría a actualizar a algo que todavía no está.
import { esc } from '../core/utils.js';

const URL_VERSION = "https://gize.ar/app/version.json";
const SKIP_KEY = "gize_upd_skip";
const VOLVER_MS = 3 * 24 * 3600 * 1000;
const CADA_MS = 6 * 3600 * 1000;
let ultimaVez = 0;

function nativo(){
  try { return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor : null; } catch (e) { return null; }
}

export async function checkUpdate(force){
  const cap = nativo();
  if (!cap || !cap.Plugins || !cap.Plugins.App) return;
  if (!force && Date.now() - ultimaVez < CADA_MS) return;
  ultimaVez = Date.now();
  try {
    const info = await cap.Plugins.App.getInfo();
    const build = parseInt(info && info.build, 10);
    if (!build) return;
    const r = await fetch(URL_VERSION + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const cfg = (await r.json())[cap.getPlatform()];
    if (!cfg || !cfg.tienda || !/^https:\/\//i.test(cfg.tienda)) return;
    const ultima = +cfg.ultima || 0, minima = +cfg.minima || 0;
    if (build < minima) return show(cfg.tienda, true);
    if (build >= ultima) return hide();
    let skip = null; try { skip = JSON.parse(localStorage.getItem(SKIP_KEY) || "null"); } catch (e) {}
    if (skip && skip.v === ultima && Date.now() - skip.t < VOLVER_MS) return;
    show(cfg.tienda, false, ultima);
  } catch (e) { /* sin señal o sin tienda: no se muestra nada */ }
}

function hide(){ const el = document.getElementById("updBox"); if (el) el.remove(); }

function show(tienda, obligatoria, ultima){
  hide();
  const el = document.createElement("div");
  el.id = "updBox";
  el.className = obligatoria ? "upd upd-forzada" : "upd";
  el.setAttribute("role", "dialog");
  el.innerHTML = `<div class="upd-card">
    <div class="upd-txt"><b>${obligatoria ? "Tenés que actualizar GIZE" : "Hay una versión nueva de GIZE"}</b>
      <span>${obligatoria ? "Esta versión ya no funciona bien. Actualizala para seguir usando la app." : "Trae arreglos y cosas nuevas. Tarda un minuto."}</span></div>
    <div class="upd-btns">
      ${obligatoria ? "" : '<button type="button" class="upd-later">Después</button>'}
      <a class="upd-go" href="${esc(tienda)}" target="_blank" rel="noopener">Actualizar</a>
    </div></div>`;
  const later = el.querySelector(".upd-later");
  if (later) later.addEventListener("click", () => {
    try { localStorage.setItem(SKIP_KEY, JSON.stringify({ v: ultima, t: Date.now() })); } catch (e) {}
    hide();
  });
  document.body.appendChild(el);
}

// Al abrir la app y cada vez que vuelve a primer plano (como mucho cada 6 horas).
export function initUpdateCheck(){
  const cap = nativo();
  if (!cap) return;
  setTimeout(() => checkUpdate(true), 3000);
  try { cap.Plugins.App.addListener("appStateChange", s => { if (s && s.isActive) checkUpdate(false); }); } catch (e) {}
}
