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
def _load(name, path):
    s_ = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(s_); s_.loader.exec_module(m); return m
R3 = _load('reel3', os.path.join(HERE, '..', 'reel-escaner', 'reel.py'))
R2 = _load('reel2', os.path.join(HERE, '..', 'reel-video-ejercicio', 'reel.py'))
from reel import W, H, FPS, TEXT, TEXT2, BLUE, GAMA, ease_out, ease_io, fade

SRC_APP = os.path.join(HERE, 'src/in.mp4')
SRC_SCAN = os.path.join(HERE, 'src/in3.mp4')
SRC_VID = os.path.join(HERE, 'src/in2.mp4')
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


# ---------- escáner: primer plano del código de barras (sin mano ni caja) ----------
PS = R.PS
def sbox(x0, y0, x1, y1): return tuple(round(v * PS) for v in (x0, y0 - 38, x1, y1 - 38))
VIEW = sbox(15, 108, 370, 693)          # visor de la cámara
GUIDE = sbox(43, 297, 341, 506)         # marco guía

_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011']
_G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111']
_R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100']
_PAR = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL']
def ean13(code):
    d = [int(c) for c in code]
    bits = '101'
    for i, c in enumerate(d[1:7]): bits += (_L if _PAR[d[0]][i] == 'L' else _G)[c]
    bits += '01010'
    for c in d[7:]: bits += _R[c]
    return bits + '101'

def barcode_label(w, h, code='7790070411914'):
    """Etiqueta blanca con el código EAN-13 y sus números, a resolución alta."""
    ss = 3; W_, H_ = w * ss, h * ss
    lab = Image.new('RGB', (W_, H_), (238, 236, 231)); d = ImageDraw.Draw(lab)
    bits = ean13(code); mod = (W_ * .78) / len(bits); x0 = (W_ - mod * len(bits)) / 2
    top, bot = H_ * .18, H_ * .70
    guards = set(list(range(0, 3)) + list(range(45, 50)) + list(range(92, 95)))
    for i, b in enumerate(bits):
        if b == '1':
            d.rectangle((x0 + i * mod, top, x0 + (i + 1) * mod - 1, bot + (H_ * .06 if i in guards else 0)), fill=(18, 18, 20))
    f = R.F_M(int(H_ * .11))
    d.text((x0 - mod * 9, bot + H_ * .02), code[0], font=f, fill=(18, 18, 20))
    for part, start in ((code[1:7], 3), (code[7:], 50)):
        cx = x0 + (start + 21) * mod
        tw = d.textlength(part, font=f); d.text((cx - tw / 2, bot + H_ * .02), part, font=f, fill=(18, 18, 20))
    return lab.resize((w, h), Image.LANCZOS)

VW, VH = VIEW[2] - VIEW[0], VIEW[3] - VIEW[1]
_GW = GUIDE[2] - GUIDE[0]
LABEL = barcode_label(int(_GW * 1.12), int(_GW * .62))
VMASK = R.rounded_mask(VW, VH, 16)

def fake_camera(src_t):
    """Lo que ve la cámara: la etiqueta en primer plano, con enfoque, leve movimiento y lectura."""
    bg = np.zeros((VH, VW, 3), np.float32)
    yy, xx = np.mgrid[0:VH, 0:VW].astype(np.float32)
    v = 1 - .55 * np.clip(np.hypot((xx - VW / 2) / VW, (yy - VH * .45) / VH) * 1.6, 0, 1)
    bg += (np.array([206, 203, 197], np.float32) * v[..., None])
    cam = Image.fromarray(bg.astype(np.uint8))
    t = src_t - 4.2
    s = 1.0 + .03 * math.sin(t * 1.7)
    lab = LABEL.resize((int(LABEL.width * s), int(LABEL.height * s)), Image.LANCZOS)
    dx = int(6 * math.sin(t * 2.3)); dy = int(5 * math.cos(t * 1.9))
    gx0, gy0, gx1, gy1 = [v_ - o for v_, o in zip(GUIDE, (VIEW[0], VIEW[1], VIEW[0], VIEW[1]))]
    cx, cy = (gx0 + gx1) // 2, (gy0 + gy1) // 2
    cam.paste(lab, (cx - lab.width // 2 + dx, cy - lab.height // 2 + dy))
    focus = max(0, 1 - t / .5)
    if focus > 0: cam = cam.filter(ImageFilter.GaussianBlur(10 * focus))
    return cam, (gx0, gy0, gx1, gy1)

def scan_overlay(frame, src_t):
    if src_t < 4.2 or src_t > 7.46: return frame
    frame = frame.copy().convert('RGBA')
    cam, (gx0, gy0, gx1, gy1) = fake_camera(src_t)
    a = min(1, (src_t - 4.2) / .25)
    c = cam.convert('RGBA'); c.putalpha(VMASK.point(lambda v_: int(v_ * a)))
    frame.alpha_composite(c, VIEW[:2])
    # marco guía con la gama y línea de lectura
    read = src_t >= 6.9
    gw, gh = gx1 - gx0, gy1 - gy0
    ring = Image.fromarray(R.ring_gradient(gw + 8, gh + 8, gw / 2, gh / 2).astype(np.uint8)).convert('RGBA')
    m = Image.new('L', ring.size, 0); ImageDraw.Draw(m).rounded_rectangle((2, 2, gw + 5, gh + 5), 18, outline=255, width=4)
    if read: ring = Image.new('RGBA', ring.size, (37, 232, 200, 255))
    ring.putalpha(m.point(lambda v_: int(v_ * a)))
    frame.alpha_composite(ring, (VIEW[0] + gx0 - 4, VIEW[1] + gy0 - 4))
    d = ImageDraw.Draw(frame)
    if read:
        ly = VIEW[1] + (gy0 + gy1) // 2
        d.line((VIEW[0] + gx0 + 20, ly, VIEW[0] + gx1 - 20, ly), fill=(37, 232, 200), width=4)
        ok = 'Código leído'
        f_ = R.F_M(30); tw = d.textlength(ok, font=f_)
        pill = (VIEW[0] + (gx0 + gx1) // 2 - tw / 2 - 22, VIEW[1] + gy1 + 26, VIEW[0] + (gx0 + gx1) // 2 + tw / 2 + 22, VIEW[1] + gy1 + 80)
        d.rounded_rectangle(pill, 27, fill=(37, 232, 200))
        d.text((pill[0] + 22, pill[1] + 9), ok, font=f_, fill=(0, 0, 0))
    else:
        p = (math.sin((src_t - 4.2) * 3.2) + 1) / 2
        ly = VIEW[1] + gy0 + 24 + p * (gh - 48)
        d.line((VIEW[0] + gx0 + 20, ly, VIEW[0] + gx1 - 20, ly), fill=(255, 60, 60), width=3)
    return frame.convert('RGB')

# ---------- escenas ----------
SCENES = [
    # (fuente, ini, fin, velocidad, líneas, kicker, color, giro, tipo)
    (SRC_APP, 1.6, 7.5, 4.0, ['TU COACH', 'ARMA EL PLAN'], '01 · RUTINA', GAMA[0], -3, None),
    (SRC_APP, 8.0, 15.0, 5.0, ['VOS', 'ANOTÁS'], '02 · SERIES', GAMA[1], 3, None),
    (SRC_APP, 15.0, 21.0, 4.0, ['CADA SERIE', 'CUENTA'], '03 · REGISTRO', GAMA[2], -2, None),
    (SRC_VID, 4.3, 6.8, 1.7, ['¿TE OLVIDASTE', 'LA TÉCNICA?'], '04 · TÉCNICA', GAMA[3], 3, 'boton'),
    (SRC_VID, 7.9, 11.5, 2.4, ['MIRÁ EL VIDEO', 'DEL EJERCICIO'], '05 · VIDEO', GAMA[0], -3, 'yt'),
    (SRC_SCAN, 4.0, 7.4, 2.4, ['ESCANEÁS', 'LA COMIDA'], '06 · COMIDA', GAMA[1], 3, 'scan'),
    (SRC_SCAN, 8.4, 10.3, 1.3, ['CALORÍAS', 'AL GRAMO'], '07 · MACROS', GAMA[2], -3, 'scan'),
    (SRC_APP, 30.0, 38.0, 5.5, ['CRONÓMETRO', 'Y DESCANSO'], '08 · CARDIO', GAMA[3], 2, None),
    (SRC_APP, 67.5, 73.8, 4.5, ['TU PROGRESO', 'EN DATOS'], '09 · PROGRESO', GAMA[0], -3, None),
    (SRC_APP, 60.5, 64.6, 2.9, ['TU COACH', 'LO VE TODO'], '10 · COACH', GAMA[1], 3, None),
]
HOOK_N, END_N = 48, 105

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
import cairosvg, io
def _icon(name, size):
    svg = open(os.path.join(HERE, name + '.svg')).read().replace('<path ', '<path fill="#FFFFFF" ')
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size))).convert('RGBA')
APPLE, ANDROID = _icon('apple', 92), _icon('android', 92)
LAUNCH = [(APPLE, 'iPhone', '29.09'), (ANDROID, 'Android', '10.10')]

def end_frame(f):
    c = bg(f, GAMA[0]).convert('RGBA')
    k = ease_out(min(1, f / 6)); s = 1.3 - .3 * k
    fi = FIRMA.resize((int(FIRMA.width * s), int(FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, min(1, f / 3)), (X0 - int((fi.width - FIRMA.width) * .1), 300 - (fi.height - FIRMA.height) // 2))
    lay = words_layer(['ENTRENÁ CON', 'TU COACH.'], 120, color_last=True)
    slam(c, lay, f, 520, 6)
    # fechas de lanzamiento, una fila por tienda
    d = ImageDraw.Draw(c)
    for i, (ic, name, date) in enumerate(LAUNCH):
        a = ease_out((f - 16 - i * 6) / 9)
        if a <= 0: continue
        y = 860 + i * 150
        row = Image.new('RGBA', (W, 140), (0, 0, 0, 0)); rd = ImageDraw.Draw(row)
        row.alpha_composite(ic, (X0, 20))
        rd.text((X0 + 124, 34), name, font=R.F_S(58), fill=TEXT2)
        fd = R.F_H(96)
        rd.text((W - 170 - rd.textlength(date, font=fd), 12), date, font=fd, fill=TEXT)
        rd.line((X0, 136, W - 170, 136), fill=(255, 255, 255, 40), width=2)
        c.alpha_composite(fade(row, a), (int((1 - a) * -60), y))
    a = ease_out((f - 34) / 10)
    if a > 0:
        fb = R.F_H(60); txt = 'gize.ar'
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
        c.alpha_composite(fade(lay2, a), (X0 - pad, int(1200 - pad + (1 - a) * 30)))
    img = c.convert('RGB')
    return cut_fx(img, f) if f < 4 else img

def scenes():
    yield 'hook', HOOK_N, hook_frame
    for i, (src, s, e, sp, lines, kick, col, rot, kind) in enumerate(SCENES):
        R.SRC = src
        if kind == 'scan':
            frames = [scan_overlay(fr, s + j / FPS * sp) for j, fr in enumerate(R3.prepare('scan', s, e, sp))]
        elif kind in ('boton', 'yt'):
            frames = R2.prepare(kind, s, e, sp)
        else:
            frames = R.clip_frames(s, e, sp)
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
