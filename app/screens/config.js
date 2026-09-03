// Pantalla de Configuración (cuenta, vínculo con coach, borrado de datos locales).
// Antes vivía como un "addon" pegado al final del index.html que parcheaba
// renderApp por monkey-patching para no tocar el original; con módulos reales
// ya no hace falta el parche: main.js llama a renderConfig() directamente
// cuando State.view === "config".
import { State } from '../core/state.js';
import { KEY } from '../core/storage.js';
import { loadCloud } from '../core/supabase.js';
import { esc } from '../core/utils.js';
import { showLogin } from './auth.js';
import { renderApp } from '../main.js';

function cfgRoleLabel(p) { return (p && p.role === "coach") ? "Coach" : "Cliente"; }

export function renderConfig() {
  const logged = !!State.cloudUser;
  const profile = State.cloudProfile;
  const name = (profile && profile.full_name) || (logged && State.cloudUser.email) || "";
  const email = logged ? State.cloudUser.email : "";
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  const account = logged
    ? '<div class="card cfg-card">' +
        '<div class="cfg-row">' +
          '<div class="cfg-avatar">' + esc(initial) + '</div>' +
          '<div class="cfg-who">' +
            '<div class="cfg-name">' + esc(name || "Sin nombre") + '</div>' +
            '<div class="cfg-email">' + esc(email) + '</div>' +
          '</div>' +
          (profile ? '<div class="cfg-badge">' + esc(cfgRoleLabel(profile)) + '</div>' : '') +
        '</div>' +
        '<button class="logout-btn" data-auth="logout">Cerrar sesión</button>' +
      '</div>'
    : '<div class="card cfg-card">' +
        '<div class="cfg-empty">No iniciaste sesión.</div>' +
        '<button class="form-save" data-action="cfg-login">Iniciar sesión</button>' +
      '</div>';

  const needsLink = logged && profile && profile.role !== "coach" && !profile.coach_id;
  const linked = logged && profile && profile.role !== "coach" && !!profile.coach_id;

  const coachSection = !logged ? "" :
    linked
      ? '<div class="card cfg-card"><div class="cfg-row-simple"><span>Tu coach</span><button class="cfg-ok" data-action="cfg-unlink-coach" title="Desvincularte de tu coach">Vinculado ✅</button></div></div>'
      : needsLink
        ? '<div class="join-box" style="margin-top:0">' +
            '<div class="join-t">Vinculate a tu coach</div>' +
            '<input id="joinCode" class="form-input" placeholder="Código del coach" style="margin-bottom:10px">' +
            '<button class="form-save" data-auth="join" style="margin-top:0">Vincular</button>' +
          '</div>'
        : "";

  const dataSection = '<div class="card cfg-card">' +
      '<div class="cfg-sub">Datos en este dispositivo</div>' +
      '<button class="logout-btn cfg-danger" data-action="cfg-clear-local">Borrar datos guardados localmente</button>' +
    '</div>';

  const about = '<div class="cfg-about">FitSheet</div>';

  return '<div class="hb-head"><div class="hb-title">Configuración</div><div class="title-accent"></div></div>' +
    account + coachSection + dataSection + about;
}

document.body.addEventListener("click", async function (e) {
  const loginBtn = e.target.closest('[data-action="cfg-login"]');
  if (loginBtn) { showLogin("", "in"); return; }

  const unlinkBtn = e.target.closest('[data-action="cfg-unlink-coach"]');
  if (unlinkBtn) {
    if (!confirm("¿Seguro que te querés desvincular de tu coach? Vas a necesitar su código de invitación de nuevo si te querés volver a vincular.")) return;
    const prevHtml = unlinkBtn.innerHTML;
    unlinkBtn.disabled = true; unlinkBtn.innerHTML = "Desvinculando…";
    try {
      const r = await State.sb.from("profiles").update({ coach_id: null }).eq("id", State.cloudUser.id);
      if (r.error) throw r.error;
      await loadCloud();
      renderApp();
    } catch (err) {
      alert("No se pudo desvincular: " + ((err && err.message) || err));
      unlinkBtn.disabled = false; unlinkBtn.innerHTML = prevHtml;
    }
    return;
  }

  const clearBtn = e.target.closest('[data-action="cfg-clear-local"]');
  if (clearBtn) {
    if (confirm("¿Seguro? Se va a borrar todo lo guardado en este dispositivo (rutinas, pesos, hábitos). Esta acción no se puede deshacer.")) {
      try { localStorage.removeItem(KEY); } catch (err) {}
      location.reload();
    }
    return;
  }
});
