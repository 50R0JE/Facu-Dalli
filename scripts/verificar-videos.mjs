// Revisa los videos de YouTube de la biblioteca de ejercicios (o una lista de candidatos):
// que existan, que sean Shorts, que se puedan mostrar en otras páginas, de qué canal son y en
// qué idioma hablan.
// Se corre en GitHub Actions (workflow "Videos"): desde ahí YouTube responde normal.
//   node scripts/verificar-videos.mjs <archivo>
// Toma todos los ids que encuentre en el archivo (links /shorts/<id>, "id":"<id>" o "Ejercicio": ["<id>", …]).
import fs from "fs";

const file = process.argv[2] || "app/core/videos.js";
if(!fs.existsSync(file)){ console.log("No existe " + file + ": nada para revisar."); fs.writeFileSync("videos-resultado.json", "[]"); process.exit(0); }
const txt = fs.readFileSync(file, "utf8");
const ids = [...new Set([...txt.matchAll(/(?:shorts\/|"id"\s*:\s*"|:\s*\[")([\w-]{11})/g)].map(m => m[1]))];
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "Accept-Language": "es-AR,es;q=0.9" };

async function check(id){
  const r = { id };
  try{
    const o = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/shorts/" + id), { headers: UA });
    r.oembed = o.status; // 200 ok · 401 no se puede insertar · 404/400 no existe o es privado
    if(o.ok){ const j = await o.json(); r.title = j.title; r.channel = j.author_name; r.channelUrl = j.author_url; r.w = j.width; r.h = j.height; }
  }catch(e){ r.oembed = "error " + e.message; }
  try{
    const s = await fetch("https://www.youtube.com/shorts/" + id, { headers: UA, redirect: "manual" });
    r.short = s.status === 200; // un video común redirige (303) a /watch
    if(!r.short) r.shortStatus = s.status + " " + (s.headers.get("location") || "");
  }catch(e){ r.short = "error " + e.message; }
  // Idioma hablado: YouTube genera subtítulos automáticos en el idioma que detecta en el
  // audio (pista "asr", vssId "a.<idioma>"). Si no hay, se toma el idioma del video.
  try{
    const w = await fetch("https://www.youtube.com/watch?v=" + id, { headers: UA });
    const h = await w.text();
    const asr = h.match(/"vssId":"a\.([A-Za-z-]+)"/);
    const def = h.match(/"defaultAudioLanguage":"([A-Za-z-]+)"/);
    r.lang = asr ? asr[1] : (def ? def[1] : "");
  }catch(e){ r.lang = ""; }
  r.ok = r.oembed === 200 && r.short === true;
  return r;
}

const out = [];
for(let i = 0; i < ids.length; i += 6){
  out.push(...await Promise.all(ids.slice(i, i + 6).map(check)));
}
fs.writeFileSync("videos-resultado.json", JSON.stringify(out, null, 1));
for(const r of out) console.log((r.ok ? "OK   " : "MAL  ") + r.id + " | " + (r.lang || "??") + " | " + (r.channel || "-") + " | " + (r.title || "") + (r.ok ? "" : " | oembed " + r.oembed + " short " + (r.shortStatus || r.short)));
console.log(`\n${out.filter(r => r.ok).length} de ${out.length} bien`);
// Sobre la biblioteca de la app, un video roto hace fallar el workflow (GitHub avisa por mail).
if(file.endsWith("videos.js") && out.some(r => !r.ok)) process.exitCode = 1;
