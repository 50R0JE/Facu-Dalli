"""GIZE · reel del contador de calorías (hoy, agregar, ayer y antes de ayer)."""
import sys, os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-atleta'))
import reel as R
import importlib.util
_s = importlib.util.spec_from_file_location('reel5', os.path.join(HERE, '..', 'reel-web', 'reel.py'))
R5 = importlib.util.module_from_spec(_s); _s.loader.exec_module(R5)
from reel import W, FPS, TEXT, TEXT2, BLUE, ease_out, ease_io, fade

R5.FR = os.path.join(HERE, 'grabacion/food_frames')
R5.BLOCKS = [
    ('hoy',      2.4, '01 · HOY',       'Tu día, en un número', 'Calorías y macros contra la meta de tu coach.'),
    ('comidas',  3.0, '02 · COMIDAS',   'Cada comida, ordenada', 'Desayuno, almuerzo, merienda y cena.'),
    ('agregar',  4.2, '03 · AGREGAR',   'Buscás y agregás', 'Elegís la porción y listo.'),
    ('suma',     2.8, '04 · CONTADOR',  'El contador suma solo', 'Proteína, carbos y grasas, al gramo.'),
    ('ayer',     2.6, '05 · AYER',      '¿Y lo de ayer?', 'Tocás la flecha y cambiás de día.'),
    ('anteayer', 3.4, '06 · HISTORIAL', 'Y antes de ayer', 'Cada día queda guardado, comida por comida.'),
    ('volver',   2.6, '07 · HOY',       'Volvés a hoy', 'En un toque.'),
]

def hook_frame(f):
    c = R.aurora(f / FPS + 3, strength=.36 * ease_io(f / 20) + .06).convert('RGBA')
    d = ImageDraw.Draw(c)
    g = R.svg('gize-monograma.svg', 200); k = ease_out(f / 12)
    c.alpha_composite(fade(g, k), ((W - 200) // 2, 500))
    fk = R.F_MONO(28); txt = 'CONTADOR DE CALORÍAS'
    a = ease_out((f - 6) / 10)
    if a > 0:
        lay = Image.new('RGBA', (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(txt, font=fk)) / 2, 4), txt, font=fk, fill=BLUE)
        c.alpha_composite(fade(lay, a), (0, 760))
    fh = R.F_H(100)
    for i, (ln, st) in enumerate([('¿Cuánto comiste', 10), ('hoy?', 20)]):
        a = ease_out((f - st) / 10)
        if a <= 0: continue
        lay = Image.new('RGBA', (W, 130), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fh)) / 2, 0), ln, font=fh, fill=TEXT)
        c.alpha_composite(fade(lay, a), (0, int(830 + i * 116 + (1 - a) * 30)))
    a = ease_out((f - 40) / 12)
    if a > 0:
        fs = R.F_S(44); ln = 'Dejá de adivinar.'
        lay = Image.new('RGBA', (W, 64), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text(((W - d.textlength(ln, font=fs)) / 2, 0), ln, font=fs, fill=TEXT2)
        c.alpha_composite(fade(lay, a), (0, int(1090 + (1 - a) * 20)))
    img = c.convert('RGB')
    img = R.aberration(img, 22 * max(0, 1 - f / 9) + (12 if f in (19, 20) else 0))
    if f < 7 or f in (19, 20): img = R.glitch(img, 1.0 if f < 4 or f in (19, 20) else .5, f)
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
    return R5.cta(c, f, 'gize.ar')

R5.hook_frame = hook_frame
R5.end_frame = end_frame

if __name__ == '__main__':
    R5.main(sys.argv[1])
