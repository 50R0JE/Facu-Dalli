# Reel · contador de calorías

1080×1920, 30 fps, ~28 s, sin audio. Solo la pantalla de Comida: el contador del día,
las comidas, agregar un alimento (el contador suma) y cambiar de fecha a ayer y antes de
ayer. El agua y el plan del coach se ocultan en la grabación.

Grabado con Supabase simulado (`grabacion/mock_client.js`): un alumno ficticio con comidas
de ejemplo en los últimos 3 días.

```bash
python3 -m http.server 8767 &            # desde la raíz del repo
BASE=http://localhost:8767 node grabacion/record_food.js
python3 reel.py salida.mp4
```
