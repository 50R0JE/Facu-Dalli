import { EX_CATS, EX_DB } from '../../core/data.js';

import { checkSvg, copySvg, downloadSvg, saveSvg, searchSvg, xSvg } from '../../core/icons.js';

import { State } from '../../core/state.js';

import { esc, mkEx, muscleOf, today } from '../../core/utils.js';

import { coachDatalist, exChart, exTable } from './clientes.js';

import { renderCoach } from './index.js';

import { CoachState, coachWeekSel } from './state.js';

import { blockWeek } from '../entreno.js';

import { closeSheet } from '../../ui/sheet.js';

export function rtDays(){ return CoachState.coachTplEdit ? CoachState.coachTplEdit.days : (CoachState.coachData?CoachState.coachData.routine:null); }

export async function loadTpls(){
  CoachState.tplsError=null;
  if(!State.sb||!State.cloudUser){ CoachState.tplsError="Sin conexión a la cuenta."; return; }
  try{
    const r=await State.sb.from("routine_templates").select("*").eq("coach_id",State.cloudUser.id).order("name");
    if(r.error){ CoachState.tplsError=r.error.message||String(r.error); CoachState.coachTpls=[]; }
    else { CoachState.coachTpls=r.data||[]; }
  }catch(e){ CoachState.tplsError=(e&&e.message)||String(e); CoachState.coachTpls=[]; console.error("tpls",e); }
}

export function planDefault(){
  return { trainDays:[], restDays:[], water:"", salt:"", guidelines:[], supps:[], options:[], extras:[], swaps:[], cardio:{text:"",items:[]}, habits:[] };
}

export function coachPlanObj(d){
  if(!CoachState.coachPlanForm){ CoachState.coachPlanForm = Object.assign(planDefault(), (d.plan && d.plan.plan) ? JSON.parse(JSON.stringify(d.plan.plan)) : {}); 
    // arrastrar macros globales viejos si existían
    if(d.plan){ CoachState.coachPlanForm._kcal=d.plan.kcal||""; CoachState.coachPlanForm._protein=d.plan.protein||""; CoachState.coachPlanForm._carbs=d.plan.carbs||""; CoachState.coachPlanForm._fat=d.plan.fat||""; CoachState.coachPlanForm._notes=d.plan.notes||""; }
  }
  return CoachState.coachPlanForm;
}

export function mealRows(p, key){
  const rows=(p[key]||[]);
  const head='<div class="ml-head"><span>Comida</span><span>Horario</span><span>Kcal</span><span>Hidratos</span><span>Grasas</span><span>Proteína</span><span>Nota</span><span></span></div>';
  const body=rows.map((r,i)=>
    '<div class="ml-row">'+
      '<input class="ml-in wide" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="meal" value="'+esc(r.meal||"")+'" placeholder="">'+
      '<input class="ml-in sm" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="time" value="'+esc(r.time||"")+'" placeholder="">'+
      '<input class="ml-in n" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="kcal" value="'+esc(r.kcal||"")+'" placeholder="">'+
      '<input class="ml-in n" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="cho" value="'+esc(r.cho||"")+'" placeholder="">'+
      '<input class="ml-in n" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="fat" value="'+esc(r.fat||"")+'" placeholder="">'+
      '<input class="ml-in n" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="prot" value="'+esc(r.prot||"")+'" placeholder="">'+
      '<input class="ml-in wide" data-coach="pl-meal" data-key="'+key+'" data-i="'+i+'" data-k="note" value="'+esc(r.note||"")+'" placeholder="">'+
      '<button class="ml-del" data-coach="pl-mealdel" data-key="'+key+'" data-i="'+i+'" title="Quitar">\u2715</button>'+
    '</div>').join("");
  // fila total
  let tk=0,tc=0,tf=0,tp=0; rows.forEach(r=>{ tk+=+r.kcal||0; tc+=+r.cho||0; tf+=+r.fat||0; tp+=+r.prot||0; });
  const tot='<div class="ml-tot"><span>OBJETIVO</span><span></span><span>'+tk+'</span><span>'+tc+'</span><span>'+tf+'</span><span>'+tp+'</span><span></span><span></span></div>';
  return head+body+tot+'<button class="pl-add" data-coach="pl-mealadd" data-key="'+key+'">+ Agregar comida</button>';
}

export function listEditor(p, key, label, ph){
  const arr=(p[key]||[]);
  const rows=arr.map((t,i)=>'<div class="le-row"><input class="ml-in wide" data-coach="pl-list" data-key="'+key+'" data-i="'+i+'" value="'+esc(t)+'" placeholder="'+ph+'"><button class="ml-del" data-coach="pl-listdel" data-key="'+key+'" data-i="'+i+'">\u2715</button></div>').join("");
  return '<div class="co-note-lbl" style="margin-top:16px">'+label+'</div>'+rows+'<button class="pl-add" data-coach="pl-listadd" data-key="'+key+'">+ Agregar</button>';
}

export function optionsEditor(p){
  const arr=(p.options||[]);
  const blocks=arr.map((sec,i)=>{
    const opts=(sec.opts||[]).map((o,j)=>
      '<div class="opt-item oc-'+(j%6)+'">'+
        '<div class="opt-item-head">'+
          '<input class="ml-in opt-label" data-coach="pl-optlabel" data-i="'+i+'" data-j="'+j+'" value="'+esc(o.label||"")+'" placeholder="">'+
          '<button class="ml-del" data-coach="pl-optdel" data-i="'+i+'" data-j="'+j+'" title="Quitar opción">\u2715</button>'+
        '</div>'+
        '<textarea class="opt-body" rows="3" data-coach="pl-optbody" data-i="'+i+'" data-j="'+j+'" placeholder="Un alimento por rengl\u00f3n (Enter para separar)">'+esc(o.body||"")+'</textarea>'+
      '</div>').join("");
    return '<div class="opt-sec">'+
      '<div class="opt-sec-head">'+
        '<input class="ml-in opt-sectitle" data-coach="pl-optsec" data-i="'+i+'" value="'+esc(sec.title||"")+'" placeholder="">'+
        '<button class="ml-del" data-coach="pl-optsecdel" data-i="'+i+'" title="Borrar sección">\u2715</button>'+
      '</div>'+
      opts+
      '<button class="pl-add sm" data-coach="pl-optadd" data-i="'+i+'">+ Agregar opción (A, B, C...)</button>'+
    '</div>';
  }).join("");
  return '<div class="co-note-lbl" style="margin-top:16px">Opciones de comidas (el cliente elige)</div>'+
    '<div class="pl-help">Cre\u00e1 una <b>secci\u00f3n</b> (Desayuno, Merienda, Almuerzo...) y adentro cada <b>opci\u00f3n</b> con su t\u00edtulo (Opci\u00f3n A) y su texto. As\u00ed el cliente lo ve como un men\u00fa ordenado.</div>'+
    blocks+
    '<button class="pl-add" data-coach="pl-optsecadd">+ Agregar secci\u00f3n (Desayuno, Almuerzo...)</button>';
}

export function swapsEditor(p){
  const arr=(p.swaps||[]);
  const rows=arr.map((sw,i)=>'<div class="sw-row"><input class="ml-in wide" data-coach="pl-swap" data-i="'+i+'" data-k="from" value="'+esc(sw.from||"")+'" placeholder=""><span class="sw-arrow">\u2192</span><input class="ml-in wide" data-coach="pl-swap" data-i="'+i+'" data-k="to" value="'+esc(sw.to||"")+'" placeholder=""><button class="ml-del" data-coach="pl-swapdel" data-i="'+i+'">\u2715</button></div>').join("");
  return '<div class="co-note-lbl" style="margin-top:16px">Reemplazos (equivalencias)</div>'+rows+'<button class="pl-add" data-coach="pl-swapadd">+ Agregar reemplazo</button>';
}

export function cardioItemsEditor(p){
  const arr=(p.cardio&&p.cardio.items)?p.cardio.items:[];
  const rows=arr.map((t,i)=>'<div class="le-row"><input class="ml-in wide" data-coach="pl-cardioitem" data-i="'+i+'" value="'+esc(t)+'" placeholder=""><button class="ml-del" data-coach="pl-cardioitemdel" data-i="'+i+'">\u2715</button></div>').join("");
  return '<div class="co-note-lbl" style="margin-top:10px">Sesiones puntuales (opcional)</div>'+rows+'<button class="pl-add" data-coach="pl-cardioitemadd">+ Agregar sesión</button>';
}

export function habitsEditor(p){
  const arr=Array.isArray(p.habits)?p.habits:[];
  const rows=arr.map((t,i)=>'<div class="le-row"><input class="ml-in wide" data-coach="pl-habit" data-i="'+i+'" value="'+esc(t)+'" placeholder=""><button class="ml-del" data-coach="pl-habitdel" data-i="'+i+'">\u2715</button></div>').join("");
  return rows+'<button class="pl-add" data-coach="pl-habitadd">+ Agregar hábito</button>';
}

export function renderCoachPlan(d){
  const p = coachPlanObj(d);
  return '<div class="co-sec">Plan nutricional</div><div class="co-panel plan-edit">'+
    '<div class="pl-sub">Días de entrenamiento — reparto de comidas</div>'+mealRows(p,"trainDays")+
    '<div class="pl-sub" style="margin-top:20px">Días de descanso — reparto de comidas</div>'+mealRows(p,"restDays")+
    '<div class="ml-row2" style="margin-top:16px">'+
      '<div class="ci-f"><label>Agua por día</label><input class="co-note" data-coach="pl-water" value="'+esc(p.water||"")+'" placeholder=""></div>'+
      '<div class="ci-f"><label>Sal por día</label><input class="co-note" data-coach="pl-salt" value="'+esc(p.salt||"")+'" placeholder=""></div>'+
    '</div>'+
    listEditor(p,"guidelines","Pautas nutricionales","")+
    listEditor(p,"supps","Suplementos recomendados","")+
    optionsEditor(p)+
    listEditor(p,"extras","Adicionales (aderezos, condimentos permitidos)","")+
    swapsEditor(p)+
    '<div class="pl-sub" style="margin-top:22px">Cardio prescripto</div>'+
    '<div class="co-note-wrap"><span class="co-note-lbl">Indicación general de cardio</span><input class="co-note" data-coach="pl-cardiotext" value="'+esc((p.cardio&&p.cardio.text)||"")+'" placeholder=""></div>'+
    cardioItemsEditor(p)+
    '<div class="pl-sub" style="margin-top:22px">Hábitos diarios (checklist del cliente)</div>'+
    habitsEditor(p)+
    '<button class="co-save-rt" data-coach="plan-save">Guardar plan nutricional</button></div>';
}

export function renderCoachBlock(d){
  const b = CoachState.coachBlockForm || d.block || {};
  const wks = parseInt(b.weeks)||8;
  const dls = Array.isArray(b.deloads)?b.deloads:[];
  const cur = b.start_date ? blockWeek(b, today()) : 0;
  let grid="";
  const wPlan=(CoachState.coachBlockForm||b).weekPlan||{};
  for(let w=1; w<=wks; w++){
    const on=dls.indexOf(w)>=0;
    const hasNote=!!(wPlan[w]&&(wPlan[w].goal||wPlan[w].note));
    const sel=coachWeekSel===w;
    grid+='<button class="bw'+(on?' dl':'')+(w===cur?' now':'')+(sel?' sel':'')+(hasNote?' has-note':'')+'" data-coach="blk-week" data-w="'+w+'">'+w+(hasNote?'<span class="bw-dot">•</span>':'')+'</button>';
  }
  const F=(k,lbl,ph,type)=>'<div class="ci-f"><label>'+lbl+'</label><input class="co-note" data-coach="blk-'+k+'" value="'+esc(b[k]==null?"":String(b[k]))+'" placeholder="'+ph+'"'+(type?' type="'+type+'"':'')+'></div>';
  return '<div class="ci-grid">'+
      F("name","Nombre del bloque","")+F("start_date","Inicio (lunes)","",'date')+
      F("weeks","Semanas","","numeric")+F("phase","Fase","")+
    '</div>'+
    F("calories","Estrategia cal\u00f3rica","")+
    F("notes","Nota del bloque (la ve el cliente)","")+
    '<div class="co-note-lbl" style="margin-top:14px">Semanas de descarga \u2014 toc\u00e1 para marcarlas'+(cur?' \u00b7 el cliente est\u00e1 en la semana '+cur:'')+'</div>'+
    '<div class="bw-grid">'+grid+'</div>'+
    (coachWeekSel!==null ? (() => {
      const wp=(wPlan[coachWeekSel]||{});
      const isDl=dls.indexOf(coachWeekSel)>=0;
      return '<div class="week-editor">'+
        '<div class="week-ed-head">Semana '+coachWeekSel+(cur===coachWeekSel?' · semana actual':'')+(isDl?' · DESCARGA':'')+
        '<button class="co-copy-btn" style="margin-left:auto" data-coach="wk-dl" data-w="'+coachWeekSel+'">'+(isDl?checkSvg+' Descarga':'Marcar descarga')+'</button></div>'+
        '<div class="ci-f" style="margin-top:10px"><label>Objetivo de la semana</label><input class="co-note" data-coach="wk-goal" value="'+esc(wp.goal||'')+'"></div>'+
        '<div class="ci-f" style="margin-top:8px"><label>Indicaciones para el cliente</label><input class="co-note" data-coach="wk-note" value="'+esc(wp.note||'')+'"></div>'+
        '<div style="margin-top:10px;display:flex;gap:8px">'+
          '<button class="co-save-rt" style="flex:1" data-coach="wk-save">Guardar semana '+coachWeekSel+'</button>'+
          '<button class="co-copy-btn" data-coach="wk-close">'+xSvg+' Cerrar</button>'+
        '</div></div>';
    })() : '')+
    '<button class="co-save-rt" data-coach="blk-save">Guardar bloque</button>';
}

export function applyPickerMarkup(){
  const st=CoachState.coachApplyPicker;
  if(!st.tplId){
    // paso 1: elegir plantilla
    let opts;
    if(st.loading){ opts='<div class="cal-hint">Cargando tus rutinas…</div>'; }
    else if(CoachState.tplsError){ opts='<div class="cal-hint" style="color:var(--red)">No se pudieron cargar las rutinas.<br><br><b>'+esc(CoachState.tplsError)+'</b><br><br>Si dice que la tabla no existe, falta correr el SQL de rutinas en Supabase.</div>'; }
    else if(!CoachState.coachTpls.length){ opts='<div class="cal-hint">Todavía no tenés rutinas guardadas.<br>Volvé al panel principal → pestaña “Mis rutinas” → creá una o importá el Microciclo 8.</div>'; }
    else { opts=CoachState.coachTpls.map(t=>{
      const nd=(t.days||[]).length;
      return '<div class="cp-copt" data-coach="ap-tpl" data-id="'+t.id+'">'+esc(t.name)+'<span class="ap-meta">'+nd+' día'+(nd===1?'':'s')+'</span></div>';
    }).join(""); }
    return '<div class="cp-title">Aplicar una rutina</div>'+
      '<div class="cp-sub">Elegí cuál de tus rutinas querés usar para este cliente.</div>'+
      '<div class="cp-clist">'+opts+'</div>'+
      '<button class="logout-btn" data-coach="ap-cancel">Cancelar</button>';
  }
  // paso 2: elegir días
  const tpl=CoachState.coachTpls.find(t=>t.id===st.tplId); if(!tpl){ CoachState.coachApplyPicker=null; return null; }
  const days=(tpl.days||[]);
  const sel=st.days||{};
  const rows=days.map((d,i)=>{
    const on=sel[i]!==false;
    const nex=(d.exercises||[]).length;
    return '<div class="ap-day'+(on?' on':'')+'" data-coach="ap-day" data-i="'+i+'">'+
      '<span class="ap-chk">'+(on?'\u2713':'')+'</span>'+
      '<span class="ap-dname">'+esc(d.name||('Día '+(i+1)))+'</span>'+
      '<span class="ap-meta">'+nex+' ej.</span></div>';
  }).join("");
  const nSel=days.filter((d,i)=>sel[i]!==false).length;
  return '<div class="cp-title">'+esc(tpl.name)+'</div>'+
    '<div class="cp-sub">Destildá los días que no quieras aplicar.</div>'+
    '<div class="ap-days">'+rows+'</div>'+
    '<div class="ap-mode"><label class="ap-radio'+(st.mode!=="add"?" on":"")+'" data-coach="ap-mode" data-m="replace">Reemplazar la rutina actual</label>'+
    '<label class="ap-radio'+(st.mode==="add"?" on":"")+'" data-coach="ap-mode" data-m="add">Agregar a la rutina actual</label></div>'+
    '<button class="co-save-rt" data-coach="ap-confirm">Aplicar '+nSel+' día'+(nSel===1?'':'s')+'</button>'+
    '<button class="logout-btn" style="margin-top:8px" data-coach="ap-back">‹ Elegir otra rutina</button>';
}

export function renderApplyPicker(){
  let el=document.getElementById("applyMount");
  if(!el){ el=document.createElement("div"); el.id="applyMount"; document.body.appendChild(el); }
  if(!CoachState.coachApplyPicker){ el.innerHTML=""; return; }
  const markup = applyPickerMarkup();
  if(markup===null){ el.innerHTML=""; return; }
  const existing = el.querySelector(".cp-ccard");
  if(existing){ existing.innerHTML = markup; return; }
  el.innerHTML='<div class="cp-bg" data-coach="ap-cancel"></div><div class="cp-ccard">'+markup+'</div>';
}

export function renderCoachRoutine(d){
  const rt=d.routine||[];
  if(!rt.length) return '<div class="co-sec">Rutina y progreso</div><div class="cal-hint">El cliente todav\u00eda no tiene rutina.</div><button class="co-add-day" data-coach="day-add">+ Agregar d\u00eda</button>';
  if(CoachState.coachEditDay>=rt.length) CoachState.coachEditDay=0;
  const tabs=rt.map((x,i)=>'<button class="co-daytab'+(i===CoachState.coachEditDay?' on':'')+'" data-coach="edit-day" data-i="'+i+'">'+esc(x.name||('D\u00eda '+(i+1)))+'</button>').join("");
  const day=rt[CoachState.coachEditDay];
  const totalSets=(day.exercises||[]).reduce((n,x)=>n+((x.sets||[]).length),0);
  const totalEx=(day.exercises||[]).length;
  const cards=(day.exercises||[]).map((ex,i)=>{
    const sets=(ex.sets||[]).map((st,j)=>'<div class="co-set-row"><span class="co-set-n">'+(j+1)+'</span><input class="co-target" data-coach="rt-target" data-i="'+i+'" data-j="'+j+'" value="'+esc(st.target||"")+'" placeholder=""><span class="co-set-u">reps objetivo</span><button class="co-set-rm" data-coach="rt-setdel" data-i="'+i+'" data-j="'+j+'" title="Quitar serie">\u2715</button></div>').join("");
    return '<button class="co-rt-ins" data-coach="rt-ins" data-i="'+i+'" title="Insertar ejercicio ac\u00e1">+</button>'+
      '<div class="co-exc"><div class="co-exc-head"><input class="co-ord" data-coach="rt-o" data-i="'+i+'" value="'+esc(ex.o||"")+'" placeholder=""><input class="co-exc-name" data-coach="rt-name" data-i="'+i+'" value="'+esc(ex.name||"")+'" list="exList" placeholder="Nombre del ejercicio">'+
      '<span class="co-exc-sets">'+((ex.sets||[]).length)+' series</span>'+
      '<button class="co-exc-btn" data-coach="rt-up" data-i="'+i+'" title="Subir"'+(i===0?' disabled':'')+'>\u2191</button>'+
      '<button class="co-exc-btn" data-coach="rt-down" data-i="'+i+'" title="Bajar"'+(i===rt.length-1?' disabled':'')+'>\u2193</button>'+
      '<button class="co-exc-btn" data-coach="rt-swap" data-i="'+i+'" title="Cambiar ejercicio">\u21c4</button>'+
      '<button class="co-exc-btn del" data-coach="rt-del" data-i="'+i+'" title="Eliminar">\u2715</button></div>'+
      '<div class="co-exc-grid">'+
        '<div class="co-exc-plan">'+
          '<div class="co-prow"><span class="co-note-lbl">RIR</span><input class="co-pin" data-coach="rt-rir" data-i="'+i+'" value="'+esc(ex.rir||"")+'" placeholder=""><span class="co-note-lbl">Descanso</span><input class="co-pin" data-coach="rt-rest" data-i="'+i+'" value="'+esc(ex.rest||"")+'" placeholder=""></div>'+
          '<div class="co-note-wrap"><span class="co-note-lbl">Objetivo de progreso</span><input class="co-note" data-coach="rt-goal" data-i="'+i+'" value="'+esc(ex.goal||"")+'" placeholder=""></div>'+
          '<div class="co-note-wrap"><span class="co-note-lbl">Link de video (YouTube)</span><input class="co-note" data-coach="rt-video" data-i="'+i+'" value="'+esc(ex.video||"")+'" placeholder="https://youtu.be/..."></div>'+
          sets+
          '<button class="co-set-add" data-coach="rt-setadd" data-i="'+i+'">+ Serie</button>'+
          '<div class="co-note-wrap"><span class="co-note-lbl">Nota para el cliente</span><input class="co-note" data-coach="rt-note" data-i="'+i+'" value="'+esc(ex.note||"")+'" placeholder=""></div>'+
        '</div>'+
        '<div class="co-exc-prog">'+exChart(d, day.name, ex.name)+'</div>'+
        '<div class="co-exc-tbl">'+exTable(d, day.name, ex.name)+'</div>'+
      '</div></div>';
  }).join("");
  return '<div class="co-sec">Rutina y progreso</div>'+coachDatalist()+
    '<div class="co-daytabs">'+tabs+'<button class="co-daytab add" data-coach="day-add">+</button></div>'+
    '<div class="co-dayname-row"><input class="co-dayname" data-coach="day-name" value="'+esc(day.name||"")+'" placeholder="Nombre del d\u00eda">'+
    (rt.length>1?'<button class="co-exc-btn" data-coach="day-left" title="Mover este d\u00eda a la izquierda"'+(CoachState.coachEditDay===0?' disabled':'')+'>\u2190</button>':'')+
    (rt.length>1?'<button class="co-exc-btn" data-coach="day-right" title="Mover este d\u00eda a la derecha"'+(CoachState.coachEditDay===rt.length-1?' disabled':'')+'>\u2192</button>':'')+
    (rt.length>1?'<button class="co-day-del" data-coach="day-del">Borrar d\u00eda</button>':'')+'</div>'+
    '<div class="co-daystats"><span class="co-stat"><b>'+totalEx+'</b> ejercicios</span><span class="co-stat"><b>'+totalSets+'</b> series en total</span></div>'+
    '<div class="co-note-wrap"><span class="co-note-lbl">Nota general de este d\u00eda (la ve el cliente al entrar)</span><input class="co-note" data-coach="day-note" value="'+esc(day.note||"")+'" placeholder=""></div>'+
    (cards||'<div class="cal-hint">D\u00eda vac\u00edo. Agreg\u00e1 ejercicios ac\u00e1 abajo.</div>')+
    '<button class="co-rt-add" data-coach="rt-add">+ Agregar ejercicio</button>'+
    (CoachState.coachTplEdit ? '' : '<button class="co-save-rt" data-coach="save-routine">Guardar rutina</button>')+
    (CoachState.coachTplEdit ? "" : "<div class='rt-actions'><button class='co-copy-btn' data-coach='rt-apply'>"+downloadSvg+" Aplicar una de mis rutinas</button><button class='co-copy-btn' data-coach='rt-copy'>"+copySvg+" Copiar a otro cliente</button><button class='co-copy-btn' data-coach='rt-tosave'>"+saveSvg+" Guardar como rutina</button></div>");
}

export function coachPickerMarkup(){
  const q=CoachState.coachPQ.trim().toLowerCase();
  let inner;
  if(q){
    const res=[]; Object.keys(EX_DB).forEach(k=>EX_DB[k].forEach(n=>{ if(n.toLowerCase().indexOf(q)>=0) res.push(n); }));
    inner='<div class="cp-exs">'+(res.length?res.map(n=>'<button class="cp-ex" data-cp="choose" data-name="'+esc(n)+'">'+esc(n)+'</button>').join(""):'<div class="cal-hint">Sin resultados</div>')+'</div>';
  } else if(!CoachState.coachPCat){
    inner='<div class="cp-step">1. Eleg\u00ed el grupo muscular</div><div class="cp-cats">'+EX_CATS.map(c=>'<button class="cp-cat" data-cp="cat" data-c="'+c[0]+'">'+c[1]+'</button>').join("")+'</div>';
  } else {
    const lb=(EX_CATS.find(c=>c[0]===CoachState.coachPCat)||["",""])[1];
    inner='<div class="cp-bar"><button class="cp-back" data-cp="cats">\u2039 Grupos</button><span class="cp-catname">'+esc(lb)+'</span></div>'+
      '<div class="cp-exs">'+(EX_DB[CoachState.coachPCat]||[]).map(n=>'<button class="cp-ex" data-cp="choose" data-name="'+esc(n)+'">'+esc(n)+'</button>').join("")+'</div>';
  }
  return '<div class="cp-head"><div class="cp-title">'+(CoachState.coachPicker.mode==="swap"?"Cambiar ejercicio":"Elegir ejercicio")+'</div><button class="cp-x" data-cp="cancel">\u2715</button></div>'+
    '<div class="search-wrap"><span class="search-ic">'+searchSvg+'</span><input class="cp-search" placeholder="Buscar ejercicio en toda la base..." value="'+esc(CoachState.coachPQ)+'" data-cp="search"></div>'+
    inner+
    '<button class="cp-custom" data-cp="custom">\u270e '+(CoachState.coachPicker.mode==="swap"?"Escribir nombre propio":"Agregar con nombre propio")+'</button>';
}

export function renderCoachPicker(){
  const host=document.getElementById("coachSheetHost"); if(!host) return;
  if(!CoachState.coachPicker){ host.innerHTML=""; return; }
  const existing = host.querySelector(".cp-modal");
  if(existing){ existing.innerHTML = coachPickerMarkup(); return; }
  host.innerHTML='<div class="cp-bg" data-cp="cancel"></div><div class="cp-modal">'+coachPickerMarkup()+'</div>';
}

export function cpApply(name){
  if(!rtDays()) return;
  const day=(rtDays()||[])[CoachState.coachEditDay]; if(!day) return;
  const mm=(muscleOf(name)!=="otros")?muscleOf(name):(CoachState.coachPCat||"otros");
  if(CoachState.coachPicker.mode==="swap"){ const ex=day.exercises[CoachState.coachPicker.i]; if(ex){ ex.name=name; ex.mus=mm; } }
  else if(CoachState.coachPicker.mode==="insert"){ day.exercises.splice(CoachState.coachPicker.idx,0,mkEx(name,3,mm)); }
  else { day.exercises.push(mkEx(name,3,mm)); }
  closeSheet(()=>{ CoachState.coachPicker=null; renderCoachPicker(); renderCoach(); }, {host:"#coachSheetHost", card:".cp-modal", duration:150});
}
