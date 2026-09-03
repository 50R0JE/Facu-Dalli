import { State, state } from './state.js';

import { migrateNames, save } from './storage.js';

import { today } from './utils.js';

import { renderApp } from '../main.js';

import { hideLogin, showLogin } from '../screens/auth.js';

import { CheckinState } from '../screens/checkin.js';

import { loadCoachClients } from '../screens/coach/clientes.js';

import { renderCoach } from '../screens/coach/index.js';

export const SB_URL = "https://wegptuzhsrwppbknqstf.supabase.co";

export const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZ3B0dXpoc3J3cHBia25xc3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDkxODgsImV4cCI6MjA5ODU4NTE4OH0.pWBes8juiNcCrFG377w_Ga9IQ4EE37p5AJwUpYs2k8Q";

export function applyBrand(){
  const t=document.getElementById("brandTag"), n=document.getElementById("brandName");
  if(!t||!n) return;
  if(State.brandName){ n.textContent=State.brandName; t.style.display="block"; document.title=State.brandName+" \u00b7 FitSheet"; }
  else { t.style.display="none"; document.title="FitSheet"; }
}

try { if (window.supabase) State.sb = window.supabase.createClient(SB_URL, SB_KEY); } catch(e){}

export async function afterLogin(){
  try { const r=await State.sb.auth.getUser(); State.cloudUser=r.data.user; } catch(e){}
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
      state.days=rt.data.days;
      migrateNames(state.days);
      if(!state.days.find(d=>d.id===State.activeId)) State.activeId=state.days[0].id;
    } else {
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
      await State.sb.from("routines").upsert({client_id:State.cloudUser.id, days:state.days, updated_at:new Date().toISOString(), updated_by:State.cloudUser.id},{onConflict:"client_id"});
      const rows=(state.weights||[]).map(w=>({client_id:State.cloudUser.id, measured_on:w.date, kg:w.kg}));
      if(rows.length) await State.sb.from("body_weights").upsert(rows,{onConflict:"client_id,measured_on"});
      const cw=await State.sb.from("body_weights").select("measured_on").eq("client_id",State.cloudUser.id);
      const local=new Set((state.weights||[]).map(w=>w.date));
      const del=(cw.data||[]).map(w=>w.measured_on).filter(d=>!local.has(d));
      for(const dd of del){ await State.sb.from("body_weights").delete().eq("client_id",State.cloudUser.id).eq("measured_on",dd); }
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
  await State.sb.from("checkin_photos").insert({client_id:State.cloudUser.id, path:path, taken_on:today()});
  await loadMyPhotos(); renderApp();
}

export async function cloudDeletePhoto(id, path){
  if(!State.sb||!State.cloudUser) return;
  try{ await State.sb.storage.from("checkins").remove([path]); await State.sb.from("checkin_photos").delete().eq("id",id); await loadMyPhotos(); renderApp(); }catch(e){ console.error(e); }
}

export async function cloudSessionFeedback(se){
  if(!State.sb||!State.cloudUser||!se.cloudId) return;
  try{ await State.sb.from("sessions").update({rpe:se.rpe||null, pump:se.pump||null, joint_pain:(typeof se.joint==="boolean")?se.joint:null}).eq("id",se.cloudId); }
  catch(e){ console.error("fb",e); }
}

export async function cloudSaveDaily(dt, rec){
  if(!State.sb||!State.cloudUser) return;
  try{
    await State.sb.from("daily_logs").upsert({
      client_id:State.cloudUser.id, log_date:dt,
      steps: parseInt(rec.steps)||null, comment: rec.comment||null,
      soreness: rec.soreness||null, performance: rec.performance||null, motivation: rec.motivation||null,
      hunger: rec.hunger||null, fatigue: rec.fatigue||null, sleep: rec.sleep||null
    },{onConflict:"client_id,log_date"});
  }catch(e){ console.error("daily",e); }
}

export async function cloudSaveCheckin(wk, f){
  if(!State.sb||!State.cloudUser) return;
  try{
    const ans=Object.assign({},f); const adh=ans.adherence; delete ans.adherence;
    await State.sb.from("checkins").upsert({client_id:State.cloudUser.id, week_start:wk, answers:ans, adherence:adh||null},{onConflict:"client_id,week_start"});
  }catch(e){ console.error("checkin",e); }
}

export async function cloudInsertSession(se){
  if(!State.sb||!State.cloudUser) return;
  try{
    const r=await State.sb.from("sessions").insert({client_id:State.cloudUser.id, performed_on:se.date, day_name:se.day}).select("id").single();
    if(r.error) throw r.error;
    se.cloudId=r.data.id;
    const entries=[];
    (se.exercises||[]).forEach(ex=>{ (ex.sets||[]).forEach((sset,i)=>{ entries.push({session_id:r.data.id, client_id:State.cloudUser.id, exercise_name:ex.name, set_order:i, kg:sset.kg, reps:sset.reps}); }); });
    if(entries.length) await State.sb.from("session_entries").insert(entries);
    save();
  }catch(e){ console.error("insertSession",e); }
}

export async function cloudDeleteSession(cid){ if(!State.sb||!State.cloudUser||!cid) return; try{ await State.sb.from("sessions").delete().eq("id",cid); }catch(e){} }

export async function cloudBoot(){
  if(!State.sb){ renderApp(); return; }
  try{
    const sess=await State.sb.auth.getSession();
    if(sess.data.session){ await afterLogin(); }
    else { showLogin("","in"); }
  }catch(e){ renderApp(); }
}
