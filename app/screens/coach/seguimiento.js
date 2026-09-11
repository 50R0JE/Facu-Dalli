import { CHECKIN_Q } from '../../core/data.js';

import { esc, fmtDate } from '../../core/utils.js';

import { weeklyAvg } from './clientes.js';

import { renderWChart } from '../progreso.js';

export function renderCoachWeekly(d){
  const avg=weeklyAvg(d.weights);
  if(!avg.length) return '<div class="cal-hint">Sin registros de peso.</div>';
  const chart=renderWChart(avg.map(a=>({date:a.date,kg:a.kg})), true, "med");
  const rows=avg.slice().reverse().map((a,i,arr)=>{
    const prev=arr[i+1];
    const df=prev?(a.kg-prev.kg):null;
    const dh=df===null?'\u2014':((df>0?'+':'')+df.toFixed(2)+' kg');
    const cls=df===null?'em':(Math.abs(df)<0.05?'em':'mx');
    return '<tr><td class="dt">Sem. '+fmtDate(a.date)+'</td><td><b>'+a.kg.toFixed(2)+' kg</b></td><td class="'+cls+'">'+dh+'</td><td class="em">'+a.n+' reg.</td></tr>';
  }).join("");
  return chart+'<table class="co-tbl"><thead><tr><th>Semana</th><th>Promedio</th><th>Variaci\u00f3n</th><th>Datos</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

export function renderCoachDaily(d){
  const rows=(d.daily||[]).slice(0,14);
  if(!rows.length) return '<div class="cal-hint">El cliente todav\u00eda no carg\u00f3 registros diarios.</div>';
  const wmap={}; (d.weights||[]).forEach(w=>wmap[w.date]=w.kg);
  const body=rows.map(r=>{
    const w=wmap[r.log_date];
    return '<tr><td class="dt">'+fmtDate(r.log_date)+'</td>'+
      '<td>'+(w?w.toFixed(1)+' kg':'\u2014')+'</td>'+
      '<td>'+(r.steps?Number(r.steps).toLocaleString("es-AR"):'\u2014')+'</td>'+
      '<td>'+(r.soreness||'\u2014')+'</td><td>'+(r.performance||'\u2014')+'</td><td>'+(r.motivation||'\u2014')+'</td>'+
      '<td>'+(r.hunger||'\u2014')+'</td><td>'+(r.fatigue||'\u2014')+'</td><td>'+(r.sleep||'\u2014')+'</td>'+
      '<td class="cm">'+esc(r.comment||'')+'</td></tr>';
  }).join("");
  return '<div class="co-scroll"><table class="co-tbl"><thead><tr><th>Fecha</th><th>Peso</th><th>Pasos</th><th>Dolor</th><th>Rendim.</th><th>Motiv.</th><th>Hambre</th><th>Cansancio</th><th>Sue\u00f1o</th><th>Comentario</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}

export function renderCoachCheckins(d){
  const cks=(d.checkins||[]);
  if(!cks.length) return '<div class="cal-hint">El cliente todav\u00eda no respondi\u00f3 ning\u00fan check-in.</div>';
  return cks.slice(0,8).map(c=>{
    const a=c.answers||{};
    const qs=CHECKIN_Q.filter(q=>a[q[0]]).map(q=>'<div class="ck-q"><div class="ck-qt">'+q[1]+'</div><div class="ck-qa">'+esc(a[q[0]])+'</div></div>').join("");
    const adh=c.adherence?'<span class="ck-adh">Adherencia: <b>'+c.adherence+'/10</b></span>':'';
    return '<div class="ck-card"><div class="ck-head">Semana del '+fmtDate(c.week_start)+' '+adh+'</div>'+(qs||'<div class="cal-hint">Sin respuestas.</div>')+'</div>';
  }).join("");
}

export function renderCoachPhotos(d){
  const ph=(d.photos||[]);
  if(!ph.length) return '<div class="cal-hint">El cliente todav\u00eda no subi\u00f3 fotos.</div>';
  return '<div class="ph-grid big">'+ph.map(p=>'<a class="ph-thumb" href="'+p.url+'" target="_blank"><img src="'+p.url+'"><span class="ph-date">'+fmtDate(p.taken_on)+'</span></a>').join("")+'</div>';
}
