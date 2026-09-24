"""GIZE · reel de la landing y el alta. La grabación es de escritorio (1280×624):
se muestra dentro de una ventana de navegador con recorridos de cámara por sección.
Uso: python3 reel.py salida.mp4 grabacion.mp4"""
import sys, os, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
import importlib.util
_s = importlib.util.spec_from_file_location('reel2', os.path.join(HERE, '..', 'reel-video-ejercicio', 'reel.py'))
R2 = importlib.util.module_from_spec(_s); _s.loader.exec_module(R2)
from reel import W, H, FPS, TEXT, TEXT2, BLUE, SURF, BORDER, ease_out, ease_io, fade

SRC = os.path.join(HERE, 'src/landing.mp4')
SW, SH = 1280, 624

# ---------- ventana de navegador ----------
VW, VH = 1000, 800            # contenido (relación 1,25)
BAR = 46
WX, WY = (W - VW) // 2, 612
ASPECT = VH / VW

def build_window():
    pad = 90
    ow, oh = VW, VH + BAR
    grad = R.ring_gradient(ow + 2 * pad, oh + 2 * pad, ow / 2 + pad, oh / 2 + pad)
    outer = Image.new('L', (ow + 2 * pad, oh + 2 * pad), 0)
    outer.paste(R.rounded_mask(ow + 4, oh + 4, 28), (pad - 2, pad - 2))
    inner = Image.new('L', outer.size, 0)
    inner.paste(R.rounded_mask(ow, oh, 26), (pad, pad))
    ring_a = np.clip(np.asarray(outer, np.float32) - np.asarray(inner, np.float32), 0, 255).astype(np.uint8)
    rgb = Image.fromarray(grad.astype(np.uint8))
    ring = rgb.copy(); ring.putalpha(Image.fromarray(ring_a))
    glow_a = Image.fromarray(ring_a).filter(ImageFilter.GaussianBlur(30)).point(lambda v: min(255, int(v * 2.2)))
    glow = rgb.copy(); glow.putalpha(glow_a)
    body = Image.new('RGBA', outer.size, (0, 0, 0, 0))
    b = Image.new('RGBA', (ow, oh), (8, 9, 12, 255)); b.putalpha(R.rounded_mask(ow, oh, 26))
    body.alpha_composite(b, (pad, pad))
    d = ImageDraw.Draw(body)
    d.line((pad, pad + BAR - 1, pad + ow, pad + BAR - 1), fill=BORDER + (255,))
    for i in range(3):
        cx, cy = pad + 28 + i * 22, pad + BAR // 2
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=(42, 47, 58, 255))
    g = R.svg('gize-monograma.svg', 22)
    body.alpha_composite(g, (pad + (ow - 22) // 2, pad + (BAR - 22) // 2))
    return glow, body, ring, pad

WGLOW, WBODY, WRING, WPAD = build_window()
CMASK = Image.new('L', (VW, VH), 255)
_m = R.rounded_mask(VW, VH + 60, 26)            # solo redondea las esquinas de abajo
CMASK.paste(_m.crop((0, 60, VW, VH + 60)), (0, 0))

def window_layer(content, scale=1.0, glow=1.0):
    L = Image.new('RGBA', WGLOW.size, (0, 0, 0, 0))
    g = WGLOW if glow >= 1 else fade(WGLOW, glow)
    L.alpha_composite(g); L.alpha_composite(WBODY)
    c = content.convert('RGBA'); c.putalpha(CMASK)
    L.alpha_composite(c, (WPAD, WPAD + BAR))
    L.alpha_composite(WRING)
    x, y = WX - WPAD, WY - WPAD
    if abs(scale - 1) > 1e-3:
        w, h = L.size; nw, nh = round(w * scale), round(h * scale)
        L = L.resize((nw, nh), Image.BICUBIC); x -= (nw - w) // 2; y -= (nh - h) // 2
    return L, x, y

# ---------- fuente ----------
def src_frames(start, end, speed, freeze=None, n=None):
    if freeze is not None:
        cmd = ['ffmpeg', '-v', 'error', '-ss', str(freeze), '-i', SRC, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
        raw = subprocess.run(cmd, capture_output=True, check=True).stdout
        return [Image.frombuffer('RGB', (SW, SH), raw[:SW * SH * 3])] * n
    n = round((end - start) / speed * FPS)
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', SRC, '-t', str(end - start + .5),
           '-vf', f'setpts=(PTS-STARTPTS)/{speed},fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    k = SW * SH * 3
    fr = [Image.frombuffer('RGB', (SW, SH), raw[i * k:(i + 1) * k]) for i in range(len(raw) // k)]
    while len(fr) < n: fr.append(fr[-1])
    return fr[:n]

def cam(kfs, u):
    """kfs: [(u, cx, cy, w)] → caja de recorte (x0, y0, x1, y1) en la grabación."""
    if u <= kfs[0][0]: a = b = kfs[0]; t = 0
    elif u >= kfs[-1][0]: a = b = kfs[-1]; t = 0
    else:
        for a, b in zip(kfs, kfs[1:]):
            if a[0] <= u <= b[0]: break
        t = ease_io((u - a[0]) / (b[0] - a[0]))
    cx, cy, w = (a[i] + (b[i] - a[i]) * t for i in (1, 2, 3))
    h = w * ASPECT
    x0 = min(max(cx - w / 2, 0), SW - w); y0 = min(max(cy - h / 2, 0), SH - h)
    return x0, y0, x0 + w, y0 + h

def render_content(frame, box):
    c = frame.resize((VW, VH), Image.LANCZOS, box=box)
    s = VW / (box[2] - box[0])
    if s > 1.3: c = c.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    return c, s

def map_box(src_box, crop, s):
    return tuple(round((v - crop[i % 2]) * s) for i, v in enumerate(src_box))

# ---------- escenas ----------
# (inicio, fin, velocidad, congelar, cámara, kicker, titular, bajada, resaltar)
BTN_CUENTA = (498, 386, 626, 428)
CAMPO_CODIGO = (546, 391, 761, 428)
BLOCKS = [
    (None, None, None, 0.2, [(0, 700, 312, 780), (1, 612, 330, 640)],
     '01 · INICIO', 'Entrenamiento con coach', 'Tu coach arma el plan y vos registrás cada serie.', None),
    (2.0, 10.0, 2.6, None, [(0, 700, 312, 780), (1, 690, 320, 740)],
     '02 · CÓMO FUNCIONA', 'Tres pasos y listo', 'Te vinculás, entrenás y progresan juntos.', None),
    (10.0, 13.2, 1.05, None, [(0, 700, 312, 780), (.55, 700, 312, 780), (1, 650, 260, 700)],
     '03 · LA APP', 'Todo lo que entrenás', 'Rutina, series, hábitos, cardio, nutrición y progreso.', None),
    (14.0, 16.2, 0.75, None, [(0, 650, 312, 760), (1, 625, 340, 660)],
     '04 · LO NUEVO', 'Lo nuevo, a la vista', 'Mensajes de tu coach, escáner de comidas y más.', None),
    (17.9, 19.3, 0.48, None, [(0, 650, 270, 740), (1, 650, 260, 700)],
     '05 · DOS PARTES', 'Vos y tu coach, conectados', 'Vos registrás, tu coach lo ve y ajusta el plan.', None),
    (21.6, 25.9, 1.4, None, [(0, 650, 330, 740), (1, 600, 370, 560)],
     '06 · EMPEZÁ', 'Creás tu cuenta en un toque', 'Desde el botón «Creá tu cuenta».', (BTN_CUENTA, 22.6, 25.5)),
    (26.3, 29.6, 1.1, None, [(0, 650, 330, 780), (.45, 650, 330, 780), (1, 653, 312, 580)],
     '07 · INGRESO', 'Entrás a la app', 'Te recibe con tu entrenamiento listo.', None),
    (29.6, 34.3, 1.55, None, [(0, 653, 300, 580), (.25, 653, 270, 440), (1, 653, 400, 440)],
     '08 · TU CUENTA', 'Creás tu cuenta o ingresás', 'Con el código de tu coach, quedan vinculados.', (CAMPO_CODIGO, 31.6, 99)),
]
HOOK_N, END_N, FREEZE_N = 78, 132, 90

def block_frame(bi, fi, n, frame, kfs, parts, tg, src_t, hl):
    c = R.aurora(tg, strength=.26, cy=.6).convert('RGBA')
    u = fi / max(n - 1, 1)
    box = cam(kfs, u)
    content, s = render_content(frame, box)
    if hl and src_t >= hl[1]:
        a = ease_out((src_t - hl[1]) / .35) * (1 - ease_out((src_t - hl[2]) / .3))
        content = R2.ring_highlight(content, map_box(hl[0], box, s), a, src_t)
    enter = ease_out(fi / 14)
    L, x, y = window_layer(content, scale=.97 + .03 * enter, glow=.55 + .45 * enter)
    c.alpha_composite(L, (x, y + int((1 - enter) * 40)))
    R.draw_parts(c, parts, R.TEXT_TOP, fi, delay=2)
    return c.convert('RGB')

def hook_frame(f):
    c = R.aurora(f / FPS + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    d = ImageDraw.Draw(c)
    k = ease_out(f / 12)
    g = R.svg('gize-monograma.svg', 200)
    c.alpha_composite(fade(g, k), ((W - 200) // 2, 500))
    fk = R.F_MONO(28); txt = 'CONOCÉ LA WEB'
    a = ease_out((f - 6) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(txt, font=fk)) / 2, 4), txt, font=fk, fill=BLUE)
        c.alpha_composite(fade(lay, a), (0, 760))
    fh = R.F_H(120); ln = 'Chau planillas.'
    a = ease_out((f - 10) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 150), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, int(830 + (1 - a) * 30)))
    fs = R.F_S(42)
    for i, ln in enumerate(['Tu coach, tu rutina y tu progreso', 'en un solo lugar.']):
        a = ease_out((f - 30 - i * 5) / 12)
        if a <= 0: continue
        lay = Image.new('RGBA', (W, 60), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fs)) / 2, 0), ln, font=fs, fill=TEXT2)
        c.alpha_composite(fade(lay, a), (0, int(1000 + i * 56 + (1 - a) * 20)))
    img = c.convert('RGB')
    img = R.aberration(img, 22 * max(0, 1 - f / 9) + (12 if f in (29, 30) else 0))
    if f < 7 or f in (29, 30): img = R.glitch(img, 1.0 if f < 4 or f in (29, 30) else .5, f)
    return img

def cta(c, f, txt):
    d = ImageDraw.Draw(c)
    a3 = ease_out((f - 34) / 16)
    if a3 > 0:
        fb = R.F_H(40)
        tw = d.textlength(txt, font=fb); bw, bh = int(tw + 110), 104; pad = 60
        lay = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), (0, 0, 0, 0))
        ang = f / FPS / 5 * 2 * math.pi
        grad = R.ring_gradient(bw + 2 * pad, bh + 2 * pad, bw / 2 + pad + 400 * math.cos(ang), bh / 2 + pad + 400 * math.sin(ang))
        ring_m = Image.new('L', lay.size, 0); ring_m.paste(R.rounded_mask(bw + 6, bh + 6, (bh + 6) // 2), (pad - 3, pad - 3))
        rg = Image.fromarray(grad.astype(np.uint8)).convert('RGBA')
        g = rg.copy(); g.putalpha(ring_m.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * .8))); lay.alpha_composite(g)
        r = rg.copy(); r.putalpha(ring_m); lay.alpha_composite(r)
        btn = Image.new('RGBA', (bw, bh), (255, 255, 255, 255)); btn.putalpha(R.rounded_mask(bw, bh, bh // 2))
        lay.alpha_composite(btn, (pad, pad))
        ImageDraw.Draw(lay).text((pad + 55, pad + 24), txt, font=fb, fill=(0, 0, 0))
        c.alpha_composite(fade(lay, a3), ((W - lay.width) // 2, int(1160 - pad + (1 - a3) * 20)))
    return c.convert('RGB')

def end_frame(f):
    c = R.aurora(f / FPS + 40, strength=.34, cy=.45).convert('RGBA')
    a = ease_out(f / 22); s = .94 + .06 * a
    fi = R.FIRMA.resize((int(R.FIRMA.width * s), int(R.FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, a), ((W - fi.width) // 2, 640 + (R.FIRMA.height - fi.height) // 2))
    d = ImageDraw.Draw(c); fh = R.F_H(62)
    for i, ln in enumerate(['Empezá a entrenar', 'con método.']):
        a2 = ease_out((f - 12 - i * 6) / 14)
        if a2 <= 0: continue
        lay = Image.new('RGBA', (W, 90), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT if i == 0 else TEXT2)
        c.alpha_composite(fade(lay, a2), (0, int(930 + i * 76 + (1 - a2) * 24)))
    return cta(c, f, 'Creá tu cuenta')

def scenes():
    """Generador perezoso: carga los cuadros de una escena por vez."""
    yield 'hook', HOOK_N, hook_frame
    tg = HOOK_N / FPS
    for bi, (s, e, sp, frz, kfs, k, h, sub, hl) in enumerate(BLOCKS):
        frames = src_frames(s, e, sp, freeze=frz, n=FREEZE_N)
        parts = R.text_parts(k, h, sub)
        n = len(frames)
        s0, sp0 = (s, sp) if frz is None else (frz, 0)
        yield f'b{bi}', n, (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg, kfs=kfs, s0=s0, sp0=sp0, hl=hl:
                             block_frame(bi, fi, n, frames[fi], kfs, parts, tg + fi / FPS, s0 + fi / FPS * sp0, hl))
        tg += n / FPS
    yield 'end', END_N, end_frame

def main(out):
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total, prev_last = 0, None
    for si, (name, n, fn) in enumerate(scenes()):
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
    if len(sys.argv) > 2: SRC = sys.argv[2]
    main(sys.argv[1])
