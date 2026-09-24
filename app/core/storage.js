import { ES_DAYS, ES_MAP, EX_DB } from './data.js';

import { state } from './state.js';

import { cloudSyncCore } from './supabase.js';

import { muscleOf, uid } from './utils.js';

export const KEY = "rutina_jero_v1";

export function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} try { cloudSyncCore(); } catch(e){} }

// Los id de la rutina van dentro del HTML (data-ex, data-set…). La rutina la puede escribir
// otra persona (el coach, o el cliente antes de vincularse), así que un id raro se cambia
// por uno nuevo en vez de confiar en que venga limpio. Lo mismo el link de video: solo https.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
function badId(o){ return o && o.id != null && !SAFE_ID.test(String(o.id)); }

export function migrateNames(days){
  let changed=false;
  (days||[]).forEach(d=>{
    if(badId(d)){ d.id=uid(); changed=true; }
    if(ES_DAYS[d.name]){ d.name=ES_DAYS[d.name]; changed=true; }
    (d.exercises||[]).forEach(ex=>{
      if(badId(ex)){ ex.id=uid(); changed=true; }
      (ex.sets||[]).forEach(st=>{ if(badId(st)){ st.id=uid(); changed=true; } });
      if(ex.video && !/^https:\/\//i.test(String(ex.video))){ delete ex.video; changed=true; }
      if(ES_MAP[ex.name]){ ex.name=ES_MAP[ex.name]; changed=true; }
      if(!ex.mus || !EX_DB[ex.mus]){ const m=muscleOf(ex.name); if(m!=="otros"){ ex.mus=m; changed=true; } }
    });
  });
  return changed;
}
