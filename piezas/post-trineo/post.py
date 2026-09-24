"""GIZE · post 4:5: ENERGIZE con estela de movimiento sobre la foto del trineo + la barra de descanso de la app."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
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
SURF, SURF2, BORDER = (11, 13, 17), (18, 21, 27), (28, 32, 41)

def rounded_mask(w, h, r, ss=3):
    m = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), r * ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def gama_h(w, h, stops=GAMA):
    x = np.linspace(0, 1, w); p = x * (len(stops) - 1)
    i0 = np.minimum(p.astype(int), len(stops) - 2); fr = (p - i0)[:, None]
    st = np.array(stops, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

# ---------- foto (cubre 1080×1350) ----------
src = Image.open(FOTO).convert('RGB')
s = max(W / src.width, H / src.height)
big = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
ox = (big.width - W) // 2
img = big.crop((ox, 0, ox + W, H))
a = np.asarray(img).astype(np.float32)
yy = np.arange(H)[:, None, None].astype(np.float32)
# techo más oscuro para que la palabra respire; piso apenas más oscuro para la barra
xx = np.arange(W)[None, :, None].astype(np.float32)
# techo: las luces de arriba a la izquierda se apagan bastante
a *= (0.30 + 0.70 * np.clip((yy - 80) / 420, 0, 1) ** 1.2) * (0.75 + 0.25 * np.clip(xx / 700, 0, 1)) ** (1 - np.clip((yy - 80) / 420, 0, 1))
a *= (1 - 0.35 * np.clip((yy - 1080) / 270, 0, 1))
img = Image.fromarray(a.astype(np.uint8)).convert('RGBA')

# ---------- ENERGIZE con estela (el atleta empuja hacia la derecha) ----------
M = 58
word, k = glifos.word_image('ENERGIZE', 100)
CAP = round(100 * (W - 2 * M) / word.width)
word, k = glifos.word_image('ENERGIZE', CAP)
pad_top = round((glifos.TOP - 785) * k)
wy = 118 - pad_top
# estela: copias corridas hacia atrás (izquierda), cada vez más tenues y estiradas
alpha = word.getchannel('A')
for i, (dx, op) in enumerate([(-96, .05), (-58, .09), (-26, .14)]):
    ghost = Image.new('RGBA', word.size, (255, 255, 255, 0))
    ga = alpha.filter(ImageFilter.BoxBlur(3 + i)).point(lambda v, op=op: int(v * op))
    ghost.putalpha(ga)
    img.alpha_composite(ghost, (M + dx, wy))
# la palabra: blanco, con ENER un poco más tenue que GIZE (el nombre sale de energize)
ener_w = glifos.word_image('ENER', CAP)[0].width + round(23.5 * k)
solid = word.copy()
sa = np.asarray(alpha).astype(np.float32)
sa[:, :ener_w] *= 1.0
solid.putalpha(Image.fromarray(sa.astype(np.uint8)))
img.alpha_composite(solid, (M, wy))

# filete RGB bajo la palabra y el texto
ly = wy + pad_top + CAP + 30
line = Image.fromarray(gama_h(W - 2 * M, 2)).convert('RGBA')
img.alpha_composite(line, (M, ly))
d = ImageDraw.Draw(img)
f_t = F('Outfit-Bold.ttf', 40)
d.text((M, ly + 24), 'Empujá. Registrá. Repetí.', font=f_t, fill=TEXT)
f_s = F('Outfit-Regular.ttf', 30)
d.text((M, ly + 76), 'Tu coach ve cada serie.', font=f_s, fill=TEXT2)

# ---------- barra de descanso de la app ----------
bw, bh = 440, 176
bx, by = W - M - bw, H - 64 - bh
bar = Image.new('RGBA', (bw, bh), SURF + (240,))
bar.putalpha(rounded_mask(bw, bh, 24).point(lambda v: int(v * 240 / 255)))
bd = ImageDraw.Draw(bar)
bd.rounded_rectangle((0, 0, bw - 1, bh - 1), 24, outline=BORDER, width=2)
bd.text((26, 24), 'EMPUJE DE TRINEO · SERIE 2 DE 4', font=F('JetBrainsMono-Bold.ttf', 18), fill=TEXT2)
bd.text((26, 58), 'Descanso', font=F('Outfit-Regular.ttf', 30), fill=TEXT2)
tf = F('JetBrainsMono-Bold.ttf', 56)
bd.text((160, 48), '01:12', font=tf, fill=TEXT)
# botón saltar (x)
cx0, cy0 = bw - 26 - 50, 54
bd.rounded_rectangle((cx0, cy0, cx0 + 50, cy0 + 50), 25, fill=SURF2, outline=BORDER, width=2)
for s_ in (1, -1):
    bd.line([(cx0 + 17, cy0 + 25 - 8 * s_), (cx0 + 33, cy0 + 25 + 8 * s_)], fill=TEXT2, width=4)
# progreso (40 %) con la gama
tw_, th_ = bw - 52, 8
bd.rounded_rectangle((26, 138, 26 + tw_, 138 + th_), 4, fill=SURF2)
pw = int(tw_ * .40)
prog = Image.fromarray(gama_h(tw_, th_)).crop((0, 0, pw, th_)).convert('RGBA')
prog.putalpha(rounded_mask(pw, th_, 4))
bar.alpha_composite(prog, (26, 138))
# sombra
sh = Image.new('L', (W, H), 0); sh.paste(rounded_mask(bw, bh, 24), (bx, by + 12))
dark = Image.new('RGBA', (W, H), (0, 0, 0, 255)); dark.putalpha(sh.filter(ImageFilter.GaussianBlur(24)).point(lambda v: int(v * .6)))
img.alpha_composite(dark)
img.alpha_composite(bar, (bx, by))

img.convert('RGB').save(os.path.join(OUT, 'post-trineo-1080x1350.jpg'), quality=95, subsampling=0)
print('ok', CAP)
