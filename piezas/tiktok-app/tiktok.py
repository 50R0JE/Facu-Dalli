"""GIZE · TikTok frenético (1080×1920, 30 fps, ~15,5 s, sin audio) para usar como anuncio.
Cortes cada ~1,5 s, palabras que golpean, teléfono grande con zoom y giro, destello RGB entre escenas.
Zonas seguras de TikTok: arriba 160 px, abajo 480 px (texto + botón del anuncio), derecha 150 px (íconos)."""
import sys, os, math, subprocess, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
import importlib.util
_s = importlib.util.spec_from_file_location('reel3', os.path.join(HERE, '..', 'reel-escaner', 'reel.py'))
R3 = importlib.util.module_from_spec(_s); _s.loader.exec_module(R3)
from reel import W, H, FPS, TEXT, TEXT2, BLUE, GAMA, ease_out, ease_io, fade

SRC_APP = os.path.join(HERE, 'src/in.mp4')
SRC_SCAN = os.path.join(HERE, 'src/in3.mp4')
X0, MAXW = 72, 1080 - 72 - 170            # texto alineado a la izquierda, lejos de los íconos
random.seed(7)

def fit_font(lines, maxw, start):
    d = ImageDraw.Draw(Image.new('L', (1, 1))); s = start
    while max(d.textlength(l, font=R.F_H(s)) for l in lines) > maxw: s -= 4
    return R.F_H(s)

def words_layer(lines, size, color_last=None):
    """Capa con las líneas grandes + sombra; la última línea puede ir con la gama."""
    f = fit_font(lines, MAXW, size)
    lh = int(f.size * .98)
    h = lh * len(lines) + 60
    L = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    sh = Image.new('L', (W, h), 0); ds = ImageDraw.Draw(sh)
    for i, ln in enumerate(lines): ds.text((X0, 10 + i * lh), ln, font=f, fill=255)
    sh = sh.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * .85))
    dk = Image.new('RGBA', (W, h), (0, 0, 0, 255)); dk.putalpha(sh); L.alpha_composite(dk)
    d = ImageDraw.Draw(L)
    for i, ln in enumerate(lines):
        if color_last and i == len(lines) - 1:
            m = Image.new('L', (W, h), 0); ImageDraw.Draw(m).text((X0, 10 + i * lh), ln, font=f, fill=255)
            g = Image.fromarray(R6_gama(W, h)).convert('RGBA'); g.putalpha(m); L.alpha_composite(g)
        else:
            d.text((X0, 10 + i * lh), ln, font=f, fill=TEXT)
    return L

def R6_gama(w, h):
    x = np.linspace(0, 1, w); p = x * 2.2; i0 = np.minimum(p.astype(int), 2); fr = (p - i0)[:, None]
    st = np.array(GAMA, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

def slam(canvas, layer, f, y, delay=0):
    """La palabra entra grande y cae a su tamaño en 5 cuadros, con un rebote mínimo."""
    t = f - delay
    if t < 0: return
    k = min(1, t / 5)
    s = 1 + .38 * (1 - ease_out(k)) - (.03 * math.sin(min(1, (t - 5) / 6) * math.pi) if t >= 5 else 0)
    a = min(1, t / 2)
    if abs(s - 1) > .003:
        lw, lh = int(layer.width * s), int(layer.height * s)
        lay = layer.resize((lw, lh), Image.BILINEAR)
        ox, oy = int((layer.width - lw) * .15), int((layer.height - lh) / 2)
    else:
        lay, ox, oy = layer, 0, 0
    canvas.alpha_composite(fade(lay, a), (ox, int(y + oy)))

def bg(f, col):
    c = R.aurora(f / FPS * 3, strength=.15, cy=.55).convert('RGBA')
    yy, xx = np.mgrid[0:H // 8, 0:W // 8].astype(np.float32)
    g = np.exp(-(((xx - W / 16) ** 2 + (yy - H / 14.5) ** 2) / (2 * (W / 10) ** 2)))[..., None]
    glow = Image.fromarray((g * np.array(col) * .40).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    return Image.fromarray(np.clip(np.asarray(c.convert('RGB')).astype(np.int16) + np.asarray(glow), 0, 255).astype(np.uint8)).convert('RGBA')

def phone(canvas, content, f, rot, n):
    punch = 1.14 - .14 * ease_out(min(1, f / 7))
    drift = 1 + .04 * f / max(n, 1)
    L, x, y = R.phone_layer(content, scale=1.30 * punch * drift, glow=1.0)
    if rot:
        L = L.rotate(rot, resample=Image.BICUBIC, expand=True)
        x -= (L.width - int(L.width)) // 2
    cx = W // 2 - L.width // 2 + 40
    cy = 1150 - L.height // 2
    sx = int(random.uniform(-1, 1) * 14 * max(0, 1 - f / 6)); sy = int(random.uniform(-1, 1) * 10 * max(0, 1 - f / 6))
    canvas.alpha_composite(L, (cx + sx, cy + sy))

def cut_fx(img, f):
    """Destello + aberración en los primeros cuadros de cada escena."""
    if f == 0:
        a = np.asarray(img).astype(np.float32); a = a * .55 + 255 * .45
        img = Image.fromarray(a.astype(np.uint8))
    if f < 4:
        img = R.aberration(img, [26, 16, 8, 3][f])
    if f in (1, 2):
        img = R.glitch(img, .7, f * 13)
    return img

# ---------- escenas ----------
SCENES = [
    # (fuente, ini, fin, velocidad, líneas, kicker, color, giro)
    (SRC_APP, 1.6, 7.5, 4.0, ['TU COACH', 'ARMA EL PLAN'], '01 · RUTINA', GAMA[0], -3),
    (SRC_APP, 8.0, 15.0, 5.0, ['VOS', 'ANOTÁS'], '02 · SERIES', GAMA[1], 3),
    (SRC_APP, 15.0, 21.0, 4.0, ['CADA SERIE', 'CUENTA'], '03 · REGISTRO', GAMA[2], -2),
    (SRC_SCAN, 4.0, 7.4, 2.4, ['ESCANEÁS', 'LA COMIDA'], '04 · COMIDA', GAMA[3], 3),
    (SRC_SCAN, 8.4, 10.3, 1.3, ['CALORÍAS', 'AL GRAMO'], '05 · MACROS', GAMA[0], -3),
    (SRC_APP, 30.0, 38.0, 5.5, ['CRONÓMETRO', 'Y DESCANSO'], '06 · CARDIO', GAMA[1], 2),
    (SRC_APP, 67.5, 73.8, 4.5, ['TU PROGRESO', 'EN DATOS'], '07 · PROGRESO', GAMA[2], -3),
    (SRC_APP, 59.5, 66.0, 4.5, ['TU COACH', 'LO VE TODO'], '08 · COACH', GAMA[3], 3),
]
HOOK_N, END_N = 48, 78

def hook_frame(f):
    c = bg(f, GAMA[2]).convert('RGBA')
    words = [('DEJÁ', 0), ('LA', 8), ('PLANILLA.', 16)]
    y = 330
    for w_, d0 in words:
        lay = words_layer([w_], 230 if w_ != 'PLANILLA.' else 200, color_last=(w_ == 'PLANILLA.'))
        slam(c, lay, f, y, d0); y += lay.height - 50
    a = ease_out((f - 28) / 8)
    if a > 0:
        c.alpha_composite(fade(words_layer(['Tu entrenamiento, en la app.'], 58), a), (0, y + 30))
    img = c.convert('RGB')
    if f < 3 or f in (8, 9, 16, 17): img = R.aberration(img, 18); img = R.glitch(img, .8, f)
    return img

FIRMA = R.svg('gize-firma-horizontal.svg', 640)
def end_frame(f):
    c = bg(f, GAMA[0]).convert('RGBA')
    k = ease_out(min(1, f / 6)); s = 1.3 - .3 * k
    fi = FIRMA.resize((int(FIRMA.width * s), int(FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, min(1, f / 3)), ((W - fi.width) // 2 - 40, 520 - (fi.height - FIRMA.height) // 2))
    lay = words_layer(['ENTRENÁ CON', 'TU COACH.'], 120, color_last=True)
    slam(c, lay, f, 790, 6)
    a = ease_out((f - 20) / 10)
    if a > 0:
        # botón: gize.ar con anillo RGB
        d = ImageDraw.Draw(c); fb = R.F_H(60); txt = 'gize.ar'
        tw = d.textlength(txt, font=fb); bw, bh = int(tw + 140), 130; pad = 60
        lay2 = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), (0, 0, 0, 0))
        ang = f / FPS * 2 * math.pi / 2.5
        grad = R.ring_gradient(bw + 2 * pad, bh + 2 * pad, bw / 2 + pad + 400 * math.cos(ang), bh / 2 + pad + 400 * math.sin(ang))
        rm = Image.new('L', lay2.size, 0); rm.paste(R.rounded_mask(bw + 8, bh + 8, (bh + 8) // 2), (pad - 4, pad - 4))
        rg = Image.fromarray(grad.astype(np.uint8)).convert('RGBA')
        g = rg.copy(); g.putalpha(rm.filter(ImageFilter.GaussianBlur(20)).point(lambda v: int(v * .9))); lay2.alpha_composite(g)
        r = rg.copy(); r.putalpha(rm); lay2.alpha_composite(r)
        btn = Image.new('RGBA', (bw, bh), (255, 255, 255, 255)); btn.putalpha(R.rounded_mask(bw, bh, bh // 2))
        lay2.alpha_composite(btn, (pad, pad))
        ImageDraw.Draw(lay2).text((pad + 70, pad + 28), txt, font=fb, fill=(0, 0, 0))
        c.alpha_composite(fade(lay2, a), (X0 - pad, int(1110 - pad + (1 - a) * 30)))
    a2 = ease_out((f - 30) / 10)
    if a2 > 0:
        c.alpha_composite(fade(words_layer(['Gratis para atletas.'], 50), a2), (0, 1320))
    img = c.convert('RGB')
    return cut_fx(img, f) if f < 4 else img

def scenes():
    yield 'hook', HOOK_N, hook_frame
    for i, (src, s, e, sp, lines, kick, col, rot) in enumerate(SCENES):
        R.SRC = src
        frames = R3.prepare('scan', s, e, sp) if src == SRC_SCAN else R.clip_frames(s, e, sp)
        n = len(frames)
        lay = words_layer(lines, 150, color_last=True)
        kick_l = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(kick_l).text((X0 + 4, 6), kick, font=R.F_MONO(30), fill=BLUE)
        def fn(f, frames=frames, lay=lay, kick_l=kick_l, col=col, rot=rot, n=n):
            c = bg(f, col)
            phone(c, frames[f], f, rot, n)
            c.alpha_composite(fade(kick_l, min(1, f / 3)), (0, 196))
            slam(c, lay, f, 238, 1)
            return cut_fx(c.convert('RGB'), f)
        yield f's{i}', n, fn
    yield 'end', END_N, end_frame

def main(out):
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total = 0
    for name, n, fn in scenes():
        for f in range(n):
            ff.stdin.write(fn(f).tobytes()); total += 1
        print(name, n, file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait()
    print('frames', total, 'seg', round(total / FPS, 2))

if __name__ == '__main__':
    main(sys.argv[1])
