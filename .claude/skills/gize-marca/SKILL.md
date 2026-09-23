---
name: gize-marca
description: Sistema de marca de GIZE (logo, color, tipografía, tokens CSS). Usar siempre que se toque UI, estilos, logos, íconos, splash, manifest o cualquier pieza visual de la app o la web. También al revisar si un cambio respeta la identidad.
---

# Marca GIZE

La fuente de verdad es `brand/BRAND.md` y `brand/tokens.css`. Leelos antes de escribir CSS.
Si el código contradice esos archivos, gana el archivo.

## Reglas que no se negocian

1. **La palabra GIZE va siempre como SVG** desde `brand/logo/`. Nunca escrita con una fuente
   del sistema ni con webfont. El logotipo son curvas de Bigger Display.
2. **Colores solo por token.** Nada de hex sueltos en componentes. Todos los valores viven
   en `brand/tokens.css` como `--gize-*`.
3. **Un solo elemento con anillo RGB por pantalla:** la acción principal. Si hay dos, hay error de diseño.
4. **El magenta `--gize-logro` es solo para logros y récords.** Si aparece, es celebración.
5. **Nunca texto largo en neón ni en la gama RGB.** El texto corrido va en `--gize-text`.
6. **Toda animación respeta `prefers-reduced-motion`.**

## Tipografías

| Uso | Familia | Dónde |
|---|---|---|
| Interfaz | Outfit 400/500/600/700 | Google Fonts |
| Datos numéricos (kg, reps, macros, cronómetros) | JetBrains Mono | tablas y registros |
| Logotipo | Bigger Display, ya en curvas | `brand/logo/*.svg` |

Bigger Display **no tiene vocales con tilde**. Si una pieza necesita tildes, esa palabra va en Outfit.

## Archivos de logo

- `gize-monograma.svg` — la G sola. Ícono, avatar, favicon.
- `gize-monograma-mono.svg` — un color, usa `currentColor`.
- `gize-logotipo.svg` — la palabra GIZE.
- `gize-firma-horizontal.svg` — símbolo + palabra. Firma principal.
- `gize-icono-negro.svg` / `gize-icono-maskable.svg` — íconos de app.

**Construcción de la firma:** símbolo 100 u, aire 44 u, altura de mayúscula 74 u. No re-espaciar.
**Zona de protección:** el alto del punto de la G alrededor de todo el logo.
**Usos incorrectos:** estirarlo, rotarlo, cambiarle el color al punto, ponerlo sobre fondo claro
sin la versión monocromo, agregarle sombras o contornos.

## Exportar íconos

Rasterizar cada tamaño **desde el SVG**, nunca reescalando un PNG grande:
1024, 512, 192, 180, 64, 32, 16 desde `gize-icono-negro.svg`; 512 y 192 desde el maskable.
Sin transparencia y sin esquinas redondeadas: el SVG ya trae el fondo y cada sistema aplica su máscara.
En el manifest, `background_color` y `theme_color` en `#000000`, o Android muestra un flash blanco.

## Colores semánticos

`--gize-danger` errores · `--gize-success` completado (es el verde agua de la gama)
`--gize-warning` avisos · superficies con `--gize-surface`, `--gize-surface-2`, `--gize-border`.
El color marca **estado**, nunca identidad: no pintar opciones de una lista con colores distintos.
