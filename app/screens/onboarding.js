import { auIcoTicket, checkSvg } from '../core/icons.js';

import { State } from '../core/state.js';

import { esc } from '../core/utils.js';

import { applyBrand, loadCloud } from '../core/supabase.js';

import { hideSilkBg, showSilkBg } from '../ui/background.js';

import { CoachState } from './coach/state.js';

import { renderApp } from '../main.js';

// Bienvenida del primer ingreso. Antes todo esto iba en el formulario de "Crear cuenta"
// (aviso de la prueba, código del coach) y era demasiado de golpe: ahora el registro pide
// lo justo y esto aparece una sola vez, ya adentro, encima de la app.
//   Coach:   "¡Bienvenido, coach!" con su código para pasarle al primer alumno.
//   Cliente: "¡Bienvenido!" y después el código de su coach (opcional).
// Solo para cuentas nuevas (creadas hace menos de 7 días): las de antes no la ven nunca.
// Se marca como vista por cuenta en este dispositivo.
const SEEN_PREFIX = "gize_onb_";
const NEW_ACCOUNT_MS = 7*24*3600000;

const seenKey = () => SEEN_PREFIX + State.cloudUser.id;
function markSeen(){ try{ localStorage.setItem(seenKey(), "1"); }catch(e){} }

export function maybeShowOnboarding(){
  const u=State.cloudUser, p=State.cloudProfile;
  if(!u || !p || !u.created_at) return;
  if(Date.now()-Date.parse(u.created_at) > NEW_ACCOUNT_MS) return;
  try{ if(localStorage.getItem(seenKey())) return; }catch(e){ return; }
  if(p.role==="coach") showCoachWelcome(); else showClientWelcome();
}

function mount(inner, label){
  const host=document.getElementById("authHost"); if(!host) return null;
  host.style.display="flex";
  hideSilkBg();
  host.innerHTML=
    '<div class="gize-aurora auth-aurora" aria-hidden="true"><span></span><span></span><span></span><span></span></div>'+
    '<div class="auth-card onb-card" role="dialog" aria-modal="true" aria-label="'+label+'" tabindex="-1">'+
      '<div class="auth-brand-ic" aria-hidden="true"><img src="brand/logo/gize-monograma.svg" alt=""></div>'+
      inner+
    '</div>';
  // El foco va a la tarjeta (lector de pantalla) y no al campo: en el celular abriría el teclado.
  host.querySelector(".onb-card").focus({preventScroll:true});
  return host;
}

function close(){
  markSeen();
  const h=document.getElementById("authHost"); if(h){ h.style.display="none"; h.innerHTML=""; }
  showSilkBg(); // la app ya está dibujada por detrás: solo vuelve el fondo animado
}

function showCoachWelcome(){
  const code=CoachState.coachInvite;
  const host=mount(
    '<h1 class="onb-title">¡Bienvenido, coach!</h1>'+
    '<div class="onb-trial">14 días gratis para probar todo · sin tarjeta</div>'+
    '<p class="onb-text">Pasale este código a tu primer alumno. Lo carga una vez y quedan conectados.</p>'+
    (code ?
      '<div class="onb-code">'+
        '<div class="onb-code-lbl">Tu código</div>'+
        '<div class="onb-code-row"><span class="onb-code-val">'+esc(code)+'</span>'+
        '<button type="button" class="onb-copy" data-onb="copy">Copiar</button></div>'+
      '</div>' :
      '<p class="onb-text">Tu código de invitación aparece arriba de todo en tu panel.</p>')+
    '<button type="button" class="gize-btn auth-btn onb-main" data-onb="done">Ir a mi panel</button>',
    "Bienvenida");
  if(!host) return;
  host.onclick=async e=>{
    const b=e.target.closest("[data-onb]"); if(!b) return;
    if(b.dataset.onb==="done"){ host.onclick=null; close(); return; }
    if(b.dataset.onb==="copy"){
      try{ await navigator.clipboard.writeText(code); }
      catch(err){ alert("No se pudo copiar. Código: "+code); return; }
      b.innerHTML=checkSvg+" Copiado"; b.classList.add("copied");
      setTimeout(()=>{ b.textContent="Copiar"; b.classList.remove("copied"); }, 1600);
    }
  };
}

function showClientWelcome(){
  const host=mount(
    '<div class="auth-logo"><img src="brand/logo/gize-logotipo.svg" alt="GIZE"></div>'+
    '<h1 class="onb-title onb-title-gap">¡Bienvenido!</h1>'+
    '<p class="onb-text">Tu coach arma el plan, vos registrás cada serie y los dos ven la evolución.</p>'+
    '<button type="button" class="gize-btn auth-btn onb-main" data-onb="start">Empezar</button>',
    "Bienvenida");
  if(!host) return;
  host.onclick=e=>{
    if(!e.target.closest('[data-onb="start"]')) return;
    host.onclick=null;
    // Ya vinculado (código de un intento anterior de registro): no se le pide de nuevo.
    if(State.cloudProfile && State.cloudProfile.coach_id) close();
    else showClientCode();
  };
}

function showClientCode(msg, value){
  const host=mount(
    '<h1 class="onb-title">¿Tenés un código de tu coach?</h1>'+
    '<p class="onb-text">Es opcional. Con el código, tu coach te arma el plan.</p>'+
    '<div class="auth-field onb-field">'+
      '<span class="auth-ic" aria-hidden="true">'+auIcoTicket+'</span>'+
      '<input id="onbCode" class="auth-in" type="text" placeholder="Código de tu coach" aria-label="Código de tu coach" autocomplete="off" autocapitalize="characters" value="'+esc(value||"")+'">'+
    '</div>'+
    (msg?'<div class="auth-msg" role="alert">'+esc(msg)+'</div>':'')+
    '<button type="button" class="gize-btn auth-btn onb-main" data-onb="join">Vincular con mi coach</button>'+
    '<button type="button" class="onb-alt" data-onb="solo">Entreno por mi cuenta</button>',
    "Código de tu coach");
  if(!host) return;
  const inp=host.querySelector("#onbCode");
  inp.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); host.querySelector('[data-onb="join"]').click(); } });
  host.onclick=async e=>{
    const b=e.target.closest("[data-onb]"); if(!b || b.disabled) return;
    if(b.dataset.onb==="solo"){ host.onclick=null; close(); return; }
    const code=inp.value.trim();
    if(!code){ showClientCode("Poné el código que te pasó tu coach, o tocá \"Entreno por mi cuenta\".", code); return; }
    b.disabled=true; b.textContent="Vinculando...";
    try{
      const r=await State.sb.rpc("join_coach",{code:code});
      if(r.data!==true){
        // join_coach trae un mensaje propio para plan vencido o cupo lleno.
        const m=(r.error && r.error.code==="P0001" && r.error.message) || "Código inválido. Revisalo con tu coach.";
        showClientCode(m, code); return;
      }
      const pr=await State.sb.from("profiles").select("*").eq("id",State.cloudUser.id).maybeSingle();
      if(pr.data) State.cloudProfile=pr.data;
      await loadCloud();
      try{ const cn=await State.sb.rpc("my_coach_name"); State.brandName=cn.data||""; }catch(e2){}
      applyBrand();
      host.onclick=null; close(); renderApp();
    }catch(err){ showClientCode("No se pudo vincular: "+((err&&err.message)||err), code); }
  };
}
