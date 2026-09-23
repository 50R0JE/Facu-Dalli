"""GIZE · reel 'escáner de código de barras'. Reusa el motor de reel.py y reel2.py.
Uso: python3 reel.py salida.mp4 grabacion.mp4"""
import sys, os, math, subprocess
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "reel-atleta"))
sys.path.insert(0, os.path.join(HERE, "..", "reel-video-ejercicio"))
import reel as R
import importlib.util
_s = importlib.util.spec_from_file_location("reel2", os.path.join(HERE, "..", "reel-video-ejercicio", "reel.py"))
R2 = importlib.util.module_from_spec(_s); _s.loader.exec_module(R2)
from reel import W, H, FPS, TEXT, TEXT2, BLUE, SURF, BORDER, ease_out, ease_io, fade

SCAN_BTN = R2.src_box(322, 350, 370, 400)     # ícono del escáner junto al buscador
COACH_NAME = R2.src_box(250, 38, 384, 100)

BLOCKS = [
    # (start, end, speed, kicker, titular, bajada, tipo)
    (1.8, 4.2, 1.0, '01 · COMIDA', 'Tocás el escáner', 'Está al lado del buscador de alimentos.', 'boton'),
    (4.0, 7.4, 1.1, '02 · ESCÁNER', 'Apuntás al código de barras', 'Lo lee al instante. Sin escribir nada.', 'scan'),
    (7.4, 10.3, 1.0, '03 · DATOS', 'Calorías y macros, al gramo', 'Elegís cuántos gramos comiste y lo agregás.', 'datos'),
    (10.3, 13.6, 1.1, '04 · TU DÍA', 'Se suma solo a tu día', 'Ves cuánto llevás y cuánto te falta.', 'dia'),
]
HOOK_N, END_N = 78, 132

def hook_frame(f):
    c = R.aurora(f / FPS + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    d = ImageDraw.Draw(c)
    k = ease_out(f / 12)
    g = R.svg('gize-monograma.svg', 200)
    c.alpha_composite(fade(g, k), ((W - 200) // 2, 500))
    fk = R.F_MONO(28); txt = 'ESCÁNER DE CÓDIGO DE BARRAS'
    a = ease_out((f - 6) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(txt, font=fk)) / 2, 4), txt, font=fk, fill=BLUE)
        c.alpha_composite(fade(lay, a), (0, 760))
    fh = R.F_H(96)
    for i, (ln, st) in enumerate([('¿Cuántas calorías', 10), ('tiene esto?', 22)]):
        a = ease_out((f - st) / 10)
        if a <= 0: continue
        lay = Image.new('RGBA', (W, 120), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, int(830 + i * 112 + (1 - a) * 30)))
    a = ease_out((f - 44) / 12)
    if a > 0:
        fs = R.F_S(40); ln = 'Dejá de adivinar. Escanealo.'
        lay = Image.new('RGBA', (W, 60), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fs)) / 2, 0), ln, font=fs, fill=TEXT2)
        c.alpha_composite(fade(lay, a), (0, int(1082 + (1 - a) * 20)))
    img = c.convert('RGB')
    img = R.aberration(img, 22 * max(0, 1 - f / 9) + (12 if f in (21, 22) else 0))
    if f < 7 or f in (21, 22): img = R.glitch(img, 1.0 if f < 4 or f in (21, 22) else .5, f)
    return img

def end_frame(f):
    c = R.aurora(f / FPS + 40, strength=.34, cy=.45).convert('RGBA')
    a = ease_out(f / 22); s = .94 + .06 * a
    fi = R.FIRMA.resize((int(R.FIRMA.width * s), int(R.FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, a), ((W - fi.width) // 2, 640 + (R.FIRMA.height - fi.height) // 2))
    d = ImageDraw.Draw(c); fh = R.F_H(62)
    for i, ln in enumerate(['Contá tus calorías', 'sin adivinar.']):
        a2 = ease_out((f - 12 - i * 6) / 14)
        if a2 <= 0: continue
        lay = Image.new('RGBA', (W, 90), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT if i == 0 else TEXT2)
        c.alpha_composite(fade(lay, a2), (0, int(930 + i * 76 + (1 - a2) * 24)))
    return R2.cta(c, f)

# ---------- fichas de datos que salen del teléfono ----------
CHIPS = [('177', 'kcal'), ('3,8 g', 'proteína'), ('38 g', 'carbos'), ('1,1 g', 'grasas')]

def chip(value, label):
    fv, fl = R.F_MONO(54), R.F_S(28)
    d = ImageDraw.Draw(Image.new('L', (1, 1)))
    w = int(max(d.textlength(value, font=fv), d.textlength(label, font=fl)) + 48)
    h = 136
    im = Image.new('RGBA', (w + 4, h + 4), (0, 0, 0, 0))
    m = R.rounded_mask(w + 4, h + 4, 22)
    ring = Image.new('RGBA', im.size, (0, 0, 0, 0))
    grad = R.ring_gradient(w + 4, h + 4, (w + 4) / 2, (h + 4) / 2)
    ring = Image.fromarray(grad.astype('uint8')).convert('RGBA'); ring.putalpha(m)
    im.alpha_composite(ring)
    body = Image.new('RGBA', (w, h), SURF + (245,)); body.putalpha(R.rounded_mask(w, h, 20))
    im.alpha_composite(body, (2, 2))
    dd = ImageDraw.Draw(im)
    dd.text((26, 18), value, font=fv, fill=TEXT)
    dd.text((26, 86), label, font=fl, fill=TEXT2)
    return im

CHIP_IMGS = [chip(v, l) for v, l in CHIPS]
# posiciones: dos a cada lado del teléfono, a la altura de la ficha del producto
CHIP_POS = [(34, 1110, -1), (34, 1270, -1), (None, 1110, 1), (None, 1270, 1)]

def data_block_frame(bi, fi, n, content, parts, tg, src_t):
    img = R.block_frame(bi, fi, n, content, parts, tg).convert('RGBA')
    t0 = 8.6
    for i, (ci, (x, y, side)) in enumerate(zip(CHIP_IMGS, CHIP_POS)):
        a = ease_out((src_t - t0 - i * .14) / .35)
        if a <= 0: continue
        if x is None: x = W - 34 - ci.width
        img.alpha_composite(fade(ci, a), (x - int((1 - a) * 50) * side, y))
    return img.convert('RGB')

def prepare(kind, s, e, sp):
    frames = R.clip_frames(s, e, sp)
    out = []
    for i, fr in enumerate(frames):
        fr = fr.copy()
        src_t = s + i / FPS * sp
        fr = R2.blur_box(fr, COACH_NAME, 10)
        if kind == 'boton' and src_t >= 3.2:
            fr = R2.ring_highlight(fr, SCAN_BTN, ease_out((src_t - 3.2) / .35), src_t)
        out.append(fr)
    return out

def scenes():
    yield 'hook', HOOK_N, hook_frame
    tg = HOOK_N / FPS
    for bi, (s, e, sp, k, h, sub, kind) in enumerate(BLOCKS):
        frames = prepare(kind, s, e, sp)
        parts = R.text_parts(k, h, sub)
        n = len(frames)
        if kind == 'datos':
            fn = (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg, s=s, sp=sp:
                  data_block_frame(bi, fi, n, frames[fi], parts, tg + fi / FPS, s + fi / FPS * sp))
        else:
            fn = (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg:
                  R.block_frame(bi, fi, n, frames[fi], parts, tg + fi / FPS))
        yield f'b{bi}', n, fn
        tg += n / FPS
    yield 'end', END_N, end_frame

def main(out):
    sc = list(scenes())
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total, prev_last = 0, None
    for si, (name, n, fn) in enumerate(sc):
        for fi in range(n):
            img = fn(fi)
            if si > 0 and fi < R.WIPE_N:
                img = R.wipe(prev_last, img, ease_io((fi + 1) / (R.WIPE_N + 1)))
            ff.stdin.write(img.tobytes()); total += 1
        prev_last = fn(n - 1)
        print(name, n, file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait()
    print('frames', total, 'seg', total / FPS)

if __name__ == '__main__':
    if len(sys.argv) > 2: R.SRC = sys.argv[2]
    main(sys.argv[1])
