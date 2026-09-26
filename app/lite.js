// Modo liviano: en celulares/compus de gama baja se apagan los efectos caros (partículas,
// aurora animada, desenfoques, borde que gira). Va acá arriba, antes del CSS, para que la
// primera pintada ya salga liviana. "gize_lite" = elección manual en Ajustes ("1"/"0");
// "gize_lite_auto" lo deja app/ui/background.js si midió que el fondo iba a tirones.
(function () {
  try {
    var o = localStorage.getItem("gize_lite"), n = navigator, c = n.connection || {};
    var weak = (n.deviceMemory && n.deviceMemory <= 4) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) ||
      c.saveData === true || localStorage.getItem("gize_lite_auto") === "1";
    if (o === "1" || (o !== "0" && weak)) document.documentElement.classList.add("lite");
  } catch (e) {}
})();
