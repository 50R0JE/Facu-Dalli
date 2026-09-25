"""GIZE · TikTok con titulares en Bigger Display, ritmo enérgico pero legible (~18 s, sin audio).
Escenas de 2,1 s, barrido RGB entre escenas, palabras que caen suave, teléfono con un zoom leve.
Zonas seguras de TikTok: arriba 160 px, abajo 480 px, derecha 150 px."""
import sys, os, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
sys.path.insert(0, os.path.join(HERE, '..', 'triptico-energize'))
import reel as R
import bigger
import importlib.util
def _load(name, path):
    s_ = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(s_); s_.loader.exec_module(m); return m
R3 = _load('reel3', os.path.join(HERE, '..', 'reel-escaner', 'reel.py'))
T8 = _load('tiktok8', os.path.join(HERE, 'tiktok.py'))       # fondo con luz de color por escena
from reel import W, H, FPS, TEXT, TEXT2, BLUE, GAMA, ease_out, ease_io, fade

SRC_APP = os.path.join(HERE, 'src/in.mp4')
SRC_SCAN = os.path.join(HERE, 'src/in3.mp4')
X0, MAXW = 72, 1080 - 72 - 160
SCENE_S = 2.1

def gama(w, h):
    x = np.linspace(0, 1, w); p = x * 2.2; i0 = np.minimum(p.astype(int), 2); fr = (p - i0)[:, None]
    st = np.array(GAMA, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0).astype(np.uint8)

def headline(lines, cap_max=190, gap=26):
    """Titular en Bigger Display: la última línea con la gama, sombra suave detrás."""
    caps = []
    for ln in lines:
        m, _ = bigger.word_mask(ln, 100)
        caps.append(min(cap_max, int(100 * MAXW / m.width)))
    cap = min(caps)                                   # todas las líneas al mismo alto
    masks = [bigger.word_mask(ln, cap) for ln in lines]
    k = masks[0][1]
    top_pad = round((bigger.glifos.TOP - 785) * k)
    lh = cap + gap
    h = lh * len(lines) + 80
    L = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    allm = Image.new('L', (W, h), 0)
    for i, (m, _) in enumerate(masks):
        allm.paste(m, (X0, 20 + i * lh - top_pad), m)
    sh = allm.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * .8))
    dk = Image.new('RGBA', (W, h), (0, 0, 0, 255)); dk.putalpha(sh); L.alpha_composite(dk)
    for i, (m, _) in enumerate(masks):
        one = Image.new('L', (W, h), 0); one.paste(m, (X0, 20 + i * lh - top_pad), m)
        if i == len(masks) - 1 and len(masks) > 1:
            g = Image.fromarray(gama(W, h)).convert('RGBA'); g.putalpha(one); L.alpha_composite(g)
        else:
            wht = Image.new('RGBA', (W, h), (255, 255, 255, 0)); wht.putalpha(one); L.alpha_composite(wht)
    return L

def drop(canvas, layer, f, y, delay=0):
    """Entrada suave: baja 40 px y aparece en 9 cuadros."""
    t = f - delay
    if t < 0: return
    a = ease_out(min(1, t / 9))
    canvas.alpha_composite(fade(layer, a), (0, int(y - (1 - a) * 40)))

def phone(canvas, content, f, rot, n):
    s = 1.30 * (1.05 - .05 * ease_out(min(1, f / 12))) * (1 + .03 * f / max(n, 1))
    L, _, _ = R.phone_layer(content, scale=s, glow=1.0)
    if rot: L = L.rotate(rot, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(L, (W // 2 - L.width // 2 + 40, 1170 - L.height // 2))

SCENES = [
    (SRC_APP, 1.6, 7.5, ['TU COACH', 'ARMA EL PLAN'], '01 · RUTINA', GAMA[0], -1.5),
    (SRC_APP, 8.0, 21.0, ['CADA SERIE', 'CUENTA'], '02 · REGISTRO', GAMA[1], 1.5),
    (SRC_SCAN, 4.0, 10.3, ['TU COMIDA', 'AL GRAMO'], '03 · ESCÁNER', GAMA[3], -1.5),
    (SRC_APP, 30.0, 38.0, ['CRONO Y', 'DESCANSO'], '04 · CARDIO', GAMA[2], 1.5),
    (SRC_APP, 67.5, 73.8, ['TU PROGRESO', 'EN DATOS'], '05 · PROGRESO', GAMA[0], -1.5),
    (SRC_APP, 60.5, 67.0, ['TU COACH', 'LO VE TODO'], '06 · COACH', GAMA[1], 1.5),
]
HOOK_N, END_N = 60, 96

HOOK = headline(['CHAU', 'PLANILLA'], cap_max=300)
def hook_frame(f):
    c = T8.bg(f, GAMA[2])
    drop(c, HOOK, f, 380)
    a = ease_out((f - 18) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 80), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text((X0 + 4, 0), 'Tu entrenamiento, en la app.', font=R.F_S(52), fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, 380 + HOOK.height + 10))
    img = c.convert('RGB')
    return R.aberration(img, 14 * max(0, 1 - f / 6)) if f < 6 else img

ENDW = headline(['ENERGIZE'], cap_max=250)
FIRMA = R.svg('gize-monograma.svg', 120)
def end_frame(f):
    c = T8.bg(f, GAMA[0])
    a0 = ease_out(min(1, f / 10))
    c.alpha_composite(fade(FIRMA, a0), (X0, 300))
    drop(c, ENDW, f, 450, 4)
    a = ease_out((f - 14) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 80), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text((X0 + 4, 0), 'Entrená con tu coach.', font=R.F_H(64), fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, int(450 + ENDW.height + (1 - a) * 20)))
    a2 = ease_out((f - 26) / 12)
    if a2 > 0:
        d = ImageDraw.Draw(c); fb = R.F_H(60); txt = 'gize.ar'
        tw = d.textlength(txt, font=fb); bw, bh = int(tw + 140), 130; pad = 60
        lay2 = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), (0, 0, 0, 0))
        ang = f / FPS * 2 * math.pi / 4
        grad = R.ring_gradient(bw + 2 * pad, bh + 2 * pad, bw / 2 + pad + 400 * math.cos(ang), bh / 2 + pad + 400 * math.sin(ang))
        rm = Image.new('L', lay2.size, 0); rm.paste(R.rounded_mask(bw + 8, bh + 8, (bh + 8) // 2), (pad - 4, pad - 4))
        rg = Image.fromarray(grad.astype(np.uint8)).convert('RGBA')
        g = rg.copy(); g.putalpha(rm.filter(ImageFilter.GaussianBlur(20)).point(lambda v: int(v * .9))); lay2.alpha_composite(g)
        r = rg.copy(); r.putalpha(rm); lay2.alpha_composite(r)
        btn = Image.new('RGBA', (bw, bh), (255, 255, 255, 255)); btn.putalpha(R.rounded_mask(bw, bh, bh // 2))
        lay2.alpha_composite(btn, (pad, pad))
        ImageDraw.Draw(lay2).text((pad + 70, pad + 28), txt, font=fb, fill=(0, 0, 0))
        c.alpha_composite(fade(lay2, a2), (X0 - pad, int(1010 - pad + (1 - a2) * 30)))
    a3 = ease_out((f - 38) / 12)
    if a3 > 0:
        lay = Image.new('RGBA', (W, 70), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text((X0 + 4, 0), 'Gratis para atletas.', font=R.F_S(48), fill=TEXT2)
        c.alpha_composite(fade(lay, a3), (0, 1210))
    return c.convert('RGB')

def scenes():
    yield 'hook', HOOK_N, hook_frame
    for i, (src, s, e, lines, kick, col, rot) in enumerate(SCENES):
        R.SRC = src
        sp = (e - s) / SCENE_S
        frames = R3.prepare('scan', s, e, sp) if src == SRC_SCAN else R.clip_frames(s, e, sp)
        n = len(frames)
        lay = headline(lines)
        kl = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(kl).text((X0 + 4, 6), kick, font=R.F_MONO(30), fill=BLUE)
        def fn(f, frames=frames, lay=lay, kl=kl, col=col, rot=rot, n=n):
            c = T8.bg(f, col)
            phone(c, frames[f], f, rot, n)
            c.alpha_composite(fade(kl, min(1, f / 6)), (0, 196))
            drop(c, lay, f, 246, 3)
            return c.convert('RGB')
        yield f's{i}', n, fn
    yield 'end', END_N, end_frame

def main(out):
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total, prev = 0, None
    for name, n, fn in scenes():
        for f in range(n):
            img = fn(f)
            if prev is not None and f < R.WIPE_N:
                img = R.wipe(prev, img, ease_io((f + 1) / (R.WIPE_N + 1)))
            ff.stdin.write(img.tobytes()); total += 1
        prev = fn(n - 1)
        print(name, n, file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait()
    print('frames', total, 'seg', round(total / FPS, 2))

if __name__ == '__main__':
    main(sys.argv[1])
