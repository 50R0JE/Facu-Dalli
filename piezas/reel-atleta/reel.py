"""GIZE · reel 'vista del atleta'. 1080x1920 30fps, sin audio."""
import subprocess, sys, os, io, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cairosvg

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
SRC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'src/in.mp4')
W, H, FPS = 1080, 1920, 30
F = lambda n: os.path.join(HERE, 'fonts', n)

BG = (0, 0, 0)
TEXT = (255, 255, 255)
TEXT2 = (143, 152, 166)
BLUE = (47, 160, 255)
GAMA = [(47, 160, 255), (166, 92, 255), (255, 61, 174), (37, 232, 200)]
SURF = (11, 13, 17)
BORDER = (28, 32, 41)

def font(name, size): return ImageFont.truetype(F(name), size)
F_H = lambda s: font('Outfit-Bold.ttf', s)
F_S = lambda s: font('Outfit-Regular.ttf', s)
F_M = lambda s: font('outfit-latin-600-normal.woff', s)
F_MONO = lambda s: font('JetBrainsMono-Bold.ttf', s)

def ease_out(t): t = min(max(t, 0), 1); return 1 - (1 - t) ** 3
def ease_io(t): t = min(max(t, 0), 1); return t * t * (3 - 2 * t)

def svg(path, width):
    png = cairosvg.svg2png(url=os.path.join(REPO, 'brand/logo', path), output_width=width)
    return Image.open(io.BytesIO(png)).convert('RGBA')

# ---------- aurora ----------
AW, AH = 108, 192
yy, xx = np.mgrid[0:AH, 0:AW].astype(np.float32)
VIG = (0.35 + 0.65 * np.sin(np.clip(yy / AH, 0, 1) * math.pi) ** 1.5)[..., None]
def aurora(t, strength=0.42, cy=0.5):
    acc = np.zeros((AH, AW, 3), np.float32)
    base = [(-.05, .15), (.45, .05), (.75, .55), (.1, .7)]
    for i, ((bx, by), col) in enumerate(zip(base, GAMA)):
        ph = t / 20 * 2 * math.pi + i * 1.7
        x = (bx + .10 * math.sin(ph) + .2) * AW
        y = (by + .07 * math.cos(ph * .8) + (cy - .5)) * AH
        s = (0.26 + .04 * math.sin(ph * 1.3)) * AW
        g = np.exp(-(((xx - x) ** 2 + (yy - y) ** 2) / (2 * s * s)))
        acc = 1 - (1 - acc) * (1 - g[..., None] * np.array(col, np.float32) / 255 * strength)
    acc *= VIG
    return Image.fromarray((acc * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)

# ---------- phone ----------
PS = 1.38
CW, CH = round(384 * PS), round(794 * PS)       # contenido
BZ = 10                                           # bisel
PW, PH = CW + 2 * BZ, CH + 2 * BZ
PX, PY = (W - PW) // 2, 548

def ring_gradient(w, h, cx, cy):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    a = (np.arctan2(y - cy, x - cx) / (2 * np.pi)) % 1.0
    stops = np.array(GAMA + [GAMA[0]], np.float32)
    idx = a * 4; i0 = np.floor(idx).astype(int); fr = (idx - i0)[..., None]
    return stops[i0] * (1 - fr) + stops[np.minimum(i0 + 1, 4)] * fr

def rounded_mask(w, h, r, ss=3):
    m = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), r * ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def build_phone_chrome():
    pad = 90
    grad = ring_gradient(PW + 2 * pad, PH + 2 * pad, PW / 2 + pad, PH / 2 + pad)
    outer = Image.new('L', (PW + 2 * pad, PH + 2 * pad), 0)
    outer.paste(rounded_mask(PW + 4, PH + 4, 54), (pad - 2, pad - 2))
    inner = Image.new('L', outer.size, 0)
    inner.paste(rounded_mask(PW, PH, 52), (pad, pad))
    ring_a = np.clip(np.asarray(outer, np.float32) - np.asarray(inner, np.float32), 0, 255)
    rgb = Image.fromarray(grad.astype(np.uint8))
    ring = rgb.copy(); ring.putalpha(Image.fromarray(ring_a.astype(np.uint8)))
    glow_a = Image.fromarray(ring_a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(28))
    glow_a = glow_a.point(lambda v: min(255, int(v * 2.2)))
    glow = rgb.copy(); glow.putalpha(glow_a)
    body = Image.new('RGBA', outer.size, (0, 0, 0, 0))
    b = Image.new('RGBA', (PW, PH), SURF + (255,)); b.putalpha(rounded_mask(PW, PH, 52))
    body.alpha_composite(b, (pad, pad))
    return glow, body, ring, pad

GLOW, BODY, RING, PAD = build_phone_chrome()
SCREEN_MASK = rounded_mask(CW, CH, 42)

def phone_layer(content, scale=1.0, glow=1.0):
    """Devuelve (RGBA, x, y) del teléfono completo con glow."""
    L = Image.new('RGBA', GLOW.size, (0, 0, 0, 0))
    if glow > 0:
        g = GLOW.copy()
        if glow < 1: g.putalpha(g.getchannel('A').point(lambda v: int(v * glow)))
        L.alpha_composite(g)
    L.alpha_composite(BODY)
    c = content.convert('RGBA'); c.putalpha(SCREEN_MASK)
    L.alpha_composite(c, (PAD + BZ, PAD + BZ))
    L.alpha_composite(RING)
    x, y = PX - PAD, PY - PAD
    if abs(scale - 1) > 1e-3:
        w, h = L.size
        nw, nh = round(w * scale), round(h * scale)
        L = L.resize((nw, nh), Image.BICUBIC)
        x -= (nw - w) // 2; y -= (nh - h) // 2
    return L, x, y

# ---------- source clips ----------
def clip_frames(start, end, speed):
    n = round((end - start) / speed * FPS)
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', SRC, '-t', str(end - start + .5),
           '-vf', f'crop=384:794:0:38,setpts=(PTS-STARTPTS)/{speed},fps={FPS},scale={CW}:{CH}:flags=lanczos',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    fs = len(raw) // (CW * CH * 3)
    frames = [Image.frombuffer('RGB', (CW, CH), raw[i * CW * CH * 3:(i + 1) * CW * CH * 3]) for i in range(fs)]
    while len(frames) < n: frames.append(frames[-1])
    return frames[:n]

# ---------- text ----------
MARGIN = 84
def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ''
    for w_ in words:
        t = (cur + ' ' + w_).strip()
        if draw.textlength(t, font=fnt) <= maxw: cur = t
        else: lines.append(cur); cur = w_
    lines.append(cur); return lines

def text_parts(kicker, head, sub, head_size=74):
    """Tres capas RGBA (kicker, titular, bajada) y sus y relativos."""
    d = ImageDraw.Draw(Image.new('L', (1, 1)))
    parts, y = [], 0
    fk = F_MONO(26)
    k = Image.new('RGBA', (W, 40), (0, 0, 0, 0))
    ImageDraw.Draw(k).text((MARGIN, 4), kicker, font=fk, fill=BLUE)
    parts.append((k, y)); y += 50
    while d.textlength(head, font=F_H(head_size)) > W - 2 * MARGIN: head_size -= 2
    fh = F_H(head_size)
    lines = wrap(d, head, fh, W - 2 * MARGIN)
    lh = int(head_size * 1.08)
    h = Image.new('RGBA', (W, lh * len(lines) + 20), (0, 0, 0, 0))
    for i, ln in enumerate(lines):
        ImageDraw.Draw(h).text((MARGIN - 3, i * lh), ln, font=fh, fill=TEXT)
    parts.append((h, y)); y += lh * len(lines) + 14
    fs = F_S(34)
    sl = wrap(d, sub, fs, W - 2 * MARGIN)
    s = Image.new('RGBA', (W, 46 * len(sl) + 12), (0, 0, 0, 0))
    for i, ln in enumerate(sl):
        ImageDraw.Draw(s).text((MARGIN, i * 46), ln, font=fs, fill=TEXT2)
    parts.append((s, y))
    return parts

def fade(img, a):
    if a >= 1: return img
    img = img.copy(); img.putalpha(img.getchannel('A').point(lambda v: int(v * a))); return img

def draw_parts(canvas, parts, top, f, delay=0, stagger=4, dur=11, rise=26):
    for i, (im, y) in enumerate(parts):
        t = ease_out((f - delay - i * stagger) / dur)
        if t <= 0: continue
        canvas.alpha_composite(fade(im, t), (0, int(top + y + (1 - t) * rise)))

# ---------- efectos ----------
def aberration(img, px):
    if px < 1: return img
    a = np.asarray(img.convert('RGB')).copy()
    a[..., 0] = np.roll(a[..., 0], int(px), axis=1)
    a[..., 2] = np.roll(a[..., 2], -int(px), axis=1)
    return Image.fromarray(a)

def glitch(img, amount, seed):
    if amount <= 0: return img
    rng = np.random.default_rng(seed)
    a = np.asarray(img.convert('RGB')).copy()
    for _ in range(int(6 * amount) + 1):
        y0 = rng.integers(0, H - 60); hh = rng.integers(8, 70)
        a[y0:y0 + hh] = np.roll(a[y0:y0 + hh], int(rng.integers(-60, 60) * amount), axis=1)
    return Image.fromarray(a)

def wipe(old, new, p):
    """Barrido diagonal con filete RGB. p 0→1."""
    band = 36
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = x + (H - y) * 0.45
    pos = -band * 2 + p * (W + H * 0.45 + band * 4)
    o = np.asarray(old.convert('RGB'), np.float32); n = np.asarray(new.convert('RGB'), np.float32)
    m = (d < pos)[..., None]
    out = np.where(m, n, o)
    edge = np.clip(1 - np.abs(d - pos) / band, 0, 1)[..., None]
    t = (y / H)[..., None] * 3
    i0 = np.clip(np.floor(t).astype(int), 0, 2)
    stops = np.array(GAMA, np.float32)
    col = stops[i0[..., 0]] * (1 - (t - i0)) + stops[i0[..., 0] + 1] * (t - i0)
    out = out * (1 - edge * .9) + col * edge * .9 + col * (edge ** 3) * .3
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

# ---------- escenas ----------
BLOCKS = [
    # (start, end, speed, kicker, titular, bajada)
    (1.6, 7.5, 1.8, '01 · ENTRENO', 'Tu rutina, lista', 'La arma tu coach y te llega dividida por día.'),
    (8.0, 20.4, 3.8, '02 · ENTRENO', 'Anotás kg y reps al toque', 'Con lo que hiciste la vez pasada a la vista.'),
    (23.4, 29.4, 2.0, '03 · HÁBITOS', 'Tu checklist diario', 'Tildás y listo. Se reinicia solo cada día.'),
    (29.6, 40.0, 3.3, '04 · CARDIO', 'Cronómetro y temporizador', 'Con el cardio que te marcó tu coach.'),
    (40.0, 43.2, 1.05, '05 · COMIDA', 'Macros e hidratación', 'Proteína, carbos, grasas y agua, de un vistazo.'),
    (43.2, 52.0, 2.8, '06 · COMIDA', 'Tu plan de comidas', 'Armado por tu coach, con opciones y reemplazos.'),
    (52.0, 55.2, 1.05, '07 · PROGRESO', 'Volumen semanal', 'Tus series por grupo muscular, sumadas solas.'),
    (55.0, 57.4, 0.8, '08 · PROGRESO', 'Check-in semanal', 'Cómo te sentiste y tus fotos, directo a tu coach.'),
    (59.5, 67.0, 2.4, '09 · PROGRESO', 'Historial de entrenos', 'Cada sesión se abre con pesos, series y volumen.'),
    (67.5, 73.8, 2.0, '10 · PROGRESO', 'Evolución de cargas', 'Elegís un ejercicio y ves cómo sube tu máximo.'),
    (74.0, 81.7, 2.6, '11 · PROGRESO', 'Peso corporal', 'Registrás el día y seguís tu curva.'),
]
TEXT_TOP = 258
HOOK_N, END_N, WIPE_N = 78, 132, 8

LOGO_G = svg('gize-monograma.svg', 230)
FIRMA = svg('gize-firma-horizontal.svg', 600)

def hook_frame(f):
    t = f / FPS
    c = aurora(t + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    k = ease_out(f / 12)
    g = LOGO_G.resize((int(230 * (0.85 + .15 * k)),) * 2, Image.LANCZOS)
    c.alpha_composite(fade(g, k), ((W - g.width) // 2, 470 + (230 - g.width) // 2))
    d = ImageDraw.Draw(c)
    fk = F_MONO(28); txt = 'VISTA DEL ATLETA'
    a = ease_out((f - 6) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(txt, font=fk)) / 2, 4), txt, font=fk, fill=BLUE)
        c.alpha_composite(fade(lay, a), (0, 790))
    fh = F_H(96)
    for i, (ln, st) in enumerate([('Tu coach arma el plan.', 10), ('Vos lo tenés acá.', 30)]):
        a = ease_out((f - st) / 10)
        if a <= 0: continue
        lay = Image.new('RGBA', (W, 120), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT if i == 0 else TEXT)
        c.alpha_composite(fade(lay, a), (0, int(860 + i * 112 + (1 - a) * 30)))
    img = c.convert('RGB')
    ab = 22 * max(0, 1 - f / 9) + (12 if f in (31, 32) else 0)
    img = aberration(img, ab)
    if f < 7 or f in (31, 32): img = glitch(img, 1.0 if f < 4 or f in (31, 32) else .5, f)
    return img

def block_frame(bi, fi, n, content, parts, t_global):
    c = aurora(t_global, strength=.26, cy=.6).convert('RGBA')
    p = fi / max(n - 1, 1)
    enter = ease_out(fi / 14)
    ph, x, y = phone_layer(content, scale=(0.965 + .035 * enter) * (1 + .025 * p), glow=.55 + .45 * enter)
    c.alpha_composite(ph, (x, y + int((1 - enter) * 40)))
    draw_parts(c, parts, TEXT_TOP, fi, delay=2)
    return c.convert('RGB')

def end_frame(f):
    t = f / FPS
    c = aurora(t + 40, strength=.34, cy=.45).convert('RGBA')
    a = ease_out(f / 22)
    s = .94 + .06 * a
    fi = FIRMA.resize((int(FIRMA.width * s), int(FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, a), ((W - fi.width) // 2, 640 + (FIRMA.height - fi.height) // 2))
    d = ImageDraw.Draw(c)
    fh = F_H(62)
    for i, ln in enumerate(['Entrenás vos.', 'Te guía tu coach.']):
        a2 = ease_out((f - 12 - i * 6) / 14)
        if a2 <= 0: continue
        lay = Image.new('RGBA', (W, 90), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT if i == 0 else TEXT2)
        c.alpha_composite(fade(lay, a2), (0, int(930 + i * 76 + (1 - a2) * 24)))
    # CTA con anillo RGB (una sola acción)
    a3 = ease_out((f - 34) / 16)
    if a3 > 0:
        fb = F_H(40); txt = 'Pedile tu código a tu coach'
        tw = d.textlength(txt, font=fb); bw, bh = int(tw + 110), 104
        pad = 60
        lay = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), (0, 0, 0, 0))
        ang = f / FPS / 5 * 2 * math.pi
        grad = ring_gradient(bw + 2 * pad, bh + 2 * pad, bw / 2 + pad + 400 * math.cos(ang), bh / 2 + pad + 400 * math.sin(ang))
        ring_m = Image.new('L', lay.size, 0); ring_m.paste(rounded_mask(bw + 6, bh + 6, (bh + 6) // 2), (pad - 3, pad - 3))
        rg = Image.fromarray(grad.astype(np.uint8)).convert('RGBA')
        glow_m = ring_m.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * .8))
        g = rg.copy(); g.putalpha(glow_m); lay.alpha_composite(g)
        r = rg.copy(); r.putalpha(ring_m); lay.alpha_composite(r)
        btn = Image.new('RGBA', (bw, bh), (255, 255, 255, 255)); btn.putalpha(rounded_mask(bw, bh, bh // 2))
        lay.alpha_composite(btn, (pad, pad))
        ImageDraw.Draw(lay).text((pad + 55, pad + 24), txt, font=fb, fill=(0, 0, 0))
        c.alpha_composite(fade(lay, a3), ((W - lay.width) // 2, int(1160 - pad + (1 - a3) * 20)))
    return c.convert('RGB')

# ---------- render ----------
def scenes():
    """Genera (nombre, lista de funciones de cuadro)."""
    yield 'hook', HOOK_N, hook_frame
    tg = HOOK_N / FPS
    for bi, (s, e, sp, k, h, sub) in enumerate(BLOCKS):
        frames = clip_frames(s, e, sp)
        parts = text_parts(k, h, sub)
        n = len(frames)
        yield f'b{bi}', n, (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg: block_frame(bi, fi, n, frames[fi], parts, tg + fi / FPS))
        tg += n / FPS
    yield 'end', END_N, end_frame

def main(out, only=None):
    sc = list(scenes())
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total = 0
    for si, (name, n, fn) in enumerate(sc):
        if only and name not in only: continue
        for fi in range(n):
            img = fn(fi)
            # barrido de entrada: primeros WIPE_N cuadros mezclan con el último de la escena anterior
            if si > 0 and fi < WIPE_N and not only:
                img = wipe(prev_last, img, ease_io((fi + 1) / (WIPE_N + 1)))
            ff.stdin.write(img.tobytes()); total += 1
            last = img
        prev_last = fn(n - 1) if si + 1 < len(sc) else None
        print(name, n, file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait()
    print('frames', total, 'seg', total / FPS)

if __name__ == '__main__':
    main(sys.argv[1])
