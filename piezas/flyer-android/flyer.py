"""GIZE · flyer 'Llegamos a Android · 10.10'. Post 4:5 (1080×1350) e historia (1080×1920)."""
import os, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import cairosvg

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
APP = os.path.join(HERE, 'app_home.png')
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)

GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
TEXT, TEXT2, BLUE = (255, 255, 255), (143, 152, 166), (47, 160, 255)
SURF, BORDER = (11, 13, 17), (28, 32, 41)
F = lambda f, s: ImageFont.truetype(os.path.join(HERE, '../triptico-energize/fonts', f), s)

def to_img(a): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def gama_h(w, h, stops=GAMA):
    x = np.linspace(0, 1, w); p = x * (len(stops) - 1)
    i0 = np.minimum(p.astype(int), len(stops) - 2); fr = (p - i0)[:, None]
    st = np.array(stops, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0)

def svg(name, width):
    png = cairosvg.svg2png(url=os.path.join(REPO, 'brand/logo', name), output_width=width)
    return Image.open(io.BytesIO(png)).convert('RGBA')

def rounded_mask(w, h, r, ss=3):
    m = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), r * ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def ring_gradient(w, h, cx, cy):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    a = (np.arctan2(y - cy, x - cx) / (2 * np.pi)) % 1.0
    st = np.array(GAMA + [GAMA[0]], np.float32)
    idx = a * 4; i0 = np.floor(idx).astype(int); fr = (idx - i0)[..., None]
    return st[i0] * (1 - fr) + st[np.minimum(i0 + 1, 4)] * fr

def background(W, H, line_y):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    c = np.zeros((H, W, 3), np.float32)
    def blob(cx, cy, r, col, k):
        g = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r)))
        return g[..., None] * np.array(col, np.float32) * k
    aur = (blob(W * .08, line_y * .50, W * .36, GAMA[0], .20) + blob(W * .92, line_y * .40, W * .34, GAMA[1], .15) +
           blob(W * .12, line_y + H * .30, W * .34, GAMA[3], .09) + blob(W * .90, line_y + H * .26, W * .36, GAMA[2], .11))
    c = 255 - (255 - c) * (1 - aur / 255)
    # piso: luz fría y baja debajo del filete
    step = 1 / (1 + np.exp(np.clip(-(yy - line_y) / 6, -50, 50)))
    floor = np.exp(-((yy - (line_y + 40)) / (H * .14)) ** 2) * step
    c += floor[..., None] * np.array([16, 19, 24], np.float32)
    v = .45 + .55 * np.sin(np.clip(yy / H, 0, 1) * np.pi) ** .6
    return to_img(c * v[..., None]).convert('RGBA')

def neon_text(text, font, stops=GAMA[:3]):
    """Texto como tubo de neón con la gama (mismo tratamiento que ENER del tríptico)."""
    d = ImageDraw.Draw(Image.new('L', (1, 1)))
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    P = 90
    w, h = r - l + 2 * P, b - t + 2 * P
    alpha = Image.new('L', (w, h), 0)
    ImageDraw.Draw(alpha).text((P - l, P - t), text, font=font, fill=255)
    inner = alpha.filter(ImageFilter.MinFilter(11))
    edge = ImageChops.subtract(alpha, inner)
    col = to_img(gama_h(w, h, stops))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    g = col.convert('RGBA'); g.putalpha(edge.filter(ImageFilter.GaussianBlur(22)).point(lambda v: min(255, int(v * 2.6))))
    fill = col.convert('RGBA'); fill.putalpha(inner.point(lambda v: int(v * .10)))
    tube = col.convert('RGBA'); tube.putalpha(edge)
    core = Image.new('RGBA', (w, h), (255, 255, 255, 0)); core.putalpha(edge.filter(ImageFilter.MinFilter(5)).point(lambda v: int(v * .75)))
    for L in (g, fill, tube, core): out.alpha_composite(L)
    return out, P, (b - t)            # imagen, margen, alto real del texto

def phone(width):
    """Teléfono con borde RGB mostrando la pantalla de entreno de la app."""
    shot = Image.open(APP).convert('RGB').crop((0, 38, 384, 832))
    s = width / 384
    cw, ch = width, round(794 * s)
    shot = shot.resize((cw, ch), Image.LANCZOS)
    bz = 12; pw, ph = cw + 2 * bz, ch + 2 * bz; pad = 90
    L = Image.new('RGBA', (pw + 2 * pad, ph + 2 * pad), (0, 0, 0, 0))
    grad = ring_gradient(*L.size, L.size[0] / 2, L.size[1] / 2)
    outer = Image.new('L', L.size, 0); outer.paste(rounded_mask(pw + 4, ph + 4, 62), (pad - 2, pad - 2))
    inner = Image.new('L', L.size, 0); inner.paste(rounded_mask(pw, ph, 60), (pad, pad))
    ring_a = ImageChops.subtract(outer, inner)
    rgb = to_img(grad)
    glow = rgb.convert('RGBA'); glow.putalpha(ring_a.filter(ImageFilter.GaussianBlur(30)).point(lambda v: min(255, int(v * 2.2))))
    L.alpha_composite(glow)
    body = Image.new('RGBA', (pw, ph), SURF + (255,)); body.putalpha(rounded_mask(pw, ph, 60))
    L.alpha_composite(body, (pad, pad))
    sc = shot.convert('RGBA'); sc.putalpha(rounded_mask(cw, ch, 50))
    L.alpha_composite(sc, (pad + bz, pad + bz))
    ring = rgb.convert('RGBA'); ring.putalpha(ring_a); L.alpha_composite(ring)
    return L, pad

def fade_bottom(img, start, end):
    """Desvanece hacia negro desde y=start hasta y=end (para que el teléfono 'salga' del borde)."""
    a = np.asarray(img).astype(np.float32)
    H = a.shape[0]; y = np.arange(H)[:, None]
    k = np.clip(1 - (y - start) / max(end - start, 1), 0, 1) ** 1.4
    a[..., :3] *= k[..., None]
    return Image.fromarray(a.astype(np.uint8))

def centered(img, text, font, cy, fill, shadow=True):
    d = ImageDraw.Draw(img)
    w = d.textlength(text, font=font)
    x = (img.width - w) / 2
    if shadow:
        sh = Image.new('L', img.size, 0)
        ImageDraw.Draw(sh).text((x, cy), text, font=font, fill=255)
        sh = sh.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * .7))
        dk = Image.new('RGBA', img.size, (0, 0, 0, 255)); dk.putalpha(sh); img.alpha_composite(dk)
    ImageDraw.Draw(img).text((x, cy), text, font=font, fill=fill)

def rgb_line(img, y, x0, x1):
    w = x1 - x0
    line = to_img(gama_h(w, 3)).convert('RGBA')
    glow = to_img(gama_h(w, 40)).convert('RGBA')
    ga = np.exp(-((np.arange(40) - 20) / 7.0) ** 2)[:, None] * np.ones((1, w)) * 140
    # que el filete se apague en las puntas
    tip = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / 160, 0, 1)[None]
    glow.putalpha(to_img(ga * tip).convert('L'))
    line.putalpha(to_img(np.ones((3, w)) * 255 * tip).convert('L'))
    img.alpha_composite(glow, (x0, y - 19)); img.alpha_composite(line, (x0, y))

def build(W, H, story=False):
    s = 1.0
    if story:
        firma_y, kick_y, date_top, line_y = 250, 400, 470, 900
        head_y, sub_y, phone_y, phone_w = 960, 1062, 1170, 560
    else:
        firma_y, kick_y, date_top, line_y = 92, 212, 262, 640
        head_y, sub_y, phone_y, phone_w = 690, 786, 880, 520
    img = background(W, H, line_y)

    firma = svg('gize-firma-horizontal.svg', 300)
    img.alpha_composite(firma, ((W - firma.width) // 2, firma_y))

    fk = F('JetBrainsMono-Bold.ttf', 28)
    d = ImageDraw.Draw(img)
    k = 'LANZAMIENTO · OCTUBRE 2026'
    d.text(((W - d.textlength(k, font=fk)) / 2, kick_y), k, font=fk, fill=BLUE)

    # 10.10 en neón, apoyado sobre el filete
    fdate = F('Outfit-Bold.ttf', 330)
    neon, P, th = neon_text('10.10', fdate)
    x = (W - neon.width) // 2
    y = line_y - (neon.height - P)            # base del texto sobre el filete
    img.alpha_composite(neon, (x, y + 6))
    # reflejo en el piso
    ref = neon.transpose(Image.FLIP_TOP_BOTTOM).crop((0, P, neon.width, P + 150)).filter(ImageFilter.GaussianBlur(4))
    fa = np.linspace(.22, 0, 150)[:, None] * np.asarray(ref.getchannel('A'), np.float32)
    ref.putalpha(to_img(fa).convert('L'))
    img.alpha_composite(ref, (x, line_y + 8))
    rgb_line(img, line_y, 90, W - 90)

    # teléfono que asoma desde abajo
    ph, pad = phone(phone_w)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    layer.alpha_composite(ph, ((W - ph.width) // 2, phone_y - pad))
    img.alpha_composite(layer)
    img = fade_bottom(img.convert('RGB'), H - (260 if story else 230), H).convert('RGBA')

    centered(img, 'Llegamos a Android.', F('Outfit-Bold.ttf', 84), head_y, TEXT)
    centered(img, 'El 10 de octubre, tu entrenamiento en tu celular.', F('Outfit-Regular.ttf', 38), sub_y, TEXT2)
    return img.convert('RGB')

post = build(1080, 1350)
post.save(os.path.join(OUT, 'flyer-android-post-1080x1350.jpg'), quality=95, subsampling=0)
story = build(1080, 1920, story=True)
story.save(os.path.join(OUT, 'flyer-android-historia-1080x1920.jpg'), quality=95, subsampling=0)
print('ok')
