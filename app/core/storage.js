import { ES_DAYS, ES_MAP, EX_DB } from './data.js';

import { state } from './state.js';

import { cloudSyncCore } from './supabase.js';

import { muscleOf } from './utils.js';

export const KEY = "rutina_jero_v1";

export function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} try { cloudSyncCore(); } catch(e){} }

export function migrateNames(days){
  let changed=false;
  (days||[]).forEach(d=>{
    if(ES_DAYS[d.name]){ d.name=ES_DAYS[d.name]; changed=true; }
    (d.exercises||[]).forEach(ex=>{
      if(ES_MAP[ex.name]){ ex.name=ES_MAP[ex.name]; changed=true; }
      if(!ex.mus || !EX_DB[ex.mus]){ const m=muscleOf(ex.name); if(m!=="otros"){ ex.mus=m; changed=true; } }
    });
  });
  return changed;
}
