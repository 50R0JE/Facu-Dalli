import { auIcoDumbbell, auIcoEye, auIcoLock, auIcoMail, auIcoTicket, auIcoUser } from '../core/icons.js';

import { hideSilkBg, startAuthParticles, stopAuthParticles } from '../ui/background.js';

export function showLogin(msg, mode, vals){
  mode = mode || "in"; vals = vals || {};
  const isUp = mode==="up";
  const eq = v => String(v==null?"":v).replace(/"/g,"&quot;");
  const host=document.getElementById("authHost"); if(!host) return;
  host.style.display="flex";
  hideSilkBg();
  const isOk = !!msg && /^listo/i.test(String(msg).trim());
  let stepIdx=-1;
  const nextDelay=()=>{ stepIdx++; return (0.14+stepIdx*0.055).toFixed(3)+"s"; };
  const field=(id, icon, extraClass, ph, type, autocomplete, value)=>
    '<div class="auth-field'+(extraClass?(" "+extraClass):"")+'" style="animation-delay:'+nextDelay()+'">'+
      '<span class="auth-ic" aria-hidden="true">'+icon+'</span>'+
      '<input id="'+id+'" class="auth-in" type="'+type+'" placeholder="'+ph+'" autocomplete="'+autocomplete+'" aria-label="'+ph+'" value="'+eq(value)+'">'+
      (id==="auPass" ? '<button type="button" class="auth-toggle-pass" data-toggle-pass aria-label="Mostrar contraseña">'+auIcoEye+'</button>' : '')+
    '</div>';
  host.innerHTML =
    '<canvas class="auth-particles" aria-hidden="true"></canvas>'+
    '<div class="auth-card" role="region" aria-label="'+(isUp?"Crear cuenta":"Iniciar sesión")+'">'+
      '<div class="auth-brand-ic" aria-hidden="true">'+auIcoDumbbell+'</div>'+
      '<div class="auth-logo"><span class="b">Fit</span>Sheet</div>'+
      '<div class="auth-sub">Tu planilla de entrenamiento</div>'+
      (isUp?field("auName", auIcoUser, "", "Tu nombre y apellido", "text", "name", vals.name):"")+
      field("auEmail", auIcoMail, "", "Email (ej: nombre@gmail.com)", "email", "username", vals.email)+
      field("auPass", auIcoLock, "pass", "Contraseña (mínimo 6)", "password", isUp?"new-password":"current-password", "")+
      (isUp?field("auCode", auIcoTicket, "", "Código de tu coach (opcional)", "text", "off", vals.code):"")+
      (msg?'<div class="auth-msg'+(isOk?" ok":"")+'" role="alert" style="animation-delay:'+nextDelay()+'">'+msg+'</div>':'')+
      '<button class="auth-btn" data-auth="'+(isUp?"do-signup":"do-login")+'" style="animation-delay:'+nextDelay()+'">'+(isUp?"Crear cuenta":"Ingresar")+'</button>'+
      '<div class="auth-switch" data-auth="'+(isUp?"to-login":"to-signup")+'" role="button" tabindex="0" style="animation-delay:'+nextDelay()+'">'+(isUp?"Ya tengo cuenta":"Crear una cuenta nueva")+'</div>'+
    '</div>';
  startAuthParticles(host.querySelector(".auth-particles"));
}

export function hideLogin(){ const h=document.getElementById("authHost"); if(h){ h.style.display="none"; h.innerHTML=""; } stopAuthParticles(); }
