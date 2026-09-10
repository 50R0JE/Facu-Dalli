import { EX_DB } from '../../core/data.js';

import { State } from '../../core/state.js';

import { migrateNames } from '../../core/storage.js';

import { esc, fmtDate, mondayOf, today } from '../../core/utils.js';

import { renderCoach } from './index.js';

import { loadTpls } from './rutinas.js';

import { CoachState } from './state.js';

import { renderWChart } from '../progreso.js';

export async function loadCoachClients(){
  try{
    let r=await State.sb.from("profiles").select("id, full_name, email").eq("coach_id",State.cloudUser.id).order("full_name");
    if(r.error){
      // Supabase no tira excepción cuando una query falla (devuelve {data:null, error})
      // — si "email" no existe como columna en profiles, o RLS no la deja leer, r.data
      // quedaba null y la lista entera se vaciaba en silencio (el coach veía "0 clientes"
      // aunque sí tuviera). El email es un plus, no algo crítico para ver la lista, así
      // que ante un error reintentamos sin él en vez de perder los clientes por eso.
      console.error("coachClients (con email)",r.error);
      r=await State.sb.from("profiles").select("id, full_name").eq("coach_id",State.cloudUser.id).order("full_name");
      if(r.error) console.error("coachClients",r.error);
    }
    CoachState.coachClients=r.data||[];
    const ic=await State.sb.rpc("my_invite_code"); CoachState.coachInvite=ic.data||null;
  }catch(e){ console.error("coachClients",e); }
  loadCoachStats(); loadTpls();
}

export async function loadCoachStats(){
  if(!State.sb||!State.cloudUser) return;
  try{
    // performed_on, no "date" — ver mismo campo usado en openClient() más abajo y en
    // core/supabase.js. Un select a una columna inexistente le pega un 400 a PostgREST,
    // que el catch se traga en silencio: coachClientStats quedaba siempre {} y todos los
    // clientes mostraban "sin entrenos aún" aunque sí hubieran entrenado.
    const {data, error}=await State.sb.from("sessions").select("client_id, performed_on").order("performed_on",{ascending:false});
    if(error) console.error("coachStats",error);
    if(!Array.isArray(data)) return;
    const stats={};
    data.forEach(r=>{
      if(!stats[r.client_id]) stats[r.client_id]={nSess:0, lastSess:null};
      stats[r.client_id].nSess++;
      if(!stats[r.client_id].lastSess) stats[r.client_id].lastSess=r.performed_on;
    });
    CoachState.coachClientStats=stats; renderCoach();
  }catch(e){ console.error("coachStats",e); }
}

// Colores rotados por id de cliente (no por nombre, que puede repetirse) para que cada
// avatar de la lista tenga un color estable entre renders sin necesitar guardar nada.
const CO_AVA_COLORS=["var(--blue)","var(--purple)","var(--pink)","var(--cyan)","var(--green-2)"];

export function coachInitials(name){
  const parts=(name||"").trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "?";
  const a=parts[0].charAt(0), b=parts.length>1?parts[parts.length-1].charAt(0):"";
  return (a+b).toUpperCase();
}

export function coachAvatarColor(id){
  const s=String(id||""); let h=0;
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return CO_AVA_COLORS[h%CO_AVA_COLORS.length];
}

// Última actividad de un cliente para la lista del coach: solo tenemos la fecha (no hora)
// de la sesión más reciente, así que la etiqueta es "Hoy"/"Ayer"/"N días atrás" sin reloj.
// "Activo" = entrenó en las últimas 48hs (hoy, ayer o antes de ayer).
export function coachActivity(lastSess){
  if(!lastSess) return {label:"Sin entrenos aún", statusLabel:"", active:false, has:false};
  const base=new Date(today()+"T00:00:00");
  const d=new Date(lastSess+"T00:00:00");
  const days=Math.round((base-d)/86400000);
  let label;
  if(days<=0) label="Hoy";
  else if(days===1) label="Ayer";
  else if(days<7) label=days+" días atrás";
  else if(days<14) label="1 semana atrás";
  else if(days<30) label=Math.floor(days/7)+" semanas atrás";
  else label=fmtDate(lastSess);
  const active=days<=2;
  return {label:label, statusLabel:active?"Activo":"Sin actividad", active:active, has:true};
}

export function coachExercises(sessions){ const m={}; (sessions||[]).forEach(se=>se.exercises.forEach(ex=>{ if(ex.name) m[ex.name]=1; })); return Object.keys(m).sort((a,b)=>a.localeCompare(b,"es")); }

export function coachSeries(sessions,name){ const out=[]; (sessions||[]).slice().sort((a,b)=>(a.ts||0)-(b.ts||0)).forEach(se=>{ let mx=0; se.exercises.forEach(ex=>{ if(ex.name===name) ex.sets.forEach(x=>{ const k=+x.kg||0; if(k>mx) mx=k; }); }); if(mx>0) out.push({date:se.date, kg:mx}); }); return out; }

export function coachLogFor(sessions, dayName, name){
  const out=[];
  (sessions||[]).slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).forEach(se=>{
    if(dayName && se.day && se.day!==dayName) return;
    const sets=[];
    se.exercises.forEach(ex=>{ if(ex.name===name) ex.sets.forEach(st=>{ if((+st.kg||0)>0||(+st.reps||0)>0) sets.push({kg:+st.kg||0, reps:+st.reps||0}); }); });
    if(sets.length) out.push({date:se.date, ts:se.ts, sets:sets});
  });
  return out;
}

export function coachExerciseLog(sessions,name){ const out=[]; (sessions||[]).slice().sort((a,b)=>(a.ts||0)-(b.ts||0)).forEach(se=>{ const sets=[]; se.exercises.forEach(ex=>{ if(ex.name===name) ex.sets.forEach(st=>{ if((+st.kg||0)>0||(+st.reps||0)>0) sets.push({kg:+st.kg||0, reps:+st.reps||0}); }); }); if(sets.length) out.push({date:se.date, ts:se.ts, sets:sets}); }); return out; }

export async function openClient(id){
  CoachState.coachSel=id; CoachState.coachData={loading:true}; CoachState.coachDayFilter=null; CoachState.coachEditDay=0; renderCoach();
  try{
    const ws=await State.sb.from("body_weights").select("*").eq("client_id",id).order("measured_on");
    const ss=await State.sb.from("sessions").select("id, performed_on, day_name, created_at, session_entries(exercise_name,set_order,kg,reps)").eq("client_id",id).order("created_at");
    const rt=await State.sb.from("routines").select("days").eq("client_id",id).maybeSingle();
    const weights=(ws.data||[]).map(w=>({date:w.measured_on, kg:Number(w.kg)}));
    const sessions=(ss.data||[]).map(se=>{ const byEx={}; (se.session_entries||[]).forEach(en=>{ (byEx[en.exercise_name]=byEx[en.exercise_name]||[]).push({kg:Number(en.kg)||0, reps:Number(en.reps)||0}); }); return {date:se.performed_on, day:se.day_name, ts:new Date(se.created_at).getTime(), exercises:Object.keys(byEx).map(n=>({name:n, sets:byEx[n]}))}; });
    const routine=(rt.data&&Array.isArray(rt.data.days))?JSON.parse(JSON.stringify(rt.data.days)):[];
    migrateNames(routine);
    const dl=await State.sb.from("daily_logs").select("*").eq("client_id",id).order("log_date",{ascending:false});
    const ck=await State.sb.from("checkins").select("*").eq("client_id",id).order("week_start",{ascending:false});
    const ci=await State.sb.from("client_info").select("*").eq("client_id",id).maybeSingle();
    const bl=await State.sb.from("blocks").select("*").eq("client_id",id).eq("active",true).order("start_date",{ascending:false}).limit(1);
    const np=await State.sb.from("nutrition").select("*").eq("client_id",id).maybeSingle();
    const ph=await State.sb.from("checkin_photos").select("*").eq("client_id",id).order("created_at",{ascending:false});
    const photos=[]; for(const p of (ph.data||[])){ const u=await State.sb.storage.from("checkins").createSignedUrl(p.path,3600); photos.push({id:p.id, taken_on:p.taken_on, url:(u.data&&u.data.signedUrl)||""}); }
    const c=CoachState.coachClients.find(x=>x.id===id);
    CoachState.coachData={id:id, info:(ci.data||{}), block:((bl.data&&bl.data[0])||null), name:(c&&c.full_name)||"Cliente", weights:weights, sessions:sessions, routine:routine, loadEx:null, daily:(dl.data||[]), checkins:(ck.data||[]), plan:(np.data||null), photos:photos};
    CoachState.coachPlanForm=null; CoachState.coachInfoForm=null; CoachState.coachBlockForm=null;
  }catch(e){ CoachState.coachData={error:true}; console.error("openClient",e); }
  renderCoach();
}

export function coachDatalist(){
  if(CoachState.coachDL) return CoachState.coachDL;
  const all=[]; try{ Object.keys(EX_DB).forEach(k=>EX_DB[k].forEach(n=>all.push(n))); }catch(e){}
  const uniq=all.filter((v,i)=>all.indexOf(v)===i).sort((a,b)=>a.localeCompare(b,"es"));
  CoachState.coachDL='<datalist id="exList">'+uniq.map(n=>'<option value="'+esc(n)+'">').join("")+'</datalist>';
  return CoachState.coachDL;
}

export function renderCoachCargas(d){
  const routine=d.routine||[];
  const dayNames=routine.map(x=>x.name);
  const dayOpts='<option value="">Todos los días</option>'+dayNames.map(n=>'<option value="'+esc(n)+'"'+(CoachState.coachDayFilter===n?' selected':'')+'>'+esc(n)+'</option>').join("");
  let exNames;
  if(CoachState.coachDayFilter){ const rd=routine.find(x=>x.name===CoachState.coachDayFilter); exNames=rd?(rd.exercises||[]).map(ex=>ex.name):[]; }
  else { exNames=coachExercises(d.sessions); }
  exNames=exNames.filter((v,i)=>v&&exNames.indexOf(v)===i);
  const fsess=CoachState.coachDayFilter?d.sessions.filter(se=>se.day===CoachState.coachDayFilter):d.sessions;
  let out='<div class="co-sec">Evolución de cargas</div><select class="form-input" data-coach="dayfilter" style="margin-bottom:8px">'+dayOpts+'</select>';
  if(!exNames.length){ return out+'<div class="cal-hint">Sin ejercicios para mostrar'+(CoachState.coachDayFilter?' en este día':'')+'.</div>'; }
  if(!d.loadEx||exNames.indexOf(d.loadEx)<0) d.loadEx=exNames[0];
  const exOpts=exNames.map(n=>'<option value="'+esc(n)+'"'+(n===d.loadEx?' selected':'')+'>'+esc(n)+'</option>').join("");
  const series=coachSeries(fsess,d.loadEx);
  const cch=series.length?renderWChart(series,true,true):'<div class="cal-hint">Sin kg registrados en este ejercicio'+(CoachState.coachDayFilter?' para este día':'')+'.</div>';
  const flog=coachExerciseLog(fsess,d.loadEx);
  const fkg=k=>(Math.round((+k||0)*10)/10);
  const detail=flog.slice().reverse().map(e=>{ const chips=e.sets.map((st,ix)=>{ const kg=+st.kg||0, rp=+st.reps||0; const val=kg>0?(fkg(kg)+' kg'+(rp>0?' \u00d7 '+rp+' reps':'')):(rp>0?rp+' reps':'\u2014'); return '<div class="co-setline"><span class="co-setno">Serie '+(ix+1)+'</span><span class="co-setval">'+val+'</span></div>'; }).join(""); return '<div class="co-slog"><div class="co-slog-date">'+fmtDate(e.date)+'</div><div class="co-sets">'+chips+'</div></div>'; }).join("");
  out+='<select class="form-input" data-coach="ex">'+exOpts+'</select><div class="load-cap">Gráfico: máximo de kg por sesión</div>'+cch+(detail?'<div class="co-sub">Registro por sesión (peso \u00d7 reps de cada serie)</div>'+detail:'');
  return out;
}

export function exChart(d, dayName, exName){
  const log=coachLogFor(d.sessions, dayName, exName);
  const asc=log.slice().reverse();
  const series=asc.map(e=>({date:e.date, kg:Math.max.apply(null,e.sets.map(x=>x.kg||0))})).filter(x=>x.kg>0);
  if(!series.length) return '<div class="co-noprog">Sin registros</div>';
  return renderWChart(series,true,"mini");
}

export function exTable(d, dayName, exName){
  const log=coachLogFor(d.sessions, dayName, exName);
  if(!log.length) return "";
  let maxS=1; log.forEach(e=>{ if(e.sets.length>maxS) maxS=e.sets.length; });
  const th=['<th>Fecha</th>']; for(let i=0;i<maxS;i++) th.push('<th>Serie '+(i+1)+'</th>'); th.push('<th class="mx">M\u00e1x</th>');
  const rows=log.slice(0,8).map(e=>{
    const tds=['<td class="dt">'+fmtDate(e.date)+'</td>'];
    for(let i=0;i<maxS;i++){
      const st=e.sets[i];
      if(!st) tds.push('<td class="em">\u2014</td>');
      else { const kg=+st.kg||0, rp=+st.reps||0; tds.push('<td>'+(kg>0?(Math.round(kg*10)/10)+' kg':'\u2014')+(rp>0?' <span class="rp">\u00d7 '+rp+'</span>':'')+'</td>'); }
    }
    const mx=Math.max.apply(null,e.sets.map(x=>x.kg||0));
    tds.push('<td class="mx">'+(mx>0?(Math.round(mx*10)/10)+' kg':'\u2014')+'</td>');
    return '<tr>'+tds.join("")+'</tr>';
  }).join("");
  return '<table class="co-tbl"><thead><tr>'+th.join("")+'</tr></thead><tbody>'+rows+'</tbody></table>';
}

export function weeklyAvg(weights){
  const wk={};
  (weights||[]).forEach(w=>{ const k=mondayOf(w.date); (wk[k]=wk[k]||[]).push(w.kg); });
  return Object.keys(wk).sort().map(k=>({date:k, kg: wk[k].reduce((a,b)=>a+b,0)/wk[k].length, n:wk[k].length}));
}

export function renderCoachInfo(d){
  const i = CoachState.coachInfoForm || d.info || {};
  const F=(k,lbl,ph,type)=>'<div class="ci-f"><label>'+lbl+'</label><input class="co-note" data-coach="info-'+k+'" value="'+esc(i[k]==null?"":String(i[k]))+'" placeholder="'+ph+'"'+(type?' inputmode="'+type+'"':'')+'></div>';
  return '<div class="ci-grid">'+
      F("age","Edad","","numeric")+F("height_cm","Altura (cm)","","numeric")+
      F("availability","Disponibilidad","")+F("stage","Etapa","")+
      F("commitment","Compromiso","")+F("steps_goal","Pasos diarios","","numeric")+
    '</div>'+
    F("objective","Objetivo","")+
    F("block_goal","Objetivo del bloque","")+
    F("structure","Estructura","")+
    F("cardio","Cardio","")+
    F("injuries","Lesiones o patolog\u00edas","")+
    '<button class="co-save-rt" data-coach="info-save">Guardar ficha del cliente</button>';
}
