import './ui/keyboard.js';

import { DEFAULT, PPL_DAYS } from './core/data.js';

import { pushLogout } from './core/push.js';
import { auIcoEye, auIcoEyeOff, checkSvg } from './core/icons.js';

import { State, state } from './core/state.js';

import { KEY, migrateNames, save } from './core/storage.js';

import { afterLogin, cloudBoot, cloudDeletePhoto, cloudDeleteSession, cloudSaveCheckin, cloudSaveDaily, cloudSessionFeedback, cloudUploadPhoto, ensureSb, loadCloud, mergeLocalProgress, newId, pendingCount, PROFILE_KEY, sbOk, setRememberSession, signInWithGoogle } from './core/supabase.js';

import { fmt, hkey, mkEx, mkSet, mondayOf, muscleOf, tabRipple, today, uid } from './core/utils.js';

import { showLogin } from './screens/auth.js';

import { CardioState, renderCardio } from './screens/cardio.js';

import { CheckinState, renderFeedback, saveSession } from './screens/checkin.js';

import { loadCoachClients, openClient } from './screens/coach/clientes.js';

import { renderCoach } from './screens/coach/index.js';

import { renderCoachSettings } from './screens/coach/settings.js';

// Registra los eventos del editor de preguntas del coach (efecto al importarlo).
import './screens/coach/preguntas.js';

import { coachPlanObj, cpApply, loadTpls, planDefault, renderApplyPicker, renderCoachPicker, rtDays } from './screens/coach/rutinas.js';

import { CoachState } from './screens/coach/state.js';

import { ComidaState, animateCalRing, calcTarget, cookPortion, defaultCookState, entryBase, lastResults, offResults, previewStr, rememberCookState, renderComida, renderOffResults, renderResults, selectedFoodValues } from './screens/comida.js';

import { EntrenoState, REST_DEFAULT, day, expandedOverride, liveCounting, renderEntreno, renderExList, renderExSheet, effectiveRest, restKey, restLabel, routineLocked, startLive, stopLive } from './screens/entreno.js';

import { HabitosState, addHabit, checkDaily, renderHabitos } from './screens/habitos.js';

import { ProgresoState, allSetsDone, renderProgreso } from './screens/progreso.js';

import { beep, initAudio } from './ui/audio.js';

import { showSilkBg } from './ui/background.js';

import { parseRest, renderRestBar, resumeRest, startRest, stopRest } from './ui/restbar.js';

import { initScrollReveal, setupExerciseFocus } from './ui/scrollfocus.js';

import { SheetState, closeSheet, collapseExerciseAnimated, renderSheet, unitsLabel } from './ui/sheet.js';
import { clientQuestions, questionSnapshot } from './core/questions.js';
import { renderConfig } from './screens/config.js';

import { removeMyAvatar, uploadMyAvatar } from './core/avatar.js';

import { productByCode, searchOFF } from './core/off.js';

import { closeScanner, openScanner, scannerManualCode } from './ui/scanner.js';

// Series cuyo peso se completó solo copiando el de la serie de arriba (ver input "kg").
const autoKg = new Set();

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
  if (a === "food-search") { ComidaState.foodQuery = t.value; scheduleOffSearch(t.value); const r=document.getElementById("foodResults"); if(r) r.innerHTML = renderResults(ComidaState.foodQuery); return; }
  if (a === "ex-search") { EntrenoState.exQuery = t.value; const l=document.getElementById("exList"); if(l) l.innerHTML = renderExList(); return; }
  if (a === "portion-grams") { const base = ComidaState.selectedFood ? selectedFoodValues() : (ComidaState.editEntry ? entryBase(ComidaState.editEntry) : null); if(base){ const pv=document.getElementById("portionPreview"); if(pv) pv.textContent = previewStr(base, t.value); const pu=document.getElementById("portionUnits"); if(pu && ComidaState.selectedFood) pu.textContent = unitsLabel(t.value, cookPortion(ComidaState.selectedFood, ComidaState.cookState), base.unit); } ComidaState.sheetGrams = t.value; return; }
  if (a === "cf-field") { ComidaState.foodForm[t.dataset.field] = t.value; return; }
  if (a === "cal-field") { ComidaState.calForm[t.dataset.field] = t.value; return; }
  if (a === "wkg-field") { ProgresoState.weightForm.kg = t.value; return; }
  const d = day();
  if (a === "dayname") d.name = t.value;
  else if (a === "subtitle") d.subtitle = t.value;
  else if (a === "exname") { const ex=d.exercises.find(x=>x.id===t.dataset.ex); if(ex) ex.name=t.value; }
  else if (a === "kg" || a === "reps") {
    const ex=d.exercises.find(x=>x.id===t.dataset.ex); const s=ex&&ex.sets.find(x=>x.id===t.dataset.set);
    if(s){
      s[a]=t.value;
      if(a === "kg"){
        // El peso casi siempre se repite: se copia a las series de abajo que están vacías o
        // que se completaron solas antes (si el cliente cambia una a mano, esa ya no se toca).
        autoKg.delete(s.id);
        const i=ex.sets.indexOf(s);
        ex.sets.slice(i+1).forEach(o=>{
          if(o.done || (String(o.kg||"")!=="" && !autoKg.has(o.id))) return;
          o.kg=t.value; if(t.value) autoKg.add(o.id); else autoKg.delete(o.id);
          const inp=document.querySelector('input.kg[data-set="'+o.id+'"]'); if(inp && inp!==t) inp.value=t.value;
        });
      }
    }
  }
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
  if (a === "daily-kg" || a === "daily-steps" || a === "daily-text") { CheckinState.dailyForm = CheckinState.dailyForm || Object.assign({}, state.daily[today()]||{}); CheckinState.dailyForm[a==="daily-kg"?"kg":(a==="daily-steps"?"steps":t.dataset.k)] = t.value; return; }
  if (a === "ci-set") { CheckinState.checkinForm = CheckinState.checkinForm || JSON.parse(JSON.stringify(state.checkins[mondayOf(today())]||{})); CheckinState.checkinForm[t.dataset.k] = t.value; return; }
  if (a === "load-ex") { EntrenoState.loadEx = t.value; renderApp(); return; }
  // Foto de perfil (Ajustes del cliente y Configuración del coach).
  if (a === "avatar-pick") {
    const file=t.files&&t.files[0]; t.value=""; if(!file) return;
    document.body.classList.add("avatar-busy");
    const err=await uploadMyAvatar(file);
    document.body.classList.remove("avatar-busy");
    if(err){ alert(err); return; }
    if(CoachState.coachSettingsOpen) renderCoachSettings(); else renderApp();
    if(State.cloudProfile && State.cloudProfile.role==="coach") renderCoach();
    return;
  }
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
  if (a === "off-pick") { SheetState.sheetGen++; ComidaState.selectedFood = offResults[parseInt(el.dataset.idx)]; ComidaState.cookState = null; ComidaState.sheetGrams = null; renderApp(); return; }
  if (a === "scan-open") { openScanner(onScannedCode); return; }
  if (a === "scan-close") { closeScanner(); return; }
  if (a === "scan-manual") { scannerManualCode(); return; }
  if (a === "food-pick") { SheetState.sheetGen++; ComidaState.selectedFood = lastResults[parseInt(el.dataset.idx)]; ComidaState.cookState = defaultCookState(ComidaState.selectedFood); ComidaState.sheetGrams = null; renderApp(); return; }
  // Crudo / cocido: si el cliente no tocó los gramos se pasa a la porción sugerida en el
  // otro estado; si ya escribió cuánto pesó, se respeta ese número.
  if (a === "portion-cook") {
    const f = ComidaState.selectedFood; if(!f || !f.cook) return;
    const inp = document.getElementById("portionGrams"); const cur = inp ? inp.value : "";
    const wasDefault = String(cur) === String(cookPortion(f, ComidaState.cookState));
    ComidaState.cookState = el.dataset.val;
    ComidaState.sheetGrams = wasDefault ? null : cur;
    renderApp(); return;
  }
  // Unidades: − / + suman o restan una porción (1 banana, 1 feta, 1 scoop…).
  if (a === "portion-step") {
    const f = ComidaState.selectedFood; if(!f) return;
    const unit = cookPortion(f, ComidaState.cookState); if(!(unit>0)) return;
    const inp = document.getElementById("portionGrams");
    const cur = parseFloat(String(inp ? inp.value : "").replace(",",".")) || 0;
    const n = Math.max(1, Math.round(cur/unit) + parseInt(el.dataset.d));
    ComidaState.sheetGrams = String(Math.round(n*unit));
    renderApp(); return;
  }
  if (a === "portion-cancel") { closeSheet(()=>{ ComidaState.selectedFood=null; ComidaState.editEntry=null; ComidaState.sheetGrams=null; renderApp(); }); return; }
  if (a === "portion-add") {
    const g = parseFloat((document.getElementById("portionGrams")||{}).value); if(!(g>0)){ return; }
    const f0 = ComidaState.selectedFood; if(!f0){ return; } const fc = g/100;
    // Con crudo/cocido se guardan los valores del estado elegido y queda en el nombre.
    const f = selectedFoodValues(); if(f0.cook) rememberCookState(f0, ComidaState.cookState);
    rememberOffProduct(f0);
    state.diary.push({ id:newId(), name:f0.name+(f0.cook?" ("+ComidaState.cookState+")":""), grams:Math.round(g), kcal:Math.round(f.kcal*fc), p:+(f.p*fc).toFixed(1), c:+(f.c*fc).toFixed(1), f:+(f.f*fc).toFixed(1), unit:f.unit||"g", base:{kcal:f.kcal,p:f.p,c:f.c,f:f.f,unit:f.unit||"g"} });
    save(); closeSheet(()=>{ ComidaState.selectedFood=null; ComidaState.sheetGrams=null; renderApp(); }); return;
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
    rec._q = questionSnapshot(clientQuestions("daily"), rec);
    state.daily[today()] = rec;
    // Un solo número de pasos por día: lo que se anota acá es el mismo contador de Hábitos.
    const st = parseInt(rec.steps); if(st>=0) state.steps = st;
    if(kg>0){ const exw=state.weights.find(w=>w.date===today()); if(exw) exw.kg=kg; else state.weights.push({id:uid(), date:today(), kg:kg}); }
    CheckinState.dailyForm=null; save();
    const synced = await cloudSaveDaily(today(), rec);
    alert(synced ? "Registro guardado \u2713" : "Se guard\u00f3 en este dispositivo pero todav\u00eda no lleg\u00f3 a tu coach (sin conexi\u00f3n). Queda pendiente y se env\u00eda solo cuando vuelva internet.");
    renderApp(); return;
  }
  if (a === "fb-set") { CheckinState.fbForm=CheckinState.fbForm||{}; CheckinState.fbForm[el.dataset.k]=el.dataset.v; renderFeedback(); return; }
  if (a === "fb-skip") { CheckinState.fbSession=null; CheckinState.fbForm=null; CheckinState.newPRs=[]; renderApp(); return; }
  if (a === "fb-save") {
    const se=state.sessions.find(x=>x.id===CheckinState.fbSession); const f=CheckinState.fbForm||{};
    if(se){ if(f.rpe) se.rpe=+f.rpe; if(f.pump) se.pump=+f.pump; if(f.joint) se.joint=(f.joint==="S\u00ed"); save(); try{ cloudSessionFeedback(se); }catch(e){} }
    CheckinState.fbSession=null; CheckinState.fbForm=null; CheckinState.newPRs=[]; renderApp(); return;
  }
  if (a === "ci-open") { CheckinState.checkinOpen=true; CheckinState.checkinForm=null; renderApp(); return; }
  if (a === "photo-del") { const path=el.dataset.path, id=el.dataset.id; const ok=await cloudDeletePhoto(id, path); if(!ok) alert("No se pudo borrar la foto. Revisá tu conexión e intentá de nuevo."); return; }
  if (a === "ci-close") { CheckinState.checkinOpen=false; CheckinState.checkinForm=null; renderApp(); return; }
  // Pregunta de opciones del check-in. La adherencia se sigue guardando como número (va a
  // su propia columna); el resto, como el texto de la opción elegida.
  if (a === "ci-opt") { CheckinState.checkinForm = CheckinState.checkinForm || JSON.parse(JSON.stringify(state.checkins[mondayOf(today())]||{})); const k=el.dataset.k; CheckinState.checkinForm[k] = (k==="adherence") ? parseInt(el.dataset.v) : el.dataset.v; renderApp(); return; }
  if (a === "ci-save") {
    const wk = mondayOf(today());
    const f = CheckinState.checkinForm || {};
    state.checkins[wk] = Object.assign({}, state.checkins[wk]||{}, f);
    state.checkins[wk]._q = questionSnapshot(clientQuestions("checkin"), state.checkins[wk]);
    CheckinState.checkinOpen=false; CheckinState.checkinForm=null; save();
    const synced = await cloudSaveCheckin(wk, state.checkins[wk]);
    if(!synced){ alert("Tu check-in se guardó en este dispositivo pero todavía no llegó a tu coach (sin conexión). Queda pendiente y se envía solo cuando vuelva internet."); renderApp(); return; }
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
    // Al marcar una serie arranca solo el descanso de ese ejercicio (se puede saltear con
    // la X). No arranca si con esta serie se terminó todo el entrenamiento del día.
    if(s.done){ const dayDone=d.exercises.every(x=>allSetsDone(x)); if(!dayDone) startRest(effectiveRest(ex).sec); }
    // Se acaba de completar recién ahora (no estaba reabierto a mano) -> animar el
    // colapso. Si ya estaba todo tildado y esto es una corrección (reabierto), o si
    // se destildó, el render es inmediato como siempre.
    if(!wasDone && nowDone && !expandedOverride.has(ex.id)){ collapseExerciseAnimated(ex.id, renderApp, true); }
    else { renderApp(); }
    return;
  }
  if (a === "ex-expand") { expandedOverride.add(ex.id); renderApp(); return; }
  if (a === "ex-collapse") { collapseExerciseAnimated(ex.id, ()=>{ expandedOverride.delete(ex.id); renderApp(); }); return; }
  // Descanso por ejercicio. Sin coach se guarda en el ejercicio (viaja con la rutina);
  // con coach, como preferencia propia (state.restPrefs) sin tocar la rutina del coach.
  if (a === "rest-edit") { EntrenoState.restEditEx = EntrenoState.restEditEx===ex.id ? null : ex.id; renderApp(); return; }
  if (a === "rest-adj" || a === "rest-preset") {
    const cur = effectiveRest(ex).sec;
    const sec = Math.min(900, Math.max(15, a === "rest-preset" ? (parseInt(el.dataset.sec)||REST_DEFAULT) : cur + (parseInt(el.dataset.d)||0)));
    if (routineLocked()) { state.restPrefs[restKey(ex)] = sec; } else { ex.rest = restLabel(sec); }
    save(); renderApp(); return;
  }
  if (a === "rest-reset") { delete state.restPrefs[restKey(ex)]; save(); renderApp(); return; }
  if (a === "addset") { ex.sets.push(mkSet()); }
  else if (a === "removeset") { ex.sets = ex.sets.filter(x=>x.id!==el.dataset.set); }
  else if (a === "removeex") { d.exercises = d.exercises.filter(x=>x.id!==el.dataset.ex); }
  else if (a === "clear") { d.exercises.forEach(x=>x.sets.forEach(s=>s.done=false)); }
  else return;
  save(); renderApp();
});

document.body.addEventListener("click", e=>{
  const rb=e.target.closest("[data-auth-role]"); if(!rb) return;
  const name=((document.getElementById("auName")||{}).value||"").trim();
  const email=((document.getElementById("auEmail")||{}).value||"").trim();
  const code=((document.getElementById("auCode")||{}).value||"").trim();
  showLogin("","up",{name:name, email:email, code:code, role:rb.dataset.authRole});
});

// Se guarda al tocarla (no al ingresar): así vale también para Google, que se va de la página.
document.body.addEventListener("change", e=>{
  if(e.target && e.target.id==="auRemember") setRememberSession(e.target.checked);
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
  if(a==="logout"){
    // El logout de antes no borraba nada de localStorage: si en el mismo dispositivo
    // después iniciaba sesión OTRA persona, heredaba el diario de comidas, hábitos, agua,
    // pesos y demás de quien usó la app antes. Y si esa cuenta nueva no tenía rutina en la
    // nube, loadCloud() le subía como "su" rutina la que había quedado puesta acá, con los
    // kg y reps de la persona anterior.
    const n=State.cloudUser?pendingCount():0;
    if(n>0 && !confirm("Tenés "+n+" registro"+(n>1?"s":"")+" sin sincronizar todavía en este dispositivo. Si cerrás sesión ahora podrías perderlo"+(n>1?"s":"")+". ¿Cerrar sesión igual?")) return;
    try{ await pushLogout(); }catch(e){} // antes del signOut: borrar el dispositivo necesita la sesión
    try{ await State.sb.auth.signOut(); }catch(e){}
    try{ localStorage.removeItem(KEY); localStorage.removeItem(PROFILE_KEY); localStorage.removeItem("gize_session_ephemeral"); }catch(e){}
    location.reload();
    return;
  }
  // Los errores de join_coach con mensaje propio (plan vencido, cupo lleno) se muestran tal cual.
  const joinErr=er=>(er && er.code==="P0001" && er.message) ? er.message : "";
  if(a==="join"){ const code=((document.getElementById("joinCode")||{}).value||"").trim(); if(!code){ alert("Poné el código de tu coach."); return; } try{ const r=await State.sb.rpc("join_coach",{code:code}); if(r.data===true){ const pr=await State.sb.from("profiles").select("*").eq("id",State.cloudUser.id).maybeSingle(); if(pr.data) State.cloudProfile=pr.data; await loadCloud(); alert("¡Listo! Te vinculaste con tu coach."); renderApp(); } else { alert(joinErr(r.error) || "Código inválido. Revisalo con tu coach."); } }catch(err){ alert("No se pudo vincular: "+((err&&err.message)||err)); } return; }
  if(a==="google"){
    const mode = document.getElementById("auRole") ? "up" : "in";
    const role=((document.getElementById("auRole")||{}).value||"client").trim();
    const code=((document.getElementById("auCode")||{}).value||"").trim();
    const V={name:((document.getElementById("auName")||{}).value||"").trim(), email:((document.getElementById("auEmail")||{}).value||"").trim(), code:code, role:role};
    b.disabled=true; b.lastChild.textContent="Abriendo Google...";
    if(!State.sb) await ensureSb();
    if(!State.sb){ showLogin("No se pudo conectar con el servidor. Revisá tu conexión a internet y volvé a intentar.", mode, V); return; }
    try{ await signInWithGoogle({role:mode==="up"?role:"client", code:mode==="up"&&role==="client"?code:""}); } // web: la página se va a Google
    catch(err){ showLogin("No se pudo entrar con Google: "+((err&&err.message)||err), mode, V); }
    return;
  }
  if(a==="do-login"||a==="do-signup"){
    try{ localStorage.removeItem("gize_google_intent"); }catch(e){} // un intento de Google abandonado no aplica acá
    const mode = a==="do-signup"?"up":"in";
    const email=((document.getElementById("auEmail")||{}).value||"").trim();
    const pass=(document.getElementById("auPass")||{}).value||"";
    const name=((document.getElementById("auName")||{}).value||"").trim();
    const code=((document.getElementById("auCode")||{}).value||"").trim();
    const role=((document.getElementById("auRole")||{}).value||"client").trim();
    const V={name:name, email:email, code:code, role:role};
    if(!email||!pass){ showLogin("Completá email y contraseña.", mode, V); return; }
    if(!/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(email)){ showLogin("Poné un email válido, con @ y punto (ej: nombre@gmail.com).", mode, V); return; }
    if(mode==="up" && pass.length<6){ showLogin("La contraseña necesita al menos 6 caracteres.", mode, V); return; }
    if(mode==="up" && name.length<2){ showLogin("Poné tu nombre y apellido, así tu coach sabe quién sos.", mode, V); return; }
    b.textContent="Cargando..."; b.disabled=true;
    // Repite el splash de arranque durante la espera de red del login: entrar
    // al panel de coach implica varios viajes a Supabase (perfil, clientes...)
    // después de este punto, así que conviene taparlos con la misma animación
    // en vez de dejar la pantalla de login colgada sin feedback.
    if(window.coreReplay) window.coreReplay();
    if(!State.sb) await ensureSb();
    if(!State.sb){ if(window.coreCancel) window.coreCancel(); showLogin("No se pudo conectar con el servidor. Revisá tu conexión a internet y volvé a intentar.", mode, V); return; }
    try{
      if(a==="do-signup"){
        const name=((document.getElementById("auName")||{}).value||"").trim();
        const r=await State.sb.auth.signUp({email:email, password:pass, options:{data:{full_name:name, role:role}, emailRedirectTo:(IS_NATIVE ? "gize://confirmado" : location.origin + location.pathname)}}); // gize:// abre la app instalada (core/supabase.js → openAuthLink)
        if(r.error) throw r.error;
        if(code) { try{ localStorage.setItem("jfit_pending_code", code.toUpperCase()); }catch(e){} }
      } else {
        const r=await State.sb.auth.signInWithPassword({email:email, password:pass});
        if(r.error) throw r.error;
      }
      const sess=await State.sb.auth.getSession();
      if(!sess.data.session){ if(window.coreCancel) window.coreCancel(); showLogin(IS_NATIVE ? "Listo. Te mandamos un mail para confirmar la cuenta: abrilo en este celular y tocá el link, que te trae de vuelta a la app." : "Listo. Te mandamos un mail para confirmar la cuenta: abrilo, hacé click en el link, y despues volvé y tocá Ingresar.","in",{email:email}); return; }
      await afterLogin(sess.data.session.user);
      if(window.coreEnter) window.coreEnter();
    }catch(err){ if(window.coreCancel) window.coreCancel(); showLogin("No se pudo: "+((err&&err.message)||err), mode, {name:name, email:email, code:code, role:role}); }
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
  const b=e.target.closest('[data-action="avatar-remove"]'); if(!b) return;
  if(!confirm("¿Quitar tu foto de perfil? Vas a volver a mostrar tus iniciales.")) return;
  const err=await removeMyAvatar(); if(err){ alert(err); return; }
  if(CoachState.coachSettingsOpen) renderCoachSettings(); else renderApp();
  if(State.cloudProfile && State.cloudProfile.role==="coach") renderCoach();
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
  if(a==="open"){ CoachState.coachClientTab="ficha"; openClient(b.dataset.id); return; }
  if(a==="back"){ CoachState.coachSel=null; CoachState.coachData=null; renderCoach(); refreshCoachClients(); return; }
  if(a==="refresh"){ if(CoachState.coachSel) openClient(CoachState.coachSel); return; }
  if(a==="open-settings"){ CoachState.coachNameForm=null; CoachState.coachSettingsOpen=true; renderCoachSettings(); return; }
  if(a==="settings-cancel"){ closeSheet(()=>{ CoachState.coachSettingsOpen=false; CoachState.coachNameForm=null; renderCoachSettings(); }, {host:"#coachSheetHost", card:".cp-ccard", duration:150}); return; }
  if(a==="settings-name-save"){
    const val=(CoachState.coachNameForm!=null?CoachState.coachNameForm:"").trim();
    if(!val){ alert("Poné un nombre."); return; }
    const prevHtml=b.innerHTML; b.disabled=true; b.innerHTML="Guardando…";
    try{
      const r=await State.sb.from("profiles").update({full_name:val}).eq("id",State.cloudUser.id);
      if(r.error) throw r.error;
      await loadCloud();
      closeSheet(()=>{ CoachState.coachSettingsOpen=false; CoachState.coachNameForm=null; renderCoachSettings(); renderCoach(); }, {host:"#coachSheetHost", card:".cp-ccard", duration:150});
    }catch(err){
      alert("No se pudo guardar: "+((err&&err.message)||err));
      b.disabled=false; b.innerHTML=prevHtml;
    }
    return;
  }
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
    try{ sbOk(await State.sb.from("routine_templates").delete().eq("id",CoachState.coachTplEdit.id)); await loadTpls(); }catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    CoachState.coachTplEdit=null; CoachState.coachView="tpls"; renderCoach(); return;
  }
  if(!CoachState.coachData && !CoachState.coachTplEdit) return;
  if(a==="client-tab"){ CoachState.coachClientTab=b.dataset.t; renderCoach(); return; }
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
      if(!mnt || !mnt.innerHTML){ console.error("rt-apply: #applyMount no se montó"); alert("No se pudo abrir el selector de plantillas. Recargá la página y volvé a intentar."); return; }
      await loadTpls();
      if(CoachState.coachApplyPicker){ CoachState.coachApplyPicker.loading=false; renderApplyPicker(); }
    }catch(err){
      alert("No se pudo abrir el selector de plantillas. Revisá tu conexión y volvé a intentar.");
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
  if(a==="day-prev"){ const D=rtDays(); if(D&&D.length){ CoachState.coachEditDay=(CoachState.coachEditDay-1+D.length)%D.length; renderCoach(); } return; }
  if(a==="day-next"){ const D=rtDays(); if(D&&D.length){ CoachState.coachEditDay=(CoachState.coachEditDay+1)%D.length; renderCoach(); } return; }
  if(a==="day-del"){ const D=rtDays(); if(D&&D.length>1){ D.splice(CoachState.coachEditDay,1); CoachState.coachEditDay=0; renderCoach(); } return; }
  if(a==="rt-setadd"){ const day=(rtDays()||[])[CoachState.coachEditDay]; const ex=day.exercises[+b.dataset.i]; if(ex) ex.sets.push(mkSet()); renderCoach(); return; }
  if(a==="rt-setdel"){ const day=(rtDays()||[])[CoachState.coachEditDay]; const ex=day.exercises[+b.dataset.i]; if(ex && ex.sets.length>1) ex.sets.splice(+b.dataset.j,1); renderCoach(); return; }
  if(a==="rt-up"){ const i=+b.dataset.i; const day=(rtDays()||[])[CoachState.coachEditDay]; if(day&&i>0){ const arr=day.exercises; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; CoachState.coachExMenu=null; renderCoach(); } return; }
  if(a==="rt-down"){ const i=+b.dataset.i; const day=(rtDays()||[])[CoachState.coachEditDay]; if(day&&i<day.exercises.length-1){ const arr=day.exercises; [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; CoachState.coachExMenu=null; renderCoach(); } return; }
  if(a==="rt-del"){ const day=(rtDays()||[])[CoachState.coachEditDay]; const ex=day.exercises[+b.dataset.i]; if(ex){ CoachState.coachExpandedEx.delete(ex.id); if(CoachState.coachExMenu===ex.id) CoachState.coachExMenu=null; } day.exercises.splice(+b.dataset.i,1); renderCoach(); return; }
  if(a==="rt-dup"){
    const day=(rtDays()||[])[CoachState.coachEditDay]; const i=+b.dataset.i; const ex=day&&day.exercises[i]; if(!ex) return;
    const copy=JSON.parse(JSON.stringify(ex)); copy.id=uid(); (copy.sets||[]).forEach(s=>{ s.id=uid(); s.kg=""; s.reps=""; s.done=false; });
    day.exercises.splice(i+1,0,copy); CoachState.coachExpandedEx.add(copy.id); renderCoach(); return;
  }
  if(a==="rt-toggle"){
    const id=b.dataset.id;
    if(CoachState.coachExpandedEx.has(id)){ CoachState.coachExpandedEx.delete(id); CoachState.coachExMenu=null; }
    else CoachState.coachExpandedEx.add(id);
    renderCoach(); return;
  }
  if(a==="rt-menu"){ const day=(rtDays()||[])[CoachState.coachEditDay]; const ex=day&&day.exercises[+b.dataset.i]; if(!ex) return; CoachState.coachExMenu=(CoachState.coachExMenu===ex.id)?null:ex.id; renderCoach(); return; }
  if(a==="rt-swap"){ CoachState.coachExMenu=null; CoachState.coachPicker={mode:"swap", i:(+b.dataset.i||0)}; CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="rt-add"){ CoachState.coachPicker={mode:"add"}; CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="rt-ins"){ CoachState.coachPicker={mode:"insert", idx:(+b.dataset.i||0)}; CoachState.coachPCat=null; CoachState.coachPQ=""; renderCoachPicker(); return; }
  if(a==="info-save"){
    const i=CoachState.coachInfoForm||CoachState.coachData.info||{};
    const row={client_id:CoachState.coachData.id, age:parseInt(i.age)||null, height_cm:parseInt(i.height_cm)||null,
      availability:i.availability||null, objective:i.objective||null, stage:i.stage||null, commitment:i.commitment||null,
      structure:i.structure||null, block_goal:i.block_goal||null, injuries:i.injuries||null, cardio:i.cardio||null,
      steps_goal:parseInt(i.steps_goal)||null, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id};
    try{ sbOk(await State.sb.from("client_info").upsert(row,{onConflict:"client_id"})); CoachState.coachData.info=row; CoachState.coachInfoForm=null; alert("Ficha guardada \u2713"); }
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
      if(CoachState.coachData.block && CoachState.coachData.block.id){ sbOk(await State.sb.from("blocks").update(row).eq("id",CoachState.coachData.block.id)); row.id=CoachState.coachData.block.id; }
      else { const r=sbOk(await State.sb.from("blocks").insert(row).select("id").single()); if(r.data) row.id=r.data.id; }
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
    try{ sbOk(await State.sb.from("nutrition").upsert(row,{onConflict:"client_id"})); CoachState.coachData.plan=row; CoachState.coachPlanForm=null; alert("Plan guardado \u2713"); }catch(e){ alert("No se pudo: "+((e&&e.message)||e)); }
    renderCoach(); return;
  }
  if(a==="pl-rest-toggle"){ coachPlanObj(CoachState.coachData); CoachState.coachPlanRestOpen=!CoachState.coachPlanRestOpen; renderCoach(); return; }
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
  else if(a==="daily-pick"){ CoachState.coachDailySel=el.value; renderCoach(); }
  else if(a==="ck-pick"){ CoachState.coachCkSel=el.value; renderCoach(); }
  else if(a==="sess-pick"){ CoachState.coachSessSel=el.value; renderCoach(); }
  else if(a==="photo-pick-date"){ CoachState.coachPhotoSel=el.value; renderCoach(); }
});

document.body.addEventListener("input", async e => {
  const el=e.target.closest("[data-coach]"); if(!el) return;
  const a0=el.dataset.coach;
  if(a0==="tpl-name"){ if(CoachState.coachTplEdit) CoachState.coachTplEdit.name=el.value; return; }
  // A propósito NO llama a renderCoachSettings() acá: el input de "tpl-name" de arriba
  // tampoco re-renderiza en cada tecla, por la misma razón que el buscador de clientes
  // sí la tenía re-renderizar y hubo que arreglar (ver "coach-search" abajo) — reescribir
  // el modal entero en cada letra le tiraría el foco al input igual que le pasaba a ese.
  if(a0==="settings-name"){ CoachState.coachNameForm=el.value; return; }
  if(a0==="coach-search"){
    CoachState.coachSearch=el.value; renderCoach();
    // renderCoach() reescribe todo el innerHTML del panel, así que el <input> viejo (el
    // que tiene el foco) se destruye y aparece uno nuevo sin foco — cada letra tipeada
    // "soltaba" el cursor y había que hacer click de nuevo para seguir escribiendo.
    // Mismo arreglo que ya usa el buscador de ejercicios (.cp-search, ver más abajo):
    // reenfocar el input nuevo y mandar el cursor al final del texto.
    const si=document.querySelector(".co-search"); if(si){ si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
    return;
  }
  if(!rtDays()) return;
  const a=a0; const day=(rtDays()||[])[CoachState.coachEditDay]; if(!day) return;
  if(a==="rt-name"){ if(day.exercises[+el.dataset.i]) day.exercises[+el.dataset.i].name=el.value; }
  else if(a==="day-name"){ day.name=el.value; }
  else if(a==="rt-target"){ const ex=day.exercises[+el.dataset.i]; const st=ex&&ex.sets[+el.dataset.j]; if(st){ const v=el.value.trim(); if(v) st.target=v; else delete st.target; } }
  else if(a==="rt-targetkg"){ const ex=day.exercises[+el.dataset.i]; const st=ex&&ex.sets[+el.dataset.j]; if(st) st.targetKg=el.value; }
  else if(a==="rt-note"){ const ex=day.exercises[+el.dataset.i]; if(ex){ const v=el.value.trim(); if(v) ex.note=v; else delete ex.note; } }
  else if(a==="day-note"){ const v=el.value.trim(); if(v) day.note=v; else delete day.note; }
  else if(a==="rt-o"||a==="rt-rir"||a==="rt-rest"||a==="rt-goal"||a==="rt-video"){ const ex=day.exercises[+el.dataset.i]; if(ex){ const k=(a==="rt-video")?"video":a.slice(3); let v=el.value.trim(); if(k==="video"&&v&&!/^https:\/\//i.test(v)) v="https://"+v.replace(/^[a-z][a-z0-9+.-]*:(\/\/)?/i,""); if(v) ex[k]=v; else delete ex[k]; } }
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
      state.days=mergeLocalProgress(rt.data.days, state.days); // conserva lo que el cliente ya cargó
      migrateNames(state.days);
      if(!state.days.find(x=>x.id===State.activeId)) State.activeId=state.days[0].id;
      renderApp();
    }
  }catch(e){}
});

if (migrateNames(state.days)) save();

cloudBoot();

resumeRest(); // descanso que quedó corriendo al cerrar la app
// En la app nativa (Capacitor) los archivos ya viajan dentro de la app: no hace falta el service worker.
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if (!IS_NATIVE && "serviceWorker" in navigator) { window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(()=>{}); }); }

// ---- Productos de marca (Open Food Facts) ----
// Búsqueda con espera de 450 ms desde la última tecla y cancelando la anterior: así no
// se pide nada por cada letra ni llega tarde una respuesta vieja.
let offTimer = null, offCtrl = null;
function paintOff(){ const box=document.getElementById("offResults"); if(box) box.innerHTML = renderOffResults(); }
function scheduleOffSearch(q){
  clearTimeout(offTimer); if(offCtrl){ offCtrl.abort(); offCtrl=null; }
  const qq = String(q||"").trim();
  if(qq.length < 3){ ComidaState.off = null; return; }
  ComidaState.off = { q: qq, status: "loading", items: [] };
  offTimer = setTimeout(async () => {
    const ctrl = offCtrl = new AbortController();
    try{
      const items = await searchOFF(qq, ctrl.signal);
      if(ctrl.signal.aborted || !ComidaState.off || ComidaState.off.q !== qq) return;
      ComidaState.off = { q: qq, status: "done", items: items };
    }catch(e){
      if(ctrl.signal.aborted) return;
      ComidaState.off = { q: qq, status: "error", items: [] };
    }
    paintOff();
  }, 450);
}

// Producto de marca agregado al diario → queda guardado en el dispositivo para
// encontrarlo al toque la próxima vez (máximo 150, el más reciente primero).
function rememberOffProduct(f){
  if(!f || f.src !== "OFF") return;
  state.offRecent = [f].concat((state.offRecent||[]).filter(x => !(x.code && x.code === f.code) && x.name !== f.name)).slice(0, 150);
}

// Código leído por el escáner (o escrito a mano).
async function onScannedCode(code){
  const known = (state.offRecent||[]).find(f => f.code === code);
  if(known){ ComidaState.selectedFood = known; ComidaState.cookState = null; ComidaState.sheetGrams = null; SheetState.sheetGen++; renderApp(); return; }
  let food = null;
  try{ food = await productByCode(code); }
  catch(e){ alert("No se pudo buscar el producto (¿sin conexión?). Probá de nuevo o cargalo a mano."); return; }
  if(!food){
    if(confirm("No encontramos el código " + code + " en Open Food Facts.\n\n¿Querés crear el alimento a mano con los datos de la etiqueta?")){
      ComidaState.foodForm = {name:"",kcal:"",p:"",c:"",f:"",unit:"g"}; ComidaState.creatingFood = true; renderApp();
    }
    return;
  }
  ComidaState.selectedFood = food; ComidaState.cookState = null; ComidaState.sheetGrams = null; SheetState.sheetGen++; renderApp();
}

// Lista de clientes del coach al día: se vuelve a pedir al volver a la app (y al salir de
// un cliente). Antes se cargaba solo al entrar, así que la foto que un cliente subía con
// el panel del coach abierto no aparecía hasta cerrar y abrir la app.
let coachListAt = 0;
function refreshCoachClients(){
  if(!State.cloudProfile || State.cloudProfile.role!=="coach" || Date.now()-coachListAt < 15000) return;
  coachListAt = Date.now();
  loadCoachClients().then(()=>{ if(!CoachState.coachSel) renderCoach(); }).catch(()=>{});
}
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") refreshCoachClients(); });
