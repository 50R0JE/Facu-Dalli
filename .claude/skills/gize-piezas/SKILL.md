---
name: gize-piezas
description: Cómo generar piezas gráficas y videos de GIZE por código (Python con Pillow, cairosvg, fontTools y ffmpeg) — plantillas, efectos y errores ya conocidos. Usar al crear reels, posts, mockups, íconos o cualquier imagen de la marca desde el repositorio.
---

# Piezas gráficas por código

## Herramientas

`cairosvg` para rasterizar SVG, `Pillow` para composición y efectos, `fontTools` para convertir
texto a curvas, `ffmpeg` para armar video desde cuadros crudos.

## Texto a curvas (Bigger Display)

Leer el glifo con `fontTools`, sacar el path con `SVGPathPen` y voltear el eje Y:
`translate(x, baseline) scale(k, -k)` con `k = alto_de_mayúscula / OS/2.sCapHeight`.
Los glifos sin contorno (el espacio) devuelven `bounds = None`: saltearlos, pero sumar su avance.

## Errores ya cometidos, no repetirlos

- **Máscaras SVG:** cairosvg no las renderiza bien. Calcular los polígonos a mano.
- **Degradado recto en un contorno:** tiñe toda la forma de un solo color. Para que el borde
  recorra la gama, usar degradado **circular** calculado con `arctan2` alrededor del centro.
- **Brillo por `ImageChops.screen`:** aclara también el interior de las formas y lava el texto.
  Después de aplicar el resplandor, volver a pegar la imagen original con la máscara de las formas
  (erosionada 2 px) para recuperar los colores exactos.
- **Capturas de escritorio en vertical:** no entran legibles enteras. Recortar y hacer
  recorridos de cámara sobre la zona que importa, alineados al borde izquierdo del contenido.
- **Partículas y elementos que entran desde un borde:** el rango de aparición depende del **alto**
  de la pantalla, no del ancho. Si no, en vertical nunca llegan a cruzar el cuadro.

## Video

Cuadros crudos por `stdin` a ffmpeg: `-f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 30`,
salida `libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart`.
Renderizar por tandas de ~300 cuadros y unir con `concat`, para no perder todo si algo falla.

## Efectos del clima GIZE

- **Aurora:** 4 círculos con los colores de la gama, desenfoque fuerte, opacidad 0,3 a 0,5.
- **Aberración cromática:** desplazar el canal rojo a un lado y el azul al otro, 4 a 26 px.
- **Glitch:** rotar bandas horizontales al azar.
- **Scanlines:** sumar 14 de brillo cada 3 filas.

## Antes de dar algo por terminado

Renderizar una tira de cuadros o una hoja de contactos y **mirarla**. Los errores de encuadre,
texto cortado y superposición solo se ven mirando.
