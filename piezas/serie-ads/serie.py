"""GIZE · serie publicitaria de 5 posts 4:5 con fotos de gimnasio.
Sistema: titular en el alfabeto Bigger (bigger.py), una línea RGB, un elemento de la app
resuelto en tipografía (sin tarjetas), la G al pie y márgenes de 64 px."""
import os, io
import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'triptico-energize'))
import bigger

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
IMG = os.path.join(HERE, 'fotos')
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)
W, H, M = 1080, 1350, 64
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
WHITE, GREY, BLUE, GREEN = (255, 255, 255), (160, 167, 178), (47, 160, 255), (37, 232, 200)
FD = os.path.join(HERE, '..', 'triptico-energize', 'fonts')
FONTS = {200: 'outfit-latin-200-normal.woff', 300: 'outfit-latin-300-normal.woff',
         400: 'Outfit-Regular.ttf', 500: 'outfit-latin-500-normal.woff', 600: 'outfit-latin-600-normal.woff', 700: 'Outfit-Bold.ttf'}
def F(w, s): return ImageFont.truetype(os.path.join(FD, FONTS[w]), s)
MONO = lambda s: ImageFont.truetype(os.path.join(FD, 'JetBrainsMono-Bold.ttf'), s)

def gama_h(w, h):
    x = np.linspace(0, 1, w); p = x * 3; i0 = np.minimum(p.astype(int), 2); fr = (p - i0)[:, None]
    st = np.array(GAMA, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

def line(img, x, y, w, h=2, alpha=255):
    L = Image.fromarray(gama_h(w, h)).convert('RGBA')
    if alpha < 255: L.putalpha(alpha)
    img.alpha_composite(L, (x, y))

def tracked(d, xy, text, font, fill, track, right=False):
    ws = [d.textlength(c, font=font) for c in text]; tot = sum(ws) + track * (len(text) - 1)
    x, y = xy
    if right: x -= tot
    for c, w in zip(text, ws): d.text((x, y), c, font=font, fill=fill); x += w + track
    return tot

def cover(path, focus=(.5, .5)):
    im = Image.open(path).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    return im.crop((x, y, x + W, y + H))

def grade(im, top=0.0, bottom=0.0, left=0.0, cool=True):
    """Oscurece zonas para el texto y enfría apenas las sombras (negro azulado de la marca)."""
    a = np.asarray(im).astype(np.float32)
    yy = np.linspace(0, 1, H)[:, None]; xx = np.linspace(0, 1, W)[None, :]
    k = np.ones((H, W), np.float32)
    if top: k *= 1 - top * np.clip(1 - yy / .42, 0, 1) ** 1.4
    if bottom: k *= 1 - bottom * np.clip((yy - .62) / .38, 0, 1) ** 1.3
    if left: k *= 1 - left * np.clip(1 - xx / .6, 0, 1) ** 1.5
    a *= k[..., None]
    if cool:
        lum = a.mean(-1, keepdims=True)
        a += (1 - np.clip(lum / 90, 0, 1)) * np.array([-2, 0, 5], np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')

def headline(img, lines, x, y, maxw, gama_last=False, outline_first=False):
    """Titular en Bigger: todas las líneas al mismo alto de mayúscula."""
    cap = min(int(100 * maxw / bigger.word_mask(l, 100)[0].width) for l in lines)
    cap = min(cap, 250)
    gap = int(cap * .16)
    for i, ln in enumerate(lines):
        m, k = bigger.word_mask(ln, cap)
        top = round((bigger.glifos.TOP - 785) * k)
        yy = y + i * (cap + gap) - top
        if outline_first and i == 0:
            edge = Image.fromarray(np.clip(np.asarray(m, np.int16) - np.asarray(m.filter(ImageFilter.MinFilter(5)), np.int16), 0, 255).astype(np.uint8))
            L = Image.new('RGBA', m.size, WHITE + (0,)); L.putalpha(edge)
        elif gama_last and i == len(lines) - 1:
            L = Image.fromarray(gama_h(m.width, m.height)).convert('RGBA'); L.putalpha(m)
        else:
            L = Image.new('RGBA', m.size, WHITE + (0,)); L.putalpha(m)
        img.alpha_composite(L, (x, yy))
    return y + len(lines) * (cap + gap) - gap

G46 = Image.open(io.BytesIO(cairosvg.svg2png(url=REPO + '/brand/logo/gize-monograma.svg', output_width=46))).convert('RGBA')
def foot(img, d, right_text='gize.ar'):
    img.alpha_composite(G46, (M, H - M - 46))
    tracked(d, (W - M, H - M - 32), right_text.upper(), F(500, 20), GREY, 4, right=True)

def save(img, n): img.convert('RGB').save(os.path.join(OUT, f'ad-{n}.jpg'), quality=95, subsampling=0)

# ---------- 1 · piernas en movimiento (8) ----------
img = grade(cover(os.path.join(IMG, '8.webp'), (.5, .45)), top=.55, bottom=.55)
d = ImageDraw.Draw(img)
y = headline(img, ['SIN PAUSA'], M, 104, W - 2 * M)
tracked(d, (M, y + 30), 'CADA SERIE QUEDA REGISTRADA.', F(500, 24), WHITE, 5)
# serie anotada, en tipografía
R = W - M; by = H - M - 330
tracked(d, (R, by), 'SENTADILLA BÚLGARA  ·  SERIE 3', F(600, 19), GREY, 5, right=True)
num = '24 kg × 10'; fN = F(200, 120); nb = d.textbbox((0, 0), num, font=fN)
d.text((R - (nb[2] - nb[0]) - nb[0], by + 34), num, font=fN, fill=WHITE)
cy = by + 34 + nb[3] + 20
line(img, R - (nb[2] - nb[0]), cy, nb[2] - nb[0])
ok = 'SERIE HECHA'; tw = tracked(d, (R, cy + 18), ok, F(600, 19), GREEN, 5, right=True)
d.ellipse((R - tw - 22, cy + 23, R - tw - 12, cy + 33), fill=GREEN)
foot(img, d); save(img, 1)

# ---------- 2 · remo, blanco y negro (9) ----------
img = grade(cover(os.path.join(IMG, '9.webp'), (.5, .3)), top=.35, bottom=.6)
d = ImageDraw.Draw(img)
y = headline(img, ['CADA SERIE', 'CUENTA'], M, 104, 700, gama_last=True)
# la vez pasada → hoy
by = H - M - 300
tracked(d, (M, by), 'REMO CON MANCUERNA', F(600, 19), GREY, 5)
d.text((M, by + 40), 'La vez pasada', font=F(400, 30), fill=GREY)
d.text((M, by + 80), '32 kg × 10', font=F(300, 64), fill=GREY)
d.text((M + 540, by + 40), 'Hoy', font=F(400, 30), fill=WHITE)
d.text((M + 540, by + 80), '34 kg × 10', font=F(300, 64), fill=WHITE)
ax = M + 420; ay = by + 120
d.line((ax, ay, ax + 50, ay), fill=BLUE, width=3); d.line((ax + 36, ay - 12, ax + 50, ay, ax + 36, ay + 12), fill=BLUE, width=3, joint='curve')
line(img, M, by + 180, W - 2 * M, alpha=160)
foot(img, d); save(img, 2)

# ---------- 3 · silueta con magnesio (10) ----------
img = grade(cover(os.path.join(IMG, '10.webp'), (.5, .25)), top=.5, bottom=.7)
d = ImageDraw.Draw(img)
y = headline(img, ['ENERGIZE'], M, 104, W - 2 * M)
tracked(d, (M, y + 30), 'LA ENERGÍA LA PONÉS VOS. EL PLAN, TU COACH.', F(500, 22), WHITE, 4)
# mensaje del coach, en tipografía
by = H - M - 280
d.ellipse((M, by + 8, M + 10, by + 18), fill=BLUE)
tracked(d, (M + 22, by), 'MENSAJE DE TU COACH  ·  AHORA', F(600, 19), GREY, 5)
d.text((M, by + 42), '“Hoy subís 2,5 kg', font=F(300, 62), fill=WHITE)
d.text((M, by + 116), 'en la sentadilla. Vamos.”', font=F(300, 62), fill=WHITE)
line(img, M, by + 210, 160)
foot(img, d); save(img, 3)

# ---------- 4 · peso muerto (11) ----------
img = grade(cover(os.path.join(IMG, '11.webp'), (.5, .45)), top=.15, bottom=.9)
d = ImageDraw.Draw(img)
y = headline(img, ['TU PROGRESO', 'EN DATOS'], M, 104, 620, gama_last=True)
# mini gráfico de evolución, sin cifras de resultado
by = H - M - 300; gw, gh = W - 2 * M, 150
tracked(d, (M, by), 'PESO MUERTO  ·  EVOLUCIÓN DE CARGAS', F(600, 19), GREY, 5)
pts = [(0, .15), (.14, .22), (.28, .2), (.42, .38), (.57, .45), (.71, .52), (.85, .66), (1, .8)]
P = [(M + int(px * gw), by + 40 + gh - int(py * gh)) for px, py in pts]
sub = 4
base = Image.new('RGBA', (gw * sub, (gh + 60) * sub), (0, 0, 0, 0)); bd = ImageDraw.Draw(base)
Q = [((x - M) * sub, (y - by - 20) * sub) for x, y in P]
bd.polygon(Q + [(Q[-1][0], (gh + 40) * sub), (Q[0][0], (gh + 40) * sub)], fill=(47, 160, 255, 40))
bd.line(Q, fill=(47, 160, 255, 255), width=4 * sub, joint='curve')
for q in Q: bd.ellipse((q[0] - 7 * sub, q[1] - 7 * sub, q[0] + 7 * sub, q[1] + 7 * sub), fill=(255, 255, 255, 255))
img.alpha_composite(base.resize((gw, gh + 60), Image.LANCZOS), (M, by + 20))
line(img, M, by + 40 + gh + 24, gw, alpha=120)
tracked(d, (M, by + 40 + gh + 40), 'SEM 1', F(500, 18), GREY, 3); tracked(d, (W - M, by + 40 + gh + 40), 'SEM 8', F(500, 18), GREY, 3, right=True)
foot(img, d); save(img, 4)

# ---------- 5 · pasillo oscuro, foto horizontal entera (12) ----------
img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
ph = Image.open(os.path.join(IMG, '12.png')).convert('RGB')          # 1080×720, sin recortar
pa = np.asarray(ph).astype(np.float32)
fade = np.ones((720, 1), np.float32)
fade[:90, 0] = np.linspace(0, 1, 90) ** 1.5; fade[-160:, 0] = np.linspace(1, 0, 160) ** 1.2
pa *= fade[..., None]
img.alpha_composite(Image.fromarray(pa.astype(np.uint8)).convert('RGBA'), (0, 300))
d = ImageDraw.Draw(img)
y = headline(img, ['TU COACH', 'TE GUIA'], M, 104, 560, gama_last=True)
by = 1050
d.text((M, by), 'Tu coach arma el plan.', font=F(300, 52), fill=WHITE)
d.text((M, by + 64), 'Vos lo entrenás desde el celular.', font=F(300, 52), fill=GREY)
tracked(d, (M, by + 150), 'GRATIS PARA ALUMNOS  ·  GIZE.AR', F(600, 20), BLUE, 5)
foot(img, d, 'Pronto en Google Play'); save(img, 5)

# lámina de la serie
sheet = Image.new('RGB', (5 * 324 + 4 * 6, 405), (12, 16, 22))
for i in range(5):
    sheet.paste(Image.open(os.path.join(OUT, f'ad-{i + 1}.jpg')).resize((324, 405), Image.LANCZOS), (i * 330, 0))
sheet.save(os.path.join(OUT, 'serie.png'))
print('ok')
