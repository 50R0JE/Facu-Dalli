"""GIZE · reel 'video de cada ejercicio'. Reusa el motor de reel.py.
Uso: python3 reel.py salida.mp4 grabacion.mp4"""
import sys, os, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "reel-atleta"))
import reel as R
from reel import W, H, FPS, CW, CH, TEXT, TEXT2, BLUE, GAMA, SURF, BORDER, ease_out, ease_io, fade

SRC_CROP_TOP, PS = 38, R.PS
def src_box(x0, y0, x1, y1):
    """Coordenadas de la grabación original → coordenadas del contenido escalado."""
    return tuple(round(v * PS) for v in (x0, y0 - SRC_CROP_TOP, x1, y1 - SRC_CROP_TOP))

BTN = src_box(30, 261, 194, 296)          # botón "Ver video del ejercicio" (ya scrolleado)
HANDLE = src_box(0, 672, 250, 716)         # @usuario del Short de YouTube
COACH_NAME = src_box(280, 40, 384, 100)     # nombre del coach en la cabecera
SURF2 = (18, 21, 27)
GREEN = (37, 232, 200)

# ---------- pantalla simulada del coach ----------
def fnt(kind, s): return {'b': R.F_H, 'r': R.F_S, 'm': R.F_M, 'mono': R.F_MONO}[kind](s)

URL = 'https://youtu.be/k7Qx2LmVb9s'
G34 = R.svg('gize-monograma.svg', 34)

def tri(d, cx, cy, open_, col):
    """Flecha de <details>: apunta a la derecha cerrada y abajo abierta."""
    a = math.pi / 2 * min(max(open_, 0), 1)
    pts = [(7, 0), (-5, -6), (-5, 6)]
    d.polygon([(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts], fill=col)

def coach_screen(f, n):
    """Editor de rutina del coach: se abre 'Link de video' y se pega el link."""
    im = Image.new('RGB', (CW, CH), (0, 0, 0))
    d = ImageDraw.Draw(im)
    # cabecera
    g = G34
    im.paste(g, (22, 34), g)
    d.text((64, 36), 'Rutinas', font=fnt('b', 28), fill=TEXT)
    chip = 'MODO COACH'
    cw_ = d.textlength(chip, font=fnt('mono', 15)) + 24
    d.rounded_rectangle((CW - 22 - cw_, 38, CW - 22, 68), 15, outline=BLUE, width=2)
    d.text((CW - 22 - cw_ + 12, 44), chip, font=fnt('mono', 15), fill=BLUE)
    # pestañas de día
    x = 22
    for i, t in enumerate(['Torso', 'Piernas', 'Pecho/Espalda']):
        tw = d.textlength(t, font=fnt('m', 18)) + 30
        d.rounded_rectangle((x, 96, x + tw, 136), 12, fill=SURF2 if i else (14, 30, 48), outline=BLUE if i == 0 else BORDER, width=2 if i == 0 else 1)
        d.text((x + 15, 104), t, font=fnt('m', 18), fill=TEXT if i == 0 else TEXT2)
        x += tw + 10
    # tarjeta del ejercicio
    top = 164
    t_open = 1.4 * FPS                      # toca "Link de video"
    t_type0, t_type1 = 2.0 * FPS, 3.4 * FPS
    t_ok = 3.7 * FPS
    card_h = 462
    op = ease_out((f - t_open) / 8)
    card_h += int(96 * op)
    d.rounded_rectangle((16, top, CW - 16, top + card_h), 18, fill=SURF, outline=BORDER)
    # filete RGB arriba
    line = np.zeros((3, CW - 60, 3), np.float32)
    for xx in range(CW - 60):
        p = xx / (CW - 61) * 3; i0 = min(int(p), 2); fr = p - i0
        line[:, xx] = np.array(GAMA[i0]) * (1 - fr) + np.array(GAMA[i0 + 1]) * fr
    im.paste(Image.fromarray(line.astype(np.uint8)), (30, top))
    d.text((34, top + 24), 'Vuelos laterales sentado', font=fnt('b', 25), fill=TEXT)
    # fila orden / RIR / descanso
    y = top + 76
    x = 34
    for lbl, val in [('Orden', 'A1'), ('RIR', '2-0'), ('Descanso', '90 s')]:
        d.text((x, y + 9), lbl, font=fnt('r', 16), fill=TEXT2)
        lx = x + d.textlength(lbl, font=fnt('r', 16)) + 8
        vw = max(56, d.textlength(val, font=fnt('m', 17)) + 22)
        d.rounded_rectangle((lx, y, lx + vw, y + 38), 10, fill=SURF2, outline=BORDER)
        d.text((lx + 11, y + 8), val, font=fnt('m', 17), fill=TEXT)
        x = lx + vw + 16
    # series
    y += 62
    d.text((34, y), 'SERIE', font=fnt('mono', 13), fill=TEXT2)
    d.text((110, y), 'REPS OBJETIVO', font=fnt('mono', 13), fill=TEXT2)
    d.text((290, y), 'PESO OBJETIVO', font=fnt('mono', 13), fill=TEXT2)
    for j, reps in enumerate(['8-14', '8-14', '14-18']):
        yy = y + 26 + j * 48
        d.text((46, yy + 9), str(j + 1), font=fnt('mono', 17), fill=TEXT2)
        d.rounded_rectangle((104, yy, 272, yy + 38), 10, fill=SURF2, outline=BORDER)
        d.text((118, yy + 8), reps, font=fnt('m', 17), fill=TEXT)
        d.rounded_rectangle((284, yy, CW - 36, yy + 38), 10, fill=SURF2, outline=BORDER)
        d.text((298, yy + 8), 'peso corporal / +10 kg', font=fnt('r', 16), fill=(70, 78, 92))
    # nota
    y += 26 + 3 * 48 + 16
    d.text((34, y), 'Nota para el cliente', font=fnt('r', 16), fill=TEXT2)
    d.rounded_rectangle((34, y + 26, CW - 36, y + 66), 10, fill=SURF2, outline=BORDER)
    d.text((48, y + 35), 'Mano apenas por delante del cuerpo.', font=fnt('r', 17), fill=TEXT)
    # Link de video (details)
    y += 90
    hl = BLUE if f >= t_open - 4 else TEXT
    tri(d, 40, y + 13, op, hl)
    d.text((58, y - 2), 'Link de video', font=fnt('m', 20), fill=hl)
    if op > 0:
        iy = y + 40
        focus = t_open + 6 <= f
        box = (34, iy, CW - 36, iy + 46)
        lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
        ld.rounded_rectangle(box, 10, fill=SURF2 + (int(255 * op),), outline=(BLUE if focus else BORDER) + (int(255 * op),), width=2 if focus else 1)
        k = int(len(URL) * ease_io((f - t_type0) / (t_type1 - t_type0)))
        txt = URL[:k] if k > 0 else ''
        if txt:
            ld.text((48, iy + 11), txt, font=fnt('r', 18), fill=TEXT + (255,))
        else:
            ld.text((48, iy + 11), 'https://youtu.be/...', font=fnt('r', 18), fill=(70, 78, 92, int(255 * op)))
        if focus and (f // 15) % 2 == 0 and f < t_ok + 10:
            cx = 48 + d.textlength(txt, font=fnt('r', 18)) + 2
            ld.rectangle((cx, iy + 11, cx + 2, iy + 35), fill=BLUE + (255,))
        im.paste(lay, (0, 0), lay)
        a = ease_out((f - t_ok) / 10)
        if a > 0:
            lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
            yy_ = iy + 58 + (1 - a) * 8
            ld.line([(38, yy_ + 11), (44, yy_ + 17), (55, yy_ + 5)], fill=GREEN + (int(255 * a),), width=3, joint='curve')
            ld.text((62, yy_), 'Tu atleta ya lo ve en su rutina', font=fnt('m', 17), fill=GREEN + (int(255 * a),))
            im.paste(lay, (0, 0), lay)
    # toque sobre "Link de video"
    tp = (f - (t_open - 6)) / 16
    if 0 <= tp <= 1:
        lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
        r = 16 + 26 * ease_out(tp); cx, cy = 120, y + 12
        ld.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, int(90 * (1 - tp))))
        im.paste(lay, (0, 0), lay)
    # segunda tarjeta, para que se vea que es por ejercicio
    y2 = top + card_h + 18
    d.rounded_rectangle((16, y2, CW - 16, y2 + 118), 18, fill=SURF, outline=BORDER)
    d.text((34, y2 + 22), 'Press inclinado con mancuernas', font=fnt('b', 23), fill=TEXT)
    tri(d, 40, y2 + 81, 0, TEXT2)
    d.text((58, y2 + 68), 'Link de video', font=fnt('m', 20), fill=TEXT2)
    # barra inferior
    d.rectangle((0, CH - 78, CW, CH), fill=(5, 6, 8))
    d.line((0, CH - 78, CW, CH - 78), fill=BORDER)
    for i, t in enumerate(['Atletas', 'Rutinas', 'Comidas', 'Check-ins', 'Ajustes']):
        cx = (i + .5) * CW / 5
        tw = d.textlength(t, font=fnt('m', 14))
        d.text((cx - tw / 2, CH - 36), t, font=fnt('m', 14), fill=TEXT if i == 1 else TEXT2)
        d.ellipse((cx - 9, CH - 66, cx + 9, CH - 48), outline=BLUE if i == 1 else TEXT2, width=2)
    return im

# ---------- post-proceso sobre la grabación ----------
def blur_box(img, box, r=14):
    reg = img.crop(box).filter(ImageFilter.GaussianBlur(r))
    img.paste(reg, box[:2]); return img

def ring_highlight(img, box, a, t):
    if a <= 0: return img
    img = img.convert('RGBA')
    x0, y0, x1, y1 = box; pad = 60
    w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    ang = t * 2 * math.pi / 2.5
    grad = R.ring_gradient(w, h, w / 2 + 300 * math.cos(ang), h / 2 + 300 * math.sin(ang))
    rg = Image.fromarray(grad.astype(np.uint8)).convert('RGBA')
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((pad - 6, pad - 6, w - pad + 6, h - pad + 6), 14, outline=255, width=4)
    glow = m.filter(ImageFilter.GaussianBlur(10)).point(lambda v: min(255, int(v * 2.5 * a)))
    g = rg.copy(); g.putalpha(glow); img.alpha_composite(g, (x0 - pad, y0 - pad))
    r = rg.copy(); r.putalpha(m.point(lambda v: int(v * a))); img.alpha_composite(r, (x0 - pad, y0 - pad))
    return img.convert('RGB')

# ---------- escenas ----------
BLOCKS = [
    # (start, end, speed, kicker, titular, bajada, tipo)
    (None, None, None, '01 · TU COACH', 'Tu coach elige el video', 'El que quiera, en cada ejercicio: pega el link y listo.', 'coach'),
    (3.0, 6.8, 1.2, '02 · TU RUTINA', 'Te aparece en el ejercicio', 'Un toque en «Ver video del ejercicio».', 'boton'),
    (7.0, 12.6, 1.8, '03 · TÉCNICA', 'Mirás cómo se hace bien', 'Se abre el video que eligió tu coach.', 'yt'),
    (14.6, 22.7, 2.6, '04 · ENTRENO', 'Y seguís anotando', 'El video queda flotando mientras cargás tus series.', 'pip'),
]
HOOK_N, COACH_N, END_N = 78, 150, 132

def hook_frame(f):
    c = R.aurora(f / FPS + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    d = ImageDraw.Draw(c)
    k = ease_out(f / 12)
    g = R.svg('gize-monograma.svg', 200)
    c.alpha_composite(fade(g, k), ((W - 200) // 2, 500))
    fk = R.F_MONO(28); txt = 'VIDEO DE CADA EJERCICIO'
    a = ease_out((f - 6) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(txt, font=fk)) / 2, 4), txt, font=fk, fill=BLUE)
        c.alpha_composite(fade(lay, a), (0, 760))
    fh = R.F_H(96)
    for i, (ln, st) in enumerate([('¿Cómo se hacía', 10), ('este ejercicio?', 22)]):
        a = ease_out((f - st) / 10)
        if a <= 0: continue
        lay = Image.new('RGBA', (W, 120), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, int(830 + i * 112 + (1 - a) * 30)))
    a = ease_out((f - 44) / 12)
    if a > 0:
        fs = R.F_S(40); ln = 'Tu coach ya te lo dejó a mano.'
        lay = Image.new('RGBA', (W, 60), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fs)) / 2, 0), ln, font=fs, fill=TEXT2)
        c.alpha_composite(fade(lay, a), (0, int(1082 + (1 - a) * 20)))
    img = c.convert('RGB')
    img = R.aberration(img, 22 * max(0, 1 - f / 9) + (12 if f in (21, 22) else 0))
    if f < 7 or f in (21, 22): img = R.glitch(img, 1.0 if f < 4 or f in (21, 22) else .5, f)
    return img

def end_frame(f):
    t = f / FPS
    c = R.aurora(t + 40, strength=.34, cy=.45).convert('RGBA')
    a = ease_out(f / 22); s = .94 + .06 * a
    fi = R.FIRMA.resize((int(R.FIRMA.width * s), int(R.FIRMA.height * s)), Image.LANCZOS)
    c.alpha_composite(fade(fi, a), ((W - fi.width) // 2, 640 + (R.FIRMA.height - fi.height) // 2))
    d = ImageDraw.Draw(c); fh = R.F_H(62)
    for i, ln in enumerate(['La técnica correcta,', 'siempre a mano.']):
        a2 = ease_out((f - 12 - i * 6) / 14)
        if a2 <= 0: continue
        lay = Image.new('RGBA', (W, 90), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT if i == 0 else TEXT2)
        c.alpha_composite(fade(lay, a2), (0, int(930 + i * 76 + (1 - a2) * 24)))
    # mismo botón con anillo que el reel del atleta
    return cta(c, f)

def cta(c, f):
    d = ImageDraw.Draw(c)
    a3 = ease_out((f - 34) / 16)
    if a3 > 0:
        fb = R.F_H(40); txt = 'Pedile tu código a tu coach'
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

def prepare(kind, s, e, sp):
    if kind == 'coach':
        return [coach_screen(i, COACH_N) for i in range(COACH_N)]
    frames = R.clip_frames(s, e, sp)
    out = []
    for i, fr in enumerate(frames):
        fr = fr.copy()
        src_t = s + i / FPS * sp
        if kind == 'yt':
            fr = blur_box(fr, HANDLE)
        if kind == 'boton' and src_t < 5.0:
            fr = blur_box(fr, COACH_NAME, 10)
        if kind == 'boton' and src_t >= 5.0:
            fr = ring_highlight(fr, BTN, ease_out((src_t - 5.0) / .5), src_t)
        out.append(fr)
    return out

def scenes():
    yield 'hook', HOOK_N, hook_frame
    tg = HOOK_N / FPS
    for bi, (s, e, sp, k, h, sub, kind) in enumerate(BLOCKS):
        frames = prepare(kind, s, e, sp)
        parts = R.text_parts(k, h, sub)
        n = len(frames)
        yield f'b{bi}', n, (lambda fi, frames=frames, parts=parts, n=n, bi=bi, tg=tg: R.block_frame(bi, fi, n, frames[fi], parts, tg + fi / FPS))
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
