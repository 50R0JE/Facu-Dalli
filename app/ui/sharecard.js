// Tarjeta para compartir el entreno terminado (formato historia, 1080 × 1920): se dibuja
// en un canvas con la marca (auroras, anillo RGB, firma de GIZE) y se comparte como imagen.
//   · App de las tiendas: se guarda en la caché del celular (Filesystem) y se abre el menú
//     de compartir del sistema (Share).
//   · Web: navigator.share con el archivo (celulares); si no se puede, se descarga.
// Antes de compartir se muestra la vista previa, así el toque en «Compartir» es del usuario
// (navigator.share lo exige) y se ve qué se va a mandar.
import { esc } from '../core/utils.js';

const W = 1080, H = 1920;
const R1 = "#2FA0FF", R2 = "#A65CFF", R3 = "#FF3DAE", R4 = "#25E8C8";
const FONT = "Outfit, system-ui, -apple-system, sans-serif";
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const kgTxt = k => (Math.round((+k || 0) * 100) / 100).toString().replace(".", ",");
function durTxt(s){ s = Math.round(+s || 0); const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? [h + " h " + String(m).padStart(2, "0"), "min"] : [String(Math.max(1, m)), "min"]; }
function bestOf(sets){
  let b = null; (sets || []).forEach(s => { if (!b || (+s.kg || 0) > (+b.kg || 0) || ((+s.kg || 0) === (+b.kg || 0) && (+s.reps || 0) > (+b.reps || 0))) b = s; });
  if (!b) return "";
  if (+b.secs > 0 && !(+b.kg > 0)) return b.secs + " s";
  return (+b.kg > 0 ? kgTxt(b.kg) + " kg × " : "") + (+b.reps || 0) + (+b.kg > 0 ? "" : " reps");
}
function fit(ctx, txt, max){ let t = String(txt); if (ctx.measureText(t).width <= max) return t; while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; }
function loadImg(src){ return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

function conic(ctx, cx, cy, from){
  try { const g = ctx.createConicGradient(from, cx, cy); [R1, R2, R3, R4, R1].forEach((c, i) => g.addColorStop(i / 4, c)); return g; }
  catch (e) { const g = ctx.createLinearGradient(cx - 300, cy - 300, cx + 300, cy + 300); g.addColorStop(0, R1); g.addColorStop(.5, R3); g.addColorStop(1, R4); return g; }
}
function lin(ctx, x0, y0, x1, y1){ const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, R1); g.addColorStop(.35, R2); g.addColorStop(.7, R3); g.addColorStop(1, R4); return g; }
function rrect(ctx, x, y, w, h, r){ ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function caps(ctx, txt, x, y, size, color, spacing, align){
  ctx.font = "700 " + size + "px " + FONT; ctx.fillStyle = color; ctx.textAlign = align || "left";
  try { ctx.letterSpacing = (spacing || 6) + "px"; } catch (e) {}
  ctx.fillText(txt, x, y); try { ctx.letterSpacing = "0px"; } catch (e) {}
}
// Trazo de neón: halo ancho difuminado, el tubo de color y un núcleo claro finito.
function neon(ctx, path, paint, w, glowColor, glow){
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = paint; ctx.shadowColor = glowColor || R2; ctx.shadowBlur = glow || 40; ctx.lineWidth = w; path(); ctx.stroke();
  ctx.shadowBlur = (glow || 40) * .4; ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(1.5, w * .3); path(); ctx.stroke();
  ctx.restore();
}

// data: { day, date (AAAA-MM-DD), dur (s), sets, exs, exercises:[{name,sets}], prs:[{name,kg,reps,prev}] }
export async function drawShareCard(data){
  try { await Promise.all(["800 300px", "700 100px", "600 40px", "500 40px"].map(f => document.fonts.load(f + " Outfit"))); } catch (e) {}
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const M = 100; // margen de los contenidos

  // Fondo negro puro; la luz la ponen solo los neones de la marca.
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

  // Marco de neón alrededor de toda la pieza
  neon(ctx, () => rrect(ctx, 38, 38, W - 76, H - 76, 64), conic(ctx, W / 2, H / 2, -Math.PI / 2), 5, R2, 46);

  // Encabezado: firma y fecha
  const logo = await loadImg("brand/logo/gize-firma-horizontal.svg");
  if (logo) ctx.drawImage(logo, M, 118, 269.4 * .88, 88);
  const d = new Date((data.date || "") + "T12:00:00");
  if (!isNaN(d)) caps(ctx, (DIAS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MESES[d.getMonth()].slice(0, 3)).toUpperCase(), W - M, 176, 30, "rgba(255,255,255,.75)", 5, "right");

  // Título con subrayado de neón
  caps(ctx, "ENTRENO COMPLETADO", M, 330, 30, "rgba(255,255,255,.7)", 7);
  ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "800 104px " + FONT;
  ctx.fillText(fit(ctx, data.day || "Entreno", W - M * 2), M, 448);
  neon(ctx, () => { ctx.beginPath(); ctx.moveTo(M, 492); ctx.lineTo(M + 230, 492); }, lin(ctx, M, 0, M + 230, 0), 6, R3, 26);

  // Protagonista: el tiempo dentro de un doble anillo de neón
  const cx = W / 2, cy = 860, rr = 290;
  neon(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); }, conic(ctx, cx, cy, -Math.PI / 2), 12, R2, 70);
  neon(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, rr - 34, -Math.PI * .85, -Math.PI * .15); }, conic(ctx, cx, cy, Math.PI / 2), 4, R1, 24);
  neon(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, rr - 34, Math.PI * .15, Math.PI * .85); }, conic(ctx, cx, cy, -Math.PI / 2), 4, R4, 24);
  let big = "", unit = "";
  if (data.dur > 0){ const s = Math.round(data.dur), h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); if (h){ big = h + ":" + String(m).padStart(2, "0"); unit = "HORAS"; } else { big = String(Math.max(1, m)); unit = "MINUTOS"; } }
  else { big = String(data.sets || 0); unit = "SERIES"; }
  const size = big.length >= 4 ? 180 : big.length === 3 ? 220 : 270;
  ctx.save(); ctx.textAlign = "center"; ctx.font = "800 " + size + "px " + FONT; ctx.fillStyle = "#fff"; ctx.shadowColor = R1; ctx.shadowBlur = 36;
  try { ctx.letterSpacing = "-6px"; } catch (e) {}
  ctx.fillText(big, cx, cy + size * .3); try { ctx.letterSpacing = "0px"; } catch (e) {} ctx.restore();
  caps(ctx, unit, cx, cy + size * .3 + 74, 32, "rgba(255,255,255,.8)", 10, "center");

  // Tres números, cada uno en su caja de neón
  const prs = data.prs || [];
  const stats = [[data.sets || 0, "SERIES", R1], [data.exs || 0, "EJERCICIOS", R2], [prs.length, prs.length === 1 ? "RÉCORD" : "RÉCORDS", R3]];
  const gap = 28, bw = (W - M * 2 - gap * 2) / 3, by = 1215, bh = 190;
  stats.forEach(([v, l, col], i) => {
    const x = M + i * (bw + gap);
    neon(ctx, () => rrect(ctx, x, by, bw, bh, 30), col, 3.5, col, 30);
    ctx.save(); ctx.textAlign = "center"; ctx.font = "800 92px " + FONT; ctx.fillStyle = "#fff"; ctx.shadowColor = col; ctx.shadowBlur = 24;
    ctx.fillText(String(v), x + bw / 2, by + 108); ctx.restore();
    caps(ctx, l, x + bw / 2, by + 156, 24, "rgba(255,255,255,.75)", 4, "center");
  });

  // Lo que hiciste: panel con borde de neón, récords primero con su pastilla
  const prNames = new Set(prs.map(p => p.name));
  const rows = prs.slice(0, 4).map(p => [true, p.name, kgTxt(p.kg) + " kg × " + p.reps])
    .concat((data.exercises || []).filter(e => !prNames.has(e.name)).map(e => [false, e.name, bestOf(e.sets)]).filter(r => r[2]))
    .slice(0, 4);
  if (rows.length){
    const px = M, py = 1455, pw = W - M * 2, rowH = 84, ph = 30 + rows.length * rowH + 10;
    neon(ctx, () => rrect(ctx, px, py, pw, ph, 34), lin(ctx, px, 0, px + pw, 0), 3.5, R2, 34);
    rows.forEach(([pr, name, val], i) => {
      const y = py + 30 + i * rowH + 50;
      if (i){ const g = ctx.createLinearGradient(px + 30, 0, px + pw - 30, 0); g.addColorStop(0, "rgba(166,92,255,0)"); g.addColorStop(.5, "rgba(166,92,255,.45)"); g.addColorStop(1, "rgba(166,92,255,0)"); ctx.fillStyle = g; ctx.fillRect(px + 30, y - 58, pw - 60, 2); }
      ctx.save(); ctx.textAlign = "right"; ctx.font = "700 40px " + FONT; ctx.fillStyle = "#fff"; ctx.shadowColor = pr ? R3 : R1; ctx.shadowBlur = 18;
      ctx.fillText(val, px + pw - 38, y); ctx.restore();
      ctx.font = "700 40px " + FONT; const vw = ctx.measureText(val).width;
      let nx = px + 38;
      if (pr){
        ctx.font = "800 22px " + FONT; try { ctx.letterSpacing = "3px"; } catch (e) {}
        const tw = ctx.measureText("RÉCORD").width + 30;
        neon(ctx, () => rrect(ctx, nx, y - 34, tw, 42, 21), R3, 2.5, R3, 18);
        ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText("RÉCORD", nx + 15, y - 5); try { ctx.letterSpacing = "0px"; } catch (e) {}
        nx += tw + 18;
      }
      ctx.textAlign = "left"; ctx.font = "600 38px " + FONT; ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.fillText(fit(ctx, name, px + pw - 38 - vw - 28 - nx), nx, y);
    });
  }

  // Pie: «Entrenado con GIZE» y la dirección en una pastilla de neón
  ctx.textAlign = "left"; ctx.font = "500 30px " + FONT; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText("Entrenado con GIZE", M, H - 108);
  ctx.font = "700 30px " + FONT; const url = "gize.ar", uw = ctx.measureText(url).width + 48;
  neon(ctx, () => rrect(ctx, W - M - uw, H - 150, uw, 60, 30), R4, 3, R4, 24);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(url, W - M - uw / 2, H - 108);
  return c;
}

function native(){ try { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.Share && C.Plugins.Filesystem ? C.Plugins : null; } catch (e) { return null; } }

async function shareCanvas(canvas){
  const text = "Mi entreno en GIZE 💪";
  const P = native();
  if (P){
    const b64 = canvas.toDataURL("image/png").split(",")[1];
    const f = await P.Filesystem.writeFile({ path: "gize-entreno.png", data: b64, directory: "CACHE" });
    await P.Share.share({ title: "Mi entreno", text, files: [f.uri], dialogTitle: "Compartir entreno" });
    return "ok";
  }
  const blobObj = await new Promise(r => canvas.toBlob(r, "image/png"));
  const file = new File([blobObj], "gize-entreno.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], text }); return "ok"; }
    catch (e) { if (e && e.name === "AbortError") return "cancel"; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blobObj); a.download = "gize-entreno.png";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  return "download";
}

export function closeSharePreview(){ const b = document.getElementById("sharePrev"); if (b) b.remove(); }

export async function openSharePreview(data){
  closeSharePreview();
  const box = document.createElement("div");
  box.id = "sharePrev"; box.className = "sprev";
  box.innerHTML = `<div class="sprev-bg" data-sp="close"></div><div class="sprev-card" role="dialog" aria-label="Compartir entreno">
    <div class="sprev-img"><div class="sprev-load">Armando la imagen…</div></div>
    <div class="sprev-btns"><button type="button" class="ctrl ghost" data-sp="close">Cerrar</button><button type="button" class="ctrl primary" data-sp="share" disabled>Compartir</button></div>
    <div class="sprev-hint" hidden></div></div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add("open"));
  const canvas = await drawShareCard(data);
  const holder = box.querySelector(".sprev-img"); holder.innerHTML = "";
  const img = new Image(); img.alt = "Resumen del entreno para compartir"; img.src = canvas.toDataURL("image/png"); holder.appendChild(img);
  const btn = box.querySelector('[data-sp="share"]'); btn.disabled = false;
  box.addEventListener("click", async e => {
    const b = e.target.closest("[data-sp]"); if (!b) return;
    if (b.dataset.sp === "close"){ closeSharePreview(); return; }
    btn.disabled = true;
    let r = "error"; try { r = await shareCanvas(canvas); } catch (err) { r = "error"; }
    btn.disabled = false;
    const hint = box.querySelector(".sprev-hint");
    if (r === "download"){ hint.hidden = false; hint.textContent = "Se descargó la imagen: subila desde tu galería. En el celular también podés mantenerla apretada para guardarla."; }
    else if (r === "error"){ hint.hidden = false; hint.textContent = "No se pudo abrir el menú para compartir. Mantené apretada la imagen para guardarla."; }
    else if (r === "ok") closeSharePreview();
  });
}
