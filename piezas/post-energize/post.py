"""GIZE · post 4:5 minimalista: ENER/GIZE en Bigger Display sobre la foto + una tarjeta de la app."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'triptico-energize'))
import glifos

HERE = os.path.dirname(os.path.abspath(__file__))
FOTO = os.path.join(HERE, 'foto.webp')
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1350
F = lambda f, s: ImageFont.truetype(os.path.join(HERE, '..', 'triptico-energize', 'fonts', f), s)
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
TEXT, TEXT2, GREEN = (255, 255, 255), (143, 152, 166), (37, 232, 200)
SURF, BORDER = (11, 13, 17), (28, 32, 41)

def rounded_mask(w, h, r, ss=3):
    m = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), r * ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def gama_h(w, h):
    x = np.linspace(0, 1, w); p = x * 3; i0 = np.minimum(p.astype(int), 2); fr = (p - i0)[:, None]
    st = np.array(GAMA, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

# ---------- foto ----------
img = Image.open(FOTO).convert('RGB').resize((W, H), Image.LANCZOS)
a = np.asarray(img).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# oscurecer apenas arriba a la izquierda, donde va la palabra (sin tocar la mano)
shade = 1 - .35 * np.clip(1 - np.hypot(xx / 700, yy / 800), 0, 1)
a *= shade[..., None]
img = Image.fromarray(a.astype(np.uint8)).convert('RGBA')

# ---------- ENER (contorno) / GIZE (macizo) ----------
X0, CAP = 72, 246
ener, k = glifos.word_image('ENER', CAP)
gize, _ = glifos.word_image('GIZE', CAP)
pad_top = round((glifos.TOP - 785) * k)          # aire de la caja sobre la mayúscula
y1 = 96 - pad_top
y2 = y1 + CAP + 34
# contorno fino en blanco para ENER
al = ener.getchannel('A')
edge = ImageChops.subtract(al, al.filter(ImageFilter.MinFilter(5)))
ener_o = Image.new('RGBA', ener.size, (255, 255, 255, 0)); ener_o.putalpha(edge)
img.alpha_composite(ener_o, (X0, y1))
img.alpha_composite(gize, (X0, y2))

# filete RGB de 2 px bajo la palabra, al ancho de ENER
line_y = y2 + pad_top + CAP + 34
lw = ener.width
line = Image.fromarray(gama_h(lw, 2)).convert('RGBA')
img.alpha_composite(line, (X0, line_y))

d = ImageDraw.Draw(img)
d.text((X0, line_y + 22), 'La energía la ponés vos.', font=F('Outfit-Regular.ttf', 34), fill=TEXT)
d.text((X0, line_y + 64), 'El plan, tu coach.', font=F('Outfit-Regular.ttf', 34), fill=TEXT2)

# ---------- tarjeta de la app: la serie recién marcada ----------
cw, ch = 470, 190
cx, cy = X0, H - 72 - ch
card = Image.new('RGBA', (cw, ch), SURF + (236,))
card.putalpha(rounded_mask(cw, ch, 22).point(lambda v: int(v * 236 / 255)))
cd = ImageDraw.Draw(card)
cd.rounded_rectangle((0, 0, cw - 1, ch - 1), 22, outline=BORDER, width=2)
top = Image.fromarray(gama_h(cw - 44, 2)).convert('RGBA')
card.alpha_composite(top, (22, 0))
mono = F('JetBrainsMono-Bold.ttf', 20)
cd.text((28, 28), 'TRÍCEPS EN POLEA · SERIE 3', font=mono, fill=TEXT2)
num = F('JetBrainsMono-Bold.ttf', 58); unit = F('Outfit-Regular.ttf', 26)
x = 28
for t, f_, c_, dy in [('25', num, TEXT, 0), (' kg', unit, TEXT2, 28), ('  × ', unit, TEXT2, 28), ('12', num, TEXT, 0), (' reps', unit, TEXT2, 28)]:
    cd.text((x, 64 + dy), t, font=f_, fill=c_); x += cd.textlength(t, font=f_)
# tilde verde
bx, by, bs = cw - 28 - 64, 70, 64
cd.rounded_rectangle((bx, by, bx + bs, by + bs), 16, fill=GREEN)
cd.line([(bx + 17, by + 33), (bx + 28, by + 44), (bx + 48, by + 22)], fill=(0, 0, 0), width=6, joint='curve')
cd.text((28, 146), '¡Serie hecha! Tu coach ya la ve.', font=F('outfit-latin-600-normal.woff', 22), fill=GREEN)
# sombra suave debajo de la tarjeta
sh = Image.new('L', (W, H), 0); sh.paste(rounded_mask(cw, ch, 22), (cx, cy + 12))
dark = Image.new('RGBA', (W, H), (0, 0, 0, 255)); dark.putalpha(sh.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * .6)))
img.alpha_composite(dark)
img.alpha_composite(card, (cx, cy))

img.convert('RGB').save(os.path.join(OUT, 'post-energize-1080x1350.jpg'), quality=95, subsampling=0)
print('ok')
