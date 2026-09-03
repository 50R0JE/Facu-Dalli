import { CHECKIN_Q, SCALES } from '../core/data.js';

import { copySvg, pillSvg, trophySvg } from '../core/icons.js';

import { state } from '../core/state.js';

import { save } from '../core/storage.js';

import { cloudInsertSession } from '../core/supabase.js';

import { esc, fmtDate, mondayOf, today, uid } from '../core/utils.js';

import { renderApp } from '../main.js';

import { day } from './entreno.js';

import { detectPRs } from './progreso.js';

export const CheckinState = {

  dailyForm: null,

  checkinOpen: false,

  checkinForm: null,

  myPhotos: [],

  fbSession: null,

  fbForm: null,

  newPRs: [],

};

export function saveSession(){
  const d=day(); const exs=[];
  (d.exercises||[]).forEach(ex=>{
    const sets=(ex.sets||[]).map(s=>({kg:parseFloat(String(s.kg).replace(",","."))||0, reps:parseInt(s.reps)||0})).filter(s=>s.kg>0||s.reps>0);
    if(sets.length) exs.push({name:ex.name, sets:sets});
  });
  if(!exs.length){ alert("Cargá kg o reps en al menos una serie antes de guardar el entreno."); return; }
  CheckinState.newPRs=detectPRs(exs, state.sessions); // contra el historial ANTES de sumar esta sesión
  const _ns={id:uid(), date:today(), ts:Date.now(), day:d.name, exercises:exs};
  state.sessions.push(_ns);
  save();
  try{ cloudInsertSession(_ns); }catch(e){}
  CheckinState.fbSession=_ns.id; CheckinState.fbForm={};
  renderApp();
}

export function renderFeedback(){
  const host=document.getElementById("fbHost"); if(!host) return;
  if(!CheckinState.fbSession){ host.innerHTML=""; return; }
  const f=CheckinState.fbForm||{};
  const scale=(k,lbl,hint)=>{
    const opts=[1,2,3,4,5].map(n=>'<button class="fb-n'+(String(f[k])===String(n)?' on':'')+'" data-action="fb-set" data-k="'+k+'" data-v="'+n+'">'+n+'</button>').join("");
    return '<div class="fb-row"><div class="fb-lbl">'+lbl+'<span class="fb-hint">'+hint+'</span></div><div class="fb-opts">'+opts+'</div></div>';
  };
  const jp=["No","S\u00ed"].map(v=>'<button class="fb-n wide'+(f.joint===v?' on':'')+'" data-action="fb-set" data-k="joint" data-v="'+v+'">'+v+'</button>').join("");
  const prBanner = (CheckinState.newPRs&&CheckinState.newPRs.length) ? '<div class="pr-box"><div class="pr-title">'+trophySvg+' ¡Nuevo récord!</div>'+CheckinState.newPRs.map(p=>'<div class="pr-line"><span class="pr-ex">'+esc(p.name)+'</span><span class="pr-val">'+p.kg+' kg × '+p.reps+'</span><span class="pr-prev">antes '+p.prev+' kg</span></div>').join("")+'</div>' : '';
  host.innerHTML='<div class="fb-bg"></div><div class="fb-card">'+
    prBanner+
    '<div class="fb-title">\u00a1Entreno guardado! 💪</div>'+
    '<div class="fb-sub">Contale a tu coach c\u00f3mo te fue</div>'+
    scale("rpe","Fatiga percibida","1 = nada \u00b7 5 = al l\u00edmite")+
    scale("pump","Pump de la sesi\u00f3n","1 = nada \u00b7 5 = mucho")+
    '<div class="fb-row"><div class="fb-lbl">Dolor articular<span class="fb-hint">\u00bfMolestia en alguna articulaci\u00f3n?</span></div><div class="fb-opts">'+jp+'</div></div>'+
    '<button class="form-save" style="margin-top:16px" data-action="fb-save">Enviar a mi coach</button>'+
    '<button class="logout-btn" style="margin-top:8px" data-action="fb-skip">Ahora no</button></div>';
}

export function renderInfo(){
  const i=state.info; if(!i) return "";
  const F=[["age","Edad",""],["height_cm","Altura"," cm"],["availability","Disponibilidad",""],["stage","Etapa",""],["commitment","Compromiso",""],["steps_goal","Pasos diarios",""]];
  const chips=F.filter(x=>i[x[0]]).map(x=>'<div class="fi-chip"><span>'+x[1]+'</span><b>'+esc(String(i[x[0]]))+x[2]+'</b></div>').join("");
  const L=[["objective","Objetivo"],["block_goal","Objetivo del bloque"],["structure","Estructura"],["cardio","Cardio"],["injuries","Lesiones o patolog\u00edas"]];
  const lines=L.filter(x=>i[x[0]]).map(x=>'<div class="fi-line"><span>'+x[1]+'</span>'+esc(i[x[0]])+'</div>').join("");
  if(!chips && !lines) return "";
  return '<div class="hb-head"><div class="hb-title">Mi ficha</div><div class="title-accent"></div></div>'+
    '<div class="fi-card">'+(chips?'<div class="fi-chips">'+chips+'</div>':'')+lines+'</div>';
}

export function renderDaily(){
  const d = CheckinState.dailyForm || (state.daily[today()] || {});
  const rows = SCALES.map(sc=>{
    const opts = sc[2].map(o=>'<button class="sc-opt'+(d[sc[0]]===o?' on':'')+'" data-action="daily-set" data-k="'+sc[0]+'" data-v="'+esc(o)+'">'+o+'</button>').join("");
    return '<div class="sc-row"><span class="sc-lbl">'+sc[1]+'</span><div class="sc-opts">'+opts+'</div></div>';
  }).join("");
  return `
    <div class="hb-head"><div class="hb-title">Registro de hoy</div><div class="title-accent"></div></div>
    <div class="daily-card">
      <div class="daily-top">
        <div class="dfield"><label>Peso</label><input id="dKg" class="form-input" type="text" inputmode="decimal" placeholder="kg" value="${esc(d.kg||"")}" data-action="daily-kg"></div>
        <div class="dfield"><label>Pasos</label><input id="dSteps" class="form-input" type="text" inputmode="numeric" placeholder="0" value="${esc(d.steps||"")}" data-action="daily-steps"></div>
      </div>
      ${rows}
      <div class="dfield" style="margin-top:10px"><label>Comentarios del día</label><input id="dCom" class="form-input" placeholder="Cómo te sentiste, algo que quieras contarle a tu coach…" value="${esc(d.comment||"")}" data-action="daily-com"></div>
      <button class="form-save" style="margin-top:12px" data-action="daily-save">Guardar registro de hoy</button>
    </div>`;
}

export function renderCheckin(){
  const wk = mondayOf(today());
  const saved = state.checkins[wk];
  if(!CheckinState.checkinOpen){
    return `<div class="hb-head" style="margin-top:26px"><div class="hb-title">Check-in semanal</div><div class="title-accent"></div></div>
      <div class="ci-card">
        <div class="ci-status">${saved ? "\u2713 Ya respondiste el check-in de esta semana. Pod\u00e9s editarlo." : "Todav\u00eda no respondiste el check-in de esta semana."}</div>
        <button class="form-save" style="margin-top:10px" data-action="ci-open">${saved ? "Ver / editar mis respuestas" : "Responder el check-in"}</button>
      </div>
      <div class="ci-card">
        <div class="ci-status">Fotos de progreso (las ve tu coach)</div>
        <div class="ph-grid">${CheckinState.myPhotos.map(p=>'<div class="ph-thumb"><img src="'+p.url+'"><button class="ph-del" data-action="photo-del" data-id="'+p.id+'" data-path="'+esc(p.path)+'">\u2715</button></div>').join("")||'<div class="cal-hint" style="padding:8px 0">Todav\u00eda no subiste fotos.</div>'}</div>
        <label class="form-save" style="margin-top:10px;display:block;text-align:center;cursor:pointer">\ud83d\udcf7 Subir foto<input type="file" accept="image/*" style="display:none" data-action="photo-pick"></label>
      </div>`;
  }
  const f = CheckinState.checkinForm || (saved ? JSON.parse(JSON.stringify(saved)) : {});
  const qs = CHECKIN_Q.map(q=>`<div class="ci-q"><label>${q[1]}</label><textarea class="ci-in" rows="2" data-action="ci-set" data-k="${q[0]}">${esc(f[q[0]]||"")}</textarea></div>`).join("");
  const adh = [1,2,3,4,5,6,7,8,9,10].map(n=>'<button class="sc-opt'+(String(f.adherence)===String(n)?' on':'')+'" data-action="ci-adh" data-v="'+n+'">'+n+'</button>').join("");
  return `<div class="hb-head" style="margin-top:26px"><div class="hb-title">Check-in semanal</div><div class="title-accent"></div></div>
    <div class="ci-card">
      <div class="ci-week">Semana del ${fmtDate(wk)}</div>
      ${qs}
      <div class="ci-q"><label>Adherencia a la nutrición (1 = nada, 10 = perfecto)</label><div class="sc-opts">${adh}</div></div>
      <button class="form-save" style="margin-top:14px" data-action="ci-save">Enviar check-in a mi coach</button>
      <button class="logout-btn" style="margin-top:8px" data-action="ci-close">Cancelar</button>
    </div>`;
}

export function renderClientPlan(p){
  if(!p) return "";
  const meals=(rows,title)=>{
    if(!rows || !rows.length) return "";
    let tk=0,tc=0,tf=0,tp=0;
    const body=rows.map((r,i)=>{ tk+=+r.kcal||0;tc+=+r.cho||0;tf+=+r.fat||0;tp+=+r.prot||0;
      return '<tr class="mc-mrow mr-'+(i%4)+'"><td class="mc-meal">'+esc(r.meal||"")+(r.time?'<span class="mc-time">'+esc(r.time)+'</span>':'')+'</td><td>'+esc(r.kcal||"-")+'</td><td>'+esc(r.cho||"-")+'</td><td>'+esc(r.fat||"-")+'</td><td>'+esc(r.prot||"-")+'</td></tr>'+
        (r.note?'<tr class="mc-noter"><td colspan="5">'+esc(r.note)+'</td></tr>':''); }).join("");
    return '<div class="mc-block"><div class="mc-title">'+title+'</div><table class="mc-tbl"><thead><tr><th>Comida</th><th>Kcal</th><th>Hidr.</th><th>Gras.</th><th>Prot.</th></tr></thead><tbody>'+body+
      '<tr class="mc-tot mc-goal"><td>Objetivo</td><td>'+tk+'</td><td>'+tc+'</td><td>'+tf+'</td><td>'+tp+'</td></tr></tbody></table></div>';
  };
  const list=(arr,title,icon,cls)=>{ if(!arr||!arr.filter(x=>x&&x.trim()).length) return ""; return '<div class="mc-block'+(cls?' '+cls:'')+'"><div class="mc-title'+(cls?' '+cls+'-t':'')+'">'+icon+' '+title+'</div><ul class="mc-list">'+arr.filter(x=>x&&x.trim()).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>'; };
  const ws=(p.water||p.salt)?'<div class="mc-block"><div class="mc-ws">'+(p.water?'<span>💧 '+esc(p.water)+'</span>':'')+(p.salt?'<span>🧂 '+esc(p.salt)+'</span>':'')+'</div></div>':'';
  const secHasContent = sec => (sec.title&&sec.title.trim()) || (sec.opts&&sec.opts.some(o=>(o.label&&o.label.trim())||(o.body&&o.body.trim()))) || (sec.items&&sec.items.some(i=>i&&i.trim()));
  const validSecs = (p.options||[]).filter(secHasContent);
  const bodyToList = body => { const parts=String(body).split(/\r?\n/).map(x=>x.trim()).filter(Boolean); if(parts.length<=1) return '<div class="mc-optbody">'+esc(body)+'</div>'; return '<ul class="mc-optitems">'+parts.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'; };
  const opts = validSecs.length ? '<div class="mc-opthead">🍽️ Opciones de comidas</div>'+validSecs.map(sec=>{
    let inner;
    if(sec.opts && sec.opts.length){
      inner = sec.opts.filter(o=>(o.label&&o.label.trim())||(o.body&&o.body.trim())).map((o,k)=>'<div class="mc-optrow c-xl">'+(o.label?'<div class="mc-optlabel">'+esc(o.label)+'</div>':'')+(o.body?bodyToList(o.body):'')+'</div>').join("");
    } else {
      inner = '<ul class="mc-optitems">'+(sec.items||[]).filter(i=>i&&i.trim()).map(i=>'<li>'+esc(i)+'</li>').join("")+'</ul>';
    }
    return '<div class="mc-block mc-optcard"><div class="mc-optt">'+esc(sec.title||"")+'</div>'+inner+'</div>';
  }).join("") : '';
  const swaps=(p.swaps&&p.swaps.length)?'<div class="mc-block"><div class="mc-title">🔁 Reemplazos</div>'+p.swaps.filter(s=>s.from||s.to).map(s=>'<div class="mc-swap"><span>'+esc(s.from||"")+'</span><span class="mc-arr">\u2192</span><span>'+esc(s.to||"")+'</span></div>').join("")+'</div>':'';
  const out = meals(p.trainDays,"Días de entrenamiento")+meals(p.restDays,"Días de descanso")+ws+
    list(p.guidelines,"Pautas nutricionales",copySvg,"mc-green")+list(p.supps,"Suplementos recomendados",pillSvg)+
    opts+list(p.extras,"Adicionales","\u2795")+swaps;
  if(!out) return "";
  return '<div class="hb-head" style="margin-top:20px"><div class="hb-title">Plan de comidas de tu coach</div><div class="title-accent"></div></div><div class="mc-wrap">'+out+'</div>';
}
