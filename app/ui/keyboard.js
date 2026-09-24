// Teclado del celular y ventanas de abajo (.sheet) o del medio (.cp-ccard).
// En iPhone (y en Chrome de Android) el teclado se abre ENCIMA de la página sin achicarla:
// lo que está pegado abajo de la pantalla queda tapado y no se ve lo que se escribe
// (ej. los gramos de un alimento). Se mide cuánto tapa el teclado con visualViewport y se
// deja en la variable CSS --kb, que usan esas ventanas para subir justo arriba del teclado.
(function () {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  let last = -1;
  function update() {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    // Menos de 80 px no es el teclado (barras del navegador que aparecen y desaparecen).
    const v = kb > 80 ? kb : 0;
    if (v === last) return;
    last = v;
    root.style.setProperty("--kb", v + "px");
    root.classList.toggle("kb-open", v > 0);
  }
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  update();
})();

// Al tocar un número de las ventanas (gramos, etc.) se selecciona todo: se escribe el
// valor nuevo directo, sin tener que borrar el anterior.
document.addEventListener("focusin", (e) => {
  const t = e.target;
  if (t && t.matches && t.matches(".sheet-input")) setTimeout(() => { try { t.select(); } catch (err) {} }, 0);
});

// "Listo" / Enter en los gramos agrega o guarda (lo mismo que el botón de la ventana).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const t = e.target;
  const act = t && t.dataset && t.dataset.enter;
  if (!act) return;
  e.preventDefault();
  const b = document.querySelector('.sheet [data-action="' + act + '"]');
  if (b) { t.blur(); b.click(); }
});
