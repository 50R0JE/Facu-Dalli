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
// vacía a medida que pasa el tiempo; en el cronómetro da una vuelta por minuto, como la
// aguja de los segundos. tick() (main.js) lo mueve con setRing(), sin redibujar la pantalla.
const R = 92, C = 2 * Math.PI * R;
const ringOffset = frac => (C * (1 - Math.min(1, Math.max(0, frac)))).toFixed(2);
function ring(frac, big, label, state){
  const small = big.length > 5 ? ' small' : '';
  return `<div class="cring${state?' '+state:''}">
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><linearGradient id="cringGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2FA0FF"/><stop offset=".45" stop-color="#A65CFF"/><stop offset=".75" stop-color="#FF3DAE"/><stop offset="1" stop-color="#25E8C8"/>
      </linearGradient></defs>
      <circle class="cring-track" cx="100" cy="100" r="${R}"/>
      <circle class="cring-arc" id="cringArc" cx="100" cy="100" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${ringOffset(frac)}" transform="rotate(-90 100 100)"/>
      <g id="cringDot" transform="rotate(${(frac*360).toFixed(2)} 100 100)"><circle class="cring-dot" cx="100" cy="${100-R}" r="6"/></g>
    </svg>
    <div class="cring-in">
      <div class="time-display${small}" id="cringTime">${big}</div>
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
    return modes + `<div class="cring-row">${ring(swFrac(elapsed), fmt(elapsed), label, CardioState.swRunning ? "run" : "")}</div>
      <div class="ctrl-row">${ctrls}</div>${laps}`;
  } else {
    const rem = CardioState.tmRunning ? Math.max(0, CardioState.tmEndTs-Date.now()) : CardioState.tmRemainingMs;
    const paused = !CardioState.tmRunning && !CardioState.tmFinished && rem < CardioState.tmTarget;
    const editable = !CardioState.tmRunning && !CardioState.tmFinished && !paused;
    const big = CardioState.tmFinished ? "00:00" : fmt(rem, true);
    const label = CardioState.tmFinished ? "¡Tiempo!" : CardioState.tmRunning ? "Restan" : paused ? "En pausa" : "Temporizador";
    const r = ring(CardioState.tmFinished ? 1 : tmFrac(), big, label, CardioState.tmFinished ? "fin" : CardioState.tmRunning ? "run" : "");
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
