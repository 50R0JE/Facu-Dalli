import { DEFAULT, PPL_DAYS } from './core/data.js';

import { auIcoEye, auIcoEyeOff, checkSvg } from './core/icons.js';

import { State, state } from './core/state.js';

import { migrateNames, save } from './core/storage.js';

import { afterLogin, cloudBoot, cloudDeletePhoto, cloudDeleteSession, cloudSaveCheckin, cloudSaveDaily, cloudSessionFeedback, cloudUploadPhoto, loadCloud } from './core/supabase.js';

import { fmt, hkey, mkEx, mkSet, mondayOf, muscleOf, tabRipple, today, uid } from './core/utils.js';

import { showLogin } from './screens/auth.js';

import { CardioState, renderCardio } from './screens/cardio.js';

import { CheckinState, renderFeedback, saveSession } from './screens/checkin.js';

import { openClient } from './screens/coach/clientes.js';

import { renderCoach } from './screens/coach/index.js';

import { coachPlanObj, cpApply, loadTpls, planDefault, renderApplyPicker, renderCoachPicker, rtDays } from './screens/coach/rutinas.js';

import { CoachState } from './screens/coach/state.js';

import { ComidaState, animateCalRing, calcTarget, entryBase, lastResults, previewStr, renderComida, renderResults } from './screens/comida.js';

import { EntrenoState, day, expandedOverride, liveCounting, renderEntreno, renderExList, renderExSheet, routineLocked, startLive, stopLive } from './screens/entreno.js';

import { HabitosState, addHabit, checkDaily, renderHabitos } from './screens/habitos.js';

import { ProgresoState, allSetsDone, renderProgreso } from './screens/progreso.js';

import { beep, initAudio } from './ui/audio.js';

import { showSilkBg } from './ui/background.js';

import { renderRestBar, startRest, stopRest } from './ui/restbar.js';

import { initScrollReveal, setupExerciseFocus } from './ui/scrollfocus.js';

import { SheetState, closeSheet, collapseExerciseAnimated, renderSheet } from './ui/sheet.js';
import { renderConfig } from './screens/config.js';

export function renderApp(){
  setTimeout(renderFeedback,0);
  checkDaily();
  document.getElementById("nav-entreno").classList.toggle("active", State.view==="entreno");
  document.getElementById("nav-habitos").classList.toggle("active", State.view==="habitos");
  document.getElementById("nav-cardio").classList.toggle("active", State.view==="cardio");
  document.getElementById("nav-comida").classList.toggle("active", State.view==="comida");
  document.getElementById("nav-progreso").classList.toggle("active", State.view==="progreso");
  const _cfgBtn = document.getElementById("nav-config");
  if (_cfgBtn) _cfgBtn.classList.toggle("active", State.view==="config");
  if (State.view === "config") {
    showSilkBg();
    document.body.classList.remove("silk-coach");
    const v0 = document.getElementById("view");
    v0.innerHTML = renderConfig();
    const sh0 = document.getElementById("sheetHost"); if (sh0) sh0.innerHTML = "";
    return;
  }
  showSilkBg();
  document.body.classList.remove("silk-coach");
  const v = document.getElementById("view");
  v.innerHTML = State.view==="entreno" ? renderEntreno() : State.view==="habitos" ? renderHabitos() : State.view==="cardio" ? renderCardio() : State.view==="comida" ? renderComida() : renderProgreso();
  if (State.view==="comida") animateCalRing();
  initScrollReveal();
  setupExerciseFocus();
  renderRestBar();
  const _sh=document.getElementById("sheetHost"); if(_sh) _sh.innerHTML = EntrenoState.exPicker ? renderExSheet() : ((State.view==="comida" && (ComidaState.selectedFood||ComidaState.editEntry)) ? renderSheet() : "");
  if (State.view==="habitos" && HabitosState.pendingFocusHabit) { const i=document.getElementById("habitInput"); if(i) i.focus(); HabitosState.pendingFocusHabit=false; }
  if (State.view==="entreno" && HabitosState.pendingFocusDay) { const i=v.querySelector(".day-name"); if(i){ i.focus(); i.select(); } HabitosState.pendingFocusDay=false; }
}

export function tick(){
  const now = Date.now();
  if (CardioState.tmRunning){
    const rem = CardioState.tmEndTs - now;
    if (rem <= 0){ CardioState.tmRunning=false; CardioState.tmRemainingMs=0; CardioState.tmFinished=true; beep(); if(State.view==="cardio") renderApp(); }
    else { CardioState.tmRemainingMs = rem; if(State.view==="cardio" && CardioState.cardioMode==="timer"){ const el=document.getElementById("tmTime"); if(el) el.textContent=fmt(rem,true); } }
  }
  if (CardioState.swRunning && State.view==="cardio" && CardioState.cardioMode==="stopwatch"){ const el=document.getElementById("swTime"); if(el) el.textContent=fmt(CardioState.swAccum+(now-CardioState.swStartTs)); }
}

setInterval(tick, 100);

document.body.addEventListener("input", async e => {
  const t = e.target, a = t.dataset.action; if(!a) return;
  if (a === "tm-min" || a === "tm-sec") {
    const mEl=document.getElementById("tmMin"), sEl=document.getElementById("tmSec");
    const mm=parseInt(mEl&&mEl.value)||0, ss=parseInt(sEl&&sEl.value)||0;
    CardioState.tmTarget = Math.min(3600000, Math.max(1000, (mm*60+ss)*1000)); CardioState.tmRemainingMs = CardioState.tmTarget;
    const disp=document.getElementById("tmTime"); if(disp) disp.textContent = fmt(CardioState.tmTarget); return;
  }
  if (a === "food-search") { ComidaState.foodQuery = t.value; const r=document.getElementById("foodResults"); if(r) r.innerHTML = renderResults(ComidaState.foodQuery); return; }
  if (a === "ex-search") { EntrenoState.exQuery = t.value; const l=document.getElementById("exList"); if(l) l.innerHTML = renderExList(); return; }
  if (a === "portion-grams") { const base = ComidaState.selectedFood ? ComidaState.selectedFood : (ComidaState.editEntry ? entryBase(ComidaState.editEntry) : null); if(base){ const pv=document.getElementById("portionPreview"); if(pv) pv.textContent = previewStr(base, t.value); } return; }
  if (a === "cf-field") { ComidaState.foodForm[t.dataset.field] = t.value; return; }
  if (a === "cal-field") { ComidaState.calForm[t.dataset.field] = t.value; return; }
  if (a === "wkg-field") { ProgresoState.weightForm.kg = t.value; return; }
  const d = day();
  if (a === "dayname") d.name = t.value;
  else if (a === "subtitle") d.subtitle = t.value;
  else if (a === "exname") { const ex=d.exercises.find(x=>x.id===t.dataset.ex); if(ex) ex.name=t.value; }
  else if (a === "kg" || a === "reps") { const ex=d.exercises.find(x=>x.id===t.dataset.ex); const s=ex&&ex.sets.find(x=>x.id===t.dataset.set); if(s) s[a]=t.value; }
  else return;
  save();
});

document.body.addEventListener("keydown", async e => {
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.action === "habit-name-input") { e.preventDefault(); addHabit(); }
  if (e.key === "Enter" && e.target.classList && e.target.classList.contains("auth-in")) {
    e.preventDefault();
    const btn = document.querySelector('#authHost .auth-btn[data-auth^="do-"]');
    if (btn && !btn.disabled) btn.click();
  }
  if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("auth-switch")) {
    e.preventDefault(); e.target.click();
  }
});

document.body.addEventListener("change", async e => {
  const t=e.target, a=t.dataset.action; if(!a) return;
  if (a === "wdate-field") { ProgresoState.weightForm.date = t.value; return; }
  if (a === "daily-kg" || a === "daily-steps" || a === "daily-com") { CheckinState.dailyForm = CheckinState.dailyForm || Object.assign({}, state.daily[today()]||{}); CheckinState.dailyForm[a==="daily-kg"?"kg":(a==="daily-steps"?"steps":"comment")] = t.value; return; }
  if (a === "ci-set") { CheckinState.checkinForm = CheckinState.checkinForm || JSON.parse(JSON.stringify(state.checkins[mondayOf(today())]||{})); CheckinState.checkinForm[t.dataset.k] = t.value; return; }
  if (a === "load-ex") { EntrenoState.loadEx = t.value; renderApp(); return; }
  if (a === "photo-pick") { const file=t.files&&t.files[0]; if(file){ try{ await cloudUploadPhoto(file); }catch(err){ alert("No se pudo subir la foto: "+((err&&err.message)||err)); } } t.value=""; return; }
});

document.body.addEventListener("mousemove", e => {
  const t = e.target.closest(".tab"); if(!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty("--gx", (e.clientX-r.left)+"px");
  t.style.setProperty("--gy", (e.clientY-r.top)+"px");
});

document.body.addEventListener("click", async e => {
  const tabBtn = e.target.closest(".tab");
  if (tabBtn) tabRipple(tabBtn, e.clientX, e.clientY);
  const navBtn = e.target.closest("[data-view]");
  if (navBtn) { State.view = navBtn.dataset.view; ComidaState.selectedFood=null; ComidaState.editEntry=null; ComidaState.calEditing=false; ComidaState.creatingFood=false; EntrenoState.exPicker=null; renderApp(); return; }
  const el = e.target.closest("[data-action]"); if(!el) return;
  const a = el.dataset.action;
  if (routineLocked() && ["addday","delday","removeex","addset","removeset","ex-add-open","ex-swap","ex-insert","ex-choose","ex-custom","load-default-routine"].indexOf(a)>=0) return;

  // Hábitos
  if (a === "habit-add") { addHabit(); return; }
  if (a === "chabit-toggle") { const k=hkey(el.dataset.name); state.habitsDone[k]=!state.habitsDone[k]; save(); renderApp(); return; }
  if (a === "habit-toggle") { const h=state.habits.find(x=>x.id===el.dataset.id); if(h) h.done=!h.done; save(); renderApp(); return; }
  if (a === "habit-remove") { state.habits = state.habits.filter(x=>x.id!==el.dataset.id); save(); renderApp(); return; }

  // Cardio
  if (a === "cardio-mode") { CardioState.cardioMode = el.dataset.mode; renderApp(); return; }
  if (a === "sw-toggle") { if(CardioState.swRunning){ CardioState.swAccum+=Date.now()-CardioState.swStartTs; CardioState.swRunning=false; } else { CardioState.swStartTs=Date.now(); CardioState.swRunning=true; } renderApp(); return; }
  if (a === "sw-lap") { CardioState.swLaps.push(CardioState.swAccum+(Date.now()-CardioState.swStartTs)); renderApp(); return; }
  if (a === "sw-reset") { CardioState.swRunning=false; CardioState.swAccum=0; CardioState.swStartTs=0; CardioState.swLaps=[]; renderApp(); return; }
  if (a === "tm-preset") { CardioState.tmTarget=parseInt(el.dataset.sec)*1000; CardioState.tmRemainingMs=CardioState.tmTarget; CardioState.tmFinished=false; renderApp(); return; }
  if (a === "tm-toggle") { if(CardioState.tmRunning){ CardioState.tmRemainingMs=Math.max(0,CardioState.tmEndTs-Date.now()); CardioState.tmRunning=false; } else { initAudio(); CardioState.tmEndTs=Date.now()+CardioState.tmRemainingMs; CardioState.tmRunning=true; CardioState.tmFinished=false; } renderApp(); return; }
  if (a === "tm-reset") { CardioState.tmRunning=false; CardioState.tmFinished=false; CardioState.tmRemainingMs=CardioState.tmTarget; renderApp(); return; }

  // Comida
  if (a === "cal-open") { ComidaState.calForm = state.calProfile ? Object.assign({sex:"m",age:"",height:"",weight:"",activity:"mod",goal:"mantener"}, state.calProfile) : {sex:"m",age:"",height:"",weight:"",activity:"mod",goal:"mantener"}; ComidaState.calEditing=true; renderApp(); return; }
  if (a === "cal-cancel") { ComidaState.calEditing=false; renderApp(); return; }
  if (a === "cal-sex") { ComidaState.calForm.sex = el.dataset.val; renderApp(); return; }
  if (a === "cal-activity") { ComidaState.calForm.activity = el.dataset.val; renderApp(); return; }
  if (a === "cal-goal") { ComidaState.calForm.goal = el.dataset.val; renderApp(); return; }
  if (a === "cal-calc") {
    if(!(+ComidaState.calForm.age>0) || !(+ComidaState.calForm.height>0) || !(+ComidaState.calForm.weight>0)){ alert("Completá edad, altura y peso."); return; }
    state.calProfile = Object.assign({}, ComidaState.calForm); state.calTarget = calcTarget(ComidaState.calForm); ComidaState.calEditing=false; save(); renderApp(); return;
  }
  if (a === "cal-manual") { const m=parseInt((document.getElementById("calManual")||{}).value); if(m>0){ state.calTarget=m; ComidaState.calEditing=false; save(); renderApp(); } else alert("Ingresá un número de calorías válido."); return; }
  if (a === "food-create-open") { ComidaState.foodForm={name:"",kcal:"",p:"",c:"",f:"",unit:"g"}; ComidaState.creatingFood=true; renderApp(); return; }
  if (a === "food-create-cancel") { ComidaState.creatingFood=false; renderApp(); return; }
  if (a === "cf-unit") { ComidaState.foodForm.unit = el.dataset.val; renderApp(); return; }
  if (a === "food-create-save") {
    if(!ComidaState.foodForm.name.trim() || !(+ComidaState.foodForm.kcal>=0) || ComidaState.foodForm.kcal===""){ alert("Poné al menos nombre y calorías."); return; }
    state.foods.push({ name:ComidaState.foodForm.name.trim(), kcal:+ComidaState.foodForm.kcal||0, p:+ComidaState.foodForm.p||0, c:+ComidaState.foodForm.c||0, f:+ComidaState.foodForm.f||0, portion:100, unit:ComidaState.foodForm.unit||"g" });
    ComidaState.creatingFood=false; ComidaState.foodQuery=ComidaState.foodForm.name.trim(); save(); renderApp(); return;
  }
  if (a === "food-pick") { SheetState.sheetGen++; ComidaState.selectedFood = lastResults[parseInt(el.dataset.idx)]; renderApp(); return; }
  if (a === "portion-cancel") { closeSheet(()=>{ ComidaState.selectedFood=null; ComidaState.editEntry=null; renderApp(); }); return; }
  if (a === "portion-add") {
    const g = parseFloat((document.getElementById("portionGrams")||{}).value); if(!(g>0)){ return; }
    const f = ComidaState.selectedFood; if(!f){ return; } const fc = g/100;
    state.diary.push({ id:uid(), name:f.name, grams:Math.round(g), kcal:Math.round(f.kcal*fc), p:+(f.p*fc).toFixed(1), c:+(f.c*fc).toFixed(1), f:+(f.f*fc).toFixed(1), unit:f.unit||"g", base:{kcal:f.kcal,p:f.p,c:f.c,f:f.f,unit:f.unit||"g"} });
    save(); closeSheet(()=>{ ComidaState.selectedFood=null; renderApp(); }); return;
  }
  if (a === "portion-save") {
    const g = parseFloat((document.getElementById("portionGrams")||{}).value); if(!(g>0)){ return; }
    const e = ComidaState.editEntry; if(!e){ return; } const base=entryBase(e); const fc=g/100;
    e.grams=Math.round(g); e.kcal=Math.round(base.kcal*fc); e.p=+(base.p*fc).toFixed(1); e.c=+(base.c*fc).toFixed(1); e.f=+(base.f*fc).toFixed(1); e.unit=base.unit||"g"; e.base=base;
    save(); closeSheet(()=>{ ComidaState.editEntry=null; renderApp(); }); return;
  }
  if (a === "diary-edit") { SheetState.sheetGen++; ComidaState.editEntry = state.diary.find(x=>x.id===el.dataset.id)||null; ComidaState.selectedFood=null; renderApp(); return; }
  if (a === "diary-remove") { state.diary = state.diary.filter(x=>x.id!==el.dataset.id); save(); renderApp(); return; }

  // Pasos
  if (a === "steps-add") { state.steps = Math.max(0,(state.steps||0)+parseInt(el.dataset.n)); save(); renderApp(); return; }
  if (a === "steps-set") { const n=parseInt((document.getElementById("stepInput")||{}).value); if(n>=0){ state.steps=n; save(); renderApp(); } else alert("Pon\u00e9 un n\u00famero v\u00e1lido."); return; }
  if (a === "steps-goal") { const g=prompt("Meta diaria de pasos:", state.stepsGoal||10000); if(g!==null){ const n=parseInt(g); if(n>0){ state.stepsGoal=n; save(); renderApp(); } } return; }
  if (a === "steps-live") { if(liveCounting) stopLive(); else startLive(); return; }

  // Ejercicios (picker)
  if (a === "ex-add-open") { SheetState.sheetGen++; EntrenoState.exPicker={mode:"add"}; EntrenoState.exCat="pecho"; EntrenoState.exQuery=""; renderApp(); return; }
  if (a === "ex-swap") { SheetState.sheetGen++; EntrenoState.exPicker={mode:"swap", exId:el.dataset.ex}; EntrenoState.exCat="pecho"; EntrenoState.exQuery=""; renderApp(); return; }
  if (a === "ex-insert") { SheetState.sheetGen++; EntrenoState.exPicker={mode:"insert", idx:(+el.dataset.i||0)}; EntrenoState.exCat="pecho"; EntrenoState.exQuery=""; renderApp(); return; }
  if (a === "ex-cat") {
    EntrenoState.exCat=el.dataset.cat; EntrenoState.exQuery="";
    document.querySelectorAll("#sheetHost .ex-chip").forEach(c=>c.classList.toggle("on", c.dataset.cat===EntrenoState.exCat));
    const sEl=document.getElementById("exSearch"); if(sEl) sEl.value="";
    const l=document.getElementById("exList"); if(l) l.innerHTML = renderExList();
    return;
  }
  if (a === "ex-cancel") { closeSheet(()=>{ EntrenoState.exPicker=null; renderApp(); }); return; }
  if (a === "ex-choose") { const name=el.dataset.name; const d=day(); const mm=(muscleOf(name)!=="otros")?muscleOf(name):EntrenoState.exCat; if(EntrenoState.exPicker && EntrenoState.exPicker.mode==="swap"){ const ex=d.exercises.find(x=>x.id===EntrenoState.exPicker.exId); if(ex){ ex.name=name; ex.mus=mm; } } else if(EntrenoState.exPicker && EntrenoState.exPicker.mode==="insert"){ d.exercises.splice(EntrenoState.exPicker.idx,0,mkEx(name,2,mm)); } else { d.exercises.push(mkEx(name,2,mm)); } save(); closeSheet(()=>{ EntrenoState.exPicker=null; renderApp(); }); return; }
  if (a === "ex-custom") { const nm=prompt(EntrenoState.exPicker&&EntrenoState.exPicker.mode==="swap"?"Nuevo nombre del ejercicio:":"Nombre del ejercicio:",""); if(nm && nm.trim()){ const d=day(); const mm=EntrenoState.exCat; if(EntrenoState.exPicker&&EntrenoState.exPicker.mode==="swap"){ const ex=d.exercises.find(x=>x.id===EntrenoState.exPicker.exId); if(ex){ ex.name=nm.trim(); ex.mus=mm; } } else if(EntrenoState.exPicker&&EntrenoState.exPicker.mode==="insert"){ d.exercises.splice(EntrenoState.exPicker.idx,0,mkEx(nm.trim(),2,mm)); } else { d.exercises.push(mkEx(nm.trim(),2,mm)); } save(); closeSheet(()=>{ EntrenoState.exPicker=null; renderApp(); }); } return; }

  // Peso corporal
  if (a === "daily-save") {
    const d = CheckinState.dailyForm || {};
    const kg = parseFloat(String(d.kg||"").replace(",","."));
    const rec = Object.assign({}, state.daily[today()]||{}, d);
    state.daily[today()] = rec;
    if(kg>0){ const exw=state.weights.find(w=>w.date===today()); if(exw) exw.kg=kg; else state.weights.push({id:uid(), date:today(), kg:kg}); }
    CheckinState.dailyForm=null; save(); try{ cloudSaveDaily(today(), rec); }catch(e){}
    alert("Registro guardado \u2713"); renderApp(); return;
  }
  if (a === "fb-set") { CheckinState.fbForm=CheckinState.fbForm||{}; CheckinState.fbForm[el.dataset.k]=el.dataset.v; renderFeedback(); return; }
  if (a === "fb-skip") { CheckinState.fbSession=null; CheckinState.fbForm=null; CheckinState.newPRs=[]; renderApp(); return; }
  if (a === "fb-save") {
    const se=state.sessions.find(x=>x.id===CheckinState.fbSession); const f=CheckinState.fbForm||{};
    if(se){ if(f.rpe) se.rpe=+f.rpe; if(f.pump) se.pump=+f.pump; if(f.joint) se.joint=(f.joint==="S\u00ed"); save(); try{ cloudSessionFeedback(se); }catch(e){} }
    CheckinState.fbSession=null; CheckinState.fbForm=null; CheckinState.newPRs=[]; renderApp(); return;
  }
  if (a === "ci-open") { CheckinState.checkinOpen=true; CheckinState.checkinForm=null; renderApp(); return; }
  if (a === "photo-del") { const path=el.dataset.path, id=el.dataset.id; try{ await cloudDeletePhoto(id, path); }catch(e){} return; }
  if (a === "ci-close") { CheckinState.checkinOpen=false; CheckinState.checkinForm=null; renderApp(); return; }
  if (a === "ci-adh") { CheckinState.checkinForm = CheckinState.checkinForm || JSON.parse(JSON.stringify(state.checkins[mondayOf(today())]||{})); CheckinState.checkinForm.adherence = parseInt(el.dataset.v); renderApp(); return; }
  if (a === "ci-save") {
    const wk = mondayOf(today());
    const f = CheckinState.checkinForm || {};
    state.checkins[wk] = Object.assign({}, state.checkins[wk]||{}, f);
    CheckinState.checkinOpen=false; CheckinState.checkinForm=null; save();
    try{ cloudSaveCheckin(wk, state.checkins[wk]); }catch(e){}
    alert("\u00a1Check-in enviado a tu coach! 💪"); renderApp(); return;
  }
  if (a === "daily-set") { CheckinState.dailyForm = CheckinState.dailyForm || Object.assign({}, state.daily[today()]||{}); CheckinState.dailyForm[el.dataset.k] = el.dataset.v; renderApp(); return; }
  if (a === "weight-save") { const dEl=document.getElementById("wDate"), kEl=document.getElementById("wKg"); const date=dEl?dEl.value:""; const kg=parseFloat((kEl?kEl.value:"").replace(",",".")); if(!date){ alert("Elegí una fecha."); return; } if(!(kg>0)){ alert("Poné un peso válido."); return; } const exw=state.weights.find(w=>w.date===date); if(exw) exw.kg=kg; else state.weights.push({id:uid(),date,kg}); ProgresoState.weightForm={date:today(),kg:""}; save(); renderApp(); return; }
  if (a === "weight-edit") { const w=state.weights.find(x=>x.id===el.dataset.id); if(w){ ProgresoState.weightForm={date:w.date,kg:String(w.kg)}; } renderApp(); return; }
  if (a === "weight-remove") { state.weights=state.weights.filter(x=>x.id!==el.dataset.id); save(); renderApp(); return; }

  // Agua
  if (a === "water-add") { const n=parseInt(el.dataset.n)||0; state.water=Math.max(0,(state.water||0)+n); save(); renderApp(); return; }
  if (a === "water-goal") { const v=prompt("Meta de agua en ml (ej: 3000):", String(Math.round(state.waterGoal||3000))); if(v!==null){ const n=parseInt(v); if(n>0){ state.waterGoal=n; save(); renderApp(); } } return; }
  if (a === "rest-set") { startRest(parseInt(el.dataset.sec)||120); return; }
  if (a === "rest-pick") { state.restDefault = parseInt(el.dataset.sec)||120; save(); renderRestBar(); return; }
  if (a === "rest-play") { startRest(state.restDefault||120); return; }
  if (a === "rest-from-ex") { const sc=parseInt(el.dataset.sec)||0; if(sc>0) startRest(sc); return; }
  if (a === "rest-stop") { stopRest(); return; }
  if (a === "save-session") { saveSession(); return; }
  if (a === "session-remove") { if(confirm("¿Borrar este entreno del historial?")){ const _s=state.sessions.find(x=>x.id===el.dataset.id); if(_s&&_s.cloudId){ try{ cloudDeleteSession(_s.cloudId); }catch(e){} } state.sessions=state.sessions.filter(x=>x.id!==el.dataset.id); save(); renderApp(); } return; }

  // Días
  if (a === "load-default-routine") { if(confirm("Esto reemplaza tus días de rutina por el Meso 2 \u00b7 Microciclo 8 (Torso / Piernas / Pecho-Espalda-Hombro / Pierna-Brazo). No toca tus pesos, sesiones ni h\u00e1bitos. \u00bfSeguro?")){ state.days = JSON.parse(JSON.stringify(DEFAULT.days)); State.activeId = state.days[0].id; save(); renderApp(); } return; }
  if (a === "addday") { const nd={id:uid(),name:"Nuevo",subtitle:"",exercises:[]}; state.days.push(nd); State.activeId=nd.id; HabitosState.pendingFocusDay=true; save(); renderApp(); return; }
  if (a === "delday") { if(state.days.length<=1){ alert("Tiene que quedar al menos un día."); return; } if(confirm("¿Eliminar este día?")){ state.days=state.days.filter(x=>x.id!==State.activeId); State.activeId=state.days[0].id; save(); renderApp(); } return; }

  // Entreno
  if (a === "tab") { State.activeId = el.dataset.day; setTimeout(renderApp, 130); return; } // deja ver el ripple antes del rerender
  const d = day();
  const ex = el.dataset.ex && d.exercises.find(x=>x.id===el.dataset.ex);
  if (a === "toggle") {
    const s=ex.sets.find(x=>x.id===el.dataset.set);
    const wasDone=allSetsDone(ex);
    s.done=!s.done;
    save();
    const nowDone=allSetsDone(ex);
    // Se acaba de completar recién ahora (no estaba reabierto a mano) -> animar el
    // colapso. Si ya estaba todo tildado y esto es una corrección (reabierto), o si
    // se destildó, el render es inmediato como siempre.
    if(!wasDone && nowDone && !expandedOverride.has(ex.id)){ collapseExerciseAnimated(ex.id, renderApp); }
    else { renderApp(); }
    return;
  }
  if (a === "ex-expand") { expandedOverride.add(ex.id); renderApp(); return; }
  if (a === "ex-collapse") { collapseExerciseAnimated(ex.id, ()=>{ expandedOverride.delete(ex.id); renderApp(); }); return; }
  if (a === "addset") { ex.sets.push(mkSet()); }
  else if (a === "removeset") { ex.sets = ex.sets.filter(x=>x.id!==el.dataset.set); }
  else if (a === "removeex") { d.exercises = d.exercises.filter(x=>x.id!==el.dataset.ex); }
  else if (a === "clear") { d.exercises.forEach(x=>x.sets.forEach(s=>s.done=false)); }
  else return;
  save(); renderApp();
});

document.body.addEventListener("click", e=>{
  const tg=e.target.closest("[data-toggle-pass]"); if(!tg) return;
  const inp=document.getElementById("auPass"); if(!inp) return;
  const showingText = inp.type==="text";
  inp.type = showingText ? "password" : "text";
  tg.setAttribute("aria-label", showingText ? "Mostrar contraseña" : "Ocultar contraseña");
  tg.innerHTML = showingText ? auIcoEye : auIcoEyeOff;
});

document.body.addEventListener("click", async e=>{
  const b=e.target.closest("[data-auth]"); if(!b) return;
  const a=b.dataset.auth;
  if(a==="to-signup"){ showLogin("","up"); return; }
  if(a==="to-login"){ showLogin("","in"); return; }
  if(a==="logout"){ try{ await State.sb.auth.signOut(); }catch(e){} location.reload(); return; }
  if(a==="join"){ const code=((document.getElementById("joinCode")||{}).value||"").trim(); if(!code){ alert("Poné el código de tu coach."); return; } try{ const r=await State.sb.rpc("join_coach",{code:code}); if(r.data===true){ const pr=await State.sb.from("profiles").select("*").eq("id",State.cloudUser.id).maybeSingle(); if(pr.data) State.cloudProfile=pr.data; await loadCloud(); alert("¡Listo! Te vinculaste con tu coach."); renderApp(); } else { alert("Código inválido. Revisalo con tu coach."); } }catch(err){ alert("No se pudo vincular: "+((err&&err.message)||err)); } return; }
  if(a==="do-login"||a==="do-signup"){
    const mode = a==="do-signup"?"up":"in";
    const email=((document.getElementById("auEmail")||{}).value||"").trim();
    const pass=(document.getElementById("auPass")||{}).value||"";
    const name=((document.getElementById("auName")||{}).value||"").trim();
    const code=((document.getElementById("auCode")||{}).value||"").trim();
    const V={name:name, email:email, code:code};
    if(!email||!pass){ showLogin("Completá email y contraseña.", mode, V); return; }
    if(!/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(email)){ showLogin("Poné un email válido, con @ y punto (ej: nombre@gmail.com).", mode, V); return; }
    if(pass.length<6){ showLogin("La contraseña necesita al menos 6 caracteres.", mode, V); return; }
    if(mode==="up" && name.length<2){ showLogin("Poné tu nombre y apellido, así tu coach sabe quién sos.", mode, V); return; }
    b.textContent="Cargando..."; b.disabled=true;
    try{
      if(a==="do-signup"){
        const name=((document.getElementById("auName")||{}).value||"").trim();
        const r=await State.sb.auth.signUp({email:email, password:pass, options:{data:{full_name:name}}});
        if(r.error) throw r.error;
        if(code) { try{ localStorage.setItem("jfit_pending_code", code.toUpperCase()); }catch(e){} }
      } else {
        const r=await State.sb.auth.signInWithPassword({email:email, password:pass});
        if(r.error) throw r.error;
      }
      const sess=await State.sb.auth.getSession();
      if(!sess.data.session){ showLogin("Listo. Te mandamos un mail para confirmar la cuenta: abrilo, hacé click en el link, y despues volvé y tocá Ingresar.","in",{email:email}); return; }
      await afterLogin();
    }catch(err){ showLogin("No se pudo: "+((err&&err.message)||err), mode, {name:name, email:email, code:code}); }
    return;
  }
});

document.body.addEventListener("click", async e => {
  const b=e.target.closest("[data-cp]"); if(!b) return;
  const a=b.dataset.cp;
  if(a==="cancel"){ closeSheet(()=>{ CoachState.coachPicker=null; renderCoachPicker(); }, {host:"#coachSheetHost", card:".cp-modal", duration:150}); return; }
  if(a==="cat"){ CoachState.coachPCat=b.dataset.c; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="cats"){ CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="choose"){ cpApply(b.dataset.name); return; }
  if(a==="custom"){ const nm=prompt(CoachState.coachPicker&&CoachState.coachPicker.mode==="swap"?"Nuevo nombre del ejercicio:":"Nombre del ejercicio:",""); if(nm&&nm.trim()) cpApply(nm.trim()); return; }
});

document.body.addEventListener("input", async e => {
  const el=e.target.closest('[data-cp="search"]'); if(!el) return;
  CoachState.coachPQ=el.value; renderCoachPicker();
  const si=document.querySelector(".cp-search"); if(si){ si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
});

document.body.addEventListener("click", async e => {
  const b=e.target.closest("[data-coach]"); if(!b) return;
  const a=b.dataset.coach;
  if(a==="copy-invite"){
    if(!CoachState.coachInvite) return;
    try{ await navigator.clipboard.writeText(CoachState.coachInvite); }
    catch(err){
      try{
        const ta=document.createElement("textarea");
        ta.value=CoachState.coachInvite; ta.style.position="fixed"; ta.style.opacity="0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }catch(e2){ alert("No se pudo copiar. Código: "+CoachState.coachInvite); return; }
    }
    const prevHtml=b.innerHTML;
    b.innerHTML=checkSvg+' ¡Copiado!'; b.classList.add("copied");
    setTimeout(()=>{ b.innerHTML=prevHtml; b.classList.remove("copied"); }, 1600);
    return;
  }
  if(a==="open"){ openClient(b.dataset.id); return; }
  if(a==="back"){ CoachState.coachSel=null; CoachState.coachData=null; renderCoach(); return; }
  if(a==="refresh"){ if(CoachState.coachSel) openClient(CoachState.coachSel); return; }
  if(a==="view-clients"){ CoachState.coachView="clients"; renderCoach(); return; }
  if(a==="view-tpls"){ CoachState.coachView="tpls"; await loadTpls(); renderCoach(); return; }
  if(a==="tpl-seed"){
    const days=JSON.parse(JSON.stringify(DEFAULT.days||[]));
    days.forEach(d=>{ d.id=uid(); (d.exercises||[]).forEach(ex=>{ ex.id=uid(); (ex.sets||[]).forEach(st=>{ st.id=uid(); st.kg=""; st.reps=""; st.done=false; }); }); });
    CoachState.coachTplEdit={id:null, name:"Meso 2 \u00b7 Microciclo 8", days:days}; CoachState.coachEditDay=0; renderCoach(); return;
  }
  if(a==="tpl-seed-ppl"){
    const days=JSON.parse(JSON.stringify(PPL_DAYS||[]));
    days.forEach(d=>{ d.id=uid(); (d.exercises||[]).forEach(ex=>{ ex.id=uid(); (ex.sets||[]).forEach(st=>{ st.id=uid(); st.kg=""; st.reps=""; st.done=false; }); }); });
    CoachState.coachTplEdit={id:null, name:"PPL \u00b7 5 d\u00edas", days:days}; CoachState.coachEditDay=0; renderCoach(); return;
  }
  if(a==="tpl-new"){ CoachState.coachTplEdit={id:null, name:"", days:[]}; CoachState.coachEditDay=0; renderCoach(); return; }
  if(a==="tpl-open"){ const t=CoachState.coachTpls.find(x=>x.id===b.dataset.id); if(t){ CoachState.coachTplEdit=JSON.parse(JSON.stringify(t)); CoachState.coachEditDay=0; renderCoach(); } return; }
  if(a==="tpl-back"){ CoachState.coachTplEdit=null; CoachState.coachView="tpls"; renderCoach(); return; }
  if(a==="tpl-save"){
    if(!CoachState.coachTplEdit) return;
    const nm=(CoachState.coachTplEdit.name||"").trim();
    if(!nm){ alert("Ponele un nombre a la rutina."); return; }
    b.textContent="Guardando...";
    try{
      const row={coach_id:State.cloudUser.id, name:nm, days:CoachState.coachTplEdit.days||[], updated_at:new Date().toISOString()};
      if(CoachState.coachTplEdit.id) row.id=CoachState.coachTplEdit.id;
      const r=await State.sb.from("routine_templates").upsert(row).select();
      if(r.error) throw r.error;
      await loadTpls(); CoachState.coachTplEdit=null; CoachState.coachView="tpls"; alert("Rutina guardada \u2713");
    }catch(err){ alert("No se pudo: "+((err&&err.message)||err)); }
    renderCoach(); return;
  }
  if(a==="tpl-del"){
    if(!CoachState.coachTplEdit||!CoachState.coachTplEdit.id){ CoachState.coachTplEdit=null; CoachState.coachView="tpls"; renderCoach(); return; }
    if(!confirm("\u00bfBorrar esta rutina? No afecta a los clientes que ya la tienen aplicada.")) return;
    try{ await State.sb.from("routine_templates").delete().eq("id",CoachState.coachTplEdit.id); await loadTpls(); }catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    CoachState.coachTplEdit=null; CoachState.coachView="tpls"; renderCoach(); return;
  }
  if(!CoachState.coachData && !CoachState.coachTplEdit) return;
  if(a==="edit-day"){ CoachState.coachEditDay=+b.dataset.i||0; renderCoach(); return; }
  if(a==="rt-tosave"){
    const nm=prompt("Nombre para guardar esta rutina en tu biblioteca:","");
    if(!nm||!nm.trim()) return;
    try{
      const days=JSON.parse(JSON.stringify(CoachState.coachData.routine||[]));
      days.forEach(d=>{ (d.exercises||[]).forEach(ex=>{ (ex.sets||[]).forEach(st=>{ st.kg=""; st.reps=""; st.done=false; }); }); });
      const r=await State.sb.from("routine_templates").insert({coach_id:State.cloudUser.id, name:nm.trim(), days:days}).select();
      if(r.error) throw r.error;
      await loadTpls(); alert("Guardada en “Mis rutinas” \u2713");
    }catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    return;
  }
  if(a==="rt-apply"){
    try{
      CoachState.coachApplyPicker={tplId:null, days:{}, mode:"replace", loading:true};
      renderApplyPicker();
      const mnt=document.getElementById("applyMount");
      if(!mnt || !mnt.innerHTML){ alert("No se pudo abrir el selector (el modal no se montó). Avisale a Jero."); return; }
      await loadTpls();
      if(CoachState.coachApplyPicker){ CoachState.coachApplyPicker.loading=false; renderApplyPicker(); }
    }catch(err){
      alert("Error al abrir el selector de rutinas:\n\n"+((err&&err.message)||err));
      console.error("rt-apply", err);
    }
    return;
  }
  if(a==="ap-cancel"){ closeSheet(()=>{ CoachState.coachApplyPicker=null; renderApplyPicker(); }, {host:"#applyMount", card:".cp-ccard", duration:150}); return; }
  if(a==="ap-back"){ CoachState.coachApplyPicker={tplId:null, days:{}, mode:"replace"}; renderApplyPicker(); return; }
  if(a==="ap-tpl"){ CoachState.coachApplyPicker.tplId=b.dataset.id; CoachState.coachApplyPicker.days={}; renderApplyPicker(); return; }
  if(a==="ap-day"){ const i=+b.dataset.i; CoachState.coachApplyPicker.days[i]=(CoachState.coachApplyPicker.days[i]===false); renderApplyPicker(); return; }
  if(a==="ap-mode"){ CoachState.coachApplyPicker.mode=b.dataset.m; renderApplyPicker(); return; }
  if(a==="ap-confirm"){
    const st=CoachState.coachApplyPicker; const tpl=CoachState.coachTpls.find(t=>t.id===st.tplId); if(!tpl) return;
    const picked=(tpl.days||[]).filter((d,i)=>st.days[i]!==false).map(d=>JSON.parse(JSON.stringify(d)));
    if(!picked.length){ alert("Elegí al menos un día."); return; }
    picked.forEach(d=>{ d.id=uid(); (d.exercises||[]).forEach(ex=>{ ex.id=uid(); (ex.sets||[]).forEach(s=>{ s.id=uid(); s.kg=""; s.reps=""; s.done=false; }); }); });
    if(st.mode==="add"){ CoachState.coachData.routine=(CoachState.coachData.routine||[]).concat(picked); }
    else { CoachState.coachData.routine=picked; }
    CoachState.coachEditDay=0;
    closeSheet(()=>{ CoachState.coachApplyPicker=null; renderApplyPicker(); renderCoach(); }, {host:"#applyMount", card:".cp-ccard", duration:150});
    alert("Rutina aplicada. Presioná “Guardar rutina” para sincronizar al cliente.");
    return;
  }
  if(a==="day-add"){ if(CoachState.coachTplEdit){ CoachState.coachTplEdit.days.push({id:uid(), name:"Nuevo día", subtitle:"", exercises:[]}); CoachState.coachEditDay=CoachState.coachTplEdit.days.length-1; } else { if(!CoachState.coachData.routine) CoachState.coachData.routine=[]; CoachState.coachData.routine.push({id:uid(), name:"Nuevo día", subtitle:"", exercises:[]}); CoachState.coachEditDay=CoachState.coachData.routine.length-1; } renderCoach(); return; }
  if(a==="day-left"){
    const D=rtDays(); const i=CoachState.coachEditDay;
    if(D && i>0){ const t=D[i-1]; D[i-1]=D[i]; D[i]=t; CoachState.coachEditDay=i-1; renderCoach(); }
    return;
  }
  if(a==="day-right"){
    const D=rtDays(); const i=CoachState.coachEditDay;
    if(D && i<D.length-1){ const t=D[i+1]; D[i+1]=D[i]; D[i]=t; CoachState.coachEditDay=i+1; renderCoach(); }
    return;
  }
  if(a==="day-del"){ const D=rtDays(); if(D&&D.length>1){ D.splice(CoachState.coachEditDay,1); CoachState.coachEditDay=0; renderCoach(); } return; }
  if(a==="rt-setadd"){ const day=(rtDays()||[])[CoachState.coachEditDay]; const ex=day.exercises[+b.dataset.i]; if(ex) ex.sets.push(mkSet()); renderCoach(); return; }
  if(a==="rt-setdel"){ const day=(rtDays()||[])[CoachState.coachEditDay]; const ex=day.exercises[+b.dataset.i]; if(ex && ex.sets.length>1) ex.sets.splice(+b.dataset.j,1); renderCoach(); return; }
  if(a==="rt-up"){ const i=+b.dataset.i; const day=(rtDays()||[])[CoachState.coachEditDay]; if(day&&i>0){ const arr=day.exercises; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; renderCoach(); } return; }
  if(a==="rt-down"){ const i=+b.dataset.i; const day=(rtDays()||[])[CoachState.coachEditDay]; if(day&&i<day.exercises.length-1){ const arr=day.exercises; [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; renderCoach(); } return; }
  if(a==="rt-del"){ const day=(rtDays()||[])[CoachState.coachEditDay]; day.exercises.splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="rt-swap"){ CoachState.coachPicker={mode:"swap", i:(+b.dataset.i||0)}; CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="rt-add"){ CoachState.coachPicker={mode:"add"}; CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="rt-ins"){ CoachState.coachPicker={mode:"insert", idx:(+b.dataset.i||0)}; CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="info-save"){
    const i=CoachState.coachInfoForm||CoachState.coachData.info||{};
    const row={client_id:CoachState.coachData.id, age:parseInt(i.age)||null, height_cm:parseInt(i.height_cm)||null,
      availability:i.availability||null, objective:i.objective||null, stage:i.stage||null, commitment:i.commitment||null,
      structure:i.structure||null, block_goal:i.block_goal||null, injuries:i.injuries||null, cardio:i.cardio||null,
      steps_goal:parseInt(i.steps_goal)||null, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id};
    try{ await State.sb.from("client_info").upsert(row,{onConflict:"client_id"}); CoachState.coachData.info=row; CoachState.coachInfoForm=null; alert("Ficha guardada \u2713"); }
    catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    renderCoach(); return;
  }
  if(a==="blk-dl"){
    CoachState.coachBlockForm = CoachState.coachBlockForm || Object.assign({}, CoachState.coachData.block||{});
    const w=parseInt(b.dataset.w); const arr=Array.isArray(CoachState.coachBlockForm.deloads)?CoachState.coachBlockForm.deloads.slice():[];
    const k=arr.indexOf(w); if(k>=0) arr.splice(k,1); else arr.push(w);
    CoachState.coachBlockForm.deloads=arr.sort((x,y)=>x-y); renderCoach(); return;
  }
  if(a==="blk-save"){
    const bf=CoachState.coachBlockForm||CoachState.coachData.block||{};
    if(!bf.start_date){ alert("Pon\u00e9 la fecha de inicio del bloque (un lunes)."); return; }
    const row={client_id:CoachState.coachData.id, name:bf.name||null, start_date:bf.start_date, weeks:parseInt(bf.weeks)||8,
      phase:bf.phase||null, calories:bf.calories||null, deloads:Array.isArray(bf.deloads)?bf.deloads:[], notes:bf.notes||null, active:true};
    try{
      if(CoachState.coachData.block && CoachState.coachData.block.id){ await State.sb.from("blocks").update(row).eq("id",CoachState.coachData.block.id); row.id=CoachState.coachData.block.id; }
      else { const r=await State.sb.from("blocks").insert(row).select("id").single(); if(r.data) row.id=r.data.id; }
      CoachState.coachData.block=row; CoachState.coachBlockForm=null; alert("Bloque guardado \u2713");
    }catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    renderCoach(); return;
  }
  if(a==="plan-save"){
    const p=CoachState.coachPlanForm||planDefault();
    // totales de días de entrenamiento como macros "globales" (compatibilidad con el banner del cliente)
    let tk=0,tp=0,tc=0,tf=0; (p.trainDays||[]).forEach(r=>{ tk+=+r.kcal||0; tp+=+r.prot||0; tc+=+r.cho||0; tf+=+r.fat||0; });
    const clean={trainDays:p.trainDays||[], restDays:p.restDays||[], water:p.water||"", salt:p.salt||"", guidelines:p.guidelines||[], supps:p.supps||[], options:p.options||[], extras:p.extras||[], swaps:p.swaps||[], cardio:p.cardio||{text:"",items:[]}, habits:p.habits||[]};
    const row={client_id:CoachState.coachData.id, kcal:tk||parseInt(p._kcal)||null, protein:tp||parseInt(p._protein)||null, carbs:tc||parseInt(p._carbs)||null, fat:tf||parseInt(p._fat)||null, notes:p._notes||null, plan:clean, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id};
    try{ await State.sb.from("nutrition").upsert(row,{onConflict:"client_id"}); CoachState.coachData.plan=row; CoachState.coachPlanForm=null; alert("Plan guardado \u2713"); }catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    renderCoach(); return;
  }
  if(a==="pl-mealadd"){ const p=coachPlanObj(CoachState.coachData); (p[b.dataset.key]=p[b.dataset.key]||[]).push({meal:"",time:"",kcal:"",cho:"",fat:"",prot:"",note:""}); renderCoach(); return; }
  if(a==="pl-mealdel"){ const p=coachPlanObj(CoachState.coachData); p[b.dataset.key].splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="pl-listadd"){ const p=coachPlanObj(CoachState.coachData); (p[b.dataset.key]=p[b.dataset.key]||[]).push(""); renderCoach(); return; }
  if(a==="pl-listdel"){ const p=coachPlanObj(CoachState.coachData); p[b.dataset.key].splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="pl-optsecadd"){ const p=coachPlanObj(CoachState.coachData); (p.options=p.options||[]).push({title:"",opts:[{label:"Opción A",body:""}]}); renderCoach(); return; }
  if(a==="pl-optsecdel"){ const p=coachPlanObj(CoachState.coachData); p.options.splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="pl-optadd"){ const p=coachPlanObj(CoachState.coachData); const sec=p.options[+b.dataset.i]; sec.opts=sec.opts||[]; const L="Opción "+String.fromCharCode(65+sec.opts.length); sec.opts.push({label:L,body:""}); renderCoach(); return; }
  if(a==="pl-optdel"){ const p=coachPlanObj(CoachState.coachData); p.options[+b.dataset.i].opts.splice(+b.dataset.j,1); renderCoach(); return; }
  if(a==="pl-swapadd"){ const p=coachPlanObj(CoachState.coachData); (p.swaps=p.swaps||[]).push({from:"",to:""}); renderCoach(); return; }
  if(a==="pl-cardioitemadd"){ const p=coachPlanObj(CoachState.coachData); p.cardio=p.cardio||{text:"",items:[]}; (p.cardio.items=p.cardio.items||[]).push(""); renderCoach(); return; }
  if(a==="pl-cardioitemdel"){ const p=coachPlanObj(CoachState.coachData); p.cardio.items.splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="pl-habitadd"){ const p=coachPlanObj(CoachState.coachData); (p.habits=p.habits||[]).push(""); renderCoach(); return; }
  if(a==="pl-habitdel"){ const p=coachPlanObj(CoachState.coachData); p.habits.splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="pl-swapdel"){ const p=coachPlanObj(CoachState.coachData); p.swaps.splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="save-routine"){ b.textContent="Guardando..."; (async()=>{ try{ const r=await State.sb.from("routines").upsert({client_id:CoachState.coachSel, days:CoachState.coachData.routine, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id},{onConflict:"client_id"}); if(r.error) throw r.error; alert("Rutina guardada. El cliente la va a ver al abrir la app."); }catch(err){ alert("No se pudo guardar: "+((err&&err.message)||err)); } renderCoach(); })(); return; }
});

document.body.addEventListener("change", async e => {
  const el=e.target.closest("[data-coach]"); if(!el||!CoachState.coachData) return;
  const a=el.dataset.coach;
  if(a==="ex"){ CoachState.coachData.loadEx=el.value; renderCoach(); }
  else if(a==="dayfilter"){ CoachState.coachDayFilter=el.value||null; CoachState.coachData.loadEx=null; renderCoach(); }
});

document.body.addEventListener("input", async e => {
  const el=e.target.closest("[data-coach]"); if(!el) return;
  const a0=el.dataset.coach;
  if(a0==="tpl-name"){ if(CoachState.coachTplEdit) CoachState.coachTplEdit.name=el.value; return; }
  if(a0==="coach-search"){ CoachState.coachSearch=el.value; renderCoach(); return; }
  if(!rtDays()) return;
  const a=a0; const day=(rtDays()||[])[CoachState.coachEditDay]; if(!day) return;
  if(a==="rt-name"){ if(day.exercises[+el.dataset.i]) day.exercises[+el.dataset.i].name=el.value; }
  else if(a==="day-name"){ day.name=el.value; }
  else if(a==="rt-target"){ const ex=day.exercises[+el.dataset.i]; const st=ex&&ex.sets[+el.dataset.j]; if(st){ const v=el.value.trim(); if(v) st.target=v; else delete st.target; } }
  else if(a==="rt-note"){ const ex=day.exercises[+el.dataset.i]; if(ex){ const v=el.value.trim(); if(v) ex.note=v; else delete ex.note; } }
  else if(a==="day-note"){ const v=el.value.trim(); if(v) day.note=v; else delete day.note; }
  else if(a==="rt-o"||a==="rt-rir"||a==="rt-rest"||a==="rt-goal"||a==="rt-video"){ const ex=day.exercises[+el.dataset.i]; if(ex){ const k=(a==="rt-video")?"video":a.slice(3); const v=el.value.trim(); if(v) ex[k]=v; else delete ex[k]; } }
  else if(a.indexOf("info-")===0){ CoachState.coachInfoForm = CoachState.coachInfoForm || Object.assign({}, CoachState.coachData.info||{}); CoachState.coachInfoForm[a.slice(5)] = el.value; return; }
  else if(a.indexOf("blk-")===0){ CoachState.coachBlockForm = CoachState.coachBlockForm || Object.assign({}, CoachState.coachData.block||{}); CoachState.coachBlockForm[a.slice(4)] = el.value; return; }
  else if(a==="plan-kcal"||a==="plan-protein"||a==="plan-carbs"||a==="plan-fat"||a==="plan-notes"){ CoachState.coachPlanForm = CoachState.coachPlanForm || Object.assign({}, CoachState.coachData.plan||{}); CoachState.coachPlanForm[a.slice(5)] = el.value; }
  else if(a==="pl-meal"){ const p=coachPlanObj(CoachState.coachData); const r=p[el.dataset.key][+el.dataset.i]; if(r) r[el.dataset.k]=el.value; }
  else if(a==="pl-list"){ const p=coachPlanObj(CoachState.coachData); p[el.dataset.key][+el.dataset.i]=el.value; }
  else if(a==="pl-water"){ coachPlanObj(CoachState.coachData).water=el.value; }
  else if(a==="pl-salt"){ coachPlanObj(CoachState.coachData).salt=el.value; }
  else if(a==="pl-optsec"){ const p=coachPlanObj(CoachState.coachData); p.options[+el.dataset.i].title=el.value; }
  else if(a==="pl-optlabel"){ const p=coachPlanObj(CoachState.coachData); p.options[+el.dataset.i].opts[+el.dataset.j].label=el.value; }
  else if(a==="pl-optbody"){ const p=coachPlanObj(CoachState.coachData); p.options[+el.dataset.i].opts[+el.dataset.j].body=el.value; }
  else if(a==="pl-swap"){ const p=coachPlanObj(CoachState.coachData); p.swaps[+el.dataset.i][el.dataset.k]=el.value; }
  else if(a==="pl-cardiotext"){ const p=coachPlanObj(CoachState.coachData); p.cardio=p.cardio||{text:"",items:[]}; p.cardio.text=el.value; }
  else if(a==="pl-cardioitem"){ const p=coachPlanObj(CoachState.coachData); p.cardio.items[+el.dataset.i]=el.value; }
  else if(a==="pl-habit"){ const p=coachPlanObj(CoachState.coachData); p.habits[+el.dataset.i]=el.value; }
});

document.addEventListener("visibilitychange", async ()=>{
  if(document.visibilityState!=="visible" || !State.sb || !State.cloudUser || !routineLocked()) return;
  try{
    const rt=await State.sb.from("routines").select("days").eq("client_id",State.cloudUser.id).maybeSingle();
    if(rt.data && Array.isArray(rt.data.days) && rt.data.days.length){
      state.days=rt.data.days;
      if(!state.days.find(x=>x.id===State.activeId)) State.activeId=state.days[0].id;
      renderApp();
    }
  }catch(e){}
});

if (migrateNames(state.days)) save();

cloudBoot();

if ("serviceWorker" in navigator) { window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(()=>{}); }); }
