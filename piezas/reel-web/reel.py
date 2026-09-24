"""GIZE · reel de la landing publicada (gize.ar), grabada en formato celular con Playwright.
Uso: python3 reel.py salida.mp4 [carpeta_de_cuadros]"""
import sys, os, json, glob, subprocess, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
from reel import W, H, FPS, TEXT, TEXT2, BLUE, ease_out, ease_io, fade

FR = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'grabacion/frames')

BLOCKS = [
    # (escena, duración en s, kicker, titular, bajada)
    ('hero',    3.6, '01 · INICIO', 'Una web que se toca', 'Deslizá el dedo sobre el vidrio y aparece la G.'),
    ('paso1',   3.2, '02 · CÓMO FUNCIONA', 'Te vinculás con tu coach', 'Con su código de invitación, una sola vez.'),
    ('paso2',   3.2, '03 · CÓMO FUNCIONA', 'Registrás cada serie', 'Un toque y tu coach ya la ve.'),
    ('paso3',   3.2, '04 · CÓMO FUNCIONA', 'Progresan juntos', 'Tu volumen semanal, a la vista de los dos.'),
    ('app',     3.4, '05 · LA APP', 'Todo lo que entrenás', 'Rutina, series, hábitos, cardio, nutrición y progreso.'),
    ('nuevo',   3.4, '06 · LO NUEVO', 'Tu coach te escribe', 'Y te llega al celular, como un mensaje.'),
    ('coach',   3.2, '07 · DOS PARTES', 'Un solo sistema', 'Lo que registrás, tu coach lo ve con datos.'),
    ('precios', 3.6, '08 · PLANES', '14 días gratis para coaches', 'Sin tarjeta. Para sus clientes, la app es gratis.'),
    ('final',   3.0, '09 · EMPEZÁ', 'Creá tu cuenta', 'O instalá la app en tu celular.'),
]
HOOK_N, END_N = 78, 138

def load_scene(name, dur):
    d = os.path.join(FR, name)
    meta = json.load(open(os.path.join(d, 'times.json')))
    files = sorted(glob.glob(os.path.join(d, '*.jpg')))
    ts = np.array(meta['times']) - meta['start']
    span = meta['end'] - meta['start']
    n = round(dur * FPS)
    cache, out = {}, []
    for k in range(n):
        t = k / max(n - 1, 1) * span
        i = max(0, int(np.searchsorted(ts, t, side='right')) - 1)
        if i not in cache:
            cache[i] = Image.open(files[i]).convert('RGB').resize((R.CW, R.CH), Image.LANCZOS)
        out.append(cache[i])
    return out

def hook_frame(f):
    c = R.aurora(f / FPS + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    d = ImageDraw.Draw(c)
    g = R.svg('gize-monograma.svg', 200); k = ease_out(f / 12)
    c.alpha_composite(fade(g, k), ((W - 200) // 2, 500))
    fk = R.F_MONO(28); txt = 'LA WEB YA ESTÁ ONLINE'
    a = ease_out((f - 6) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(txt, font=fk)) / 2, 4), txt, font=fk, fill=BLUE)
        c.alpha_composite(fade(lay, a), (0, 760))
    fh = R.F_H(150); ln = 'gize.ar'
    a = ease_out((f - 10) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 190), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, int(820 + (1 - a) * 30)))
    fs = R.F_S(42)
    a = ease_out((f - 32) / 12)
    if a > 0:
        ln = 'Entrá desde el celular y tocá todo.'
        lay = Image.new('RGBA', (W, 60), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fs)) / 2, 0), ln, font=fs, fill=TEXT2)
        c.alpha_composite(fade(lay, a), (0, int(1030 + (1 - a) * 20)))
    img = c.convert('RGB')
    img = R.aberration(img, 22 * max(0, 1 - f / 9) + (12 if f in (29, 30) else 0))
    if f < 7 or f in (29, 30): img = R.glitch(img, 1.0 if f < 4 or f in (29, 30) else .5, f)
    return img

def end_frame(f):
    c = R.aurora(f / FPS + 40, strength=.34, cy=.45).convert('RGBA')
    a = ease_out(f / 22); s = .94 + .06 * a
    fi = R.FIRMA.resize((int(R.FIRMA.width * s), int(R.FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, a), ((W - fi.width) // 2, 640 + (R.FIRMA.height - fi.height) // 2))
    d = ImageDraw.Draw(c); fh = R.F_H(62)
    for i, ln in enumerate(['Ya estamos online.', 'Conocé todo en la web.']):
        a2 = ease_out((f - 12 - i * 6) / 14)
        if a2 <= 0: continue
        lay = Image.new('RGBA', (W, 90), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT if i == 0 else TEXT2)
        c.alpha_composite(fade(lay, a2), (0, int(930 + i * 76 + (1 - a2) * 24)))
    return cta(c, f, 'Entrá a gize.ar')

def cta(c, f, txt):
    d = ImageDraw.Draw(c)
    a3 = ease_out((f - 34) / 16)
    if a3 > 0:
        fb = R.F_H(46)
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
        c.alpha_composite(fade(lay, a3), ((W - lay.width) // 2, int(1160 - pad + (1 - a3) * 20)))
    return c.convert('RGB')

def scenes():
    yield 'hook', HOOK_N, hook_frame
    tg = HOOK_N / FPS
    for bi, (name, dur, k, h, sub) in enumerate(BLOCKS):
        frames = load_scene(name, dur)
        parts = R.text_parts(k, h, sub)
        n = len(frames)
        yield name, n, (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg: R.block_frame(bi, fi, n, frames[fi], parts, tg + fi / FPS))
        tg += n / FPS
    yield 'end', END_N, end_frame

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
