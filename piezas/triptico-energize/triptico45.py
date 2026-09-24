"""Pasa el tríptico a posts 4:5 (1080×1350) para la grilla de Instagram.
La grilla del perfil muestra cada post recortado a 3:4: el centro 1012×1350, sin 34 px
de cada costado. Por eso la tira visible (3 × 1012 = 3036 px) se arma continua y cada
post lleva 34 px extra a cada lado, que se superponen con el vecino y quedan ocultos."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'salida/3x4/triptico-completo.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'salida')
os.makedirs(OUT, exist_ok=True)
PW, PH, VIS = 1080, 1350, 1012
M = (PW - VIS) // 2                      # 34 px ocultos por lado

full = Image.open(SRC).convert('RGB').resize((VIS * 3, PH), Image.LANCZOS)
a = np.asarray(full)
strip = np.concatenate([a[:, :M][:, ::-1], a, a[:, -M:][:, ::-1]], axis=1)   # bordes en espejo
strip = Image.fromarray(strip)
names = ['1-izquierda-ENER', '2-centro', '3-derecha-GIZE']
posts = []
for i, n in enumerate(names):
    p = strip.crop((i * VIS, 0, i * VIS + PW, PH)); posts.append(p)
    p.save(os.path.join(OUT, f'post-{n}.jpg'), quality=95, subsampling=0)

# maqueta: lo que muestra la grilla (centro 3:4 de cada post, con la separación de Instagram)
tw, th, gap = 360, 480, 3
m = Image.new('RGB', (tw * 3 + gap * 2, th + 40), (12, 16, 22))
for i, p in enumerate(posts):
    m.paste(p.crop((M, 0, M + VIS, PH)).resize((tw, th), Image.LANCZOS), (i * (tw + gap), 20))
m.save(os.path.join(OUT, 'maqueta-grilla.png'))
print('ok', strip.size)
