import { DAILY_COLUMNS } from './questions.js';

import { syncPush } from './push.js';
import { resolveAvatars } from './avatar.js';

import { loadCoachQuestions } from '../screens/coach/preguntas.js';

import { State, state } from './state.js';

import { migrateNames, save } from './storage.js';

import { today, ymd } from './utils.js';

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
// Fecha (AAAA-MM-DD) de hace n días, en hora local.
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return ymd(d); }

export function sbOk(r){ if(r && r.error) throw r.error; return r; }

// Supabase devuelve como máximo 1000 filas por pedido ("Max rows" del proyecto) y corta
// el resto SIN avisar: con más de 1000 entrenos o registros diarios, loadCloud() traía un
// pedazo del historial y el coach veía conteos de menos. fetchAll() pide de a 1000 hasta
// que una página vuelve incompleta. make() arma la consulta de cero en cada página y
// tiene que tener un orden único (si no, entre páginas se repiten o saltean filas).
// Devuelve {data, error} como una consulta normal. Si alguien baja "Max rows" por debajo
// de 1000, la primera página vuelve incompleta y se corta como antes (no empeora nada).
const PAGE=1000;
export async function fetchAll(make){
  const all=[];
  for(let from=0;;from+=PAGE){
    const r=await make().range(from, from+PAGE-1);
    if(r.error) return {data:null, error:r.error};
    const rows=r.data||[];
    for(const x of rows) all.push(x);
    if(rows.length<PAGE) return {data:all, error:null};
  }
}

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
  // La pestaña siempre dice solo "GIZE" (el nombre del coach se ve adentro de la app).
  document.title="GIZE";
  if(State.brandName){ n.textContent=State.brandName; t.style.display="block"; }
  else { t.style.display="none"; }
}

// Crear el cliente de Supabase apenas el script del CDN esté listo. No alcanza con
// probar una sola vez al cargar el módulo: si el <script> del CDN todavía no terminó
// de ejecutarse en ese instante, State.sb quedaba en null para siempre y cualquier
// login explotaba con "Cannot read properties of null (reading 'auth')" aunque la
// librería cargara bien un momento después. Por eso reintentamos un rato.
// Si el script del CDN directamente no cargó (sin internet y todavía sin copia en el
// caché del service worker), se vuelve a pedir en el próximo intento, que es cuando el
// usuario toca "Ingresar". Antes el primer fracaso quedaba guardado para siempre.
let _sbReady = null, _sbFailed = false;
export function ensureSb(){
  if (State.sb) return Promise.resolve(State.sb);
  if (_sbReady) return _sbReady;
  const tryInit = () => {
    if (!State.sb && window.supabase) { try { State.sb = window.supabase.createClient(SB_URL, SB_KEY); } catch(e){} }
    return !!State.sb;
  };
  if (_sbFailed && !window.supabase) reloadSbScript();
  _sbReady = tryInit() ? Promise.resolve(State.sb) : new Promise(resolve=>{
    let tries=0;
    const iv=setInterval(()=>{
      tries++;
      if (tryInit() || tries>=160){ // ~8s a 50ms
        clearInterval(iv);
        if(!State.sb){ _sbFailed=true; _sbReady=null; }
        resolve(State.sb);
      }
    },50);
  });
  return _sbReady;
}

function reloadSbScript(){
  const old=document.querySelector('script[src*="supabase-js"]'); if(!old) return;
  const s=document.createElement("script"); s.src=old.src;
  old.replaceWith(s);
}

// El perfil se guarda también en el dispositivo: si la app abre sin internet, loadCloud()
// no lo puede leer y un coach terminaba viendo la app de cliente. Se guarda junto con el
// id de usuario para no usarle el perfil de otra cuenta; el logout lo borra.
export const PROFILE_KEY = "core_profile_v1";
function saveCachedProfile(p){ try{ if(p) localStorage.setItem(PROFILE_KEY, JSON.stringify({uid:State.cloudUser.id, profile:p})); }catch(e){} }
function cachedProfile(){
  try{ const c=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null"); return (c && State.cloudUser && c.uid===State.cloudUser.id) ? c.profile : null; }catch(e){ return null; }
}
// Ojo: no llamar a ensureSb() acá arriba. core/state.js -> core/storage.js ->
// core/supabase.js -> core/state.js forman un ciclo de imports; si esta función
// corre durante esa evaluación circular, "State" todavía está en su temporal dead
// zone y explota con "Cannot access 'State' before initialization" (el try/catch
// de antes lo tapaba silenciosamente, dejando State.sb en null para siempre).
// cloudBoot() ya llama a ensureSb() apenas termina de cargar todo el árbol de
// módulos, momento en el que "State" ya está inicializado sin problema.

export async function afterLogin(sessionUser){
  // getUser() revalida el token pegándole a la red. Si no hay conexión esa llamada
  // falla y ANTES dejábamos State.cloudUser en null: como flushOutbox()/pendingCount()
  // filtran la cola por el id de usuario, un cloudUser null "escondía" lo pendiente
  // (mostraba "Se guarda solo en este dispositivo" con la cola intacta pero invisible)
  // y loadCloud() cortaba de raíz. getSession() ya trae el usuario sin pegarle a la
  // red (lee la sesión guardada en el dispositivo), así que arrancamos con ESE y solo
  // lo reemplazamos por la versión fresca del servidor si getUser() llega a responder.
  State.cloudUser = sessionUser || State.cloudUser || null;
  try { const r=await State.sb.auth.getUser(); if(r.data.user) State.cloudUser=r.data.user; } catch(e){}
  // Primero se envía lo que quedó pendiente de otra sesión (sin conexión, app cerrada):
  // loadCloud() reemplaza entrenos/registros locales por los de la nube.
  try { await flushOutbox(); } catch(e){ console.error("flushOutbox",e); }
  // El nombre del coach no depende de loadCloud(): se pide en paralelo en vez de después.
  let coachNameP=Promise.resolve(State.sb.rpc("my_coach_name")).catch(()=>({data:null}));
  await loadCloud();
  if(!State.cloudProfile) State.cloudProfile=cachedProfile(); // sin conexión: el último perfil conocido
  try{
    const pc=localStorage.getItem("jfit_pending_code");
    if(pc && State.cloudProfile && State.cloudProfile.role!=="coach" && !State.cloudProfile.coach_id){
      // Se saca del localStorage pase lo que pase (código inválido o válido), no solo si
      // funcionó: si no, un código viejo o mal tipeado queda dando vueltas en el dispositivo
      // y se lo intenta aplicar a la cuenta de OTRA persona que después inicie sesión ahí.
      localStorage.removeItem("jfit_pending_code");
      const r2=await State.sb.rpc("join_coach",{code:pc});
      if(r2.data===true){ coachNameP=Promise.resolve(State.sb.rpc("my_coach_name")).catch(()=>({data:null})); const pr=await State.sb.from("profiles").select("*").eq("id",State.cloudUser.id).maybeSingle(); if(pr.data) State.cloudProfile=pr.data; await loadCloud(); }
    }
  }catch(e){ console.error("pending code",e); }
  hideLogin();
  try{
    if(State.cloudProfile && State.cloudProfile.role==="coach"){ State.brandName=State.cloudProfile.full_name||""; }
    else { const cn=await coachNameP; State.brandName=cn.data||""; }
  }catch(e){ State.brandName=""; }
  applyBrand();
  if (State.cloudProfile && State.cloudProfile.role==="coach"){ await Promise.all([loadCoachClients(), loadCoachQuestions().catch(()=>{})]); renderCoach(); }
  else { renderApp(); syncPush(); } // sin await: no demora la entrada
}

export async function loadCloud(){
  if(!State.sb||!State.cloudUser) return;
  State.cloudLoading=true;
  try{
    // Supabase no lanza cuando una lectura falla: devuelve {data:null, error}. Un data null
    // por error NO significa "no hay nada en la nube", así que cada lectura se chequea y,
    // si falló, se conserva lo local en vez de pisarlo (o de subirlo como si fuera nuevo).
    // Perfil y rutina son imprescindibles: sin ellos se corta acá y cloudReady queda false.
    // Todas las lecturas salen juntas (antes iban de a una y el arranque sumaba ~12 idas
    // y vueltas a Supabase); después se aplican en el mismo orden de siempre.
    const uid=State.cloudUser.id, sb=State.sb;
    const [pr0, rt0, ws, ss, dl, ck, ci, bl, np, fe, cp, cq, fw] = await Promise.all([
      sb.from("profiles").select("*").eq("id",uid).maybeSingle(),
      sb.from("routines").select("days").eq("client_id",uid).maybeSingle(),
      // Las tablas que crecen con el uso van con fetchAll() (sin eso, más de 1000 filas se
      // cortaban). Orden único: fecha (única por cliente) o created_at + id.
      fetchAll(()=>sb.from("body_weights").select("*").eq("client_id",uid).order("measured_on")),
      // "*" y no una lista de columnas: trae rpe/pump/joint_pain si existen sin romper la consulta si no.
      fetchAll(()=>sb.from("sessions").select("*, session_entries(exercise_name,set_order,kg,reps)").eq("client_id",uid).order("created_at").order("id")),
      fetchAll(()=>sb.from("daily_logs").select("*").eq("client_id",uid).order("log_date")),
      fetchAll(()=>sb.from("checkins").select("*").eq("client_id",uid).order("week_start")),
      sb.from("client_info").select("*").eq("client_id",uid).maybeSingle(),
      sb.from("blocks").select("*").eq("client_id",uid).eq("active",true).order("start_date",{ascending:false}).limit(1),
      sb.from("nutrition").select("*").eq("client_id",uid).maybeSingle(),
      sb.from("food_entries").select("*").eq("client_id",uid).eq("log_date",today()).order("pos"),
      sb.from("client_prefs").select("*").eq("client_id",uid).maybeSingle(),
      // Preguntas de mi coach (la política de la tabla solo deja ver la fila del coach
      // propio). Si la tabla todavía no existe en la base, da error y se ignora: quedan
      // las predeterminadas.
      sb.from("coach_questions").select("daily, checkin").maybeSingle(),
      // Calorías de los 7 días anteriores, para el promedio semanal de Comida.
      sb.from("food_entries").select("log_date, kcal").eq("client_id",uid).gte("log_date",daysAgo(7)).lt("log_date",today()),
      loadMyPhotos()
    ]);
    const pr=sbOk(pr0);
    State.cloudProfile=pr.data||null;
    saveCachedProfile(State.cloudProfile);
    // Link de la foto de perfil propia (no frena el arranque; redibuja Ajustes al llegar).
    if(State.cloudProfile && State.cloudProfile.avatar_path){
      resolveAvatars([State.cloudProfile.avatar_path]).then(ok=>{ if(ok && State.view==="config") renderApp(); }).catch(()=>{});
    }
    const rt=sbOk(rt0);
    if(rt.data && Array.isArray(rt.data.days) && rt.data.days.length){
      // Con coach, la rutina manda el coach: se toma la de la nube y solo se conserva lo
      // que el cliente cargó a mano (kg, reps, tildes) de cada serie.
      state.days = routineLocked() ? mergeLocalProgress(rt.data.days, state.days) : rt.data.days;
      migrateNames(state.days);
      if(!state.days.find(d=>d.id===State.activeId)) State.activeId=state.days[0].id;
    } else if(!routineLocked()) {
      sbOk(await State.sb.from("routines").upsert({client_id:State.cloudUser.id, days:state.days, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id},{onConflict:"client_id"}));
    }
    State.cloudReady=true;
    if(!ws.error && Array.isArray(ws.data)){
      state.weights=ws.data.map(w=>({id:w.id, date:w.measured_on, kg:Number(w.kg)}));
      State.cloudWeightDates=new Set(ws.data.map(w=>w.measured_on));
    }
    if(!ss.error && Array.isArray(ss.data)){
      state.sessions=ss.data.map(se=>Object.assign(sessionFromRow(se), {id:se.id, cloudId:se.id}));
    }
    // Las respuestas a preguntas propias del coach vienen en "answers"; las de siempre, en
    // sus columnas (que mandan si aparecen en los dos lados).
    if(!dl.error && Array.isArray(dl.data)){ state.daily={}; dl.data.forEach(r=>{ state.daily[r.log_date]=Object.assign({}, r.answers||{}, {steps:r.steps||"", comment:r.comment||"", soreness:r.soreness||"", performance:r.performance||"", motivation:r.motivation||"", hunger:r.hunger||"", fatigue:r.fatigue||"", sleep:r.sleep||""}); }); }
    if(!cq.error) state.coachQ = cq.data ? {daily:cq.data.daily||null, checkin:cq.data.checkin||null} : null;
    // La nube manda para esos 7 días: suma lo anotado en cada uno (vale desde cualquier celular).
    if(fw && !fw.error && Array.isArray(fw.data)){
      const byDay={}; fw.data.forEach(r=>{ byDay[r.log_date]=(byDay[r.log_date]||0)+(Number(r.kcal)||0); });
      state.kcalLog = Object.assign({}, state.kcalLog||{}, byDay);
    }
    if(!ck.error && Array.isArray(ck.data)){ state.checkins={}; ck.data.forEach(r=>{ const o=Object.assign({}, r.answers||{}); if(r.adherence) o.adherence=r.adherence; state.checkins[r.week_start]=o; }); }
    if(!ci.error) state.info = ci.data || null;
    if(!bl.error) state.block = (bl.data && bl.data[0]) ? bl.data[0] : null;
    if(!np.error) state.coachPlan = np.data ? {kcal:np.data.kcal, protein:np.data.protein, carbs:np.data.carbs, fat:np.data.fat, notes:np.data.notes, plan:np.data.plan||null, cardio:(np.data.plan&&np.data.plan.cardio)||null, habits:(np.data.plan&&np.data.plan.habits)||null} : null;
    // Comidas, agua, pasos y hábitos de hoy. La nube manda solo si ya tiene el día
    // (water_ml lo escribe siempre la app); si no, se conserva lo local y se sube.
    _lastDay=null;
    const todayRow=(!dl.error && Array.isArray(dl.data)) ? dl.data.find(r=>r.log_date===today()) : null;
    if(!fe.error && todayRow && todayRow.water_ml!=null){
      state.diaryDate=state.waterDate=state.stepsDate=state.habitsDate=today();
      state.water=todayRow.water_ml||0;
      state.steps=todayRow.steps||0;
      state.diary=(fe.data||[]).map(r=>({id:r.id, name:r.name, grams:Number(r.grams)||0, kcal:r.kcal||0, p:Number(r.protein)||0, c:Number(r.carbs)||0, f:Number(r.fat)||0, unit:r.unit||"g", base:r.base||undefined}));
      applyHabitsDone(todayRow.habits_done);
      _lastDay=JSON.stringify(daySnapshot());
    }
    _lastPrefs=null;
    if(!cp.error && cp.data){ applyPrefs(cp.data); _lastPrefs=JSON.stringify(prefsSnapshot()); }
    if(!cp.error) state.cloudSeen=true; // desde acá lo local de este usuario ya se puede subir
    applyPending(); // lo que la nube todavía no tiene (cola de envío) se vuelve a poner encima
    save();
  }catch(e){ console.error("loadCloud",e); }
  State.cloudLoading=false;
  syncExtras();
}

// ===== Comidas, agua, pasos, hábitos y preferencias =====
// Se comparan contra lo último enviado (o leído de la nube) y, si cambió, van a la cola
// de envío como una foto completa: la del día (clave = fecha) y la de preferencias.
// Una foto nueva reemplaza a la anterior todavía pendiente, así la cola no crece.
let _lastDay=null, _lastPrefs=null, _extrasTimer=null;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function daySnapshot(){
  const t=today();
  if(state.diaryDate!==t || state.waterDate!==t || state.stepsDate!==t || state.habitsDate!==t) return null; // checkDaily() todavía no pasó al día nuevo
  const coachHabits=(state.coachPlan && Array.isArray(state.coachPlan.habits)) ? state.coachPlan.habits.filter(x=>x&&x.trim()) : [];
  return {
    dt:t, water:state.water||0, steps:state.steps||0,
    habits:{ coach:coachHabits.filter(n=>state.habitsDone && state.habitsDone[t+"|"+n]), own:(state.habits||[]).filter(h=>h.done).map(h=>h.name) },
    foods:(state.diary||[]).map(e=>{ if(!UUID_RE.test(String(e.id))) e.id=newId(); return {id:e.id, name:e.name, grams:e.grams, unit:e.unit||"g", kcal:e.kcal||0, p:e.p||0, c:e.c||0, f:e.f||0, base:e.base||null}; })
  };
}

function prefsSnapshot(){
  return { cal_profile:state.calProfile||null, cal_target:state.calTarget||null, steps_goal:state.stepsGoal||null, water_goal:state.waterGoal||null,
    rest_default:state.restDefault||null, habits:(state.habits||[]).map(h=>({id:h.id, name:h.name})), foods:state.foods||[] };
}

function applyHabitsDone(hd){
  if(!hd) return;
  const t=today(), own=new Set(hd.own||[]);
  (state.habits||[]).forEach(h=>{ h.done=own.has(h.name); });
  if(!state.habitsDone || typeof state.habitsDone!=="object") state.habitsDone={};
  Object.keys(state.habitsDone).forEach(k=>{ if(k.indexOf(t+"|")===0) delete state.habitsDone[k]; });
  (hd.coach||[]).forEach(n=>{ state.habitsDone[t+"|"+n]=true; });
}

function applyPrefs(p){
  if(p.cal_profile!==undefined) state.calProfile=p.cal_profile||null;
  if(p.cal_target!==undefined) state.calTarget=p.cal_target||null;
  if(p.steps_goal) state.stepsGoal=p.steps_goal;
  if(p.water_goal) state.waterGoal=p.water_goal;
  if(p.rest_default) state.restDefault=p.rest_default;
  if(Array.isArray(p.foods)) state.foods=p.foods;
  if(Array.isArray(p.habits)){
    const done=new Set((state.habits||[]).filter(h=>h.done).map(h=>h.name)); // las tildes de hoy no viajan en prefs
    state.habits=p.habits.map(h=>({id:h.id, name:h.name, done:done.has(h.name)}));
  }
}

export function syncExtras(){
  if(!State.cloudUser || State.cloudLoading || !state.cloudSeen) return;
  let queued=false;
  const d=daySnapshot();
  if(d){ const j=JSON.stringify(d); if(j!==_lastDay){ _lastDay=j; enqueue("day", d, d.dt); queued=true; } }
  const p=prefsSnapshot(), pj=JSON.stringify(p);
  if(pj!==_lastPrefs){ _lastPrefs=pj; enqueue("prefs", p, "prefs"); queued=true; }
  if(queued){ clearTimeout(_extrasTimer); _extrasTimer=setTimeout(()=>{ flushOutbox(); }, 1500); }
}

// Fila de "sessions" (con sus session_entries) → entreno como lo guarda la app.
// Las series se ordenan por set_order (su número dentro del ejercicio): Supabase no
// garantiza el orden de la relación, y sin esto el detalle del entreno podía mostrar la
// serie 3 antes que la 1. El sort es estable, así que el orden de los ejercicios no cambia.
export function sessionFromRow(se){
  const byEx={};
  (se.session_entries||[]).slice().sort((a,b)=>(a.set_order||0)-(b.set_order||0)).forEach(en=>{
    (byEx[en.exercise_name]=byEx[en.exercise_name]||[]).push({kg:Number(en.kg)||0, reps:Number(en.reps)||0});
  });
  const out={date:se.performed_on, day:se.day_name, ts:new Date(se.created_at).getTime(), exercises:Object.keys(byEx).map(n=>({name:n, sets:byEx[n]}))};
  if(se.rpe) out.rpe=se.rpe;
  if(se.pump) out.pump=se.pump;
  if(typeof se.joint_pain==="boolean") out.joint=se.joint_pain;
  return out;
}

export function cloudSyncCore(){
  // Comidas/agua/pasos/hábitos/preferencias van por la cola: no dependen de cloudReady
  // (es data del propio cliente, no hay coach que pisar) y así funcionan sin conexión.
  try{ syncExtras(); }catch(e){ console.error("extras",e); }
  if(!State.sb||!State.cloudUser||State.cloudLoading||!State.cloudReady) return;
  clearTimeout(State.routineTimer);
  State.routineTimer=setTimeout(async ()=>{
    try{
      // Con coach asignado la rutina es SOLO del coach: subir la copia del cliente en cada
      // save() pisaba lo que el coach acababa de cambiar.
      if(!routineLocked()) sbOk(await State.sb.from("routines").upsert({client_id:State.cloudUser.id, days:state.days, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id},{onConflict:"client_id"}));
      const rows=(state.weights||[]).map(w=>({client_id:State.cloudUser.id, measured_on:w.date, kg:w.kg}));
      if(rows.length) sbOk(await State.sb.from("body_weights").upsert(rows,{onConflict:"client_id,measured_on"}));
      // Se borra de la nube solo lo que este dispositivo ya había visto ahí y el cliente
      // sacó. Antes se borraba todo lo que no estuviera en local: si la lectura de pesos
      // había fallado, o si otro dispositivo cargó un peso nuevo, se perdían.
      const local=new Set((state.weights||[]).map(w=>w.date));
      const del=[...State.cloudWeightDates].filter(d=>!local.has(d));
      for(const dd of del){ sbOk(await State.sb.from("body_weights").delete().eq("client_id",State.cloudUser.id).eq("measured_on",dd)); State.cloudWeightDates.delete(dd); }
      local.forEach(d=>State.cloudWeightDates.add(d));
    }catch(e){ console.error("sync",e); }
  },1200);
}

export async function loadMyPhotos(){
  if(!State.sb||!State.cloudUser) return;
  try{
    const r=sbOk(await State.sb.from("checkin_photos").select("*").eq("client_id",State.cloudUser.id).order("created_at",{ascending:false}));
    const rows=r.data||[];
    const urls=await signedUrls(rows.map(p=>p.path));
    CheckinState.myPhotos=rows.map(p=>({id:p.id, path:p.path, url:urls[p.path]||""}));
  }catch(e){ console.error("photos",e); }
}

// Links firmados de las fotos de check-in, todos en un solo pedido (antes era uno por
// foto, en serie). Devuelve {path: url}; una foto sin link queda afuera del objeto.
export async function signedUrls(paths){
  const out={};
  if(!paths.length) return out;
  const r=await State.sb.storage.from("checkins").createSignedUrls(paths, 3600);
  (r.data||[]).forEach(u=>{ if(u && u.path && u.signedUrl) out[u.path]=u.signedUrl; });
  return out;
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
    // Primero la fila y después el archivo: al revés, si fallaba borrar la fila quedaba en
    // la lista una foto que ya no existe. Así, lo peor es un archivo sin fila, que nadie ve.
    sbOk(await State.sb.from("checkin_photos").delete().eq("id",id));
    const rm=await State.sb.storage.from("checkins").remove([path]);
    if(rm.error) console.error("deletePhoto: la foto se sacó de la lista pero el archivo quedó en Storage", path, rm.error);
    await loadMyPhotos(); renderApp();
    return true;
  }catch(e){ console.error("deletePhoto",e); return false; }
}

// Borra todos los archivos del usuario en Storage (fotos de check-in y de perfil). Se usa
// antes de eliminar la cuenta: delete_own_account borra auth.users y con eso las filas en
// cascada, pero los archivos NO (Supabase no deja borrar storage.objects por SQL: trigger
// protect_objects_delete), así que las fotos quedaban para siempre sin dueño.
// Lanza si algo falla, para no eliminar la cuenta con fotos todavía guardadas.
export async function deleteMyStorageFiles(){
  if(!State.sb||!State.cloudUser) return;
  const uid=State.cloudUser.id;
  for(const bucket of ["checkins","avatars"]){
    const st=State.sb.storage.from(bucket);
    // Primero se listan todas (list() devuelve de a 1000 como máximo) y después se borran:
    // borrar mientras se pagina corre el offset y se saltearía archivos.
    const paths=[];
    for(let offset=0;;offset+=1000){
      const r=sbOk(await st.list(uid,{limit:1000, offset:offset}));
      const items=r.data||[];
      // id null = subcarpeta (la app no las crea; se ignoran).
      items.forEach(it=>{ if(it && it.id) paths.push(uid+"/"+it.name); });
      if(items.length<1000) break;
    }
    for(let i=0;i<paths.length;i+=100) sbOk(await st.remove(paths.slice(i,i+100)));
  }
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
    const row={
      client_id:uid, log_date:p.dt, comment: rec.comment||null,
      soreness: rec.soreness||null, performance: rec.performance||null, motivation: rec.motivation||null,
      hunger: rec.hunger||null, fatigue: rec.fatigue||null, sleep: rec.sleep||null
    };
    // Los pasos también los escribe el contador de Hábitos: si el registro los dejó vacíos
    // no se mandan, para no borrar lo que ya contó.
    if(parseInt(rec.steps)>=0) row.steps=parseInt(rec.steps);
    // Preguntas propias del coach (sin columna fija) → daily_logs.answers, con la "foto"
    // de sus textos. Solo se manda si hay alguna: con las predeterminadas no cambia nada.
    const extra={};
    Object.keys(rec).forEach(k=>{ if(DAILY_COLUMNS.indexOf(k)<0 && k!=="steps" && k!=="kg" && k!=="_q" && rec[k]!=null && rec[k]!=="") extra[k]=rec[k]; });
    if(Object.keys(extra).length) row.answers=Object.assign(extra, {_q:rec._q||{}});
    const r=await sb.from("daily_logs").upsert(row,{onConflict:"client_id,log_date"});
    // Base sin la columna "answers" (falta correr supabase/preguntas-coach.sql): se guarda
    // igual todo lo demás en vez de trabar el registro del día en la cola para siempre.
    if(r.error && row.answers && (r.error.code==="PGRST204" || r.error.code==="42703")){
      console.warn("daily_logs.answers no existe todavía; se guardan solo las columnas fijas", r.error);
      delete row.answers;
      sbOk(await sb.from("daily_logs").upsert(row,{onConflict:"client_id,log_date"}));
    } else sbOk(r);
  } else if(it.k==="day"){
    // Solo las columnas del día: el upsert no toca comentario, sueño, etc. del registro.
    sbOk(await sb.from("daily_logs").upsert({client_id:uid, log_date:p.dt, water_ml:p.water, steps:p.steps, habits_done:p.habits},{onConflict:"client_id,log_date"}));
    if(p.foods.length){
      sbOk(await sb.from("food_entries").upsert(p.foods.map((f,i)=>({id:f.id, client_id:uid, log_date:p.dt, pos:i, name:f.name, grams:f.grams, unit:f.unit, kcal:f.kcal, protein:f.p, carbs:f.c, fat:f.f, base:f.base})),{onConflict:"id"}));
    }
    // Lo que el cliente sacó del diario de ese día.
    let del=sb.from("food_entries").delete().eq("client_id",uid).eq("log_date",p.dt);
    if(p.foods.length) del=del.not("id","in","("+p.foods.map(f=>f.id).join(",")+")");
    sbOk(await del);
  } else if(it.k==="prefs"){
    sbOk(await sb.from("client_prefs").upsert(Object.assign({client_id:uid, updated_at:new Date().toISOString()}, p),{onConflict:"client_id"}));
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
    } else if(it.k==="day" && p.dt===today()){
      state.water=p.water; state.steps=p.steps;
      state.diary=p.foods.map(f=>({id:f.id, name:f.name, grams:f.grams, kcal:f.kcal, p:f.p, c:f.c, f:f.f, unit:f.unit, base:f.base||undefined}));
      applyHabitsDone(p.habits);
      _lastDay=JSON.stringify(p);
    } else if(it.k==="prefs"){
      applyPrefs(p); _lastPrefs=JSON.stringify(p);
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
  // Sin la librería de Supabase no hay cuenta: antes se mostraba la app igual, "sin
  // cuenta", y lo que se cargaba ahí se daba por guardado sin entrar nunca a la cola de
  // envío. Ahora se pide el login, que al tocar "Ingresar" reintenta la conexión.
  const offlineMsg="No hay conexión con el servidor. Revisá tu internet y tocá Ingresar para reintentar.";
  if(!State.sb){ showLogin(offlineMsg,"in"); if(window.coreEnter) window.coreEnter(); return; }
  try{
    const sess=await State.sb.auth.getSession();
    if(sess.data.session){ await afterLogin(sess.data.session.user); }
    else {
      // Links de la landing: #registro abre "Crear cuenta" y #registro-coach lo abre con
      // "Soy coach" ya elegido. Se limpia el # para que recargar no lo repita.
      const h=location.hash;
      if(h==="#registro"||h==="#registro-coach"){
        try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
        showLogin("","up",h==="#registro-coach"?{role:"coach"}:{});
      } else showLogin("","in");
    }
  }catch(e){ console.error("cloudBoot",e); showLogin(offlineMsg,"in"); }
  finally{ if(window.coreEnter) window.coreEnter(); }
}
