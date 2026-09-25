"""GIZE · foto de perfil de Instagram (1080×1080, se ve en círculo).
Tres variantes + una lámina que las muestra al tamaño real del perfil."""
import os, io
import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)
S = 1080
SS = 2                                   # supermuestreo
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
BLUE = '#2FA0FF'

def mono(size, stroke='#FFFFFF', dot=BLUE, dot_only=False, arc_only=False):
    arc = '' if dot_only else f'<path d="M81.53,62.74 A34,34 0 1 1 67,20.55" fill="none" stroke="{stroke}" stroke-width="20" stroke-linecap="round"/>'
    c = '' if arc_only else f'<circle cx="60.5" cy="50" r="9.5" fill="{dot}"/>'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{arc}{c}</svg>'
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size))).convert('RGBA')

def optical_offset(im):
    """Corrimiento para centrar la G a ojo: promedio entre el centro de la caja y el centro de masa."""
    a = np.asarray(im.getchannel('A')).astype(np.float32)
    ys, xs = np.nonzero(a > 10)
    bx, by = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    w = a / a.sum(); cy, cx = (np.indices(a.shape) * w[None]).sum((1, 2))
    ox, oy = (bx + cx) / 2, (by + cy) / 2
    return im.width / 2 - ox, im.height / 2 - oy

def radial(n, cx, cy, r):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    return np.clip(1 - np.hypot(xx - cx, yy - cy) / r, 0, 1)

def aurora_bg(n, k=1.0):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    acc = np.zeros((n, n, 3), np.float32)
    for (cx, cy, r, col, w) in [(.18, .20, .42, GAMA[0], .55), (.85, .30, .40, GAMA[1], .40),
                                (.80, .88, .42, GAMA[2], .38), (.15, .85, .40, GAMA[3], .30)]:
        g = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r)))
        acc = 1 - (1 - acc) * (1 - g[..., None] * np.array(col, np.float32) / 255 * w * k)
    return acc * 255

def compose(kind):
    n = S * SS
    G_SIZE = int(n * .60)                       # la G ocupa el 60 % del círculo: entra en el 70 % seguro
    g = mono(G_SIZE)
    ox, oy = optical_offset(g)
    gx, gy = int((n - G_SIZE) / 2 + ox), int((n - G_SIZE) / 2 + oy)
    # posición del punto en el lienzo (para su brillo)
    dcx, dcy = gx + G_SIZE * .605, gy + G_SIZE * .50
    dot_r = G_SIZE * .095

    if kind == 'punto':
        bg = np.zeros((n, n, 3), np.float32)
        bg += radial(n, n / 2, n * .42, n * .75)[..., None] ** 2 * np.array([10, 16, 30], np.float32)
    elif kind == 'aurora':
        bg = aurora_bg(n, .70) * (.35 + .65 * radial(n, n / 2, n / 2, n * .9)[..., None] ** .4) * .80
    else:  # 'relieve'
        bg = aurora_bg(n, .30) * .6
        bg += radial(n, n / 2, n * .45, n * .7)[..., None] ** 2 * np.array([12, 16, 26], np.float32)
    img = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).convert('RGBA')

    # brillo del punto: la energía sale del centro de la G
    glow = radial(n, dcx, dcy, dot_r * (5.2 if kind != 'aurora' else 4.2)) ** 2.4
    gl = Image.new('RGBA', (n, n), (47, 160, 255, 0))
    gl.putalpha(Image.fromarray((glow * (170 if kind == 'punto' else 120)).astype(np.uint8)))
    img.alpha_composite(gl)

    if kind == 'relieve':
        # arco con luz de arriba y sombra suave
        arc = mono(G_SIZE, arc_only=True)
        a = arc.getchannel('A')
        grad = np.linspace(1.0, .80, G_SIZE)[:, None] * np.ones((1, G_SIZE))
        rgb = np.stack([grad * 255, grad * 255, grad * 250], -1).astype(np.uint8)
        lit = Image.fromarray(rgb).convert('RGBA'); lit.putalpha(a)
        sh = Image.new('RGBA', (n, n), (0, 0, 0, 0)); sa = Image.new('L', (n, n), 0)
        sa.paste(a, (gx, gy + int(n * .018)))
        sh.putalpha(sa.filter(ImageFilter.GaussianBlur(n * .02)).point(lambda v: int(v * .55)))
        img.alpha_composite(sh)
        img.alpha_composite(lit, (gx, gy))
        img.alpha_composite(mono(G_SIZE, dot_only=True), (gx, gy))
    else:
        img.alpha_composite(g, (gx, gy))
    # núcleo del punto un poco más claro (se siente encendido)
    core = radial(n, dcx - dot_r * .25, dcy - dot_r * .25, dot_r * .75) ** 2
    cl = Image.new('RGBA', (n, n), (190, 228, 255, 0)); cl.putalpha(Image.fromarray((core * 150).astype(np.uint8)))
    img.alpha_composite(cl)
    return img.resize((S, S), Image.LANCZOS).convert('RGB')

def circle(im, d):
    m = Image.new('L', (d * 4, d * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    c = im.resize((d, d), Image.LANCZOS).convert('RGBA'); c.putalpha(m.resize((d, d), Image.LANCZOS)); return c

variants = {k: compose(k) for k in ('aurora', 'punto')}
for k, im in variants.items():
    im.save(os.path.join(OUT, f'perfil-{k}-1080.png'))

# lámina: cada variante a 3 tamaños (perfil grande, feed, comentarios) sobre fondo oscuro y claro
f = ImageFont.truetype(os.path.join(HERE, '..', 'triptico-energize', 'fonts', 'Outfit-Regular.ttf'), 26)
sheet = Image.new('RGB', (2 * 520, 2 * 420), (0, 0, 0))
for col, (k, im) in enumerate(variants.items()):
    for row, bgc in enumerate([(12, 16, 22), (255, 255, 255)]):
        x0, y0 = col * 520, row * 420
        ImageDraw.Draw(sheet).rectangle((x0, y0, x0 + 519, y0 + 419), fill=bgc)
        sheet.paste(big := circle(im, 250), (x0 + 30, y0 + 60), big)
        sheet.paste(mid := circle(im, 110), (x0 + 310, y0 + 80), mid)
        sheet.paste(sm := circle(im, 40), (x0 + 440, y0 + 115), sm)
        ImageDraw.Draw(sheet).text((x0 + 30, y0 + 340), k, font=f, fill=(150, 158, 170))
sheet.save(os.path.join(OUT, 'comparacion.png'))
print('ok')
