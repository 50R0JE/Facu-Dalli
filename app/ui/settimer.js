// Cronómetro de las series por tiempo (plancha, isométricos, colgado de barra…).
// Un solo cronómetro a la vez. Con objetivo cuenta hacia atrás y al llegar a 0 suena, vibra
// y avisa (onDone) para anotar los segundos y marcar la serie. Sin objetivo cuenta hacia
// arriba hasta que se toca de nuevo. El tiempo sale de Date.now(), no de contar ticks: si el
// celular se bloquea o la app pasa a segundo plano, al volver sigue en el segundo correcto.
// Mientras corre se pide mantener la pantalla prendida (si el navegador lo permite).

import { beep, initAudio } from './audio.js';

import { fmtSecs } from '../core/utils.js';

let T = null; // { setId, start, target, iv, onDone, lock }

const elapsed = () => T ? (Date.now() - T.start) / 1000 : 0;

export function runningSetId(){ return T ? T.setId : null; }

// Texto del botón: lo que falta (o lo que va, sin objetivo) si está corriendo; si no, el objetivo.
export function timerText(setId, target){
  if(T && T.setId === setId) return T.target ? fmtSecs(Math.max(0, Math.ceil(T.target - elapsed()))) : fmtSecs(Math.floor(elapsed()));
  return target ? fmtSecs(target) : "Iniciar";
}

function paint(){
  if(!T) return;
  document.querySelectorAll('.tmr[data-set]').forEach(b => {
    const on = b.dataset.set === T.setId;
    b.classList.toggle("run", on);
    if(on){ const t = b.querySelector(".tmr-t"); if(t) t.textContent = timerText(T.setId, T.target); }
  });
}

async function keepAwake(){ try{ if(navigator.wakeLock && T) T.lock = await navigator.wakeLock.request("screen"); }catch(e){} }

// Frena el cronómetro que esté corriendo. Devuelve { setId, secs } con lo que alcanzó a correr.
export function stopTimer(){
  if(!T) return null;
  const t = T; T = null;
  clearInterval(t.iv);
  try{ if(t.lock) t.lock.release(); }catch(e){}
  document.querySelectorAll('.tmr.run').forEach(b => b.classList.remove("run"));
  const e = Math.round((Date.now() - t.start) / 1000);
  return { setId: t.setId, secs: t.target ? Math.min(e, t.target) : e };
}

export function startTimer(setId, target, onDone){
  stopTimer();
  initAudio(); // el primer toque del usuario habilita el sonido en iPhone
  T = { setId, start: Date.now(), target: +target || 0, onDone };
  T.iv = setInterval(() => {
    if(!T) return;
    paint();
    if(T.target && elapsed() >= T.target){
      const cb = T.onDone, tg = T.target;
      stopTimer();
      beep();
      if(cb) cb(tg);
    }
  }, 250);
  keepAwake();
  paint();
}

// Si la app vuelve de segundo plano con el objetivo ya cumplido, termina enseguida.
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible" && T) paint(); });
