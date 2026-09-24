# Reel · la web ya está online (gize.ar)

Reel 1080×1920, 30 fps, sin audio, ~37 s. La landing se graba en formato celular
(390×806 a 2×) con Playwright, interactuando como una persona: se desliza el dedo sobre
el vidrio del inicio, se copia el código del coach, se marca la serie, se toca el gráfico
y se recorren las secciones hasta los planes y el alta.

```bash
# 1) servir el sitio (raíz del repo) y grabar
python3 -m http.server 8765 &          # desde la raíz del repo
node grabacion/record.js               # deja los cuadros en grabacion/frames/
# 2) armar el reel
python3 reel.py salida.mp4
```

Las fuentes de Google se reemplazan por las locales de `grabacion/fonts/`, así la
grabación no depende de internet. Textos y duración de cada escena: `BLOCKS` en `reel.py`.
