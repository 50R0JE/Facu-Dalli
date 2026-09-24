"""GIZE · post 4:5 del trineo, versión editorial.
Arriba ENER (contorno) + GIZE (macizo) en Bigger Display. Abajo a la derecha, el descanso de la
app convertido en tipografía: número grande en Outfit ExtraLight, etiqueta espaciada y un
filete de progreso con la gama. Nada de tarjetas ni capturas."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'triptico-energize'))
import glifos

HERE = os.path.dirname(os.path.abspath(__file__))
FOTO = os.path.join(HERE, 'foto.webp')
FONTS = os.path.join(HERE, '..', 'triptico-energize', 'fonts')
OUT = os.path.join(HERE, 'salida')
REPO = os.path.abspath(os.path.join(HERE, '../..'))
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1350
M = 64                                            # margen de la grilla
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
WHITE, GREY = (255, 255, 255), (150, 158, 170)

def font(weight, size):
    files = {200: 'outfit-latin-200-normal.woff', 300: 'outfit-latin-300-normal.woff',
             500: 'outfit-latin-500-normal.woff', 600: 'outfit-latin-600-normal.woff'}
    return ImageFont.truetype(os.path.join(FONTS, files[weight]), size)

def gama_h(w, h):
    x = np.linspace(0, 1, w); p = x * 3; i0 = np.minimum(p.astype(int), 2); fr = (p - i0)[:, None]
    st = np.array(GAMA, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

def tracked(d, xy, text, fnt, fill, track, anchor_right=False):
    """Texto con espaciado entre letras (tracking) en px."""
    widths = [d.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + track * (len(text) - 1)
    x, y = xy
    if anchor_right: x -= total
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=fnt, fill=fill); x += w + track
    return total

# ---------- foto: cubrir 4:5 y trabajar la luz ----------
src = Image.open(FOTO).convert('RGB')
s = max(W / src.width, H / src.height)
big = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
ox = (big.width - W) // 2
a = np.asarray(big.crop((ox, 0, ox + W, H))).astype(np.float32)
yy = np.arange(H, dtype=np.float32)[:, None]
xx = np.arange(W, dtype=np.float32)[None, :]
top = 0.28 + 0.72 * np.clip((yy - 60) / 460, 0, 1) ** 1.3            # techo apagado
foot = 1 - 0.55 * np.clip((yy - 1000) / 350, 0, 1) * np.clip((xx - 480) / 420, 0, 1)   # rincón inferior derecho
a *= (top * foot)[..., None]
# leve tono frío en las sombras, para que case con el negro azulado de la marca
lum = a.mean(-1, keepdims=True)
a += (1 - np.clip(lum / 90, 0, 1)) * np.array([-2, 0, 5], np.float32)
img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')

# ---------- ENER / GIZE en una línea ----------
gap_u = 150                                       # aire entre las dos palabras, en unidades de fuente
ener0, _ = glifos.word_image('ENER', 100)
gize0, _ = glifos.word_image('GIZE', 100)
k100 = 100 / 772
total_u = (ener0.width + gize0.width) / k100 + gap_u
CAP = round((W - 2 * M) / total_u * 772)
ener, k = glifos.word_image('ENER', CAP)
gize, _ = glifos.word_image('GIZE', CAP)
pad_top = round((glifos.TOP - 785) * k)
y0 = 104 - pad_top
al = ener.getchannel('A')
edge = ImageChops.subtract(al, al.filter(ImageFilter.MinFilter(5)))
outl = Image.new('RGBA', ener.size, WHITE + (0,)); outl.putalpha(edge)
img.alpha_composite(outl, (M, y0))
img.alpha_composite(gize, (W - M - gize.width, y0))
base_y = y0 + pad_top + CAP

d = ImageDraw.Draw(img)
# bajada: una sola línea, alineada a la grilla
tag_y = base_y + 34
tracked(d, (M, tag_y), 'EMPUJÁ.  REGISTRÁ.  REPETÍ.', font(500, 24), WHITE, 5)

# ---------- descanso de la app, en tipografía ----------
R_X = W - M                                        # todo alineado al margen derecho
num_f = font(200, 188)
num = '01:12'
nb = d.textbbox((0, 0), num, font=num_f)
num_w, num_h = nb[2] - nb[0], nb[3] - nb[1]
num_y = H - M - 60 - num_h - nb[1]
lbl_y = num_y + nb[1] - 44
tracked(d, (R_X, lbl_y), 'DESCANSO', font(600, 20), GREY, 6, anchor_right=True)
# punto azul funcional delante de la etiqueta
lbl_w = tracked(ImageDraw.Draw(Image.new('L', (1, 1))), (0, 0), 'DESCANSO', font(600, 20), 0, 6)
dx = R_X - lbl_w - 20
d.ellipse((dx, lbl_y + 7, dx + 9, lbl_y + 16), fill=GAMA[0])
d.text((R_X - num_w - nb[0], num_y), num, font=num_f, fill=WHITE)

# filete de progreso: pista tenue al ancho del número, 40 % con la gama
bar_y = num_y + nb[3] + 26
bw = num_w
track_ = Image.new('RGBA', (bw, 2), (255, 255, 255, 46))
img.alpha_composite(track_, (R_X - bw, bar_y))
pw = int(bw * .40)
prog = Image.fromarray(gama_h(bw, 2)).crop((0, 0, pw, 2)).convert('RGBA')
img.alpha_composite(prog, (R_X - bw, bar_y))
# pie: serie y ejercicio, chiquito
tracked(d, (R_X, bar_y + 18), 'SERIE 2 / 4  ·  EMPUJE DE TRINEO', font(500, 17), GREY, 3, anchor_right=True)

# monograma chico abajo a la izquierda, como firma
import cairosvg, io
g = Image.open(io.BytesIO(cairosvg.svg2png(url=os.path.join(REPO, 'brand/logo/gize-monograma.svg'), output_width=46))).convert('RGBA')
foot_c = bar_y + 18 + 12                          # centro óptico del pie
img.alpha_composite(g, (M, foot_c - 23))

img.convert('RGB').save(os.path.join(OUT, 'post-trineo-1080x1350.jpg'), quality=95, subsampling=0)
print('ok', CAP)
