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
import { bellSvg, fileTextSvg, instagramSvg, globeSvg, auIcoMail, whatsappSvg, chevronRightSvg } from '../core/icons.js';

function cfgRoleLabel(p) { return (p && p.role === "coach") ? "Coach" : "Cliente"; }

// Links externos de la pantalla de Configuración. Placeholders a propósito: reemplazar
// cada uno por el real (instagram/website: URL completa; email: solo la casilla;
// whatsapp: solo número con código de país, sin "+" ni espacios ni guiones) y listo,
// los botones ya redirigen solos — no hace falta tocar nada más de este archivo.
const LINKS = {
  terms: "https://TU-DOMINIO.com/terminos-y-condiciones",
  instagram: "https://instagram.com/TU_USUARIO",
  website: "https://TU-SITIO.com",
  email: "contacto@TU-DOMINIO.com",
  whatsapp: "5491100000000",
};

function cfgLinkRow(icon, label, href) {
  return '<a class="cfg-link-row" href="' + esc(href) + '" target="_blank" rel="noopener">' +
    '<span class="cfg-link-ic">' + icon + '</span>' +
    '<span class="cfg-link-label">' + esc(label) + '</span>' +
    '<span class="cfg-link-chev">' + chevronRightSvg + '</span>' +
  '</a>';
}

// Sin backend de push (no hay VAPID key ni suscripción a un servidor acá): esto
// prende/apaga el permiso del navegador para notificaciones locales. Un navegador
// nunca deja "revocar" el permiso por código una vez dado — el apagado guarda una
// preferencia propia de la app y listo; para bloquearlas del todo hay que hacerlo
// desde los ajustes del sistema/navegador (se lo avisamos al usuario en ese caso).
const NOTIF_KEY = "jfit_notif_enabled";

function notifSupported() { return typeof Notification !== "undefined"; }

function notifOn() {
  if (!notifSupported()) return false;
  try { return Notification.permission === "granted" && localStorage.getItem(NOTIF_KEY) !== "0"; }
  catch (e) { return Notification.permission === "granted"; }
}

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

  const notifOnNow = notifOn();
  const notifSection = '<div class="card cfg-card">' +
      '<div class="cfg-notif-row">' +
        '<span class="cfg-notif-ic">' + bellSvg + '</span>' +
        '<div class="cfg-notif-txt">' +
          '<div class="cfg-notif-label">Notificaciones</div>' +
          '<div class="cfg-notif-desc">Avisos de tu coach y recordatorios</div>' +
        '</div>' +
        '<button class="cfg-switch' + (notifOnNow ? ' on' : '') + '" data-action="cfg-notif-toggle" role="switch" aria-checked="' + notifOnNow + '"><span class="cfg-switch-knob"></span></button>' +
      '</div>' +
    '</div>';

  const legalSection = '<div class="card cfg-card">' +
      cfgLinkRow(fileTextSvg, "Términos y condiciones", LINKS.terms) +
    '</div>';

  const contactSection = '<div class="card cfg-card">' +
      '<div class="cfg-sub">Contacto</div>' +
      cfgLinkRow(instagramSvg, "Instagram", LINKS.instagram) +
      cfgLinkRow(globeSvg, "Sitio web", LINKS.website) +
      cfgLinkRow(auIcoMail, "Email", "mailto:" + LINKS.email) +
      cfgLinkRow(whatsappSvg, "WhatsApp", "https://wa.me/" + LINKS.whatsapp) +
    '</div>';

  const dataSection = '<div class="card cfg-card">' +
      '<div class="cfg-sub">Datos en este dispositivo</div>' +
      '<button class="logout-btn cfg-danger" data-action="cfg-clear-local">Borrar datos guardados localmente</button>' +
    '</div>';

  const dangerSection = !logged ? "" : '<div class="card cfg-card">' +
      '<div class="cfg-sub">Zona de peligro</div>' +
      '<button class="logout-btn cfg-danger" data-action="cfg-delete-account">Eliminar cuenta</button>' +
    '</div>';

  const about = '<div class="cfg-about">FitSheet</div>';

  return '<div class="hb-head"><div class="hb-title">Configuración</div><div class="title-accent"></div></div>' +
    account + coachSection + notifSection + legalSection + contactSection + dataSection + dangerSection + about;
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

  const notifBtn = e.target.closest('[data-action="cfg-notif-toggle"]');
  if (notifBtn) {
    if (!notifSupported()) { alert("Este navegador no soporta notificaciones."); return; }
    if (notifBtn.classList.contains("on")) {
      // Ver comentario junto a NOTIF_KEY: no se puede revocar el permiso del navegador
      // por código, solo apagar el aviso a nivel app.
      try { localStorage.setItem(NOTIF_KEY, "0"); } catch (err) {}
      renderApp();
      return;
    }
    if (Notification.permission === "denied") {
      alert("Las notificaciones están bloqueadas para FitSheet en este dispositivo. Para activarlas, habilitalas desde los ajustes del navegador o del celular.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") { try { localStorage.setItem(NOTIF_KEY, "1"); } catch (err) {} }
      else if (perm === "denied") { alert("No se activaron las notificaciones."); }
    } catch (err) {}
    renderApp();
    return;
  }

  const delAccBtn = e.target.closest('[data-action="cfg-delete-account"]');
  if (delAccBtn) {
    if (!State.sb || !State.cloudUser) { alert("Iniciá sesión para poder eliminar tu cuenta."); return; }
    if (!confirm("¿Seguro que querés eliminar tu cuenta? Se va a borrar tu rutina, tus registros y tu vínculo con tu coach de forma permanente. Esta acción no se puede deshacer.")) return;
    const typed = prompt('Para confirmar, escribí ELIMINAR (en mayúsculas):');
    if (typed !== "ELIMINAR") { if (typed !== null) alert("No coincide, no se eliminó nada."); return; }
    const prevHtml = delAccBtn.innerHTML;
    delAccBtn.disabled = true; delAccBtn.innerHTML = "Eliminando…";
    try {
      // Requiere que exista en Supabase una función RPC "delete_own_account" (SECURITY
      // DEFINER) que borre el registro de auth.users junto con lo que dependa de él —
      // la anon key del cliente no tiene permiso para borrar de auth.users directo.
      // Mismo patrón que join_coach/my_coach_name en core/supabase.js: acá solo se
      // llama, la función se crea del lado de Supabase.
      const r = await State.sb.rpc("delete_own_account");
      if (r.error) throw r.error;
      try { localStorage.removeItem(KEY); } catch (err) {}
      try { await State.sb.auth.signOut(); } catch (err) {}
      alert("Tu cuenta fue eliminada.");
      location.reload();
    } catch (err) {
      alert("No se pudo eliminar la cuenta: " + ((err && err.message) || err));
      delAccBtn.disabled = false; delAccBtn.innerHTML = prevHtml;
    }
    return;
  }
});
