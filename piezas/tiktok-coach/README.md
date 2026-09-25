# TikTok · panel de coach

1080×1920, 30 fps, ~34 s, sin audio. Gancho «¿SOS COACH?», 16 funciones del panel
(clientes, código, plantillas, ficha, mensajes, bloques, seguimiento diario, check-in,
entrenos, volumen y peso, rutina, video de técnica, progreso, plan de comidas, preguntas)
y cierre con las fechas de iPhone y Android.

La grabación usa **Supabase simulado** (`grabacion/mock.js`): un coach y seis atletas
ficticios, así no se muestran datos reales ni se toca la base.

```bash
python3 -m http.server 8766 &            # desde la raíz del repo
node grabacion/record_coach.js            # deja los cuadros en grabacion/coach_frames/
python3 tiktok.py salida.mp4
```
