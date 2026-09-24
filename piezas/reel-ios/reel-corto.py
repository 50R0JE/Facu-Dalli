"""GIZE · reel corto y tranquilo 'Llegamos a iPhone' (7 s): manzana, fecha en neón y firma.
Uso: python3 reel-corto.py salida.mp4 [fecha, ej. 28.09]"""
import sys, os, io, subprocess
import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
from reel import W, H, FPS, TEXT, TEXT2, BLUE, ease_out, ease_io, fade
import importlib.util
_s = importlib.util.spec_from_file_location('reel6', os.path.join(HERE, 'reel.py'))
R6 = importlib.util.module_from_spec(_s); _s.loader.exec_module(R6)   # neón, filete y texto centrado

FECHA = sys.argv[2] if len(sys.argv) > 2 else '28.09'
DIA, MES = FECHA.split('.')
MESES = {'09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre'}
APPLE_SVG = os.path.join(HERE, 'apple.svg')  # Simple Icons
N = 7 * FPS

def apple(size):
    svg = open(APPLE_SVG).read().replace('<path ', '<path fill="#FFFFFF" ')
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert('RGBA')

APPLE = apple(230)
glow_a = Image.new('L', (APPLE.width + 200, APPLE.height + 200), 0)
glow_a.paste(APPLE.getchannel('A'), (100, 100))
APPLE_GLOW = Image.new('RGBA', glow_a.size, (190, 210, 255, 0))
APPLE_GLOW.putalpha(glow_a.filter(ImageFilter.GaussianBlur(40)).point(lambda v: int(v * .55)))
FIRMA = R.svg('gize-firma-horizontal.svg', 250)

def frame(f):
    t = f / FPS
    c = R.aurora(t + 10, strength=.22 + .06 * ease_io(f / 60), cy=.55).convert('RGBA')
    # 1) la manzana aparece despacio (0 → 1,3 s) y respira apenas
    a = ease_io(f / 40)
    s = .94 + .06 * ease_out(f / 60)
    ap = APPLE.resize((int(APPLE.width * s), int(APPLE.height * s)), Image.LANCZOS)
    cx, cy = W // 2, 560
    c.alpha_composite(fade(APPLE_GLOW, a * (.8 + .2 * np.sin(t * 2.2))), (cx - APPLE_GLOW.width // 2, cy - APPLE_GLOW.height // 2))
    c.alpha_composite(fade(ap, a), (cx - ap.width // 2, cy - ap.height // 2 - int((1 - a) * 20)))
    # 2) la fecha se enciende como un tubo (1,1 → 2,4 s), con un parpadeo suave
    line_y = 1060
    p = (f - 34) / 38
    if p > 0:
        on = ease_io(p)
        flick = 1.0
        k = f - 34
        if k < 26: flick = [.2, .5, .25, .7, .4, .9, .6, 1][min(k // 3, 7)]
        R6.put_neon(c, FECHA, line_y, on, flicker=flick)
        R6.rgb_line(c, line_y, 90, W - 90, on)
    # 3) textos (2,6 s en adelante)
    a2 = ease_out((f - 78) / 22)
    if a2 > 0:
        R6.centered(c, 'Llegamos a iPhone.', R.F_H(92), line_y + 64 + (1 - a2) * 18, TEXT, a2)
    a3 = ease_out((f - 96) / 22)
    if a3 > 0:
        R6.centered(c, f'El {int(DIA)} de {MESES.get(MES, "")}, en tu iPhone.', R.F_S(42), line_y + 184 + (1 - a3) * 14, TEXT2, a3)
    # 4) firma al pie (4 s en adelante)
    a4 = ease_out((f - 120) / 26)
    if a4 > 0:
        c.alpha_composite(fade(FIRMA, a4), ((W - FIRMA.width) // 2, 1450))
    # fundido de salida corto para que el loop del reel no corte seco
    out = 1 - ease_io((f - (N - 14)) / 14)
    img = c.convert('RGB')
    if out < 1:
        img = Image.fromarray((np.asarray(img).astype(np.float32) * out).astype(np.uint8))
    return img

def main(out):
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for f in range(N):
        ff.stdin.write(frame(f).tobytes())
    ff.stdin.close(); ff.wait()
    print('ok', N / FPS, 's')

if __name__ == '__main__':
    main(sys.argv[1])
