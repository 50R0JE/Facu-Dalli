import { HOURGLASS_SVG, RUNNER_SVG } from '../core/icons.js';

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

export function renderCardioTools(modes){
  if (CardioState.cardioMode === "stopwatch") {
    const elapsed = CardioState.swRunning ? CardioState.swAccum + (Date.now()-CardioState.swStartTs) : CardioState.swAccum;
    const laps = CardioState.swLaps.length ? `<div class="laps">${CardioState.swLaps.map((t,i)=>({t,i})).reverse().map(o=>`<div class="lap"><span>Vuelta ${o.i+1}</span><span>${fmt(o.t)}</span></div>`).join("")}</div>` : "";
    const runner = CardioState.swRunning ? `<div class="cardio-runner">${RUNNER_SVG}</div>` : "";
    return modes + `
      <div class="time-display" id="swTime">${fmt(elapsed)}</div>
      <div class="ctrl-row">
        <button class="ctrl ${CardioState.swRunning?'ghost':'primary'}" data-action="sw-toggle">${CardioState.swRunning?'Pausar':'Iniciar'}</button>
        ${CardioState.swRunning?'<button class="ctrl ghost" data-action="sw-lap">Vuelta</button>':''}
        <button class="ctrl ghost" data-action="sw-reset">Reiniciar</button>
      </div>
      ${runner}${laps}`;
  } else {
    const rem = CardioState.tmRunning ? Math.max(0, CardioState.tmEndTs-Date.now()) : CardioState.tmRemainingMs;
    const presetVals = [30,60,90,120,180,300];
    const editable = !CardioState.tmRunning && !CardioState.tmFinished;
    const cm = Math.floor(CardioState.tmTarget/60000), cs = Math.floor((CardioState.tmTarget%60000)/1000);
    const editor = editable ? `
      <div class="presets">${presetVals.map(v=>`<button class="preset${CardioState.tmTarget===v*1000?' on':''}" data-action="tm-preset" data-sec="${v}">${fmt(v*1000)}</button>`).join("")}</div>
      <div class="custom-time">
        <input id="tmMin" class="ct-input" type="text" inputmode="numeric" maxlength="3" value="${cm}" data-action="tm-min">
        <span class="ct-colon">:</span>
        <input id="tmSec" class="ct-input" type="text" inputmode="numeric" maxlength="2" value="${String(cs).padStart(2,'0')}" data-action="tm-sec">
      </div>
      <div class="ct-hint">minutos : segundos — personalizá lo que quieras</div>` : "";
    let ctrls;
    if (CardioState.tmRunning) ctrls = '<button class="ctrl ghost" data-action="tm-toggle">Pausar</button><button class="ctrl ghost" data-action="tm-reset">Reiniciar</button>';
    else if (CardioState.tmFinished) ctrls = '<button class="ctrl primary" data-action="tm-reset">Reiniciar</button>';
    else ctrls = '<button class="ctrl primary" data-action="tm-toggle">Iniciar</button>';
    const hourglass = CardioState.tmRunning ? `<div class="cardio-runner">${HOURGLASS_SVG}</div>` : "";
    return modes + `
      <div class="time-display${CardioState.tmFinished?' finished':''}" id="tmTime">${CardioState.tmFinished?'00:00':fmt(rem,true)}</div>
      ${editor}
      <div class="ctrl-row">${ctrls}</div>
      ${hourglass}`;
  }
}
