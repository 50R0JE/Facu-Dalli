"""GIZE · piezas de texto del calendario: carrusel #5 (5 errores por WhatsApp) y post #18.
1080×1350 (4:5). Fondo negro con aurora suave, Outfit, filete RGB y la G al pie."""
import os, io
import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)
W, H, M = 1080, 1350, 88
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
WHITE, GREY, BLUE, GREEN = (255, 255, 255), (150, 158, 170), (47, 160, 255), (37, 232, 200)
FD = os.path.join(HERE, '..', 'triptico-energize', 'fonts')
def F(w, s):
    f = {'r': 'Outfit-Regular.ttf', 'b': 'Outfit-Bold.ttf', 'm': 'outfit-latin-600-normal.woff',
         'l': 'outfit-latin-300-normal.woff', 'mono': 'JetBrainsMono-Bold.ttf'}[w]
    return ImageFont.truetype(os.path.join(FD, f), s)

def gama_h(w, h):
    x = np.linspace(0, 1, w); p = x * 3; i0 = np.minimum(p.astype(int), 2); fr = (p - i0)[:, None]
    st = np.array(GAMA, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

def bg(seed):
    yy, xx = np.mgrid[0:H // 6, 0:W // 6].astype(np.float32)
    acc = np.zeros(yy.shape + (3,), np.float32)
    rng = np.random.default_rng(seed)
    for col in GAMA[:3]:
        cx, cy = rng.uniform(0, W // 6), rng.uniform(0, H // 6)
        g = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * (W / 16) ** 2)))
        acc += g[..., None] * np.array(col, np.float32) * .16
    img = Image.fromarray(np.clip(acc, 0, 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    return img.convert('RGBA')

G = Image.open(io.BytesIO(cairosvg.svg2png(url=REPO + '/brand/logo/gize-monograma.svg', output_width=44))).convert('RGBA')

def wrap(d, text, font, maxw):
    out = []
    for para in text.split('\n'):
        cur = ''
        for w in para.split():
            t = (cur + ' ' + w).strip()
            if d.textlength(t, font=font) <= maxw: cur = t
            else: out.append(cur); cur = w
        out.append(cur)
    return out

def block(d, xy, text, font, fill, maxw, lh):
    x, y = xy
    for ln in wrap(d, text, font, maxw):
        d.text((x, y), ln, font=font, fill=fill); y += lh
    return y

def frame(img, n=None, total=None, swipe=False):
    d = ImageDraw.Draw(img)
    img.alpha_composite(G, (M, H - M - 44))
    d.text((M + 60, H - M - 36), '@gize.app', font=F('m', 26), fill=GREY)
    if n:
        t = f'{n}/{total}'; d.text((W - M - d.textlength(t, font=F('mono', 24)), H - M - 34), t, font=F('mono', 24), fill=GREY)
    if swipe:
        t = 'Deslizá'; x = W - M - 90 - 44 - d.textlength(t, font=F('m', 28)); y = H - M - 38
        d.text((x, y), t, font=F('m', 28), fill=WHITE)
        ax, ay = x + d.textlength(t, font=F('m', 28)) + 14, y + 19
        d.line((ax, ay, ax + 26, ay), fill=WHITE, width=3); d.line((ax + 16, ay - 9, ax + 26, ay, ax + 16, ay + 9), fill=WHITE, width=3, joint='curve')

def rgb_line(img, x, y, w, h=3):
    img.alpha_composite(Image.fromarray(gama_h(w, h)).convert('RGBA'), (x, y))

def save(img, name): img.convert('RGB').save(os.path.join(OUT, name), quality=95, subsampling=0)

# ---------- carrusel #5 ----------
TOTAL = 7
ERRORES = [
    ('La rutina vive en un PDF que nadie encuentra.',
     'Tu alumno la busca entre 200 mensajes, no la encuentra y entrena lo que se acuerda.',
     'La rutina tiene que estar a un toque, siempre la última versión.'),
    ('Te enterás de que no entrenó recién a la semana.',
     'Cuando te das cuenta, ya perdió el ritmo y cortar es más fácil que volver.',
     'Mirá la actividad de cada alumno todos los días, no cuando te escribe.'),
    ('Los pesos están en la cabeza del alumno.',
     '"Creo que eran 60." Sin registro no hay progresión, hay intuición.',
     'Cada serie anotada: peso, reps y la vez anterior a la vista.'),
    ('El check-in es "¿cómo va todo?".',
     'La respuesta siempre es "bien". Y con "bien" no ajustás nada.',
     'Preguntas concretas y las mismas cada semana: sueño, molestias, adherencia.'),
    ('Todo depende de que vos te acuerdes.',
     'Con 5 alumnos zafa. Con 25, alguien se te pierde seguro.',
     'Un sistema que te avise, no una memoria que falla.'),
]

# portada
img = bg(1); d = ImageDraw.Draw(img)
d.text((M, 150), '5 ERRORES AL HACER SEGUIMIENTO POR WHATSAPP', font=F('mono', 24), fill=BLUE)
y = block(d, (M, 230), 'Tu alumno no dejó de entrenar.', F('b', 96), WHITE, W - 2 * M, 104)
y = block(d, (M, y + 10), 'Se perdió entre tus audios.', F('b', 96), GREY, W - 2 * M, 104)
rgb_line(img, M, y + 50, 300)
block(d, (M, y + 90), 'Si sos coach y seguís a tus alumnos por chat, fijate cuántos de estos cometés.', F('r', 38), GREY, W - 2 * M - 80, 52)
frame(img, 1, TOTAL, swipe=True); save(img, 'c5-1.jpg')

for i, (t, why, fix) in enumerate(ERRORES):
    img = bg(10 + i); d = ImageDraw.Draw(img)
    d.text((M - 8, 120), f'0{i + 1}', font=F('l', 300), fill=WHITE)
    d.text((M, 480), 'ERROR ' + str(i + 1), font=F('mono', 24), fill=BLUE)
    y = block(d, (M, 530), t, F('b', 72), WHITE, W - 2 * M, 82)
    y = block(d, (M, y + 30), why, F('r', 38), GREY, W - 2 * M - 40, 52)
    rgb_line(img, M, y + 50, 120)
    d.text((M, y + 84), 'EN CAMBIO', font=F('mono', 22), fill=GREEN)
    block(d, (M, y + 124), fix, F('m', 40), WHITE, W - 2 * M - 40, 54)
    frame(img, i + 2, TOTAL); save(img, f'c5-{i + 2}.jpg')

img = bg(30); d = ImageDraw.Draw(img)
y = block(d, (M, 300), '¿Cuántos cometés?', F('b', 110), WHITE, W - 2 * M, 118)
rgb_line(img, M, y + 40, 300)
y = block(d, (M, y + 90), 'Guardalo y revisalo el lunes con tu lista de alumnos.', F('r', 42), GREY, W - 2 * M - 60, 58)
block(d, (M, y + 60), 'Estamos armando GIZE para resolver justamente esto. Seguinos.', F('m', 40), WHITE, W - 2 * M - 60, 54)
firma = Image.open(io.BytesIO(cairosvg.svg2png(url=REPO + '/brand/logo/gize-firma-horizontal.svg', output_width=280))).convert('RGBA')
img.alpha_composite(firma, (M, 980))
frame(img, TOTAL, TOTAL); save(img, 'c5-7.jpg')

# ---------- post #18 ----------
img = bg(99); d = ImageDraw.Draw(img)
y = block(d, (M, 330), 'Nadie abandona el día que falta.', F('b', 100), WHITE, W - 2 * M, 108)
y = block(d, (M, y + 24), 'Abandona el día que nadie lo nota.', F('b', 100), GREY, W - 2 * M, 108)
rgb_line(img, M, y + 60, 300)
frame(img); save(img, 'post18.jpg')
print('ok')
