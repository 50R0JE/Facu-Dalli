"""GIZE · destacadas en neón: el ícono como tubo con la gama RGB, brillo y núcleo blanco."""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import destacadas as D

OUT = os.path.join(D.HERE, 'salida-neon')
os.makedirs(OUT, exist_ok=True)
W, H, S = D.W, D.H, 440
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174)]

def gradient(n):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    t = np.clip((xx * .6 + yy * .4), 0, 1) * 2
    i0 = np.minimum(t.astype(int), 1); fr = (t - i0)[..., None]
    st = np.array(GAMA, np.float32)
    return Image.fromarray((st[i0] * (1 - fr) + st[i0 + 1] * fr).astype(np.uint8))

def neon(alpha):
    n = alpha.width; col = gradient(n)
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    wide = alpha.filter(ImageFilter.GaussianBlur(26)).point(lambda v: min(255, int(v * 2.4)))
    mid = alpha.filter(ImageFilter.GaussianBlur(8)).point(lambda v: min(255, int(v * 1.8)))
    for a in (wide, mid):
        g = col.convert('RGBA'); g.putalpha(a); out.alpha_composite(g)
    tube = col.convert('RGBA'); tube.putalpha(alpha); out.alpha_composite(tube)
    core = Image.new('RGBA', (n, n), (255, 255, 255, 0))
    core.putalpha(alpha.filter(ImageFilter.MinFilter(15)).filter(ImageFilter.GaussianBlur(2)).point(lambda v: int(v * .8))); out.alpha_composite(core)
    return out

bg = Image.new('RGBA', (W, H), (4, 5, 8, 255))
P = 120                                          # margen para que el brillo no se corte
for name in D.ORDER:
    img = bg.copy()
    if name == 'gize':
        arc = D.svg_img(open(D.REPO + '/brand/logo/gize-monograma.svg').read().replace('<circle', '<circle opacity="0"'), S)
        dot = D.svg_img(open(D.REPO + '/brand/logo/gize-monograma.svg').read().replace('stroke="#FFFFFF"', 'stroke="none"'), S)
        a = Image.new('L', (S + 2 * P, S + 2 * P), 0); a.paste(arc.getchannel('A'), (P, P))
        L = neon(a)
        # el punto queda azul, con su propio brillo
        da = Image.new('L', a.size, 0); da.paste(dot.getchannel('A'), (P, P))
        g = Image.new('RGBA', a.size, (47, 160, 255, 0)); g.putalpha(da.filter(ImageFilter.GaussianBlur(18)).point(lambda v: min(255, v * 2))); L.alpha_composite(g)
        dd = Image.new('RGBA', a.size, (47, 160, 255, 0)); dd.putalpha(da); L.alpha_composite(dd)
    else:
        ic = D.svg_img(f'<svg xmlns="http://www.w3.org/2000/svg" {D.ATTR}>{D.ICONS[name]}</svg>', S)
        a = Image.new('L', (S + 2 * P, S + 2 * P), 0); a.paste(ic.getchannel('A'), (P, P))
        L = neon(a)
    img.alpha_composite(L, ((W - L.width) // 2, (H - L.height) // 2))
    img = img.convert('RGB')
    img.save(os.path.join(OUT, f'destacada-{name}.png'))
    img.crop((0, (H - W) // 2, W, (H + W) // 2)).save(os.path.join(OUT, f'destacada-{name}-1080.png'))

from PIL import ImageFont
F = ImageFont.truetype(os.path.join(D.HERE, '..', 'triptico-energize', 'fonts', 'Outfit-Regular.ttf'), 22)
d_, gap = 128, 34
prev = Image.new('RGB', (len(D.ORDER) * (d_ + gap) + gap, 230), (12, 16, 22)); pd = ImageDraw.Draw(prev)
for i, name in enumerate(D.ORDER):
    x = gap + i * (d_ + gap); y = 30
    sq = Image.open(os.path.join(OUT, f'destacada-{name}-1080.png')).resize((d_, d_), Image.LANCZOS)
    m = Image.new('L', (d_ * 4, d_ * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, d_ * 4 - 1, d_ * 4 - 1), fill=255)
    prev.paste(sq, (x, y), m.resize((d_, d_), Image.LANCZOS))
    pd.ellipse((x - 5, y - 5, x + d_ + 4, y + d_ + 4), outline=(60, 66, 78), width=2)
    tw = pd.textlength(D.LAB[name], font=F); pd.text((x + (d_ - tw) / 2, y + d_ + 16), D.LAB[name], font=F, fill=(230, 232, 236))
prev.save(os.path.join(OUT, 'vista-perfil.png'))
print('ok')
