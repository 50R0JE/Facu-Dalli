"""GIZE · tríptico para la grilla de Instagram: ENER | barra bajo el foco | GIZE.
Una sola imagen de 3240×1440 que se corta en tres posts de 1080×1440 (3:4)."""
import os, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import cairosvg
import glifos

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
FOTO = os.path.join(HERE, 'foto.webp')
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)

TW, TH = 1080, 1440
CW, CH = TW * 3, TH
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
TEXT, TEXT2 = (255, 255, 255), (143, 152, 166)
FONT = lambda f, s: ImageFont.truetype(os.path.join(HERE, 'fonts', f), s)

FLOOR_ORIG = 876          # y donde apoyan los discos en la foto original
Y_LINE = 1062             # piso común de las tres piezas
CAP = 452                 # altura de mayúscula de ENER y GIZE

def gama_h(w, h, stops=GAMA):
    x = np.linspace(0, 1, w)
    p = x * (len(stops) - 1); i0 = np.minimum(p.astype(int), len(stops) - 2); fr = (p - i0)[:, None]
    st = np.array(stops, np.float32)
    row = st[i0] * (1 - fr) + st[i0 + 1] * fr
    return np.repeat(row[None], h, 0)

def to_img(a): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

# ---------- 1. foto al centro, extendida hacia los costados ----------
foto = Image.open(FOTO).convert('RGB')
s = TW / foto.width
big = foto.resize((TW, round(foto.height * s)), Image.LANCZOS)
c = round(FLOOR_ORIG * s) - Y_LINE
center = big.crop((0, c, TW, c + TH)).filter(ImageFilter.UnsharpMask(1.2, 50, 2))

canvas = np.zeros((CH, CW, 3), np.float32)
canvas[:, TW:2 * TW] = np.asarray(center, np.float32)

# costados: espejo de la foto, que se apaga hacia afuera (continúa el piso y el humo)
# (desenfocado y sin la parte alta, para que no se repitan el foco ni los discos)
mir = np.asarray(center.transpose(Image.FLIP_LEFT_RIGHT).filter(ImageFilter.GaussianBlur(26)), np.float32)
ramp = np.clip(np.linspace(-0.1, 1, TW), 0, 1) ** 1.8         # 0 afuera → 1 en la unión
vert = np.clip((np.arange(TH) - 260) / 420, 0, 1)[:, None] ** 1.5
m = ramp[None, :] * (.25 + .75 * vert)
# el borde de la foto se funde con el espejo en los últimos 40 px
canvas[:, :TW] = mir * m[..., None] * .85
canvas[:, 2 * TW:] = mir * m[:, ::-1][..., None] * .85


# piso: una franja de luz fría y baja que cruza las tres piezas
yy = np.arange(CH)[:, None]
floor = np.exp(-((yy - (Y_LINE + 90)) / 260.0) ** 2) * (yy > Y_LINE - 40)
canvas += floor[..., None] * np.array([26, 30, 36], np.float32) * .55

# ---------- 2. auroras de marca, suaves, en los costados ----------
def blob(cx, cy, r, col, k):
    x = np.arange(CW)[None, :]
    g = np.exp(-(((x - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r)))
    return g[..., None] * np.array(col, np.float32) * k

aur = (blob(380, 520, 420, GAMA[0], .30) + blob(820, 900, 380, GAMA[1], .20) +
       blob(2420, 880, 380, GAMA[2], .18) + blob(2860, 520, 420, GAMA[3], .22))
canvas = 255 - (255 - canvas) * (1 - aur / 255)                 # screen

# viñeta vertical para asentar arriba y abajo
v = 0.55 + 0.45 * np.sin(np.clip(yy / CH, 0, 1) * np.pi) ** .7
canvas *= v[..., None]

base = to_img(canvas).convert('RGBA')

# ---------- 3. ENER en neón (izquierda) y GIZE macizo (derecha) ----------
def place_word(word, tile, style):
    im0, k = glifos.word_image(word, CAP)
    P = 90                                                       # margen para que el brillo no se corte
    im = Image.new('RGBA', (im0.width + 2 * P, im0.height + 2 * P), (0, 0, 0, 0)); im.paste(im0, (P, P))
    alpha = im.getchannel('A')
    x = tile * TW + (TW - im0.width) // 2 - P
    base_px = round((glifos.TOP - 13) * k) + P                  # de la caja al renglón
    y = Y_LINE - base_px
    layer = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    if style == 'neon':
        inner = alpha.filter(ImageFilter.MinFilter(11))
        edge = ImageChops.subtract(alpha, inner)
        col = to_img(gama_h(im.width, im.height, GAMA[:3]))
        glow_a = edge.filter(ImageFilter.GaussianBlur(22)).point(lambda v: min(255, int(v * 2.6)))
        g = col.copy().convert('RGBA'); g.putalpha(glow_a)
        tube = col.copy().convert('RGBA'); tube.putalpha(edge)
        core = Image.new('RGBA', im.size, (255, 255, 255, 0))
        core.putalpha(edge.filter(ImageFilter.MinFilter(5)).point(lambda v: int(v * .75)))
        # un velo tenue adentro de las letras, para que no queden huecas
        fill = col.copy().convert('RGBA'); fill.putalpha(inner.point(lambda v: int(v * .10)))
        for L in (g, fill, tube, core):
            layer.alpha_composite(L, (x, y))
        refl_src = tube
    else:
        # blanco con luz que viene del foco (más claro del lado del centro)
        grad = np.linspace(1.0, .82, im.width)[None, :] * np.linspace(1.0, .86, im.height)[:, None]
        rgb = np.stack([grad * 255, grad * 255, grad * 250], -1)
        solid = to_img(rgb).convert('RGBA'); solid.putalpha(alpha)
        glow = Image.new('RGBA', im.size, (170, 190, 255, 0))
        glow.putalpha(alpha.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * .35)))
        layer.alpha_composite(glow, (x, y)); layer.alpha_composite(solid, (x, y))
        refl_src = solid
    # reflejo en el piso
    h_ref = round(CAP * .42)
    flip = refl_src.transpose(Image.FLIP_TOP_BOTTOM)
    top = flip.height - (base_px + 2)
    ref = flip.crop((0, top, flip.width, top + h_ref)).filter(ImageFilter.GaussianBlur(5))
    fade = np.linspace(.20, 0, h_ref)[:, None] * np.ones((1, ref.width))
    a = np.asarray(ref.getchannel('A'), np.float32) * fade
    ref.putalpha(to_img(a).convert('L'))
    layer.alpha_composite(ref, (x, Y_LINE + 4))
    return layer, (x + P, y + P, im0.width)

ener, box_e = place_word('ENER', 0, 'neon')
gize, box_g = place_word('GIZE', 2, 'solid')
base.alpha_composite(ener); base.alpha_composite(gize)

# ---------- 4. filete RGB del piso, continuo en las tres piezas ----------
line = to_img(gama_h(CW, 3)).convert('RGBA')
la = np.ones((3, CW), np.float32) * 255
x = np.arange(CW)
# en la pieza del medio se afina para no pisar la barra
la *= np.where((x > TW + 60) & (x < 2 * TW - 60), .35, 1.0)[None]
line.putalpha(to_img(la).convert('L'))
glow_l = to_img(gama_h(CW, 40)).convert('RGBA')
ga = np.exp(-((np.arange(40) - 20) / 7.0) ** 2)[:, None] * la[0][None] * .55
glow_l.putalpha(to_img(ga).convert('L'))
base.alpha_composite(glow_l, (0, Y_LINE - 20 + 1))
base.alpha_composite(line, (0, Y_LINE))

# ---------- 5. textos ----------
d = ImageDraw.Draw(base)
f_sub = FONT('Outfit-Regular.ttf', 46)
f_tag = FONT('Outfit-Bold.ttf', 60)
f_k = FONT('JetBrainsMono-Bold.ttf', 24)

def centered(text, font, cx, y, fill):
    # sombra difusa detrás del texto para que se lea sobre la foto
    w = d.textlength(text, font=font)
    sh = Image.new('L', (CW, CH), 0)
    ImageDraw.Draw(sh).text((cx - w / 2, y), text, font=font, fill=255)
    sh = sh.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * .8))
    dark = Image.new('RGBA', (CW, CH), (0, 0, 0, 255)); dark.putalpha(sh)
    base.alpha_composite(dark)
    ImageDraw.Draw(base).text((cx - w / 2, y), text, font=font, fill=fill)

centered('La energía la ponés vos.', f_sub, TW * .5, Y_LINE + 96, TEXT)
centered('Energizá cada serie.', f_tag, TW * 1.5, Y_LINE + 90, TEXT)
centered('El método, tu coach.', f_sub, TW * 2.5, Y_LINE + 96, TEXT)

# monograma chico abajo, en la pieza del medio
g = Image.open(io.BytesIO(cairosvg.svg2png(url=os.path.join(REPO, 'brand/logo/gize-monograma.svg'), output_width=64))).convert('RGBA')
gs = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); gsa = Image.new('L', (CW, CH), 0)
gsa.paste(g.getchannel('A'), (int(TW * 1.5 - 32), TH - 150))
gs = Image.new('RGBA', (CW, CH), (0, 0, 0, 255)); gs.putalpha(gsa.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(14)))
base.alpha_composite(gs)
base.alpha_composite(g, (int(TW * 1.5 - 32), TH - 150))

# ---------- 6. salida ----------
full = base.convert('RGB')
names = ['1-izquierda-ENER', '2-centro', '3-derecha-GIZE']
for i, n in enumerate(names):
    full.crop((i * TW, 0, (i + 1) * TW, TH)).save(os.path.join(OUT, f'post-{n}.jpg'), quality=95, subsampling=0)
print('ok', box_e, box_g)
