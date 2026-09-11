import { FOODS, RC } from '../core/data.js';

import { flameSvg, searchSvg, xSvg } from '../core/icons.js';

import { state } from '../core/state.js';

import { esc, norm } from '../core/utils.js';

import { renderClientPlan } from './checkin.js';

export const ComidaState = {

  calEditing: false,

  creatingFood: false,

  selectedFood: null,

  editEntry: null,

  foodQuery: "",

  calForm: {sex:"m",age:"",height:"",weight:"",activity:"mod",goal:"mantener"},

  foodForm: {name:"",kcal:"",p:"",c:"",f:"",unit:"g"},

};

export let lastResults = [];

export let calRingPrevOffset = null;

export let calRingPrevOver = null;

export let calRingPrevKcal = null;

export let calRingNumRaf = null;

export function animateCalRing(){
  const circle = document.getElementById("calRing");
  if (!circle) return;
  const target = circle.style.strokeDashoffset;
  const isOver = circle.classList.contains("over");
  if (calRingPrevOffset !== null) {
    circle.style.transition = "none";
    circle.style.strokeDashoffset = calRingPrevOffset;
    circle.classList.toggle("over", calRingPrevOver);
    void circle.getBoundingClientRect();
    circle.style.transition = "";
    requestAnimationFrame(()=>{
      circle.style.strokeDashoffset = target;
      circle.classList.toggle("over", isOver);
    });
  }
  calRingPrevOffset = target;
  calRingPrevOver = isOver;

  const numEl = document.getElementById("calRingNum");
  if (!numEl) return;
  const targetKcal = parseInt(numEl.dataset.val, 10) || 0;
  const fromKcal = calRingPrevKcal;
  calRingPrevKcal = targetKcal;
  if (fromKcal === null || fromKcal === targetKcal) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (calRingNumRaf) cancelAnimationFrame(calRingNumRaf);
  const dur = 400, t0 = performance.now(); // igual a la transition-duration de .ring-fill
  const ease = x => 1 - Math.pow(1 - x, 3); // easeOutCubic: misma "desaceleración rápida" que --ease-drawer,
                                             // aproximada a mano porque un cubic-bezier() de CSS no se puede
                                             // evaluar directo dentro de un loop de rAF sin un solver aparte.
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    numEl.textContent = Math.round(fromKcal + (targetKcal - fromKcal) * ease(p));
    if (p < 1) calRingNumRaf = requestAnimationFrame(step);
    else { numEl.textContent = targetKcal; calRingNumRaf = null; }
  };
  calRingNumRaf = requestAnimationFrame(step);
}

export function calcTarget(p){
  let bmr = 10*(+p.weight) + 6.25*(+p.height) - 5*(+p.age) + (p.sex==="m"?5:-161);
  const act = {sed:1.2,lig:1.375,mod:1.55,act:1.725,muy:1.9}[p.activity] || 1.55;
  const g = {bajar:0.8,mantener:1.0,ganar:1.1}[p.goal] || 1.0;
  return Math.round(bmr*act*g);
}

export function macroTargets(){
  if(state.coachPlan){ const p=state.coachPlan; return {p:+p.protein||0, c:+p.carbs||0, f:+p.fat||0}; }
  const t = state.calTarget||0;
  const w = state.calProfile && state.calProfile.weight ? +state.calProfile.weight : 0;
  let p = w>0 ? Math.round(w*2) : Math.round(t*0.30/4);
  const f = Math.round(t*0.25/9);
  const c = Math.max(0, Math.round((t - p*4 - f*9)/4));
  return {p,c,f};
}

export function diaryTotals(){ return state.diary.reduce((a,e)=>({kcal:a.kcal+e.kcal,p:a.p+e.p,c:a.c+e.c,f:a.f+e.f}),{kcal:0,p:0,c:0,f:0}); }

export function renderResults(q){
  const nq = norm(q);
  if(!nq) return '<div class="cal-hint">Escribí para buscar un alimento</div>';
  const all = FOODS.concat(state.foods||[]);
  lastResults = all.filter(f=>norm(f.name).includes(nq)).slice(0,30);
  if(!lastResults.length) return '<div class="cal-hint">Sin resultados. Probá crear el alimento 👇</div>';
  return lastResults.map((f,i)=>`<div class="food-row" data-action="food-pick" data-idx="${i}">
    <div class="food-name">${esc(f.name)}</div>
    <div class="food-kcal">${f.kcal} kcal<span>por 100 ${f.unit==="ml"?"ml":"g"}</span></div>
  </div>`).join("");
}

export function entryBase(e){ return e.base ? e.base : { kcal: e.grams? e.kcal/e.grams*100:0, p: e.grams? e.p/e.grams*100:0, c: e.grams? e.c/e.grams*100:0, f: e.grams? e.f/e.grams*100:0, unit: e.unit||"g" }; }

export function previewStr(food, grams){
  const fc=(parseFloat(grams)||0)/100;
  return `${Math.round(food.kcal*fc)} kcal · P ${(food.p*fc).toFixed(1)} · C ${(food.c*fc).toFixed(1)} · G ${(food.f*fc).toFixed(1)}`;
}

export function renderCalForm(){
  const c = ComidaState.calForm;
  const sb = (v,l)=>`<button class="${c.sex===v?'on':''}" data-action="cal-sex" data-val="${v}">${l}</button>`;
  const ab = (v,l)=>`<button class="${c.activity===v?'on':''}" data-action="cal-activity" data-val="${v}">${l}</button>`;
  const gb = (v,l)=>`<button class="${c.goal===v?'on':''}" data-action="cal-goal" data-val="${v}">${l}</button>`;
  return `
    <div class="form-head"><button class="form-back" data-action="cal-cancel">‹</button><div class="form-title">Tu meta diaria</div></div>
    <div class="form-sub">Calculamos tus calorías con la fórmula Mifflin-St Jeor.</div>
    <div class="form-group"><label class="form-label">Sexo</label><div class="seg">${sb("m","Hombre")}${sb("f","Mujer")}</div></div>
    <div class="form-row2">
      <div class="form-group"><label class="form-label">Edad</label><input class="form-input" type="text" inputmode="numeric" value="${esc(c.age)}" data-action="cal-field" data-field="age"></div>
      <div class="form-group"><label class="form-label">Altura (cm)</label><input class="form-input" type="text" inputmode="numeric" value="${esc(c.height)}" data-action="cal-field" data-field="height"></div>
      <div class="form-group"><label class="form-label">Peso (kg)</label><input class="form-input" type="text" inputmode="decimal" value="${esc(c.weight)}" data-action="cal-field" data-field="weight"></div>
    </div>
    <div class="form-group"><label class="form-label">Actividad</label><div class="seg">${ab("sed","Sedentario")}${ab("lig","Ligero")}${ab("mod","Moderado")}${ab("act","Activo")}${ab("muy","Muy activo")}</div></div>
    <div class="form-group"><label class="form-label">Objetivo</label><div class="seg">${gb("bajar","Bajar grasa")}${gb("mantener","Mantener")}${gb("ganar","Ganar músculo")}</div></div>
    <button class="form-save" data-action="cal-calc">Calcular mi meta</button>
    <div class="form-or">— o ingresá tu meta a mano —</div>
    <div class="form-row2">
      <input id="calManual" class="form-input" type="text" inputmode="numeric" placeholder="kcal" value="${state.calTarget||''}">
      <button class="form-save" style="width:auto;padding-left:22px;padding-right:22px;margin-top:0" data-action="cal-manual">Guardar</button>
    </div>`;
}

export function renderFoodForm(){
  const f = ComidaState.foodForm;
  const ub=(v,l)=>`<button class="${(f.unit||"g")===v?'on':''}" data-action="cf-unit" data-val="${v}">${l}</button>`;
  return `
    <div class="form-head"><button class="form-back" data-action="food-create-cancel">‹</button><div class="form-title">Crear alimento</div></div>
    <div class="form-sub">Cargá los valores por cada 100 ${(f.unit||"g")==="ml"?"ml":"g"}.</div>
    <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" type="text" value="${esc(f.name)}" data-action="cf-field" data-field="name"></div>
    <div class="form-group"><label class="form-label">Se mide en</label><div class="seg">${ub("g","Gramos (sólido)")}${ub("ml","Mililitros (líquido)")}</div></div>
    <div class="form-group"><label class="form-label">Calorías (kcal)</label><input class="form-input" type="text" inputmode="numeric" value="${esc(f.kcal)}" data-action="cf-field" data-field="kcal"></div>
    <div class="form-row2">
      <div class="form-group"><label class="form-label">Proteína (g)</label><input class="form-input" type="text" inputmode="decimal" value="${esc(f.p)}" data-action="cf-field" data-field="p"></div>
      <div class="form-group"><label class="form-label">Carbos (g)</label><input class="form-input" type="text" inputmode="decimal" value="${esc(f.c)}" data-action="cf-field" data-field="c"></div>
      <div class="form-group"><label class="form-label">Grasas (g)</label><input class="form-input" type="text" inputmode="decimal" value="${esc(f.f)}" data-action="cf-field" data-field="f"></div>
    </div>
    <button class="form-save" data-action="food-create-save">Guardar alimento</button>`;
}

export function renderComida(){
  if (ComidaState.calEditing) return renderCalForm();
  if (ComidaState.creatingFood) return renderFoodForm();
  if (!state.calTarget && !state.coachPlan) {
    return `<div class="cal-empty">
      <div class="cal-empty-ic">${flameSvg}</div>
      <div class="cal-empty-title">Configurá tu meta</div>
      <div class="cal-empty-sub">Calculamos cuántas calorías necesitás según tu cuerpo y tu objetivo. Después registrás lo que comés y la app va sumando.</div>
      <button class="ctrl primary" style="max-width:240px;margin:0 auto" data-action="cal-open">Configurar meta</button>
    </div>`;
  }
  const t = (state.coachPlan && state.coachPlan.kcal) ? state.coachPlan.kcal : state.calTarget, tot = diaryTotals(), mt = macroTargets();
  const planFull = (state.coachPlan && state.coachPlan.plan) ? renderClientPlan(state.coachPlan.plan) : '';
  const planBanner = state.coachPlan ? `<div class="plan-banner"><div class="plan-t">Plan de tu coach</div><div class="plan-macros"><span><b>${state.coachPlan.kcal||"-"}</b> kcal</span><span><b>${state.coachPlan.protein||"-"}</b>P</span><span><b>${state.coachPlan.carbs||"-"}</b>C</span><span><b>${state.coachPlan.fat||"-"}</b>G</span></div>${state.coachPlan.notes?`<div class="plan-notes">${esc(state.coachPlan.notes)}</div>`:''}</div>` : '';
  const wml = state.water||0, wgoal = state.waterGoal||3000, wpct = wgoal?Math.min(Math.round(wml/wgoal*100),100):0;
  const Lstr = v => (v/1000).toLocaleString("es-AR",{maximumFractionDigits:2});
  const pct = t ? Math.min(tot.kcal/t, 1) : 0;
  const over = tot.kcal > t;
  const mbar = (lbl, cons, tgt) => {
    const w = tgt ? Math.min(Math.round(cons/tgt*100),100) : 0;
    return `<div><div class="macro-top"><b>${lbl}</b><span>${Math.round(cons)} / ${tgt} g</span></div><div class="bar"><div style="width:${w}%"></div></div></div>`;
  };
  const diary = state.diary.length ? state.diary.map(e=>`
    <div class="diary-item" data-action="diary-edit" data-id="${e.id}">
      <div class="diary-name">${esc(e.name)}<span>${e.grams} ${e.unit==="ml"?"ml":"g"} · P ${e.p} · C ${e.c} · G ${e.f}</span></div>
      <div class="diary-kcal">${e.kcal} kcal</div>
      <button class="diary-rm" data-action="diary-remove" data-id="${e.id}" title="Quitar">${xSvg}</button>
    </div>`).join("") : '<div class="cal-hint">Todavía no registraste nada hoy.</div>';
  return `
    ${planBanner}
    ${planFull}
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 120 120">
        <circle class="ring-track" cx="60" cy="60" r="52"></circle>
        <circle id="calRing" class="ring-fill${over?' over':''}" cx="60" cy="60" r="52" style="stroke-dasharray:${RC};stroke-dashoffset:${RC*(1-pct)}"></circle>
      </svg>
      <div class="ring-center">
        <div id="calRingNum" class="ring-num${over?' over':''}" data-val="${tot.kcal}">${tot.kcal}</div>
        <div class="ring-lbl">de ${t} kcal</div>
      </div>
    </div>
    <div class="macros">
      ${mbar("Proteína", tot.p, mt.p)}
      ${mbar("Carbos", tot.c, mt.c)}
      ${mbar("Grasas", tot.f, mt.f)}
    </div>
    <div class="water-card">
      <div class="water-top"><span class="water-ttl">\ud83d\udca7 Hidratación</span><span class="water-val">${Lstr(wml)} / ${Lstr(wgoal)} L</span></div>
      <div class="bar"><div style="width:${wpct}%"></div></div>
      <div class="water-btns">
        <button class="qbtn" data-action="water-add" data-n="250">+250</button>
        <button class="qbtn" data-action="water-add" data-n="500">+500</button>
        <button class="qbtn" data-action="water-add" data-n="1000">+1L</button>
        <button class="qbtn water-undo" data-action="water-add" data-n="-250">−250</button>
      </div>
      <button class="water-goal" data-action="water-goal">Cambiar meta (${Lstr(wgoal)} L)</button>
    </div>
    <button class="cal-edit" data-action="cal-open">Editar meta</button>
    <div class="cal-search search-wrap"><span class="search-ic">${searchSvg}</span><input id="foodSearch" type="text" placeholder="Buscar alimento…" value="${esc(ComidaState.foodQuery)}" data-action="food-search"></div>
    <div id="foodResults">${renderResults(ComidaState.foodQuery)}</div>
    <button class="cal-create" data-action="food-create-open">+ Crear alimento propio</button>
    <div class="diary-head"><span class="t">Hoy</span><span class="s">${state.diary.length} ítems · ${tot.kcal} kcal</span></div>
    ${diary}`;
}
