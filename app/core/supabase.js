import { State, state } from './state.js';

import { migrateNames, save } from './storage.js';

import { today } from './utils.js';

import { renderApp } from '../main.js';

import { hideLogin, showLogin } from '../screens/auth.js';

import { CheckinState } from '../screens/checkin.js';

import { routineLocked } from '../screens/entreno.js';

import { loadCoachClients } from '../screens/coach/clientes.js';

import { renderCoach } from '../screens/coach/index.js';

export const SB_URL = "https://wegptuzhsrwppbknqstf.supabase.co";

export const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZ3B0dXpoc3J3cHBia25xc3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDkxODgsImV4cCI6MjA5ODU4NTE4OH0.pWBes8juiNcCrFG377w_Ga9IQ4EE37p5AJwUpYs2k8Q";

// supabase-js NO lanza excepción cuando una query falla (RLS, red, columna inexistente):
// devuelve {data:null, error}. Un try/catch a secas no atrapa nada, y el código seguía
// como si se hubiera guardado. Envolvé cada escritura con sbOk() para que un error
// real llegue al catch.
export function sbOk(r){ if(r && r.error) throw r.error; return r; }

// Pasa a la rutina que mandó el coach (cloudDays) lo que el cliente ya cargó en su copia
// local (kg, reps y tildes), emparejando por id de serie. Si el coach cambió una serie
// existente se conserva lo cargado; si aplicó una rutina nueva (ids nuevos) arranca limpia.
export function mergeLocalProgress(cloudDays, localDays){
  const prog={};
  (localDays||[]).forEach(d=>(d.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{ prog[s.id]=s; })));
  (cloudDays||[]).forEach(d=>(d.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{
    const l=prog[s.id]; if(l){ s.kg=l.kg; s.reps=l.reps; s.done=l.done; }
  })));
  return cloudDays;
}

export function applyBrand(){
  const t=document.getElementById("brandTag"), n=document.getElementById("brandName");
  if(!t||!n) return;
  if(State.brandName){ n.textContent=State.brandName; t.style.display="block"; document.title=State.brandName+" \u00b7 Core"; }
  else { t.style.display="none"; document.title="Core"; }
}

// Crear el cliente de Supabase apenas el script del CDN esté listo. No alcanza con
// probar una sola vez al cargar el módulo: si el <script> del CDN todavía no terminó
// de ejecutarse en ese instante, State.sb quedaba en null para siempre y cualquier
// login explotaba con "Cannot read properties of null (reading 'auth')" aunque la
// librería cargara bien un momento después. Por eso reintentamos un rato.
let _sbReady = null;
export function ensureSb(){
  if (State.sb) return Promise.resolve(State.sb);
  if (_sbReady) return _sbReady;
  const tryInit = () => {
    if (!State.sb && window.supabase) { try { State.sb = window.supabase.createClient(SB_URL, SB_KEY); } catch(e){} }
    return !!State.sb;
  };
  _sbReady = tryInit() ? Promise.resolve(State.sb) : new Promise(resolve=>{
    let tries=0;
    const iv=setInterval(()=>{
      tries++;
      if (tryInit() || tries>=160){ clearInterval(iv); resolve(State.sb); } // ~8s a 50ms
    },50);
  });
  return _sbReady;
}
// Ojo: no llamar a ensureSb() acá arriba. core/state.js -> core/storage.js ->
// core/supabase.js -> core/state.js forman un ciclo de imports; si esta función
// corre durante esa evaluación circular, "State" todavía está en su temporal dead
// zone y explota con "Cannot access 'State' before initialization" (el try/catch
// de antes lo tapaba silenciosamente, dejando State.sb en null para siempre).
// cloudBoot() ya llama a ensureSb() apenas termina de cargar todo el árbol de
// módulos, momento en el que "State" ya está inicializado sin problema.

export async function afterLogin(){
  try { const r=await State.sb.auth.getUser(); State.cloudUser=r.data.user; } catch(e){}
  // Primero se envía lo que quedó pendiente de otra sesión (sin conexión, app cerrada):
  // loadCloud() reemplaza entrenos/registros locales por los de la nube.
  try { await flushOutbox(); } catch(e){ console.error("flushOutbox",e); }
  await loadCloud();
  try{
    const pc=localStorage.getItem("jfit_pending_code");
    if(pc && State.cloudProfile && State.cloudProfile.role!=="coach" && !State.cloudProfile.coach_id){
      const r2=await State.sb.rpc("join_coach",{code:pc});
      if(r2.data===true){ localStorage.removeItem("jfit_pending_code"); const pr=await State.sb.from("profiles").select("*").eq("id",State.cloudUser.id).maybeSingle(); if(pr.data) State.cloudProfile=pr.data; await loadCloud(); }
    }
  }catch(e){ console.error("pending code",e); }
  hideLogin();
  try{
    if(State.cloudProfile && State.cloudProfile.role==="coach"){ State.brandName=State.cloudProfile.full_name||""; }
    else { const cn=await State.sb.rpc("my_coach_name"); State.brandName=cn.data||""; }
  }catch(e){ State.brandName=""; }
  applyBrand();
  if (State.cloudProfile && State.cloudProfile.role==="coach"){ await loadCoachClients(); renderCoach(); }
  else { renderApp(); }
}

export async function loadCloud(){
  if(!State.sb||!State.cloudUser) return;
  State.cloudLoading=true;
  try{
    const pr=await State.sb.from("profiles").select("*").eq("id",State.cloudUser.id).maybeSingle();
    State.cloudProfile=pr.data||null;
    const rt=await State.sb.from("routines").select("days").eq("client_id",State.cloudUser.id).maybeSingle();
    if(rt.data && Array.isArray(rt.data.days) && rt.data.days.length){
      // Con coach, la rutina manda el coach: se toma la de la nube y solo se conserva lo
      // que el cliente cargó a mano (kg, reps, tildes) de cada serie.
      state.days = routineLocked() ? mergeLocalProgress(rt.data.days, state.days) : rt.data.days;
      migrateNames(state.days);
      if(!state.days.find(d=>d.id===State.activeId)) State.activeId=state.days[0].id;
    } else if(!routineLocked()) {
      await State.sb.from("routines").upsert({client_id:State.cloudUser.id, days:state.days, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id},{onConflict:"client_id"});
    }
    const ws=await State.sb.from("body_weights").select("*").eq("client_id",State.cloudUser.id).order("measured_on");
    if(Array.isArray(ws.data)) state.weights=ws.data.map(w=>({id:w.id, date:w.measured_on, kg:Number(w.kg)}));
    const ss=await State.sb.from("sessions").select("id, performed_on, day_name, created_at, session_entries(exercise_name,set_order,kg,reps)").eq("client_id",State.cloudUser.id).order("created_at");
    if(Array.isArray(ss.data)){
      state.sessions=ss.data.map(se=>{
        const byEx={};
        (se.session_entries||[]).forEach(en=>{ (byEx[en.exercise_name]=byEx[en.exercise_name]||[]).push({kg:Number(en.kg)||0, reps:Number(en.reps)||0}); });
        const exercises=Object.keys(byEx).map(n=>({name:n, sets:byEx[n]}));
        return {id:se.id, cloudId:se.id, date:se.performed_on, ts:new Date(se.created_at).getTime(), day:se.day_name, exercises:exercises};
      });
    }
    const dl=await State.sb.from("daily_logs").select("*").eq("client_id",State.cloudUser.id);
    if(Array.isArray(dl.data)){ state.daily={}; dl.data.forEach(r=>{ state.daily[r.log_date]={steps:r.steps||"", comment:r.comment||"", soreness:r.soreness||"", performance:r.performance||"", motivation:r.motivation||"", hunger:r.hunger||"", fatigue:r.fatigue||"", sleep:r.sleep||""}; }); }
    const ck=await State.sb.from("checkins").select("*").eq("client_id",State.cloudUser.id);
    if(Array.isArray(ck.data)){ state.checkins={}; ck.data.forEach(r=>{ const o=Object.assign({}, r.answers||{}); if(r.adherence) o.adherence=r.adherence; state.checkins[r.week_start]=o; }); }
    const ci=await State.sb.from("client_info").select("*").eq("client_id",State.cloudUser.id).maybeSingle();
    state.info = ci.data || null;
    const bl=await State.sb.from("blocks").select("*").eq("client_id",State.cloudUser.id).eq("active",true).order("start_date",{ascending:false}).limit(1);
    state.block = (bl.data && bl.data[0]) ? bl.data[0] : null;
    const np=await State.sb.from("nutrition").select("*").eq("client_id",State.cloudUser.id).maybeSingle();
    state.coachPlan = np.data ? {kcal:np.data.kcal, protein:np.data.protein, carbs:np.data.carbs, fat:np.data.fat, notes:np.data.notes, plan:np.data.plan||null, cardio:(np.data.plan&&np.data.plan.cardio)||null, habits:(np.data.plan&&np.data.plan.habits)||null} : null;
    applyPending(); // lo que la nube todavía no tiene (cola de envío) se vuelve a poner encima
    await loadMyPhotos();
    save();
  }catch(e){ console.error("loadCloud",e); }
  State.cloudLoading=false;
}

export function cloudSyncCore(){
  if(!State.sb||!State.cloudUser||State.cloudLoading) return;
  clearTimeout(State.routineTimer);
  State.routineTimer=setTimeout(async ()=>{
    try{
      // Con coach asignado la rutina es SOLO del coach: subir la copia del cliente en cada
      // save() pisaba lo que el coach acababa de cambiar.
      if(!routineLocked()) sbOk(await State.sb.from("routines").upsert({client_id:State.cloudUser.id, days:state.days, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id},{onConflict:"client_id"}));
      const rows=(state.weights||[]).map(w=>({client_id:State.cloudUser.id, measured_on:w.date, kg:w.kg}));
      if(rows.length) sbOk(await State.sb.from("body_weights").upsert(rows,{onConflict:"client_id,measured_on"}));
      const cw=sbOk(await State.sb.from("body_weights").select("measured_on").eq("client_id",State.cloudUser.id));
      const local=new Set((state.weights||[]).map(w=>w.date));
      const del=(cw.data||[]).map(w=>w.measured_on).filter(d=>!local.has(d));
      for(const dd of del){ sbOk(await State.sb.from("body_weights").delete().eq("client_id",State.cloudUser.id).eq("measured_on",dd)); }
    }catch(e){ console.error("sync",e); }
  },1200);
}

export async function loadMyPhotos(){
  if(!State.sb||!State.cloudUser) return;
  try{
    const r=await State.sb.from("checkin_photos").select("*").eq("client_id",State.cloudUser.id).order("created_at",{ascending:false});
    CheckinState.myPhotos=[];
    for(const p of (r.data||[])){
      const u=await State.sb.storage.from("checkins").createSignedUrl(p.path, 3600);
      CheckinState.myPhotos.push({id:p.id, path:p.path, url:(u.data&&u.data.signedUrl)||""});
    }
  }catch(e){ console.error("photos",e); }
}

export async function cloudUploadPhoto(file){
  if(!State.sb||!State.cloudUser) return;
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
  const path=State.cloudUser.id+"/"+Date.now()+"."+ext;
  const up=await State.sb.storage.from("checkins").upload(path, file, {upsert:false});
  if(up.error) throw up.error;
  sbOk(await State.sb.from("checkin_photos").insert({client_id:State.cloudUser.id, path:path, taken_on:today()}));
  await loadMyPhotos(); renderApp();
}

// Las funciones cloudSave*/cloudInsert* devuelven true si quedó en la nube (o si no hay
// sesión y no hay nada que sincronizar) y false si falló, para que quien las llama pueda
// avisarle al usuario en vez de decirle "guardado" a ciegas.
export async function cloudDeletePhoto(id, path){
  if(!State.sb||!State.cloudUser) return true;
  try{
    sbOk(await State.sb.storage.from("checkins").remove([path]));
    sbOk(await State.sb.from("checkin_photos").delete().eq("id",id));
    await loadMyPhotos(); renderApp();
    return true;
  }catch(e){ console.error("deletePhoto",e); return false; }
}

// ===== Cola de envío pendiente ("outbox") =====
// Todo lo que el cliente carga a mano (entreno, registro diario, check-in, feedback de
// sesión) se anota primero acá, en localStorage, y sale hacia Supabase desde esta cola.
// Se saca de la cola SOLO cuando Supabase confirma. Si no hay conexión queda esperando y
// se reintenta al abrir la app (antes de que loadCloud pise el estado local), cuando
// vuelve la conexión y cuando la pestaña vuelve a estar visible.
// Cada pendiente guarda el id del usuario: si en el mismo celular entra otra cuenta, no
// se le suben los datos de la anterior.
const OUTBOX_KEY = "core_outbox_v1";
const OUTBOX_FAILED_KEY = "core_outbox_failed_v1";

// crypto.randomUUID solo existe en contextos seguros (https / localhost).
export function newId(){
  try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c=>{ const r=Math.random()*16|0; return (c==="x"?r:(r&3|8)).toString(16); });
}

function readQueue(key){ try{ const a=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function writeQueue(key, a){ try{ localStorage.setItem(key, JSON.stringify(a)); }catch(e){} }

function myPending(){ const u=State.cloudUser&&State.cloudUser.id; return u ? readQueue(OUTBOX_KEY).filter(i=>i.uid===u) : []; }

export function pendingCount(){ return myPending().length; }

export function syncFootText(){
  if(!State.cloudUser) return "Se guarda solo en este dispositivo";
  const n=pendingCount();
  return n>0 ? (n+" pendiente"+(n>1?"s":"")+" de sincronizar · se envía solo cuando haya conexión") : "Sincronizado con tu cuenta";
}

export function refreshSyncFoot(){ const el=document.getElementById("syncFoot"); if(el) el.textContent=syncFootText(); }

// key: para daily/checkin, la última versión de la misma fecha/semana reemplaza a la anterior.
function enqueue(k, p, key){
  const uid=State.cloudUser.id;
  let q=readQueue(OUTBOX_KEY);
  if(key) q=q.filter(i=>!(i.uid===uid && i.k===k && i.key===key));
  const item={id:newId(), uid:uid, k:k, key:key||null, p:p, ts:Date.now()};
  q.push(item); writeQueue(OUTBOX_KEY, q);
  return item.id;
}

async function sendItem(it){
  const sb=State.sb, uid=it.uid, p=it.p;
  if(it.k==="session"){
    // upsert + ignoreDuplicates (ON CONFLICT DO NOTHING) con ids generados en el celular:
    // reintentar no duplica el entreno ni sus series aunque el envío anterior haya
    // llegado a medias.
    sbOk(await sb.from("sessions").upsert({id:p.id, client_id:uid, performed_on:p.date, day_name:p.day, created_at:new Date(p.ts).toISOString()},{onConflict:"id", ignoreDuplicates:true}));
    if(p.entries && p.entries.length){
      sbOk(await sb.from("session_entries").upsert(p.entries.map(e=>({id:e.id, session_id:p.id, client_id:uid, exercise_name:e.name, set_order:e.order, kg:e.kg, reps:e.reps})),{onConflict:"id", ignoreDuplicates:true}));
    }
  } else if(it.k==="feedback"){
    // Con RLS, un UPDATE que ninguna política permite NO da error: simplemente cambia 0
    // filas. Sin pedir las filas de vuelta el feedback "se guardaba" sin llegar nunca.
    const r=sbOk(await sb.from("sessions").update({rpe:p.rpe||null, pump:p.pump||null, joint_pain:(typeof p.joint==="boolean")?p.joint:null}).eq("id",p.id).select("id"));
    if(!r.data || !r.data.length){ const e=new Error("El feedback no se guardó: la base no permite actualizar sessions (falta política UPDATE)"); e.code="42501"; throw e; }
  } else if(it.k==="daily"){
    const rec=p.rec||{};
    sbOk(await sb.from("daily_logs").upsert({
      client_id:uid, log_date:p.dt,
      steps: parseInt(rec.steps)||null, comment: rec.comment||null,
      soreness: rec.soreness||null, performance: rec.performance||null, motivation: rec.motivation||null,
      hunger: rec.hunger||null, fatigue: rec.fatigue||null, sleep: rec.sleep||null
    },{onConflict:"client_id,log_date"}));
  } else if(it.k==="checkin"){
    const ans=Object.assign({},p.f); const adh=ans.adherence; delete ans.adherence;
    sbOk(await sb.from("checkins").upsert({client_id:uid, week_start:p.wk, answers:ans, adherence:adh||null},{onConflict:"client_id,week_start"}));
  }
}

// Errores que reintentar no arregla (dato inválido, permiso denegado, clave inexistente:
// clases SQLSTATE 22/23/42). Un pendiente así trabaría toda la cola para siempre, así que
// se aparta en OUTBOX_FAILED_KEY. Un corte de red no trae "code" y se sigue reintentando.
function isPermanent(e){ return !!(e && typeof e.code==="string" && /^(22|23|42)/.test(e.code)); }

let _flushing=null;
export function flushOutbox(){
  if(_flushing) return _flushing;
  _flushing=(async()=>{
    try{
      if(!State.sb||!State.cloudUser) return false;
      for(;;){
        const it=myPending()[0];
        if(!it) return true;
        try{ await sendItem(it); }
        catch(e){
          console.error("outbox",it.k,e);
          if(!isPermanent(e)) return false;
          writeQueue(OUTBOX_FAILED_KEY, readQueue(OUTBOX_FAILED_KEY).concat([Object.assign({error:String(e&&e.message||e)}, it)]));
        }
        writeQueue(OUTBOX_KEY, readQueue(OUTBOX_KEY).filter(i=>i.id!==it.id));
      }
    } finally { _flushing=null; refreshSyncFoot(); }
  })();
  return _flushing;
}

// Anota y manda ya. true = quedó en la nube; false = quedó pendiente en el dispositivo.
async function enqueueAndSend(k, p, key){
  if(!State.cloudUser) return true; // sin cuenta no hay nada que sincronizar
  const id=enqueue(k, p, key);
  refreshSyncFoot();
  await flushOutbox();
  if(readQueue(OUTBOX_KEY).some(i=>i.id===id)) await flushOutbox(); // un envío en curso pudo no llegar a verlo
  return !readQueue(OUTBOX_KEY).some(i=>i.id===id);
}

// loadCloud pisa state.sessions/daily/checkins con lo que hay en la nube: lo que
// todavía está en la cola (y por eso la nube no lo tiene) se vuelve a poner encima.
function applyPending(){
  myPending().forEach(it=>{
    const p=it.p;
    if(it.k==="session"){
      if(!state.sessions.some(s=>s.id===p.id)) state.sessions.push({id:p.id, cloudId:p.id, date:p.date, ts:p.ts, day:p.day, exercises:p.exercises});
    } else if(it.k==="feedback"){
      const s=state.sessions.find(x=>x.id===p.id);
      if(s){ if(p.rpe) s.rpe=p.rpe; if(p.pump) s.pump=p.pump; if(typeof p.joint==="boolean") s.joint=p.joint; }
    } else if(it.k==="daily"){
      state.daily[p.dt]=Object.assign({}, state.daily[p.dt]||{}, p.rec);
    } else if(it.k==="checkin"){
      state.checkins[p.wk]=Object.assign({}, state.checkins[p.wk]||{}, p.f);
    }
  });
  state.sessions.sort((a,b)=>(a.ts||0)-(b.ts||0));
}

window.addEventListener("online", ()=>{ flushOutbox(); });
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") flushOutbox(); });

// Las funciones cloud* devuelven true si quedó en la nube y false si quedó pendiente.
export function cloudInsertSession(se){
  const entries=[];
  (se.exercises||[]).forEach(ex=>{ (ex.sets||[]).forEach((sset,i)=>{ entries.push({id:newId(), name:ex.name, order:i, kg:sset.kg, reps:sset.reps}); }); });
  se.cloudId=se.id; // el id del entreno ES el id de la fila en la nube
  return enqueueAndSend("session", {id:se.id, date:se.date, day:se.day, ts:se.ts, exercises:se.exercises, entries:entries});
}

export function cloudSessionFeedback(se){
  if(!se.cloudId) return Promise.resolve(true); // entrenos viejos, guardados antes de tener id de nube
  return enqueueAndSend("feedback", {id:se.cloudId, rpe:se.rpe||null, pump:se.pump||null, joint:(typeof se.joint==="boolean")?se.joint:null});
}

export function cloudSaveDaily(dt, rec){ return enqueueAndSend("daily", {dt:dt, rec:rec}, dt); }

export function cloudSaveCheckin(wk, f){ return enqueueAndSend("checkin", {wk:wk, f:f}, wk); }

export async function cloudDeleteSession(cid){
  if(!State.sb||!State.cloudUser||!cid) return true;
  // Si todavía no salió de la cola (o tiene feedback pendiente), se descarta: si no,
  // volvería a aparecer en la nube después de borrarlo.
  writeQueue(OUTBOX_KEY, readQueue(OUTBOX_KEY).filter(i=>!((i.k==="session"||i.k==="feedback") && i.p && i.p.id===cid)));
  refreshSyncFoot();
  try{ sbOk(await State.sb.from("sessions").delete().eq("id",cid)); return true; }
  catch(e){ console.error("deleteSession",e); return false; }
}

export async function cloudBoot(){
  await ensureSb();
  if(!State.sb){ renderApp(); if(window.coreEnter) window.coreEnter(); return; }
  try{
    const sess=await State.sb.auth.getSession();
    if(sess.data.session){ await afterLogin(); }
    else { showLogin("","in"); }
  }catch(e){ renderApp(); }
  finally{ if(window.coreEnter) window.coreEnter(); }
}
