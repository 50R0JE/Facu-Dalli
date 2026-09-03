import { EX_CATS, EX_DB, RC } from '../core/data.js';

import { checkSvg, chevronDownSvg, pencilSvg, playSvg, resetSvg, searchSvg, swapSvg, trashSvg, trophySvg, xSvg } from '../core/icons.js';

import { State, state } from '../core/state.js';

import { save } from '../core/storage.js';

import { esc, norm, today } from '../core/utils.js';

import { renderApp } from '../main.js';

import { allSetsDone, bestKgBefore, bestSetOf, renderLastSession } from './progreso.js';

import { parseRest } from '../ui/restbar.js';

export const EntrenoState = {

  exPicker: null,

  exCat: "pecho",

  exQuery: "",

  loadEx: null,

};

export function blockWeek(b, dstr){
  if(!b || !b.start_date) return 0;
  const a=new Date(b.start_date+"T00:00:00"), c=new Date((dstr||today())+"T00:00:00");
  const w=Math.floor((c-a)/(7*24*3600*1000))+1;
  return (w<1) ? 0 : w;
}

export function isDeload(b, wk){ return !!(b && Array.isArray(b.deloads) && b.deloads.indexOf(wk)>=0); }

export let expandedOverride = new Set();

export let liveCounting = false;

export let lpf = 9.8;

export let prevDyn = 0;

export let lastStepTs = 0;

export let stepsSaveTs = 0;

export const day = () => state.days.find(d => d.id === State.activeId) || state.days[0];

export function onMotion(e){
  const a = e.accelerationIncludingGravity; if(!a) return;
  const mag = Math.sqrt((a.x||0)*(a.x||0)+(a.y||0)*(a.y||0)+(a.z||0)*(a.z||0));
  lpf = lpf*0.9 + mag*0.1;
  const dyn = mag - lpf, now = Date.now();
  if (dyn>1.2 && prevDyn<=1.2 && (now-lastStepTs)>300){
    state.steps = (state.steps||0)+1; lastStepTs=now;
    const el=document.getElementById("stepNum"); if(el) el.textContent=(state.steps).toLocaleString("es-AR");
    const ring=document.getElementById("stepRing"); if(ring){ const g=state.stepsGoal||10000; ring.style.strokeDashoffset = RC*(1-Math.min(state.steps/g,1)); }
    if(now-stepsSaveTs>3000){ save(); stepsSaveTs=now; }
  }
  prevDyn = dyn;
}

export async function startLive(){
  try{
    if (typeof DeviceMotionEvent!=="undefined" && typeof DeviceMotionEvent.requestPermission==="function"){
      const res = await DeviceMotionEvent.requestPermission();
      if (res!=="granted"){ alert("Necesito permiso de movimiento para contar pasos."); return; }
    }
    window.addEventListener("devicemotion", onMotion);
    liveCounting=true; renderApp();
  }catch(err){ alert("Tu dispositivo no permite usar el sensor de movimiento en el navegador."); }
}

export function stopLive(){ try{ window.removeEventListener("devicemotion", onMotion); }catch(e){} liveCounting=false; save(); renderApp(); }

export function routineLocked(){ try { return !!(State.cloudProfile && State.cloudProfile.role!=="coach" && State.cloudProfile.coach_id); } catch(e){ return false; } }

export function renderBlockBanner(){
  const b=state.block; if(!b) return "";
  const wk=blockWeek(b, today());
  if(wk<1) return "";
  const dl=isDeload(b,wk);
  const meta=[b.phase, b.calories].filter(Boolean).join(" \u00b7 ");
  const wkData=(b.weekPlan||{})[wk]||{};
  const wkGoal=wkData.goal||''; const wkNote=wkData.note||'';
  return '<div class="blk'+(dl?' deload':'')+'">'+
    '<div class="blk-top"><span class="blk-w">Semana '+wk+(b.weeks?' de '+b.weeks:'')+'</span>'+(meta?'<span class="blk-meta">'+esc(meta)+'</span>':'')+'</div>'+
    (dl?'<div class="blk-dl">SEMANA DE DESCARGA \u2014 No faltes al gimnasio: baj\u00e1 series y cargas para recuperarte.</div>':'')+
    (b.notes?'<div class="blk-note">'+esc(b.notes)+'</div>':'')+
    (wkGoal?'<div class="blk-wkgoal">⭐ Objetivo: '+esc(wkGoal)+'</div>':'')+
    (wkNote&&wkNote!==b.notes?'<div class="blk-note">'+esc(wkNote)+'</div>':'')+
    '</div>';
}

export function renderDayNotes(d){
  const exN=(d.exercises||[]).filter(x=>x.note);
  if(!d.note && !exN.length) return "";
  const items=exN.map(x=>'<div class="dn-item"><span class="dn-ex">'+esc(x.name)+'</span><span class="dn-tx">'+esc(x.note)+'</span></div>').join("");
  return '<div class="daynotes" data-reveal="notes-'+d.id+'"><div class="dn-head">Notas de tu coach \u00b7 '+esc(d.name)+'</div>'+
    (d.note?'<div class="dn-general">'+esc(d.note)+'</div>':'')+items+'</div>';
}

export function renderEntreno(){
  const d = day();
  const total = d.exercises.reduce((a,e)=>a+e.sets.length,0);
  const done = d.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  const pct = total ? Math.round(done/total*100) : 0;
  const tabs = state.days.map(x =>
    `<button class="tab${x.id===State.activeId?' active':''}" data-action="tab" data-day="${x.id}">${esc(x.name)}</button>`
  ).join("") + (routineLocked() ? "" : `<button class="tab tab-add" data-action="addday" title="Agregar día">+</button>`);
  // Un solo ejercicio roto no debe tumbar toda la vista de Entreno: v.innerHTML= es una
  // sola asignación, así que si CUALQUIER ejercicio revienta acá adentro, renderApp() se
  // corta a la mitad, #view queda vacío y la nav no vuelve a responder (ver el bug de
  // .kg/.reps sobre bestSetOf()===null, ya arreglado arriba, pero esto es la red de
  // seguridad para lo que no prevemos). Cada ejercicio se renderiza en su propio try/catch:
  // si uno falla, muestra una card de error puntual y el resto del día se ve normal.
  const cards = d.exercises.map((ex, exIdx) => { try {
    const insertBtn = routineLocked()?'':`<button class="ins-ex" data-action="ex-insert" data-i="${exIdx}" title="Insertar ejercicio acá">+</button>`;
    const done = allSetsDone(ex);
    // Ejercicio completo y no reabierto a mano -> fila compacta, no la card entera.
    if(done && !expandedOverride.has(ex.id)){
      const best=bestSetOf(ex.sets);
      const isPR=exerciseIsLivePR(ex);
      // bestSetOf() da null si ningún set tiene kg cargado (ej.: ejercicio de peso
      // corporal donde el cliente solo anota reps) — antes esto reventaba renderEntreno()
      // entero (best.kg sobre null) y dejaba la pestaña Entreno en blanco. Con reps
      // mostramos el mejor número de reps en su lugar; sin ninguno de los dos, "Completado".
      let bestReps=0; (ex.sets||[]).forEach(s=>{ const r=+s.reps||0; if(r>bestReps) bestReps=r; });
      const bestStr = best ? (best.kg+' kg × '+best.reps) : (bestReps>0 ? bestReps+' reps' : 'Completado');
      return `${insertBtn}<div class="ex-collapsed${exIdx===0?' ex-focused':''}" data-action="ex-expand" data-ex="${ex.id}">
        <span class="ex-collapsed-badge">${isPR?trophySvg:checkSvg}</span>
        <span class="ex-collapsed-name">${esc(ex.name)}</span>
        <span class="ex-collapsed-best">${bestStr}</span>
      </div>`;
    }
    const sets = ex.sets.map((s,i) => `
      <div class="set">
        <span class="idx">${i+1}</span>
        <div class="field"><input class="kg" type="text" inputmode="decimal" placeholder="0" value="${esc(s.kg)}" data-action="kg" data-ex="${ex.id}" data-set="${s.id}"><span class="unit">kg</span></div>
        <div class="field"><input class="reps" type="text" inputmode="numeric" placeholder="0" value="${esc(s.reps)}" data-action="reps" data-ex="${ex.id}" data-set="${s.id}"><span class="unit">reps</span></div>
        ${s.target?`<span class="goal" title="Objetivo del coach">${esc(s.target)}</span>`:''}
        <button class="done${s.done?' on':''}" data-action="toggle" data-ex="${ex.id}" data-set="${s.id}">${s.done?checkSvg:''}</button>
        ${routineLocked()?'':`<button class="rm" data-action="removeset" data-ex="${ex.id}" data-set="${s.id}" title="Quitar serie">${xSvg}</button>`}
      </div>`).join("");
    return `${insertBtn}<div class="card${exIdx===0?' ex-focused':''}" data-ex-id="${ex.id}">
      <div class="card-head">
        <input class="ex-name" type="text" value="${esc(ex.name)}" data-action="exname" data-ex="${ex.id}" ${routineLocked()?'readonly':''}>
        ${done?`<button class="icon-mini" data-action="ex-collapse" data-ex="${ex.id}" title="Colapsar">${chevronDownSvg}</button>`:''}
        ${routineLocked()?'':`<button class="icon-mini" data-action="ex-swap" data-ex="${ex.id}" title="Cambiar ejercicio">${swapSvg}</button>
        <button class="trash" data-action="removeex" data-ex="${ex.id}" title="Eliminar ejercicio">${trashSvg}</button>`}
      </div>
      ${ex.video?`<a class="ex-video" href="${esc(ex.video)}" target="_blank" rel="noopener">${playSvg} Ver video del ejercicio</a>`:''}
      ${(ex.o||ex.rir||ex.goal)?`<div class="ex-prog">
        ${ex.o?`<span class="ep-ord">${esc(ex.o)}</span>`:''}
        ${ex.rir?`<span class="ep-chip">RIR ${esc(ex.rir)}</span>`:''}
        ${ex.goal?`<span class="ep-goal">${esc(ex.goal)}</span>`:''}
      </div>`:''}
      ${renderLastSession(ex.name)}
      ${sets}
      ${ex.note?`<div class="ex-note"><span class="ex-note-t">Nota de tu coach</span>${esc(ex.note)}</div>`:''}
      ${routineLocked()?'':`<button class="add-set" data-action="addset" data-ex="${ex.id}">+ Serie</button>`}
      ${ex.rest?`<button class="rest-btn-full" data-action="rest-from-ex" data-sec="${parseRest(ex.rest)}"><span class="rbf-play">${playSvg} Iniciar descanso</span><span class="rbf-time">${esc(ex.rest)}</span></button>`:''}
    </div>`;
  } catch(err) {
    // Ojo acá: si lo que reventó fue justo leer una propiedad de ex (ex.name, ex.id),
    // volver a leerla para armar el mensaje de error vuelve a tirar, esta vez sin nadie
    // que lo atajé. Cada lectura de ex.* en este catch va en su propio try chico.
    let safeName = "Ejercicio", safeId = "";
    try { safeName = ex && ex.name ? String(ex.name) : safeName; } catch(e2) {}
    try { safeId = ex && ex.id ? String(ex.id) : safeId; } catch(e2) {}
    console.error("renderEntreno: error al renderizar el ejercicio", safeId, safeName, err);
    return `<div class="card"><div class="card-head"><span class="ex-name" style="color:var(--red)">⚠ ${esc(safeName)} — no se pudo mostrar</span></div></div>`;
  } }).join("");
  return `
    ${renderBlockBanner()}
    ${routineLocked()?'<div class="coach-banner">Rutina asignada por tu coach</div>':''}
    <div class="tabs">${tabs}</div>
    <div class="day-head" data-reveal="dayhead-${d.id}">
      <div class="day-top">
        <input class="day-name" type="text" value="${esc(d.name)}" data-action="dayname" ${routineLocked()?'readonly':''}>
        ${routineLocked()?'':`<button class="day-del" data-action="delday" title="Eliminar día">${trashSvg}</button>`}
      </div>
      <input class="day-sub" type="text" value="${esc(d.subtitle)}" placeholder="Grupos musculares…" data-action="subtitle" ${routineLocked()?'readonly':''}>
      <div class="progress-row">
        <div class="bar"><div style="width:${pct}%"></div></div>
        <span class="count">${done}/${total} series</span>
        <button class="clear" data-action="clear">Limpiar</button>
      </div>
    </div>
    ${cards || '<div class="empty">Día vacío.<br>' + (routineLocked()?'Tu coach todavía no te cargó ejercicios.':'Agregá ejercicios acá abajo 👇') + '</div>'}
    ${routineLocked()?'':'<button class="add-ex" data-action="ex-add-open">+ Agregar ejercicio</button>'}
    ${renderDayNotes(d)}
    ${d.exercises.length ? '<button class="save-session" data-action="save-session">'+checkSvg+' Guardar entreno de hoy</button>' : ''}
    ${routineLocked() ? '' : '<button class="load-def" data-action="load-default-routine">'+resetSvg+' Cargar Meso 2 · Microciclo 8</button>'}
    <p class="foot">${State.cloudUser ? 'Sincronizado con tu cuenta' : 'Se guarda solo en este dispositivo'}</p>`;
}

export function renderExList(){
  const nq = norm(EntrenoState.exQuery);
  if(nq){
    const all=[]; for(const k in EX_DB){ EX_DB[k].forEach(n=>all.push(n)); }
    const res = all.filter(n=>norm(n).includes(nq)).slice(0,60);
    return res.length ? res.map(n=>`<button class="ex-pick" data-action="ex-choose" data-name="${esc(n)}">${esc(n)}</button>`).join("") : '<div class="cal-hint">Sin resultados</div>';
  }
  return (EX_DB[EntrenoState.exCat]||[]).map(n=>`<button class="ex-pick" data-action="ex-choose" data-name="${esc(n)}">${esc(n)}</button>`).join("");
}

export function renderExSheet(){
  if(!EntrenoState.exPicker) return "";
  const chips = EX_CATS.map(c=>`<button class="ex-chip${EntrenoState.exCat===c[0]?' on':''}" data-action="ex-cat" data-cat="${c[0]}">${c[1]}</button>`).join("");
  return `
    <div class="sheet-bg" data-action="ex-cancel"></div>
    <div class="sheet ex-sheet">
      <div class="sheet-title">${EntrenoState.exPicker.mode==="swap"?"Cambiar ejercicio":"Elegir ejercicio"}</div>
      <div class="search-wrap"><span class="search-ic">${searchSvg}</span><input class="ex-search" id="exSearch" type="text" placeholder="Buscar ejercicio…" value="${esc(EntrenoState.exQuery)}" data-action="ex-search"></div>
      <div class="ex-chips">${chips}</div>
      <div class="ex-list" id="exList">${renderExList()}</div>
      <button class="ex-custom" data-action="ex-custom">${pencilSvg} ${EntrenoState.exPicker.mode==="swap"?"Escribir nombre propio":"Agregar con nombre propio"}</button>
      <button class="ctrl ghost" style="max-width:none;width:100%;margin-top:10px" data-action="ex-cancel">Cancelar</button>
    </div>`;
}

export function exerciseIsLivePR(ex){
  const best=bestSetOf(ex.sets);
  if(!best) return false;
  const prev=bestKgBefore(ex.name, state.sessions);
  return prev!==null && best.kg>prev;
}
