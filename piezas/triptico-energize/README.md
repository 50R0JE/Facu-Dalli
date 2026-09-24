# Tríptico · ENERGIZE

Tres posts de 1080×1350 (4:5) que en la grilla del perfil forman una sola imagen:
**ENER** en neón · la barra bajo el foco · **GIZE**, todo parado sobre el mismo filete RGB.

- Izquierda: «La energía la ponés vos.»
- Centro: «Energizá cada serie.» + monograma
- Derecha: «El método, tu coach.»

**Orden de subida:** Instagram pone lo último arriba a la izquierda, así que se sube
primero `post-3-derecha-GIZE`, después `post-2-centro` y al final `post-1-izquierda-ENER`.

`glifos.py` arma palabras en Bigger Display a partir de las curvas del logotipo
(G, I, Z, E) más una N y una R dibujadas con las mismas medidas.

**Por qué 4:5 con bordes superpuestos:** la grilla del perfil muestra cada post recortado
a 3:4 (el centro, 1012 px de ancho). La tira visible se arma continua y cada post suma
34 px a cada lado que se superponen con el vecino y la grilla no muestra.
En la app, al subir, tocá las flechitas de «ampliar» para que no la recorte a cuadrado.

```bash
python3 triptico.py      # arma la imagen completa (salida/3x4/)
python3 triptico45.py    # la corta en los 3 posts 4:5 y la maqueta de la grilla (salida/)
```
