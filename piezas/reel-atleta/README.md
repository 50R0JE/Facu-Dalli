# Reel · vista del atleta

Reel publicitario 1080×1920, 30 fps, sin audio (la música va aparte). ~41 s:
gancho → 11 funciones del panel del cliente → cierre con firma y una sola acción.

```bash
pip install pillow cairosvg numpy        # y ffmpeg en el PATH
python3 reel.py salida.mp4 grabacion-del-panel.mp4
```

La grabación de entrada es una captura de pantalla del celular (384×832). Los tramos
que se usan de cada función, su velocidad y los textos están en `BLOCKS`.
La configuración (nombre y email de la cuenta) queda afuera a propósito.
