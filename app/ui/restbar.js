import { xSvg } from '../core/icons.js';

import { state } from '../core/state.js';

import { save } from '../core/storage.js';

import { beep, initAudio } from './audio.js';

export let rest = {active:false,total:0,remaining:0,id:null};

export function parseRest(txt){
  if(!txt) return 0;
  const t=String(txt).trim();
  let m=t.match(/(\d+):(\d+)/);
  if(m) return (+m[1])*60 + (+m[2]);
  m=t.match(/(\d+)\s*['\u2032]/);
  if(m) return (+m[1])*60;
  m=t.match(/(\d+)/);
  if(m){ const n=+m[1]; return n<=10 ? n*60 : n; }
  return 0;
}

export function restFmt(s){ const m=Math.floor(s/60), x=s%60; return m+":"+String(x).padStart(2,"0"); }

export function startRest(sec){ sec = sec || state.restDefault || 120; state.restDefault = sec; initAudio(); rest.active=true; rest.total=sec; rest.remaining=sec; if(rest.id) clearInterval(rest.id); rest.id=setInterval(restTick,1000); renderRestBar(); save(); }

export function restTick(){ if(!rest.active) return; rest.remaining--; if(rest.remaining<=0) restFinish(); else updateRestBar(); }

export function restFinish(){ rest.active=false; if(rest.id){ clearInterval(rest.id); rest.id=null; } try{ beep(); }catch(e){} renderRestBar(true); setTimeout(()=>{ if(!rest.active) renderRestBar(); }, 6000); }

export function stopRest(){ rest.active=false; if(rest.id){ clearInterval(rest.id); rest.id=null; } renderRestBar(); }

export function updateRestBar(){ const t=document.getElementById("restTime"); if(t) t.textContent=restFmt(rest.remaining); const b=document.getElementById("restProg"); if(b&&rest.total) b.style.transform="scaleX("+Math.max(0,Math.min(1,1-rest.remaining/rest.total))+")"; }

export function renderRestBar(finished){
  const el=document.getElementById("restBar"); if(!el) return;
  if(finished){ el.style.display="block"; el.innerHTML='<div class="rest-inner rest-done"><span class="rest-msg">¡Descanso terminado! 💪</span><button class="rest-x" data-action="rest-stop">Cerrar</button></div>'; return; }
  if(rest.active){
    el.style.display="block";
    el.innerHTML='<div class="rest-inner"><span class="rest-lbl2">Descanso</span><span id="restTime" class="rest-time">'+restFmt(rest.remaining)+'</span><button class="rest-x" data-action="rest-stop" title="Saltar">'+xSvg+'</button><div class="rest-prog-track"><div id="restProg" class="rest-prog" style="transform:scaleX('+Math.max(0,Math.min(1,1-rest.remaining/rest.total))+')"></div></div></div>';
    return;
  }
  el.style.display="none"; el.innerHTML="";
}
