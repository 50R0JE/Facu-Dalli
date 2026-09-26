// Esta es la landing (gize.ar). La app está en app/. Van directo a la app: la app instalada
// (ícono del celular), la vuelta de los mails de Supabase (#access_token…) y la de
// Mercado Pago (?pago=…).
(function () {
  var h = location.hash, q = location.search;
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  if (standalone || /access_token|error_description|type=(signup|recovery|invite|magiclink)/.test(h) || /[?&]pago=/.test(q))
    location.replace("app/" + q + h);
})();
