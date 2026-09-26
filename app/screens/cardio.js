import { state } from '../core/state.js';

import { esc, fmt } from '../core/utils.js';

export const CardioState = {

  cardioMode: "stopwatch",

  swRunning: false,

  swAccum: 0,

  swStartTs: 0,

  swLaps: [],

  tmRunning: false,

  tmRemainingMs: 60000,

  tmTarget: 60000,

  tmEndTs: 0,

  tmFinished: false,

};

export function renderCardioPrescription(){
  const cp = (state.coachPlan && state.coachPlan.cardio) ? state.coachPlan.cardio : null;
  if(!cp || (!cp.text && !(cp.items&&cp.items.length))) return "";
  const items = (cp.items&&cp.items.length) ? '<ul class="mc-list">'+cp.items.filter(x=>x&&x.trim()).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>' : "";
  const txt = cp.text ? '<div class="cardio-rx-txt">'+esc(cp.text)+'</div>' : "";
  return '<div class="cardio-rx"><div class="cardio-rx-h">Tu cardio de esta semana</div>'+txt+items+'</div>';
}

export function renderCardio(){
  const modes = `<div class="cardio-modes">
    <button class="cmode${CardioState.cardioMode==='stopwatch'?' active':''}" data-action="cardio-mode" data-mode="stopwatch">Cronómetro</button>
    <button class="cmode${CardioState.cardioMode==='timer'?' active':''}" data-action="cardio-mode" data-mode="timer">Temporizador</button>
  </div>`;
  const rx = renderCardioPrescription();
  const tools = renderCardioTools(modes);
  return rx + '<div class="cardio-toolsec"><div class="cardio-tools-h">Cronómetro y temporizador</div>' + tools + '</div>';
}

// Anillo alrededor del tiempo (en vez de los dibujitos animados): en el temporizador se
// vacía a medida que pasa el tiempo; en el cronómetro un cometa da una vuelta por minuto,
// como la aguja de los segundos, sin reiniciarse. tick() (main.js) lo mueve con setRing(), sin redibujar la pantalla.
const R = 92, C = 2 * Math.PI * R;
const ringOffset = frac => (C * (1 - Math.min(1, Math.max(0, frac)))).toFixed(2);
function ring(frac, big, label, state, comet, pick){
  const small = big.length > 5 ? ' small' : '';
  const deg = (Math.min(1, Math.max(0, frac))*360).toFixed(2);
  // Cronómetro: anillo entero tenue y un cometa (cabeza blanca + estela que se desvanece) que
  // gira sin parar, una vuelta por minuto; al pasar de 59 a 60 s sigue de largo, no se reinicia.
  const tail = [[.36, .07], [.30, .1], [.24, .16], [.18, .26], [.12, .45], [.06, 1]].map(([f, o]) =>
    `<circle class="cring-arc${f > .06 ? " tail" : ""}" cx="100" cy="100" r="${R}" stroke-dasharray="${(C*f).toFixed(2)} ${C.toFixed(2)}" transform="rotate(${(-90 - f*360).toFixed(2)} 100 100)" opacity="${o}"/>`).join("");
  const body = comet
    ? `<circle class="cring-track sw" cx="100" cy="100" r="${R}"/>
      <g id="cringDot" transform="rotate(${deg} 100 100)">${tail}<circle class="cring-dot" cx="100" cy="${100-R}" r="6"/></g>`
    : `<circle class="cring-track" cx="100" cy="100" r="${R}"/>
      <circle class="cring-arc" id="cringArc" cx="100" cy="100" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${ringOffset(frac)}" transform="rotate(-90 100 100)"/>
      <g id="cringDot" transform="rotate(${deg} 100 100)"><circle class="cring-dot" cx="100" cy="${100-R}" r="6"/></g>`;
  return `<div class="cring${state?' '+state:''}${comet?' comet':''}">
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><linearGradient id="cringGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2FA0FF"/><stop offset=".45" stop-color="#A65CFF"/><stop offset=".75" stop-color="#FF3DAE"/><stop offset="1" stop-color="#25E8C8"/>
      </linearGradient></defs>
      ${body}
    </svg>
    <div class="cring-in">
      ${pick
        ? `<button type="button" class="time-display cring-pick${small}" id="cringTime" data-action="tm-pick" aria-label="Cambiar el tiempo">${big}</button>`
        : `<div class="time-display${small}" id="cringTime">${big}</div>`}
      <div class="cring-label" id="cringLabel">${label}</div>
    </div>
  </div>`;
}
export function setRing(frac, big){
  const a = document.getElementById("cringArc"); if (a) a.setAttribute("stroke-dashoffset", ringOffset(frac));
  const d = document.getElementById("cringDot"); if (d) d.setAttribute("transform", `rotate(${(Math.min(1, Math.max(0, frac))*360).toFixed(2)} 100 100)`);
  const t = document.getElementById("cringTime"); if (t && big != null && t.textContent !== big){ t.textContent = big; t.classList.toggle("small", big.length > 5); }
}
export const swFrac = ms => (ms % 60000) / 60000;
export const tmFrac = () => CardioState.tmTarget ? (CardioState.tmRunning ? Math.max(0, CardioState.tmEndTs - Date.now()) : CardioState.tmRemainingMs) / CardioState.tmTarget : 0;

const PRESETS = [[30, "30 s"], [60, "1 min"], [90, "1:30"], [120, "2 min"], [180, "3 min"], [300, "5 min"]];
const minus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

export function renderCardioTools(modes){
  if (CardioState.cardioMode === "stopwatch") {
    const elapsed = CardioState.swRunning ? CardioState.swAccum + (Date.now()-CardioState.swStartTs) : CardioState.swAccum;
    const laps = CardioState.swLaps.length ? `<div class="laps">${CardioState.swLaps.map((t,i)=>({t,i, d: t - (i ? CardioState.swLaps[i-1] : 0)})).reverse().map(o=>`<div class="lap"><span>Vuelta ${o.i+1}</span><span class="lap-d">+${fmt(o.d)}</span><span>${fmt(o.t)}</span></div>`).join("")}</div>` : "";
    const paused = !CardioState.swRunning && elapsed > 0;
    const label = CardioState.swRunning ? (CardioState.swLaps.length ? "Vuelta " + (CardioState.swLaps.length + 1) : "En curso") : paused ? "En pausa" : "Cronómetro";
    const ctrls = CardioState.swRunning
      ? '<button class="ctrl ghost" data-action="sw-toggle">Pausar</button><button class="ctrl ghost" data-action="sw-lap">Vuelta</button>'
      : paused
        ? '<button class="ctrl ghost" data-action="sw-reset">Reiniciar</button><button class="ctrl primary" data-action="sw-toggle">Seguir</button>'
        : '<button class="ctrl primary wide" data-action="sw-toggle">Iniciar</button>';
    return modes + `<div class="cring-row">${ring(swFrac(elapsed), fmt(elapsed), label, CardioState.swRunning ? "run" : "", true)}</div>
      <div class="ctrl-row">${ctrls}</div>${laps}`;
  } else {
    const rem = CardioState.tmRunning ? Math.max(0, CardioState.tmEndTs-Date.now()) : CardioState.tmRemainingMs;
    const paused = !CardioState.tmRunning && !CardioState.tmFinished && rem < CardioState.tmTarget;
    const editable = !CardioState.tmRunning && !CardioState.tmFinished && !paused;
    const big = CardioState.tmFinished ? "00:00" : fmt(rem, true);
    const label = CardioState.tmFinished ? "¡Tiempo!" : CardioState.tmRunning ? "Restan" : paused ? "En pausa" : "Tocá para cambiar";
    const r = ring(CardioState.tmFinished ? 1 : tmFrac(), big, label, CardioState.tmFinished ? "fin" : CardioState.tmRunning ? "run" : "", false, editable);
    const row = editable
      ? `<div class="cring-row">
          <button class="cstep" data-action="tm-step" data-d="-15" aria-label="Quitar 15 segundos">${minus}<span>15 s</span></button>
          ${r}
          <button class="cstep" data-action="tm-step" data-d="15" aria-label="Sumar 15 segundos">${plus}<span>15 s</span></button>
        </div>
        <div class="presets">${PRESETS.map(([v, t])=>`<button class="preset${CardioState.tmTarget===v*1000?' on':''}" data-action="tm-preset" data-sec="${v}">${t}</button>`).join("")}</div>`
      : `<div class="cring-row">${r}</div>`;
    let ctrls;
    if (CardioState.tmRunning) ctrls = '<button class="ctrl ghost" data-action="tm-reset">Reiniciar</button><button class="ctrl ghost" data-action="tm-toggle">Pausar</button>';
    else if (CardioState.tmFinished) ctrls = '<button class="ctrl primary wide" data-action="tm-reset">Otra vez</button>';
    else if (paused) ctrls = '<button class="ctrl ghost" data-action="tm-reset">Reiniciar</button><button class="ctrl primary" data-action="tm-toggle">Seguir</button>';
    else ctrls = '<button class="ctrl primary wide" data-action="tm-toggle">Iniciar</button>';
    return modes + row + `<div class="ctrl-row">${ctrls}</div>`;
  }
}

// Ruedas para elegir minutos y segundos (se abre tocando el número del temporizador). Se
// desliza como el reloj del celular: sin teclado, que en iPhone corría la pantalla.
const ITEM = 44;
function wheel(id, max, val, unit){
  let items = ""; for (let i = 0; i <= max; i++) items += `<div class="tw-item${i===val?' on':''}">${String(i).padStart(2,"0")}</div>`;
  return `<div class="tw-col"><div class="tw-wheel" id="${id}" tabindex="0" aria-label="${unit}">${items}</div><div class="tw-unit">${unit}</div></div>`;
}
const wheelVal = (el, max) => Math.max(0, Math.min(max, Math.round(el.scrollTop / ITEM)));

export function openTimePicker(onDone){
  closeTimePicker();
  const m = Math.floor(CardioState.tmTarget / 60000), sec = Math.floor((CardioState.tmTarget % 60000) / 1000);
  const box = document.createElement("div");
  box.id = "timePick"; box.className = "tpick";
  box.innerHTML = `<div class="tpick-bg" data-tp="close"></div>
    <div class="tpick-card" role="dialog" aria-label="Elegir el tiempo">
      <div class="tpick-title">Elegí el tiempo</div>
      <div class="tpick-wheels">
        <div class="tw-band" aria-hidden="true"></div>
        ${wheel("twMin", 60, m, "min")}${wheel("twSec", 59, sec, "seg")}
      </div>
      <div class="tpick-btns"><button type="button" class="ctrl ghost" data-tp="close">Cancelar</button><button type="button" class="ctrl primary" data-tp="ok">Listo</button></div>
    </div>`;
  document.body.appendChild(box);
  const wm = box.querySelector("#twMin"), ws = box.querySelector("#twSec");
  wm.scrollTop = m * ITEM; ws.scrollTop = sec * ITEM;
  [[wm, 60], [ws, 59]].forEach(([w, max]) => {
    const mark = () => { const v = wheelVal(w, max); w.querySelectorAll(".tw-item").forEach((it, i) => it.classList.toggle("on", i === v)); };
    w.addEventListener("scroll", mark, { passive: true });
    // Tocar un número lo lleva al centro.
    w.addEventListener("click", e => { const it = e.target.closest(".tw-item"); if (!it) return; const i = [...w.children].indexOf(it); w.scrollTo({ top: i * ITEM, behavior: "smooth" }); });
    w.addEventListener("keydown", e => { if (e.key === "ArrowUp" || e.key === "ArrowDown"){ e.preventDefault(); w.scrollTo({ top: (wheelVal(w, max) + (e.key === "ArrowUp" ? -1 : 1)) * ITEM, behavior: "smooth" }); } });
  });
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-tp]"); if (!b) return;
    if (b.dataset.tp === "ok"){
      let mm = wheelVal(wm, 60), ss = wheelVal(ws, 59);
      if (mm === 60) ss = 0;
      const t = (mm * 60 + ss) * 1000;
      if (t > 0){ CardioState.tmTarget = t; CardioState.tmRemainingMs = t; CardioState.tmFinished = false; }
    }
    closeTimePicker(); onDone && onDone();
  });
  requestAnimationFrame(() => box.classList.add("open"));
}
export function closeTimePicker(){ const b = document.getElementById("timePick"); if (b) b.remove(); }
