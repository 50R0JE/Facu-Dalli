"""GIZE · TikTok del panel de coach (mismo diseño frenético que el del atleta).
Usa la grabación rec/coach_frames (panel con datos ficticios)."""
import sys, os, json, glob, math, subprocess
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
import importlib.util
_s = importlib.util.spec_from_file_location('reel10', os.path.join(HERE, '..', 'tiktok-app', 'tiktok-v3.py'))
T = importlib.util.module_from_spec(_s); _s.loader.exec_module(T)
from reel import W, H, FPS, TEXT, BLUE, GAMA, ease_out

FR = os.path.join(HERE, 'grabacion/coach_frames')
DUR = 1.8

SCENES = [
    ('lista',     ['TODOS TUS', 'ATLETAS'],        '01 · PANEL'),
    ('codigo',    ['SE VINCULAN', 'CON TU CÓDIGO'], '02 · INVITACIÓN'),
    ('rutinas',   ['TUS RUTINAS', 'EN PLANTILLAS'], '03 · PLANTILLAS'),
    ('abrir',     ['LA FICHA', 'DE CADA UNO'],      '04 · ATLETA'),
    ('mensaje',   ['LE ESCRIBÍS', 'AL CELULAR'],    '05 · MENSAJES'),
    ('ficha',     ['OBJETIVOS', 'Y CONTEXTO'],      '06 · FICHA'),
    ('bloque',    ['MESOCICLOS', 'Y DESCARGAS'],    '07 · BLOQUES'),
    ('diario',    ['SU DÍA', 'A DÍA'],              '08 · SEGUIMIENTO'),
    ('checkin',   ['CHECK-IN', 'SEMANAL'],          '09 · CHECK-IN'),
    ('entrenos',  ['CADA SERIE', 'REGISTRADA'],     '10 · ENTRENOS'),
    ('volumen',   ['VOLUMEN', 'Y PESO'],            '11 · MÉTRICAS'),
    ('rutina',    ['ARMÁS', 'LA RUTINA'],           '12 · RUTINA'),
    ('editar',    ['VIDEO DE', 'TÉCNICA'],          '13 · VIDEOS'),
    ('progreso',  ['SU PROGRESO', 'POR EJERCICIO'], '14 · PROGRESO'),
    ('plan',      ['PLAN DE', 'COMIDAS'],           '15 · NUTRICIÓN'),
    ('preguntas', ['TUS PROPIAS', 'PREGUNTAS'],     '16 · PREGUNTAS'),
]
ROT = [-3, 3, -2, 3, -3, 2, -3, 3, -2, 3, -3, 2, -3, 3, -2, 3]

def load_scene(name, dur):
    d = os.path.join(FR, name)
    meta = json.load(open(os.path.join(d, 'times.json')))
    files = sorted(glob.glob(os.path.join(d, '*.jpg')))
    ts = np.array(meta['times']) - meta['start']; span = meta['end'] - meta['start']
    n = round(dur * FPS); cache, out = {}, []
    for k in range(n):
        t = k / max(n - 1, 1) * span
        i = max(0, int(np.searchsorted(ts, t, side='right')) - 1)
        if i not in cache:
            cache[i] = Image.open(files[i]).convert('RGB').resize((R.CW, R.CH), Image.LANCZOS)
        out.append(cache[i])
    return out

def hook_frame(f):
    c = T.bg(f, GAMA[1]).convert('RGBA')
    y = 360
    for w_, d0, sz in [('¿SOS', 0, 230), ('COACH?', 8, 230)]:
        lay = T.words_layer([w_], sz, color_last=(w_ == 'COACH?'))
        T.slam(c, lay, f, y, d0); y += lay.height - 50
    a = ease_out((f - 22) / 8)
    if a > 0:
        c.alpha_composite(T.fade(T.words_layer(['Mirá todo lo que te da GIZE.'], 58), a), (0, y + 30))
    img = c.convert('RGB')
    if f < 3 or f in (8, 9): img = R.aberration(img, 18); img = R.glitch(img, .8, f)
    return img

# cierre: igual al del TikTok del atleta, con el titular para coaches
_orig_words = T.words_layer
def end_frame(f):
    def wl(lines, size, color_last=None):
        if lines == ['ENTRENÁ CON', 'TU COACH.']: lines = ['GUIÁ A TU', 'EQUIPO.']
        return _orig_words(lines, size, color_last)
    T.words_layer = wl
    try: return T.end_frame(f)
    finally: T.words_layer = _orig_words

def scenes():
    yield 'hook', 48, hook_frame
    for i, (name, lines, kick) in enumerate(SCENES):
        frames = load_scene(name, DUR); n = len(frames)
        lay = T.words_layer(lines, 150, color_last=True)
        kl = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(kl).text((T.X0 + 4, 6), kick, font=R.F_MONO(30), fill=BLUE)
        col, rot = GAMA[i % 4], ROT[i]
        def fn(f, frames=frames, lay=lay, kl=kl, col=col, rot=rot, n=n):
            c = T.bg(f, col)
            T.phone(c, frames[f], f, rot, n)
            c.alpha_composite(T.fade(kl, min(1, f / 3)), (0, 196))
            T.slam(c, lay, f, 238, 1)
            return T.cut_fx(c.convert('RGB'), f)
        yield name, n, fn
    yield 'end', T.END_N, end_frame

def main(out):
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total = 0
    for name, n, fn in scenes():
        for f in range(n): ff.stdin.write(fn(f).tobytes()); total += 1
        print(name, n, file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait()
    print('frames', total, 'seg', round(total / FPS, 2))

if __name__ == '__main__':
    main(sys.argv[1])
