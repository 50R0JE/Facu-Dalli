"""Glifos de Bigger Display en unidades de fuente (y hacia arriba).
G, I, Z y E salen tal cual del logotipo (brand/logo/gize-logotipo.svg).
N y R no existen en el logo: están construidas con las mismas medidas
(fuste 139 u, altura 13→785, esquinas redondeadas de radio 152)."""
import io, os, re
import cairosvg
from PIL import Image

LOGO = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../brand/logo/gize-logotipo.svg')).read()
_paths = re.findall(r'<path transform="translate\(([\d.]+),0\)" d="([^"]+)"', LOGO)
G, I, Z, E = (d for _, d in _paths)

def rect(x0, y0, x1, y1):
    # sentido horario con y hacia arriba: todas las piezas suman con nonzero
    return f'M{x0} {y1}H{x1}V{y0}H{x0}Z'

def hole(x0, y0, x1, y1):
    # sentido contrario: resta (contraforma)
    return f'M{x0} {y0}H{x1}V{y1}H{x0}Z'

N = ' '.join([
    rect(10.5, 13, 149.5, 785),
    rect(218.5, 13, 357.5, 785),
    'M10.5 785H160.5L357.5 13H207.5Z',
])

# R: fuste + panza con la esquina superior redondeada + pierna recta con muesca
R = ' '.join([
    rect(8.9, 13, 147.7, 785),
    # panza: de y=381 a 785, esquina sup. derecha con radio 152
    'M8.9 785H205.5C289.4 785 357.5 717 357.5 633V381H8.9Z',
    hole(147.7, 520, 218.7, 646),
    # pierna (sin superponerse con la panza, así la muesca resta limpia)
    'M218.5 381H357.5V13H218.5Z',
    # muesca entre panza y pierna, del lado derecho (sentido contrario = resta)
    'M357.5 430L300 395L357.5 360Z',
])

ADV = {'G': 391.6, 'I': 183.5, 'Z': 391.6, 'E': 354.7, 'N': 391.6, 'R': 391.6}
GLY = {'G': G, 'I': I, 'Z': Z, 'E': E, 'N': N, 'R': R}
TOP, BASE = 800, -2          # caja vertical que abarca los sobrepasos de la G

def word_svg(word, fill='#FFFFFF'):
    x, parts = 0.0, []
    for ch in word:
        parts.append(f'<path transform="translate({x:.1f},0)" d="{GLY[ch]}"/>')
        x += ADV[ch]
    width = x - 23.5
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-TOP} {width:.1f} {TOP - BASE}">'
           f'<g transform="scale(1,-1)" fill="{fill}">{"".join(parts)}</g></svg>')
    return svg, width

def word_image(word, cap_px):
    """Imagen RGBA de la palabra con altura de mayúscula (13→785 u) = cap_px."""
    svg, width = word_svg(word)
    k = cap_px / 772
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=round(width * k), output_height=round((TOP - BASE) * k))
    return Image.open(io.BytesIO(png)).convert('RGBA'), k

if __name__ == '__main__':
    for w in ('ENER', 'GIZE', 'ENERGIZE'):
        svg, _ = word_svg(w)
        png = cairosvg.svg2png(bytestring=svg.encode(), output_height=300, background_color='#000000')
        open(f'word_{w}.png', 'wb').write(png)
