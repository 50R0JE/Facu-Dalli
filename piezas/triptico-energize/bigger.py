"""Alfabeto en el estilo de Bigger Display, para titulares.
G, I, Z, E salen tal cual del logotipo; N y R de glifos.py; el resto está construido con las
mismas reglas: altura 13→785 u, fuste 139 u, ancho estándar 10,5→357,5, curvas de radio 152
y contraformas en ranura de 69 u con puntas redondas. Se dibujan como máscara: se suman las
piezas y se borran los huecos."""
import io
import cairosvg
from PIL import Image, ImageDraw
import glifos

B, T = 13, 785
L0, L1, R0, R1 = 10.5, 149.5, 218.5, 357.5
RR = 152
SR = (R0 - L1) / 2                       # radio de las ranuras
SS = 3                                   # supermuestreo

def A_(kind, *a): return ('add', kind) + a
def S_(kind, *a): return ('sub', kind) + a
ALL = (1, 1, 1, 1)

SHAPES = {
    'O': [A_('rr', L0, B, R1, T, RR, ALL), S_('rr', L1, 171, R0, 627, SR, ALL)],
    'C': [A_('rr', L0, B, R1, T, RR, ALL), S_('rr', L1, 171, R0, 627, SR, ALL), S_('rr', R0, 300, R1 + 40, 498, 0, ALL)],
    'D': [A_('rr', L0, B, R1, T, RR, (0, 1, 1, 0)), S_('rr', L1, 171, R0, 627, SR, ALL)],
    'U': [A_('rr', L0, B, R1, T, RR, (0, 0, 1, 1)), S_('rr', L1, 171, R0, T + 40, SR, (0, 0, 1, 1))],
    'A': [A_('rr', L0, B, R1, T, RR, (1, 1, 0, 0)), S_('rr', L1, 470, R0, 627, SR, ALL), S_('rr', L1, B - 40, R0, 330, SR, (1, 1, 0, 0))],
    'P': [A_('rr', L0, B, L1, T, 0, ALL), A_('rr', L0, 330, R1, T, 118, (0, 1, 1, 0)), S_('rr', L1, 468, R0, 646, SR, ALL)],
    'H': [A_('rr', L0, B, L1, T, 0, ALL), A_('rr', R0, B, R1, T, 0, ALL), A_('rr', L1, 330, R0, 468, 0, ALL)],
    'L': [A_('rr', L0, B, L1, T, 0, ALL), A_('rr', L0, B, 321.1, 151.9, 0, ALL)],
    'T': [A_('rr', L0, 646.4, R1, T, 0, ALL), A_('rr', 114.5, B, 253.5, T, 0, ALL)],
    'S': [A_('rr', L0, 330, R1, T, RR, (1, 1, 0, 0)), A_('rr', L0, B, R1, 468, RR, (0, 0, 1, 1)),
          S_('rr', L1, 468, R1 + 40, 646, SR, (1, 0, 0, 1)), S_('rr', L0 - 40, 152, R0, 330, SR, (0, 1, 1, 0))],
    'V': [A_('poly', [(10.5, 785), (149.5, 785), (184, 200), (218.5, 785), (357.5, 785), (253.5, 13), (114.5, 13)])],
    'Y': [A_('poly', [(10.5, 785), (149.5, 785), (184, 520), (218.5, 785), (357.5, 785), (253.5, 400), (253.5, 13), (114.5, 13), (114.5, 400)])],
    'M': [A_('rr', L0, B, L1, T, 0, ALL), A_('rr', 391, B, 530, T, 0, ALL),
          A_('poly', [(10.5, 785), (175, 785), (270.5, 480), (366, 785), (530, 785), (335, 260), (206, 260)])],
}
ADV = dict(glifos.ADV)
for ch in 'OCDUAPHSVYT': ADV[ch] = 391.6
ADV['L'] = 354.7; ADV['M'] = 564
SPACE = 150
BOX = glifos.TOP - glifos.BASE

def _logo_glyph(ch, k):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-glifos.TOP} {ADV[ch]:.1f} {BOX}">'
           f'<g transform="scale(1,-1)" fill="#fff"><path d="{glifos.GLY[ch]}"/></g></svg>')
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=round(ADV[ch] * k), output_height=round(BOX * k))
    return Image.open(io.BytesIO(png)).getchannel('A')

def glyph_mask(ch, k):
    if ch not in SHAPES: return _logo_glyph(ch, k)
    s = k * SS
    w, h = round(ADV[ch] * s), round(BOX * s)
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    X = lambda x: x * s; Y = lambda y: (glifos.TOP - y) * s
    for op, kind, *a in SHAPES[ch]:
        fill = 255 if op == 'add' else 0
        if kind == 'rr':
            x0, y0, x1, y1, r, c = a
            box = (X(x0), Y(y1), X(x1), Y(y0))
            if r: d.rounded_rectangle(box, radius=r * s, fill=fill, corners=tuple(bool(v) for v in c))
            else: d.rectangle(box, fill=fill)
        else:
            d.polygon([(X(x), Y(y)) for x, y in a[0]], fill=fill)
    return m.resize((round(ADV[ch] * k), round(BOX * k)), Image.LANCZOS)

def word_mask(text, cap_px):
    k = cap_px / 772
    width = sum(SPACE if c == ' ' else ADV[c] for c in text) - 23.5
    out = Image.new('L', (max(1, round(width * k)), round(BOX * k)), 0)
    x = 0.0
    for ch in text:
        if ch == ' ': x += SPACE; continue
        g = glyph_mask(ch, k)
        out.paste(255, (round(x * k), 0), g)          # pegar con la máscara del glifo (unión)
        x += ADV[ch]
    return out, k

def word_image(text, cap_px, color=(255, 255, 255)):
    m, k = word_mask(text, cap_px)
    im = Image.new('RGBA', m.size, color + (0,)); im.putalpha(m)
    return im, k

if __name__ == '__main__':
    lines = ['CHAU PLANILLA', 'TU COACH ARMA EL PLAN', 'CADA SERIE CUENTA', 'TU COMIDA AL GRAMO',
             'CRONO Y DESCANSO', 'TU PROGRESO EN DATOS', 'LO VE TODO', 'ENERGIZE']
    ims = [word_image(l, 110)[0] for l in lines]
    Wd = max(i.width for i in ims) + 40
    sheet = Image.new('RGB', (Wd, 140 * len(ims) + 20), 'black')
    for j, im in enumerate(ims): sheet.paste(im, (20, 15 + j * 140), im)
    sheet.save('bigger_test.png')
