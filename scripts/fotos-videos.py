# Arma hojas de contacto de los videos de ejercicios para revisarlos a ojo: por cada ejercicio,
# una fila por video con 4 fotogramas (la miniatura y los 3 cuadros que YouTube saca al 25/50/75%
# del video). Opcionalmente busca Shorts nuevos en YouTube (en español, desde Argentina).
# Se corre en GitHub Actions (workflow "Fotos de videos"); deja todo en la rama revision-videos.
#   python3 scripts/fotos-videos.py <entrada.json> <carpeta-salida>
# entrada.json: {"Ejercicio": {"ids": ["<id>", ...], "buscar": ["consulta", ...]}, ...}
import json, os, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      "Accept-Language": "es-AR,es;q=0.9", "Cookie": "CONSENT=YES+1; SOCS=CAI"}

def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")

def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)

def txt(o):
    if not o: return ""
    if isinstance(o, str): return o
    if "simpleText" in o: return o["simpleText"]
    if "runs" in o: return "".join(r.get("text", "") for r in o["runs"])
    if "content" in o: return o["content"]
    return ""

def buscar(q):
    # Resultados de la búsqueda de YouTube (videos cortos) con título, canal y duración.
    url = "https://www.youtube.com/results?hl=es&gl=AR&sp=EgIYAQ%253D%253D&search_query=" + urllib.parse.quote(q)
    h = get(url)
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", h, re.S)
    if not m: return []
    out = []
    for d in walk(json.loads(m.group(1))):
        if "videoRenderer" in d:
            v = d["videoRenderer"]
            out.append({"id": v.get("videoId"), "title": txt(v.get("title")), "channel": txt(v.get("ownerText")), "dur": txt(v.get("lengthText"))})
        elif "reelItemRenderer" in d:
            v = d["reelItemRenderer"]
            out.append({"id": v.get("videoId"), "title": txt(v.get("headline")), "channel": "", "dur": "short"})
        elif "shortsLockupViewModel" in d:
            v = d["shortsLockupViewModel"]
            vid = next((x["reelWatchEndpoint"]["videoId"] for x in walk(v) if "reelWatchEndpoint" in x), None)
            out.append({"id": vid, "title": txt(v.get("overlayMetadata", {}).get("primaryText")), "channel": "", "dur": "short"})
    seen, res = set(), []
    for r in out:
        if r["id"] and r["id"] not in seen: seen.add(r["id"]); res.append(r)
    return res[:8]

def info(i):
    r = {"id": i}
    try:
        j = json.loads(get("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote("https://www.youtube.com/shorts/" + i)))
        r["title"], r["channel"], r["ok"] = j.get("title", ""), j.get("author_name", ""), True
    except Exception as e:
        r["ok"] = False
    try:
        req = urllib.request.Request("https://www.youtube.com/shorts/" + i, headers=UA)
        class NoRedir(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k): return None
        op = urllib.request.build_opener(NoRedir)
        try: r["short"] = op.open(req, timeout=20).status == 200
        except urllib.error.HTTPError as e: r["short"] = False
    except Exception: r["short"] = None
    frames = []
    for n in ["hqdefault", "hq1", "hq2", "hq3"]:
        try:
            im = Image.open(BytesIO(get(f"https://i.ytimg.com/vi/{i}/{n}.jpg", True))).convert("RGB")
            w, h = im.size; cw = int(h * 9 / 16)  # el Short vertical va centrado con bandas negras
            im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h)).resize((150, 267))
            frames.append(im)
        except Exception:
            frames.append(Image.new("RGB", (150, 267), (60, 0, 0)))
    r["frames"] = frames
    return r

def main():
    entrada, salida = sys.argv[1], sys.argv[2]
    os.makedirs(salida, exist_ok=True)
    data = json.load(open(entrada))
    try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    except Exception: font = ImageFont.load_default()
    resumen = {}
    for idx, (ej, cfg) in enumerate(data.items()):
        ids = list(cfg.get("ids", []))
        extra = {}
        for q in cfg.get("buscar", []):
            try:
                for r in buscar(q):
                    if r["id"] not in ids: ids.append(r["id"]); extra[r["id"]] = r
            except Exception as e:
                print("búsqueda falló", q, e)
        ids = ids[:10]
        with ThreadPoolExecutor(6) as ex: infos = list(ex.map(info, ids))
        rows = []
        for n, r in enumerate(infos, 1):
            e = extra.get(r["id"], {})
            r["dur"] = e.get("dur", "")
            r["title"] = r.get("title") or e.get("title", "")
            r["channel"] = r.get("channel") or e.get("channel", "")
            rows.append(r)
        W, RH, LH = 150 * 4 + 20, 267, 44
        sheet = Image.new("RGB", (W, max(1, len(rows)) * (RH + LH)), (20, 20, 20))
        dr = ImageDraw.Draw(sheet)
        for n, r in enumerate(rows):
            y = n * (RH + LH)
            flag = "" if r.get("ok") and r.get("short") else "  [NO OK]"
            dr.text((6, y + 4), f"#{n+1} {r['id']} · {r.get('channel','')[:30]} · {r.get('dur','')}{flag}", fill=(255, 230, 120), font=font)
            dr.text((6, y + 23), (r.get("title") or "")[:70], fill=(220, 220, 220), font=font)
            for k, f in enumerate(r["frames"]):
                sheet.paste(f, (k * 155, y + LH))
        nombre = f"{idx:03d}.jpg"
        sheet.save(os.path.join(salida, nombre), quality=80)
        resumen[ej] = {"hoja": nombre, "videos": [{k: v for k, v in r.items() if k != "frames"} for r in rows]}
        print(idx, ej, len(rows))
    json.dump(resumen, open(os.path.join(salida, "resumen.json"), "w"), ensure_ascii=False, indent=1)

main()
