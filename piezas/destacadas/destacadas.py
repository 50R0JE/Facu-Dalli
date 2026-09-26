"""GIZE · portadas de historias destacadas: íconos de la app en blanco, sobre negro con brillo azul.
Salen en 1080×1920 (para subir como historia) y 1080×1080 (vista previa del círculo)."""
import os, io
import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
OUT = os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
ATTR = 'viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
ICONS = {
    'coaches':   '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    'entreno':   '<path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/>',
    'comida':    '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    'progreso':  '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
    'tecnica':   '<circle cx="12" cy="12" r="9.5"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
    'novedades': '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    'preguntas': '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.5-2.8 4"/><path d="M12 17.6h.01"/>',
}
ORDER = ['gize', 'coaches', 'entreno', 'comida', 'progreso', 'tecnica', 'novedades', 'preguntas']
ICON = 400                                   # entra holgado en el círculo de la destacada

def svg_img(svg, size):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size))).convert('RGBA')

def background():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot(xx - W / 2, yy - H / 2)
    glow = np.exp(-(r / 330) ** 2)[..., None] * np.array([47, 160, 255], np.float32) * .30
    base = np.array([6, 8, 12], np.float32) * np.clip(1 - r / 1300, .4, 1)[..., None]
    return Image.fromarray(np.clip(base + glow, 0, 255).astype(np.uint8)).convert('RGBA')

BG = background()
for name in ORDER:
    img = BG.copy()
    if name == 'gize':
        ic = svg_img(open(REPO + '/brand/logo/gize-monograma.svg').read(), ICON)
    else:
        ic = svg_img(f'<svg xmlns="http://www.w3.org/2000/svg" {ATTR}>{ICONS[name]}</svg>', ICON)
    img.alpha_composite(ic, ((W - ICON) // 2, (H - ICON) // 2))
    img = img.convert('RGB')
    img.save(os.path.join(OUT, f'destacada-{name}.png'))
    img.crop((0, (H - W) // 2, W, (H + W) // 2)).save(os.path.join(OUT, f'destacada-{name}-1080.png'))

# vista previa: la fila de destacadas como se ve en el perfil (modo oscuro)
F = ImageFont.truetype(os.path.join(HERE, '..', 'triptico-energize', 'fonts', 'Outfit-Regular.ttf'), 22)
LAB = {'gize': 'GIZE', 'coaches': 'Coaches', 'entreno': 'Entreno', 'comida': 'Comida', 'progreso': 'Progreso',
       'tecnica': 'Técnica', 'novedades': 'Novedades', 'preguntas': 'Preguntas'}
d_, gap = 128, 34
prev = Image.new('RGB', (len(ORDER) * (d_ + gap) + gap, 230), (12, 16, 22)); pd = ImageDraw.Draw(prev)
for i, name in enumerate(ORDER):
    x = gap + i * (d_ + gap); y = 30
    sq = Image.open(os.path.join(OUT, f'destacada-{name}-1080.png')).resize((d_, d_), Image.LANCZOS)
    m = Image.new('L', (d_ * 4, d_ * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, d_ * 4 - 1, d_ * 4 - 1), fill=255)
    prev.paste(sq, (x, y), m.resize((d_, d_), Image.LANCZOS))
    pd.ellipse((x - 5, y - 5, x + d_ + 4, y + d_ + 4), outline=(60, 66, 78), width=2)
    tw = pd.textlength(LAB[name], font=F); pd.text((x + (d_ - tw) / 2, y + d_ + 16), LAB[name], font=F, fill=(230, 232, 236))
prev.save(os.path.join(OUT, 'vista-perfil.png'))
print('ok')
