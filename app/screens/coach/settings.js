// Panel de configuración del propio coach (ícono de tuerca en el header): cambiar foto
// de perfil, cambiar nombre de usuario, cerrar sesión. Se abre/cierra como cualquier otro
// sheet del panel de coach (mismo patrón que renderCoachPicker en rutinas.js): un modal
// .cp-bg+.cp-ccard montado en #coachSheetHost, cerrado con closeSheet.
import { State } from '../../core/state.js';

import { esc } from '../../core/utils.js';

import { coachAvatarColor, coachInitials } from './clientes.js';

import { CoachState } from './state.js';

export function renderCoachSettings(){
  const host=document.getElementById("coachSheetHost"); if(!host) return;
  if(!CoachState.coachSettingsOpen){ host.innerHTML=""; return; }
  const name=(State.cloudProfile&&State.cloudProfile.full_name)||(State.cloudUser&&State.cloudUser.email)||"";
  const draft=CoachState.coachNameForm!=null?CoachState.coachNameForm:name;
  const id=(State.cloudUser&&State.cloudUser.id)||"";
  host.innerHTML='<div class="cp-bg" data-coach="settings-cancel"></div><div class="cp-ccard">'+
    '<div class="cp-head"><div class="cp-title">Configuración</div><button class="cp-x" data-coach="settings-cancel">✕</button></div>'+
    '<div class="cs-avatar-row">'+
      '<span class="co-avatar cs-avatar-big" style="background:'+coachAvatarColor(id)+'">'+esc(coachInitials(name))+'</span>'+
      '<div class="cs-avatar-col">'+
        '<button class="cp-copt cs-photo-btn" disabled>Cambiar foto de perfil</button>'+
        '<div class="cs-hint">Todavía no disponible</div>'+
      '</div>'+
    '</div>'+
    '<div class="cs-field">'+
      '<label>Nombre de usuario</label>'+
      '<input class="co-note" data-coach="settings-name" value="'+esc(draft)+'">'+
      '<button class="co-save-rt" data-coach="settings-name-save">Guardar nombre</button>'+
    '</div>'+
    '<button class="logout-btn" data-auth="logout">Cerrar sesión</button>'+
  '</div>';
}
