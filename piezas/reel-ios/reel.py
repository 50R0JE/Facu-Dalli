"""GIZE · reel 'Llegamos a iPhone · 28.09'. Reusa el motor de los reels anteriores.
Uso: python3 reel.py salida.mp4 [fecha, ej. 28.09]
Necesita las grabaciones del panel (src/in.mp4) y del escáner (src/in3.mp4)."""
import sys, os, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
import importlib.util
_s = importlib.util.spec_from_file_location('reel3', os.path.join(HERE, '..', 'reel-escaner', 'reel.py'))
R3 = importlib.util.module_from_spec(_s); _s.loader.exec_module(R3)
from reel import W, H, FPS, TEXT, TEXT2, BLUE, GAMA, ease_out, ease_io, fade

FECHA = sys.argv[2] if len(sys.argv) > 2 else '28.09'
DIA, MES = FECHA.split('.')
MESES = {'09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre'}
SRC_APP = os.path.join(HERE, 'src/in.mp4')
SRC_SCAN = os.path.join(HERE, 'src/in3.mp4')

# ---------- neón (mismo tratamiento que ENER y 10.10) ----------
def gama_h(w, h, stops):
    x = np.linspace(0, 1, w); p = x * (len(stops) - 1)
    i0 = np.minimum(p.astype(int), len(stops) - 2); fr = (p - i0)[:, None]
    st = np.array(stops, np.float32)
    return np.repeat((st[i0] * (1 - fr) + st[i0 + 1] * fr)[None], h, 0)

_neon = {}
def neon(text, size=300):
    key = (text, size)
    if key in _neon: return _neon[key]
    font = R.F_H(size)
    d = ImageDraw.Draw(Image.new('L', (1, 1)))
    # caja fija con la fecha final, así los dígitos que ruedan no mueven el conjunto
    l, t, r, b = d.textbbox((0, 0), '88.88', font=font)
    P = 90; w, h = r - l + 2 * P, b - t + 2 * P
    tw = d.textlength(text, font=font); tw0 = d.textlength('88.88', font=font)
    alpha = Image.new('L', (w, h), 0)
    ImageDraw.Draw(alpha).text((P - l + (tw0 - tw) / 2, P - t), text, font=font, fill=255)
    inner = alpha.filter(ImageFilter.MinFilter(11)); edge = ImageChops.subtract(alpha, inner)
    col = Image.fromarray(gama_h(w, h, GAMA[:3]).astype(np.uint8))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    g = col.convert('RGBA'); g.putalpha(edge.filter(ImageFilter.GaussianBlur(22)).point(lambda v: min(255, int(v * 2.6))))
    fl = col.convert('RGBA'); fl.putalpha(inner.point(lambda v: int(v * .10)))
    tube = col.convert('RGBA'); tube.putalpha(edge)
    core = Image.new('RGBA', (w, h), (255, 255, 255, 0)); core.putalpha(edge.filter(ImageFilter.MinFilter(5)).point(lambda v: int(v * .75)))
    for L in (g, fl, tube, core): out.alpha_composite(L)
    _neon[key] = (out, P, b - t)
    return _neon[key]

def rgb_line(img, y, x0, x1, a=1.0):
    w = x1 - x0
    tip = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / 160, 0, 1)[None] * a
    line = Image.fromarray(gama_h(w, 3, GAMA).astype(np.uint8)).convert('RGBA')
    line.putalpha(Image.fromarray((np.ones((3, w)) * 255 * tip).astype(np.uint8)))
    glow = Image.fromarray(gama_h(w, 40, GAMA).astype(np.uint8)).convert('RGBA')
    ga = np.exp(-((np.arange(40) - 20) / 7.0) ** 2)[:, None] * 140 * tip
    glow.putalpha(Image.fromarray(ga.astype(np.uint8)))
    img.alpha_composite(glow, (x0, y - 19)); img.alpha_composite(line, (x0, y))

def put_neon(c, text, line_y, a=1.0, size=300, flicker=1.0):
    im, P, th = neon(text, size)
    x = (W - im.width) // 2; y = line_y - (im.height - P) + 6
    c.alpha_composite(fade(im, a * flicker), (x, y))
    ref = im.transpose(Image.FLIP_TOP_BOTTOM).crop((0, P, im.width, P + 140)).filter(ImageFilter.GaussianBlur(4))
    fa = np.linspace(.22, 0, 140)[:, None] * np.asarray(ref.getchannel('A'), np.float32) * a * flicker
    ref.putalpha(Image.fromarray(fa.astype(np.uint8)))
    c.alpha_composite(ref, (x, line_y + 8))

def centered(c, text, font, y, fill, a=1.0):
    d = ImageDraw.Draw(c); w = d.textlength(text, font=font)
    lay = Image.new('RGBA', (W, font.size + 40), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text(((W - w) / 2, 0), text, font=font, fill=fill)
    c.alpha_composite(fade(lay, a), (0, int(y)))

# ---------- escenas ----------
def hook_frame(f):
    c = R.aurora(f / FPS + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    g = R.svg('gize-monograma.svg', 200); k = ease_out(f / 12)
    c.alpha_composite(fade(g, k), ((W - 200) // 2, 500))
    a = ease_out((f - 6) / 10)
    if a > 0: centered(c, 'PRÓXIMAMENTE', R.F_MONO(28), 764, BLUE, a)
    a = ease_out((f - 10) / 10)
    if a > 0: centered(c, '¿Tenés iPhone?', R.F_H(116), 830 + (1 - a) * 30, TEXT, a)
    a = ease_out((f - 34) / 12)
    if a > 0: centered(c, 'Esto es para vos.', R.F_S(46), 990 + (1 - a) * 20, TEXT2, a)
    img = c.convert('RGB')
    img = R.aberration(img, 22 * max(0, 1 - f / 9) + (12 if f in (31, 32) else 0))
    if f < 7 or f in (31, 32): img = R.glitch(img, 1.0 if f < 4 or f in (31, 32) else .5, f)
    return img

DATE_N = 120
def date_frame(f):
    """La fecha rueda día por día desde hoy hasta el lanzamiento y se enciende."""
    c = R.aurora(f / FPS + 20, strength=.30, cy=.52).convert('RGBA')
    line_y = 1010
    start = int(DIA) - 4
    days = [f'{d:02d}.{MES}' for d in range(start, int(DIA) + 1)]
    step = 9                                   # cuadros por día
    i = min(len(days) - 1, max(0, (f - 8) // step))
    txt = days[i]
    settled = f >= 8 + step * (len(days) - 1)
    a = ease_out(f / 10)
    flick = 1.0
    if not settled: flick = .55
    elif f < 8 + step * (len(days) - 1) + 8: flick = [1, .3, 1, .5, 1, 1, .7, 1][f - (8 + step * (len(days) - 1))]
    put_neon(c, txt, line_y, a, flicker=flick)
    rgb_line(c, line_y, 90, W - 90, a)
    a2 = ease_out((f - 8 - step * (len(days) - 1)) / 12)
    if a2 > 0:
        centered(c, 'LANZAMIENTO EN IOS', R.F_MONO(28), 560 + (1 - a2) * 16, BLUE, a2)
        centered(c, 'Llegamos a iPhone.', R.F_H(92), line_y + 60 + (1 - a2) * 24, TEXT, a2)
        centered(c, f'El {int(DIA)} de {MESES.get(MES, "")}, en tu iPhone.', R.F_S(42), line_y + 180 + (1 - a2) * 20, TEXT2, a2)
    img = c.convert('RGB')
    if settled and f < 8 + step * (len(days) - 1) + 3: img = R.aberration(img, 16)
    return img

BLOCKS = [
    # (fuente, inicio, fin, velocidad, kicker, titular, bajada)
    (SRC_APP, 1.6, 7.5, 1.8, '01 · EN TU IPHONE', 'Tu rutina, armada por tu coach', 'Te llega dividida por día, lista para entrenar.'),
    (SRC_APP, 8.0, 20.4, 3.8, '02 · ENTRENO', 'Anotás cada serie al toque', 'Con lo que hiciste la vez pasada a la vista.'),
    (SRC_SCAN, 4.0, 7.4, 1.1, '03 · COMIDA', 'Escaneás lo que comés', 'Calorías y macros al gramo, sin escribir nada.'),
]
END_N = 138

def end_frame(f):
    c = R.aurora(f / FPS + 40, strength=.34, cy=.45).convert('RGBA')
    a = ease_out(f / 22); s = .94 + .06 * a
    fi = R.FIRMA.resize((int(R.FIRMA.width * s), int(R.FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, a), ((W - fi.width) // 2, 560 + (R.FIRMA.height - fi.height) // 2))
    for i, ln in enumerate(['Tu coach, en tu iPhone.', f'Desde el {int(DIA)} de {MESES.get(MES, "")}.']):
        a2 = ease_out((f - 12 - i * 6) / 14)
        if a2 > 0: centered(c, ln, R.F_H(62), 850 + i * 76 + (1 - a2) * 24, TEXT if i == 0 else TEXT2, a2)
    # botón con anillo RGB (una sola acción)
    a3 = ease_out((f - 34) / 16)
    if a3 > 0:
        d = ImageDraw.Draw(c); fb = R.F_H(46); txt = f'Llegamos el {FECHA}'
        tw = d.textlength(txt, font=fb); bw, bh = int(tw + 120), 112; pad = 60
        lay = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), (0, 0, 0, 0))
        ang = f / FPS / 5 * 2 * math.pi
        grad = R.ring_gradient(bw + 2 * pad, bh + 2 * pad, bw / 2 + pad + 400 * math.cos(ang), bh / 2 + pad + 400 * math.sin(ang))
        ring_m = Image.new('L', lay.size, 0); ring_m.paste(R.rounded_mask(bw + 6, bh + 6, (bh + 6) // 2), (pad - 3, pad - 3))
        rg = Image.fromarray(grad.astype(np.uint8)).convert('RGBA')
        g = rg.copy(); g.putalpha(ring_m.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * .8))); lay.alpha_composite(g)
        r = rg.copy(); r.putalpha(ring_m); lay.alpha_composite(r)
        btn = Image.new('RGBA', (bw, bh), (255, 255, 255, 255)); btn.putalpha(R.rounded_mask(bw, bh, bh // 2))
        lay.alpha_composite(btn, (pad, pad))
        ImageDraw.Draw(lay).text((pad + 60, pad + 26), txt, font=fb, fill=(0, 0, 0))
        c.alpha_composite(fade(lay, a3), ((W - lay.width) // 2, int(1100 - pad + (1 - a3) * 20)))
    return c.convert('RGB')

def scenes():
    yield 'hook', HOOK_N, hook_frame
    yield 'fecha', DATE_N, date_frame
    tg = (HOOK_N + DATE_N) / FPS
    for bi, (src, s, e, sp, k, h, sub) in enumerate(BLOCKS):
        R.SRC = src
        frames = R3.prepare('scan' if src == SRC_SCAN else 'x', s, e, sp) if src == SRC_SCAN else R.clip_frames(s, e, sp)
        parts = R.text_parts(k, h, sub); n = len(frames)
        yield f'b{bi}', n, (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg: R.block_frame(bi, fi, n, frames[fi], parts, tg + fi / FPS))
        tg += n / FPS
    yield 'end', END_N, end_frame

HOOK_N = 78

def main(out):
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total, prev_last = 0, None
    for name, n, fn in scenes():
        for fi in range(n):
            img = fn(fi)
            if prev_last is not None and fi < R.WIPE_N:
                img = R.wipe(prev_last, img, ease_io((fi + 1) / (R.WIPE_N + 1)))
            ff.stdin.write(img.tobytes()); total += 1
        prev_last = fn(n - 1)
        print(name, n, file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait()
    print('frames', total, 'seg', total / FPS)

if __name__ == '__main__':
    main(sys.argv[1])
