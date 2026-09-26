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
function blob(ctx, x, y, r, color, a){ const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color + a); g.addColorStop(1, color + "00"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

// data: { day, date (AAAA-MM-DD), dur (s), sets, exs, exercises:[{name,sets}], prs:[{name,kg,reps,prev}] }
export async function drawShareCard(data){
  try { await Promise.all([document.fonts.load("700 100px Outfit"), document.fonts.load("500 40px Outfit"), document.fonts.load("800 40px Outfit")]); } catch (e) {}
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  blob(ctx, 120, 260, 760, R1, "55"); blob(ctx, 1000, 820, 700, R3, "40"); blob(ctx, 180, 1650, 760, R4, "38"); blob(ctx, 980, 1780, 600, R2, "40");

  // Firma de GIZE arriba
  const logo = await loadImg("brand/logo/gize-firma-horizontal.svg");
  if (logo) ctx.drawImage(logo, 90, 110, 269.4 * 1.1, 110);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.font = "700 34px " + FONT;
  ctx.letterSpacing = "6px"; ctx.fillText("ENTRENO TERMINADO", 90, 330); ctx.letterSpacing = "0px";
  ctx.fillStyle = "#fff"; ctx.font = "700 92px " + FONT; ctx.fillText(fit(ctx, data.day || "Entreno", W - 180), 90, 435);
  const d = new Date((data.date || "") + "T12:00:00");
  if (!isNaN(d)) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = "500 40px " + FONT; ctx.fillText(DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()], 90, 500); }

  // Anillo RGB con el tiempo total
  const cx = W / 2, cy = 830, rr = 250;
  let stroke;
  try { stroke = ctx.createConicGradient(-Math.PI / 2, cx, cy); [R1, R2, R3, R4, R1].forEach((col, i) => stroke.addColorStop(i / 4, col)); }
  catch (e) { stroke = ctx.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr); stroke.addColorStop(0, R1); stroke.addColorStop(.5, R2); stroke.addColorStop(1, R4); }
  ctx.save(); ctx.shadowColor = R2; ctx.shadowBlur = 60; ctx.strokeStyle = stroke; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = stroke; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  if (data.dur > 0){
    const [big, unit] = durTxt(data.dur);
    ctx.font = "700 " + (big.length > 3 ? 120 : 190) + "px " + FONT; ctx.fillText(big, cx, cy + (big.length > 3 ? 30 : 55));
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = "600 44px " + FONT; ctx.fillText(big.length > 3 ? "de entreno" : unit + " de entreno", cx, cy + 125);
  } else {
    ctx.font = "700 170px " + FONT; ctx.fillText(String(data.sets || 0), cx, cy + 40);
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = "600 44px " + FONT; ctx.fillText("series", cx, cy + 120);
  }

  // Números
  const prs = data.prs || [];
  const stats = [[data.sets || 0, "series"], [data.exs || 0, "ejercicios"], [prs.length, prs.length === 1 ? "récord" : "récords"]];
  stats.forEach(([v, l], i) => {
    const x = 90 + i * 310, y = 1150;
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, 280, 170, 28) : ctx.rect(x, y, 280, 170); ctx.fill(); ctx.stroke();
    ctx.fillStyle = i === 2 && v > 0 ? "#FFC940" : "#fff"; ctx.font = "700 76px " + FONT; ctx.fillText(String(v), x + 140, y + 92);
    ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.font = "500 34px " + FONT; ctx.fillText(l, x + 140, y + 140);
  });

  // Récords (si hay) o los ejercicios con su mejor serie
  ctx.textAlign = "left";
  let y = 1420;
  // Primero los récords (punto dorado), después el resto de los ejercicios; hasta 5 filas.
  const prNames = new Set(prs.map(p => p.name));
  const rows = prs.slice(0, 5).map(p => ["pr", p.name, kgTxt(p.kg) + " kg × " + p.reps])
    .concat((data.exercises || []).filter(e => !prNames.has(e.name)).map(e => ["", e.name, bestOf(e.sets)]).filter(r => r[2]))
    .slice(0, 5);
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = "700 30px " + FONT; ctx.letterSpacing = "5px";
  ctx.fillText("LO QUE HICE", 90, y);
  if (prs.length){ ctx.textAlign = "right"; ctx.fillStyle = "#FFC940"; ctx.fillText("● RÉCORD", W - 90, y); ctx.textAlign = "left"; }
  ctx.letterSpacing = "0px";
  y += 30;
  rows.forEach(([ic, name, val]) => {
    y += 72;
    ctx.fillStyle = "#fff"; ctx.font = "600 40px " + FONT;
    ctx.textAlign = "right"; ctx.fillStyle = ic ? "#FFC940" : R1; ctx.font = "700 40px " + FONT; ctx.fillText(val, W - 90, y); const vw = ctx.measureText(val).width;
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "600 40px " + FONT;
    let nx = 90;
    if (ic){ ctx.save(); ctx.fillStyle = "#FFC940"; ctx.shadowColor = "#FFC940"; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(102, y - 14, 11, 0, Math.PI * 2); ctx.fill(); ctx.restore(); nx = 132; }
    ctx.fillStyle = "#fff"; ctx.fillText(fit(ctx, name, W - 90 - nx - vw - 30), nx, y);
  });

  // Pie
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "600 36px " + FONT; ctx.fillText("gize.ar", cx, H - 90);
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
