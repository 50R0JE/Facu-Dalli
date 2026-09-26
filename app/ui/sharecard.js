// Tarjeta para compartir el entreno terminado (formato historia, 1080 × 1920): se dibuja
// en un canvas con la marca (auroras, anillo RGB, firma de GIZE) y se comparte como imagen.
//   · App de las tiendas: se guarda en la caché del celular (Filesystem) y se abre el menú
//     de compartir del sistema (Share).
//   · Web: navigator.share con el archivo (celulares); si no se puede, se descarga.
// Antes de compartir se muestra la vista previa, así el toque en «Compartir» es del usuario
// (navigator.share lo exige) y se ve qué se va a mandar.
import { esc } from '../core/utils.js';

const W = 1080, H = 1920;
const R1 = "#2FA0FF", R2 = "#A65CFF", R3 = "#FF3DAE", R4 = "#25E8C8", GOLD = "#FFC940";
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

// Grano fino encima de todo (como una foto impresa): le saca lo "digital plano" al degradé.
function grain(ctx){
  const g = document.createElement("canvas"); g.width = 360; g.height = 640;
  const gx = g.getContext("2d"), im = gx.createImageData(360, 640), d = im.data;
  for (let i = 0; i < d.length; i += 4){ const v = Math.random() * 255; d[i] = d[i+1] = d[i+2] = v; d[i+3] = 14; }
  gx.putImageData(im, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.imageSmoothingEnabled = false; ctx.drawImage(g, 0, 0, W, H); ctx.restore();
}
function conic(ctx, cx, cy, from){
  try { const g = ctx.createConicGradient(from, cx, cy); [R1, R2, R3, R4, R1].forEach((c, i) => g.addColorStop(i / 4, c)); return g; }
  catch (e) { const g = ctx.createLinearGradient(cx - 300, cy - 300, cx + 300, cy + 300); g.addColorStop(0, R1); g.addColorStop(.5, R3); g.addColorStop(1, R4); return g; }
}
function rrect(ctx, x, y, w, h, r){ ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function caps(ctx, txt, x, y, size, color, spacing, align){
  ctx.font = "700 " + size + "px " + FONT; ctx.fillStyle = color; ctx.textAlign = align || "left";
  try { ctx.letterSpacing = (spacing || 6) + "px"; } catch (e) {}
  ctx.fillText(txt, x, y); try { ctx.letterSpacing = "0px"; } catch (e) {}
}

// data: { day, date (AAAA-MM-DD), dur (s), sets, exs, exercises:[{name,sets}], prs:[{name,kg,reps,prev}] }
export async function drawShareCard(data){
  try { await Promise.all(["800 300px", "700 100px", "600 40px", "500 40px"].map(f => document.fonts.load(f + " Outfit"))); } catch (e) {}
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const M = 88; // margen

  // Fondo: negro profundo con una malla de luces de la gama (azul arriba, magenta al costado,
  // verde agua abajo) muy difuminadas.
  ctx.fillStyle = "#040507"; ctx.fillRect(0, 0, W, H);
  blob(ctx, 60, 120, 900, R1, "66"); blob(ctx, 1150, 760, 820, R3, "4a"); blob(ctx, 980, 330, 520, R2, "40");
  blob(ctx, -40, 1480, 820, R4, "3a"); blob(ctx, 1080, 1960, 700, R2, "44");
  const vign = ctx.createRadialGradient(W / 2, H * .45, 300, W / 2, H * .45, 1250); vign.addColorStop(0, "rgba(0,0,0,0)"); vign.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);

  // Encabezado: firma y fecha
  const logo = await loadImg("brand/logo/gize-firma-horizontal.svg");
  if (logo) ctx.drawImage(logo, M, 104, 269.4 * .92, 92);
  const d = new Date((data.date || "") + "T12:00:00");
  if (!isNaN(d)) caps(ctx, (DIAS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MESES[d.getMonth()].slice(0, 3)).toUpperCase(), W - M, 164, 30, "rgba(255,255,255,.7)", 5, "right");

  // Título
  caps(ctx, "ENTRENO COMPLETADO", M, 330, 30, "rgba(255,255,255,.62)", 7);
  const line = ctx.createLinearGradient(M, 0, M + 260, 0); line.addColorStop(0, R1); line.addColorStop(.5, R3); line.addColorStop(1, R4);
  ctx.fillStyle = line; rrect(ctx, M, 350, 180, 5, 3); ctx.fill();
  ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "800 104px " + FONT;
  const title = fit(ctx, data.day || "Entreno", W - M * 2);
  ctx.fillText(title, M, 470);

  // Héroe: anillo de neón con el tiempo adentro
  const cx = W / 2, cy = 870, rr = 300;
  ctx.save(); ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
  const ring = conic(ctx, cx, cy, -Math.PI / 2);
  ctx.strokeStyle = ring; ctx.shadowColor = R2; ctx.shadowBlur = 90; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 30; ctx.shadowColor = R1; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Número en blanco con un leve degradé hacia abajo
  let big = "", unit = "";
  if (data.dur > 0){ const s = Math.round(data.dur), h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); if (h){ big = h + ":" + String(m).padStart(2, "0"); unit = "HORAS"; } else { big = String(Math.max(1, m)); unit = "MINUTOS"; } }
  else { big = String(data.sets || 0); unit = "SERIES"; }
  const size = big.length >= 4 ? 190 : big.length === 3 ? 230 : 280;
  const tg = ctx.createLinearGradient(0, cy - size * .7, 0, cy + size * .3); tg.addColorStop(0, "#ffffff"); tg.addColorStop(1, "#cfd8ff");
  ctx.textAlign = "center"; ctx.fillStyle = tg; ctx.font = "800 " + size + "px " + FONT;
  try { ctx.letterSpacing = "-6px"; } catch (e) {}
  ctx.fillText(big, cx, cy + size * .3); try { ctx.letterSpacing = "0px"; } catch (e) {}
  caps(ctx, unit, cx, cy + size * .3 + 78, 34, "rgba(255,255,255,.72)", 10, "center");

  // Números: tres columnas con divisores finos
  const prs = data.prs || [];
  const stats = [[data.sets || 0, "SERIES"], [data.exs || 0, "EJERCICIOS"], [prs.length, prs.length === 1 ? "RÉCORD" : "RÉCORDS"]];
  const sy = 1290, colW = (W - M * 2) / 3;
  stats.forEach(([v, l], i) => {
    const x = M + colW * i + colW / 2;
    ctx.textAlign = "center"; ctx.font = "800 96px " + FONT; ctx.fillStyle = i === 2 && v > 0 ? GOLD : "#fff"; ctx.fillText(String(v), x, sy);
    caps(ctx, l, x, sy + 52, 26, "rgba(255,255,255,.6)", 5, "center");
    if (i) { ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(M + colW * i, sy - 80, 2, 140); }
  });

  // Panel de vidrio con lo que hiciste (récords primero, con su marca dorada)
  const prNames = new Set(prs.map(p => p.name));
  const rows = prs.slice(0, 4).map(p => [true, p.name, kgTxt(p.kg) + " kg × " + p.reps])
    .concat((data.exercises || []).filter(e => !prNames.has(e.name)).map(e => [false, e.name, bestOf(e.sets)]).filter(r => r[2]))
    .slice(0, 4);
  if (rows.length){
    const px = M, py = 1430, pw = W - M * 2, rowH = 86, ph = 34 + rows.length * rowH + 14;
    ctx.save(); rrect(ctx, px, py, pw, ph, 36); ctx.fillStyle = "rgba(255,255,255,.055)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    rows.forEach(([pr, name, val], i) => {
      const y = py + 34 + i * rowH + 52;
      if (i) { ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(px + 36, y - 60, pw - 72, 2); }
      ctx.textAlign = "right"; ctx.font = "700 40px " + FONT; ctx.fillStyle = pr ? GOLD : "#fff"; ctx.fillText(val, px + pw - 40, y);
      const vw = ctx.measureText(val).width;
      let nx = px + 40;
      if (pr){ // pastilla «RÉCORD»
        ctx.font = "800 22px " + FONT; try { ctx.letterSpacing = "3px"; } catch (e) {}
        const tw = ctx.measureText("RÉCORD").width + 30; rrect(ctx, nx, y - 34, tw, 42, 21); ctx.fillStyle = "rgba(255,201,64,.16)"; ctx.fill();
        ctx.strokeStyle = "rgba(255,201,64,.55)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.textAlign = "left"; ctx.fillStyle = GOLD; ctx.fillText("RÉCORD", nx + 15, y - 5); try { ctx.letterSpacing = "0px"; } catch (e) {}
        nx += tw + 18;
      }
      ctx.textAlign = "left"; ctx.font = "600 38px " + FONT; ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.fillText(fit(ctx, name, px + pw - 40 - vw - 28 - nx), nx, y);
    });
  }

  // Pie
  ctx.textAlign = "left"; ctx.font = "500 30px " + FONT; ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillText("Entrenado con GIZE", M, H - 92);
  ctx.font = "700 30px " + FONT; const url = "gize.ar", uw = ctx.measureText(url).width + 44;
  rrect(ctx, W - M - uw, H - 132, uw, 58, 29); ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(url, W - M - uw / 2, H - 92);

  grain(ctx);
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
