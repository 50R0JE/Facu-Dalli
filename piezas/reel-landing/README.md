# Reel · landing y alta

Reel 1080×1920, 30 fps, sin audio, ~31 s. La grabación es de escritorio (1280×624), así
que se muestra dentro de una ventana de navegador con un recorrido de cámara por sección:
inicio, cómo funciona, la app, lo nuevo, dos partes, «Creá tu cuenta», la carga y el
formulario de alta (con el campo del código del coach resaltado).

```bash
python3 reel.py salida.mp4 grabacion-de-la-landing.mp4
```

Los tramos, la cámara (`[(progreso, cx, cy, ancho)]` en píxeles de la grabación) y los
textos de cada escena están en `BLOCKS`.
