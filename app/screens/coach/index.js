import { copySvg, downloadSvg, resetSvg } from '../../core/icons.js';

import { esc, fmtDate } from '../../core/utils.js';

import { renderCoachInfo } from './clientes.js';

import { renderApplyPicker, renderCoachBlock, renderCoachPlan, renderCoachRoutine } from './rutinas.js';

import { renderCoachCheckins, renderCoachDaily, renderCoachPhotos, renderCoachWeekly } from './seguimiento.js';

import { CoachState } from './state.js';

import { renderVolumen, renderWChart } from '../progreso.js';

import { showSilkBg } from '../../ui/background.js';

export function renderCoach(){
  const host=document.getElementById("coachHost"); if(!host) return;
  if(!CoachState.coachSel && CoachState.coachApplyPicker){ CoachState.coachApplyPicker=null; renderApplyPicker(); }
  host.style.display="block";
  showSilkBg();
  document.body.classList.add("silk-coach");
  if(!CoachState.coachSel && !CoachState.coachTplEdit){
    const tabs='<div class="co-tabs">'+
      '<button class="co-tab'+(CoachState.coachView==="clients"?" on":"")+'" data-coach="view-clients">Clientes <span class="co-tab-count'+(CoachState.coachClients.length?" has":"")+'">('+CoachState.coachClients.length+')</span></button>'+
      '<button class="co-tab'+(CoachState.coachView==="tpls"?" on":"")+'" data-coach="view-tpls">Mis rutinas <span class="co-tab-count'+(CoachState.coachTpls.length?" has":"")+'">('+CoachState.coachTpls.length+')</span></button>'+
    '</div>';
    let body="";
    if(CoachState.coachView==="tpls"){
      const tl=CoachState.coachTpls.length ? CoachState.coachTpls.map(t=>{
        const nd=(t.days||[]).length;
        const nex=(t.days||[]).reduce((n,d)=>n+((d.exercises||[]).length),0);
        return '<div class="co-item tpl-item" data-coach="tpl-open" data-id="'+t.id+'">'+
          '<div class="co-name">'+esc(t.name||"Sin nombre")+'</div>'+
          '<div class="co-item-meta">'+nd+' día'+(nd===1?'':'s')+' · '+nex+' ejercicios</div>'+
          '<div class="co-arrow">›</div></div>';
      }).join("") : (CoachState.tplsError ? '<div class="cal-hint" style="color:var(--red)">No se pudieron cargar: <b>'+esc(CoachState.tplsError)+'</b><br><br>Si dice que la tabla no existe, falta correr el SQL de rutinas en Supabase.</div>' : '<div class="cal-hint">Todavía no creaste ninguna rutina. Creá una y después aplicásela a los clientes que quieras.</div>');
      body='<div class="co-items">'+tl+'</div>'+
        '<button class="co-add-day" data-coach="tpl-new">+ Crear rutina nueva</button>'+
        '<button class="co-copy-btn" style="margin-top:8px" data-coach="tpl-seed">'+downloadSvg+' Importar Meso 2 · Microciclo 8</button>'+
        '<button class="co-copy-btn" style="margin-top:8px" data-coach="tpl-seed-ppl">'+downloadSvg+' Importar PPL · 5 días</button>';
    } else {
      const q=(CoachState.coachSearch||"").toLowerCase();
      const filtered=CoachState.coachClients.filter(c=>(c.full_name||"").toLowerCase().includes(q));
      const onboard='<div class="co-onboard">'+
        '<div class="co-onboard-lead">Todavía no tenés clientes vinculados</div>'+
        '<div class="co-item co-onboard-step"><div class="co-onboard-n">1</div><div class="co-onboard-txt">Copiá tu <b>código de invitación</b> de arriba</div></div>'+
        '<div class="co-item co-onboard-step"><div class="co-onboard-n">2</div><div class="co-onboard-txt">Pasáselo a tu cliente por donde le quede más cómodo</div></div>'+
        '<div class="co-item co-onboard-step"><div class="co-onboard-n">3</div><div class="co-onboard-txt">Se vincula solo — va a aparecer acá apenas lo haga</div></div>'+
      '</div>';
      const list=filtered.length ? filtered.map(c=>{
        const st=CoachState.coachClientStats[c.id]||{};
        const meta=st.nSess ? st.nSess+' entrenos'+(st.lastSess?' · último '+fmtDate(st.lastSess):'') : 'sin entrenos aún';
        return '<div class="co-item" data-coach="open" data-id="'+c.id+'"><div class="co-name">'+esc(c.full_name||"Sin nombre")+'</div><div class="co-item-meta">'+meta+'</div><div class="co-arrow">›</div></div>';
      }).join("") : '<div class="cal-hint">Sin resultados.</div>';
      const searchBox=CoachState.coachClients.length>3 ? '<input class="co-search" placeholder="\u{1F50D} Buscar cliente…" data-coach="coach-search" value="'+esc(CoachState.coachSearch||"")+'">' : "";
      // El onboarding es un bloque ancho de texto/pasos, no una card angosta más — si lo
      // metiera adentro de .co-items (grid de auto-fill,minmax(260px,1fr) en desktop)
      // quedaría encajonado en una sola columna angosta con carriles vacíos al lado.
      // Va como reemplazo del bloque entero (sin buscador ni grid), no como un item más.
      body=(!CoachState.coachSearch && !CoachState.coachClients.length) ? onboard : searchBox+'<div class="co-items">'+list+'</div>';
    }
    host.innerHTML='<div class="co-wrap"><div class="co-head"><div class="co-brand"><div class="brand-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/></svg></div><div class="wordmark"><span class="b">Fit</span><span class="w">Sheet</span></div><span class="co-brand-dash">-</span><span class="co-brand-tag">Panel de coach</span></div><button class="co-logout" data-auth="logout">Salir</button></div><div class="co-invite">Tu código de invitación<br><span class="co-code">'+esc(CoachState.coachInvite||"—")+'</span>'+(CoachState.coachInvite?'<button class="co-copy-btn co-invite-copy" data-coach="copy-invite">'+copySvg+' Copiar código</button>':'')+'<div class="co-invite-sub">Compartíselo a tus clientes para que se vinculen a vos.</div></div>'+tabs+body+'</div>';
  } else if(CoachState.coachTplEdit){
    const rt=CoachState.coachTplEdit.days||[];
    let ed="";
    if(!rt.length){ ed='<div class="cal-hint">Esta rutina no tiene días todavía.</div><button class="co-add-day" data-coach="day-add">+ Agregar día</button>'; }
    else { ed=renderCoachRoutine({routine:rt, sessions:[]}); }
    host.innerHTML='<div class="co-wrap">'+
      '<div class="co-head"><button class="co-back" data-coach="tpl-back">‹ Volver</button>'+
      '<button class="co-logout" data-coach="tpl-del">Borrar rutina</button></div>'+
      '<div class="ci-f" style="margin-bottom:14px"><label>Nombre de la rutina</label><input class="co-note" data-coach="tpl-name" value="'+esc(CoachState.coachTplEdit.name||"")+'"></div>'+
      ed+
      '<button class="co-save-rt" data-coach="tpl-save">Guardar rutina</button>'+
    '</div>';
  } else {
    const d=CoachState.coachData; let body="";
    if(!d||d.loading){ body='<div class="cal-hint">Cargando…</div>'; }
    else if(d.error){ body='<div class="cal-hint">No se pudo cargar. Reintentá.</div>'; }
    else {
      const wchart=d.weights.length ? renderWChart(d.weights,false,"med") : '<div class="cal-hint">Sin registros de peso.</div>';
      const wlist=d.weights.length ? '<div class="co-list">'+d.weights.slice().reverse().map(w=>'<div class="co-row"><span>'+fmtDate(w.date)+'</span><span class="co-val">'+Number(w.kg).toFixed(1)+' kg</span></div>').join("")+'</div>' : "";
      const sess=d.sessions.slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,20).map(se=>{ const names=se.exercises.map(e=>e.name).join(", "); return '<div class="sess-item"><div class="sess-main"><div class="sess-date">'+fmtDate(se.date)+' · '+esc(se.day||"")+'</div><div class="sess-exs">'+esc(names)+'</div></div></div>'; }).join("");
      const vol=(d.routine&&d.routine.length)?renderVolumen(d.routine):'<div class="cal-hint">Sin rutina cargada.</div>';
      body='<div class="co-bottom"><div class="co-panel"><div class="co-sec">Ficha del cliente</div>'+renderCoachInfo(d)+'</div>'+
             '<div class="co-panel"><div class="co-sec">Bloque / mesociclo</div>'+renderCoachBlock(d)+'</div></div>'+
           renderCoachRoutine(d)+
           renderCoachPlan(d)+
           '<div class="co-sec">Fotos de progreso</div>'+renderCoachPhotos(d)+
           '<div class="co-sec">Seguimiento diario</div>'+renderCoachDaily(d)+
           '<div class="co-sec">Check-in semanal</div>'+renderCoachCheckins(d)+
           '<div class="co-sec">Historial de entrenos</div>'+(sess||'<div class="cal-hint">El cliente todavía no registró entrenos.</div>')+
           '<div class="co-bottom">'+
             '<div class="co-panel"><div class="co-sec">Volumen semanal por m\u00fasculo</div>'+vol+'</div>'+
             '<div class="co-panel"><div class="co-sec">Promedio semanal de peso</div>'+renderCoachWeekly(d)+'</div>'+
           '</div>'+
           '<div class="co-sec">Peso corporal (d\u00eda a d\u00eda)</div>'+wchart+wlist;
    }
    host.innerHTML='<div class="co-wrap"><div class="co-head"><button class="co-back" data-coach="back">‹ Volver</button><div><button class="co-back" data-coach="refresh" style="margin-right:8px">'+resetSvg+' Actualizar</button><button class="co-logout" data-auth="logout">Salir</button></div></div><div class="co-client-name">'+esc((CoachState.coachData&&CoachState.coachData.name)||"Cliente")+'</div>'+body+'</div>';
  }
}
