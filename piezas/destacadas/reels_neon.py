"""GIZE · un reel por destacada: el ícono en neón se prende parpadeando como un cartel,
después se prende la palabra en Bigger y queda respirando. 1080×1920, 30 fps, 5 s, sin audio."""
import os, sys, subprocess
import numpy as np
from PIL import Image, ImageFilter
import destacadas as D
sys.path.insert(0, os.path.join(D.HERE, '..', 'triptico-energize'))
import bigger

OUT = os.path.join(D.HERE, 'salida-reels')
os.makedirs(OUT, exist_ok=True)
W, H, FPS, N = D.W, D.H, 30, 150
S, P = 440, 120
GAMA = np.array([(47, 160, 255), (166, 92, 255), (255, 61, 174)], np.float32)
BG = np.array([4, 5, 8], np.float32)
WORD = {'gize': 'GIZE', 'coaches': 'COACHES', 'entreno': 'ENTRENO', 'comida': 'COMIDA', 'progreso': 'PROGRESO',
        'tecnica': 'TECNICA', 'novedades': 'NOVEDADES', 'preguntas': 'PREGUNTAS'}

def gradient(h, w):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip(xx / w * .6 + yy / h * .4, 0, 1) * 2
    i0 = np.minimum(t.astype(int), 1); fr = (t - i0)[..., None]
    return GAMA[i0] * (1 - fr) + GAMA[i0 + 1] * fr

def f32(im): return np.asarray(im, np.float32) / 255

def layers(alpha, blur=(26, 8), core=15, col=None):
    """Devuelve (brillo, tubo, apagado) como luz aditiva en float, del tamaño de alpha."""
    col = gradient(alpha.height, alpha.width) if col is None else col
    wide = f32(alpha.filter(ImageFilter.GaussianBlur(blur[0]))) * 2.4
    mid = f32(alpha.filter(ImageFilter.GaussianBlur(blur[1]))) * 1.8
    a = f32(alpha)
    c = f32(alpha.filter(ImageFilter.MinFilter(core)).filter(ImageFilter.GaussianBlur(2))) * .8
    glow = col * np.clip(wide + mid, 0, 1.6)[..., None] * .55
    tube = col * a[..., None] + (255 - col) * c[..., None]
    off = np.array([34, 36, 46], np.float32) * a[..., None]          # vidrio apagado
    return glow, tube, off

def icon_alpha(name):
    a = Image.new('L', (S + 2 * P, S + 2 * P), 0)
    if name == 'gize':
        svg = open(D.REPO + '/brand/logo/gize-monograma.svg').read()
        arc = D.svg_img(svg.replace('<circle', '<circle opacity="0"'), S)
        dot = D.svg_img(svg.replace('stroke="#FFFFFF"', 'stroke="none"'), S)
        a.paste(arc.getchannel('A'), (P, P))
        d = Image.new('L', a.size, 0); d.paste(dot.getchannel('A'), (P, P))
        return a, d
    ic = D.svg_img(f'<svg xmlns="http://www.w3.org/2000/svg" {D.ATTR}>{D.ICONS[name]}</svg>', S)
    a.paste(ic.getchannel('A'), (P, P))
    return a, None

def word_alpha(text):
    m, _ = bigger.word_mask(text, 104)
    q = 70
    a = Image.new('L', (m.width + 2 * q, m.height + 2 * q), 0); a.paste(m, (q, q))
    return a

# encendido tipo cartel: 1 prendido, 0 apagado, valores intermedios = tubo tibio
FLICK = [0, 0, .9, 0, 0, 0, .5, 1, 0, 0, .3, 0, 1, 1, 1, 0, .6, 1, 1, 1, 1, .2, 1]
def power(t):
    """t en cuadros desde que arranca el encendido → (tubo, brillo)."""
    if t < 0: return 0., 0.
    tube = FLICK[t] if t < len(FLICK) else 1.
    ramp = min(1, max(0, (t - 10) / 20))
    return tube, tube * (.35 + .65 * ramp)

def add(frame, layer, x, y, k):
    if k <= 0: return
    h, w = layer.shape[:2]
    frame[y:y + h, x:x + w] += layer * k

def render(name):
    ia, dot = icon_alpha(name)
    ig, it, io_ = layers(ia)
    if dot is not None:                                   # el punto de la G, azul con su brillo
        blue = np.broadcast_to(GAMA[0], (ia.height, ia.width, 3))
        dg, dt, do = layers(dot, (18, 6), 3, col=blue)
        ig, it, io_ = ig + dg * 1.3, it + dt, io_ + do
    wa = word_alpha(WORD[name])
    wg, wt, wo = layers(wa, (20, 6), 9)
    ix, iy = (W - ia.width) // 2, H // 2 - 170 - ia.height // 2
    wx, wy = (W - wa.width) // 2, H // 2 + 250 - wa.height // 2
    path = os.path.join(OUT, f'destacada-{name}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16',
                           '-preset', 'slow', '-movflags', '+faststart', path], stdin=subprocess.PIPE)
    rng = np.random.default_rng(len(name))
    hum = {int(f) for f in rng.integers(95, 140, 2)}      # algún parpadeo suelto después, como un cartel real
    for f in range(N):
        fr = np.empty((H, W, 3), np.float32); fr[:] = BG
        breath = 1 + .08 * np.sin(max(0, f - 40) / FPS * 2 * np.pi * .5)
        # ícono
        tube, glow = power(f - 8)
        if f in hum: tube, glow = .35, .5
        add(fr, io_, ix, iy, min(1, f / 8) * (1 - tube))
        add(fr, ig, ix, iy, glow * breath); add(fr, it, ix, iy, tube)
        # palabra
        tube, glow = power(f - 44)
        add(fr, wo, wx, wy, min(1, max(0, (f - 30) / 10)) * (1 - tube))
        add(fr, wg, wx, wy, glow * breath); add(fr, wt, wx, wy, tube)
        # fundido de salida corto para que el loop no salte
        k = min(1, (N - 1 - f) / 8)
        fr = BG + (fr - BG) * k
        ff.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes())
        if f == 80: Image.fromarray(np.clip(fr, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'cuadro-{name}.png'))
    ff.stdin.close(); ff.wait()
    print(name, 'ok')

if __name__ == '__main__':
    for name in (sys.argv[1:] or D.ORDER): render(name)
