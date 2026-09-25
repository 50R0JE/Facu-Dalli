import { FOODS, RC } from '../core/data.js';

import { cookVariant } from '../core/foods.js';

const barcodeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>';

import { flameSvg, searchSvg, xSvg } from '../core/icons.js';

import { state } from '../core/state.js';

import { esc, norm, ymd } from '../core/utils.js';

import { renderClientPlan } from './checkin.js';

export const ComidaState = {

  calEditing: false,

  creatingFood: false,

  selectedFood: null,

  // Cómo pesó el cliente el alimento elegido: "crudo" o "cocido" (solo si el alimento
  // tiene esa opción, ver food.cook en core/foods.js).
  cookState: null,

  // Búsqueda en Open Food Facts: { q, status: "loading" | "done" | "error", items }.
  off: null,

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
  // Orden: mis alimentos, los productos de marca que ya usé (Open Food Facts) y la base.
  const all = (state.foods||[]).concat(state.offRecent||[], FOODS);
  // Primero los que empiezan con lo buscado, después los que tienen una palabra que
  // empieza así y al final el resto ("pan" → Pan francés antes que Sartén de pan…).
  const rank = f => { const n=norm(f.name); return n.startsWith(nq) ? 0 : (n.includes(" "+nq) ? 1 : 2); };
  lastResults = all.filter(f=>norm(f.name).includes(nq)).sort((a,b)=>rank(a)-rank(b)).slice(0,40);
  const local = lastResults.length ? lastResults.map((f,i)=>foodRow(f, "food-pick", i)).join("")
    : (nq.length < 3 ? '<div class="cal-hint">Sin resultados en la base. Probá crear el alimento 👇</div>' : '');
  return local + '<div id="offResults">'+renderOffResults()+'</div>';
}

function foodRow(f, action, i){
  return `<div class="food-row" data-action="${action}" data-idx="${i}">
    <div class="food-name">${esc(f.name)}${f.cook?'<span class="food-cook">crudo / cocido</span>':''}${f.src==="OFF"?'<span class="food-cook">marca</span>':''}</div>
    <div class="food-kcal">${f.kcal} kcal<span>por 100 ${f.unit==="ml"?"ml":"g"}${f.cook?" "+f.cook.base:""}</span></div>
  </div>`;
}

// Resultados de Open Food Facts (productos de marca), debajo de los de la base propia.
// Se buscan aparte y sin bloquear la escritura (ver "food-search" en main.js).
export let offResults = [];
export function renderOffResults(){
  const o = ComidaState.off || {};
  if (!o.q || o.q.length < 3) return "";
  const head = '<div class="off-head">Productos de marca <span>Open Food Facts</span></div>';
  if (o.status === "loading") return head + '<div class="cal-hint">Buscando productos de marca…</div>';
  if (o.status === "error") return head + '<div class="cal-hint">No se pudo buscar productos de marca (¿sin conexión?). La base propia sigue funcionando.</div>';
  const shown = new Set((state.offRecent||[]).map(f=>f.code));
  offResults = (o.items||[]).filter(f=>!f.code || !shown.has(f.code));
  if (!offResults.length) return o.status === "done" ? head + '<div class="cal-hint">Sin productos de marca para esa búsqueda. Podés escanear el código de barras o crear el alimento.</div>' : "";
  return head + offResults.map((f,i)=>foodRow(f, "off-pick", i)).join("");
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
  // planFull/planBanner se calculan acá (ya con coachPlan cargado) pero se insertan al
  // final del return, no acá arriba: el plan escrito por el coach puede ser largo
  // (varias tablas de comidas, opciones, reemplazos) y antes iba primero en la pantalla,
  // empujando el anillo de calorías y el diario —lo que el cliente usa a diario— bajo
  // todo ese texto de referencia. Ahora el uso diario queda arriba sin interrupciones y
  // el plan completo del coach como lectura al final.
  const planFull = (state.coachPlan && state.coachPlan.plan) ? renderClientPlan(state.coachPlan.plan) : '';
  const planBanner = state.coachPlan ? `<div class="plan-banner"><div class="plan-t">Plan de tu coach</div><div class="plan-macros"><span><b>${(+state.coachPlan.kcal||0)||"-"}</b> kcal</span><span><b>${(+state.coachPlan.protein||0)||"-"}</b>P</span><span><b>${(+state.coachPlan.carbs||0)||"-"}</b>C</span><span><b>${(+state.coachPlan.fat||0)||"-"}</b>G</span></div>${state.coachPlan.notes?`<div class="plan-notes">${esc(state.coachPlan.notes)}</div>`:''}</div>` : '';
  const wml = state.water||0, wgoal = state.waterGoal||3000, wpct = wgoal?Math.min(Math.round(wml/wgoal*100),100):0;
  const Lstr = v => (v/1000).toLocaleString("es-AR",{maximumFractionDigits:2});
  const pct = t ? Math.min(tot.kcal/t, 1) : 0;
  const over = tot.kcal > t;
  const mbar = (lbl, cons, tgt) => {
    const w = tgt ? Math.min(Math.round(cons/tgt*100),100) : 0;
    return `<div><div class="macro-top"><b>${lbl}</b><span>${Math.round(cons)} / ${tgt} g</span></div><div class="bar"><div style="width:${w}%"></div></div></div>`;
  };
  const diary = state.diary.length ? state.diary.map(e=>`
    <div class="diary-item" data-action="diary-edit" data-id="${esc(e.id)}">
      <div class="diary-name">${esc(e.name)}<span>${e.grams} ${e.unit==="ml"?"ml":"g"} · P ${e.p} · C ${e.c} · G ${e.f}</span></div>
      <div class="diary-kcal">${e.kcal} kcal</div>
      <button class="diary-rm" data-action="diary-remove" data-id="${esc(e.id)}" title="Quitar">${xSvg}</button>
    </div>`).join("") : '<div class="cal-hint">Todavía no registraste nada hoy.</div>';
  return `
    <div class="cal-top">
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 120 120">
        <defs><linearGradient id="calRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--gize-r1)"/><stop offset=".35" style="stop-color:var(--gize-r2)"/><stop offset=".7" style="stop-color:var(--gize-r3)"/><stop offset="1" style="stop-color:var(--gize-r4)"/></linearGradient></defs>
        <circle class="ring-track" cx="60" cy="60" r="52"></circle>
        <circle id="calRing" class="ring-fill${over?' over':''}" cx="60" cy="60" r="52" style="stroke-dasharray:${RC};stroke-dashoffset:${RC*(1-pct)}"></circle>
      </svg>
      <div class="ring-center">
        <div id="calRingNum" class="ring-num${over?' over':''}" data-val="${tot.kcal}">${tot.kcal}</div>
        <div class="ring-lbl">de ${t} kcal</div>
      </div>
    </div>
    ${renderWeekAvg(t)}
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
    <div class="food-search-row">
      <div class="cal-search search-wrap"><span class="search-ic">${searchSvg}</span><input id="foodSearch" type="text" placeholder="Buscar alimento o marca…" value="${esc(ComidaState.foodQuery)}" data-action="food-search"></div>
      <button class="scan-btn" data-action="scan-open" title="Escanear código de barras" aria-label="Escanear código de barras">${barcodeSvg}</button>
    </div>
    <div id="foodResults">${renderResults(ComidaState.foodQuery)}</div>
    <button class="cal-create" data-action="food-create-open">+ Crear alimento propio</button>
    <div class="diary-head"><span class="t">Hoy</span><span class="s">${state.diary.length} ítems · ${tot.kcal} kcal</span></div>
    ${diary}
    ${planBanner}
    ${planFull}`;
}

// ---- Crudo / cocido ----
const COOK_PREF_KEY = "gize_cook_pref";
function cookPrefs(){ try{ return JSON.parse(localStorage.getItem(COOK_PREF_KEY)||"{}")||{}; }catch(e){ return {}; } }

// Estado con el que se abre un alimento: el último que eligió el cliente para ese
// alimento (la mayoría pesa siempre igual) o, si nunca eligió, el de los valores base.
export function defaultCookState(food){
  if(!food || !food.cook) return null;
  const p = cookPrefs()[food.name];
  return (p === "crudo" || p === "cocido") ? p : food.cook.base;
}

export function rememberCookState(food, st){
  if(!food || !food.cook || !st) return;
  try{ const p = cookPrefs(); p[food.name] = st; localStorage.setItem(COOK_PREF_KEY, JSON.stringify(p)); }catch(e){}
}

// Porción sugerida en ese estado: 80 g de arroz crudo ≈ 210 g cocido.
export function cookPortion(food, st){
  if(!food || !food.cook || !st || st === food.cook.base) return food ? food.portion : 0;
  return Math.round(st === "cocido" ? food.portion * food.cook.factor : food.portion / food.cook.factor);
}

// El alimento elegido con los valores del estado en que lo pesó el cliente.
export function selectedFoodValues(){
  return cookVariant(ComidaState.selectedFood, ComidaState.cookState);
}

// ---- Promedio de calorías de los últimos 7 días ----
// Se guarda el total del día cuando la app pasa al día siguiente (ver checkDaily) y se
// completa con la nube al abrir la app. Se conservan 60 días.
export function logDayKcal(date, diary){
  if(!date || !Array.isArray(diary) || !diary.length) return;
  const tot = diary.reduce((a,e)=>a+(Number(e.kcal)||0), 0);
  state.kcalLog = Object.assign({}, state.kcalLog||{}); state.kcalLog[date] = Math.round(tot);
  const keys = Object.keys(state.kcalLog).sort(); while(keys.length > 60) delete state.kcalLog[keys.shift()];
}

// Promedio de los 7 días anteriores a hoy (hoy no cuenta: todavía no terminó). Solo
// promedia los días en que se anotó algo: un día sin registrar no es un día de 0 kcal.
export function weekKcal(){
  const log = state.kcalLog || {}; const vals = [];
  for(let i=1;i<=7;i++){ const d=new Date(); d.setDate(d.getDate()-i); const v=log[ymd(d)]; if(v>0) vals.push(v); }
  return vals.length ? { avg: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length), days: vals.length } : null;
}

// Recuadro chico al lado del anillo de calorías. Con los datos del cliente (Mifflin-St
// Jeor, ver calcTarget) se compara con su mantenimiento: déficit / superávit. Si la meta
// la puso el coach o se cargó a mano, no se sabe el mantenimiento y se compara con la meta.
function renderWeekAvg(target){
  const w = weekKcal();
  if(!w) return `<button class="wk-avg empty" data-action="food-hist-open"><span class="wk-t">Promedio 7 días</span><span class="wk-hint">Registrá lo que comés unos días para verlo</span><span class="wk-go">Ver días anteriores ›</span></button>`;
  const prof = state.calProfile, useMaint = !state.coachPlan && prof && +prof.age>0 && +prof.height>0 && +prof.weight>0;
  const ref = useMaint ? calcTarget(Object.assign({}, prof, {goal:"mantener"})) : target;
  const diff = w.avg - ref, band = ref * 0.05;
  const st = !ref ? "" : Math.abs(diff) <= band ? "eq" : (diff < 0 ? "down" : "up");
  const lbl = { eq: useMaint ? "Mantenimiento" : "En tu meta", down: useMaint ? "Déficit" : "Debajo de la meta", up: useMaint ? "Superávit" : "Arriba de la meta" }[st] || "";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  return `<button class="wk-avg ${st}" data-action="food-hist-open" title="Promedio de los días registrados de la última semana, comparado con ${useMaint?"tu mantenimiento ("+ref+" kcal)":"tu meta ("+ref+" kcal)"}">
    <span class="wk-t">Promedio 7 días</span>
    <span class="wk-n">${w.avg.toLocaleString("es-AR")}<small> kcal/día</small></span>
    ${st ? `<span class="wk-st">${lbl}</span><span class="wk-d">${sign}${Math.abs(Math.round(diff)).toLocaleString("es-AR")} kcal vs ${useMaint?"mantenim.":"meta"}</span>` : ""}
    <span class="wk-days">${w.days} de 7 días registrados</span>
    <span class="wk-go">Ver lo que comiste ›</span>
  </button>`;
}
