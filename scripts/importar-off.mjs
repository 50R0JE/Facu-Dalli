// Trae de Open Food Facts los productos vendidos en Argentina con la tabla nutricional
// completa y los suma a la base compartida de GIZE (public.products).
// Lo corre el workflow "Importar Open Food Facts" (.github/workflows/importar-off.yml).
//   node scripts/importar-off.mjs --out off.sql       arma el SQL (para probar en una base local)
//   node scripts/importar-off.mjs --apply             carga en Supabase por tandas (API de Supabase;
//                                                     usa PROJECT_REF y SUPABASE_ACCESS_TOKEN)
//   --max-pages N                                     tope de páginas de 100 productos (800)
// Open Food Facts pide identificarse (User-Agent) y no más de 10 búsquedas por minuto: se
// espera 6,5 s entre páginas. Datos bajo licencia ODbL (se cita la fuente en la app y en
// gize.ar/privacidad). El log de Actions es público: solo se imprimen cantidades.
import { writeFileSync } from "node:fs";
import { batchSql, offToRow, rowsToSql } from "./off-import-lib.mjs";

const has = k => process.argv.includes(k);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg("--out", ""), APPLY = has("--apply"), MAX_PAGES = parseInt(arg("--max-pages", "800"), 10) || 800;
const UA = "GIZE/1.0 (https://gize.ar - soporte@gize.ar)";
const FIELDS = "code,product_name,product_name_es,generic_name_es,brands,quantity,serving_quantity,nutriments,nutrition_data_per,unique_scans_n";
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!OUT && !APPLY){ console.error("Falta --out archivo.sql o --apply"); process.exit(1); }

async function page(n){
  const u = "https://world.openfoodfacts.org/api/v2/search?countries_tags=en:argentina&states_tags=en:nutrition-facts-completed" +
    "&sort_by=unique_scans_n&page_size=100&page=" + n + "&fields=" + FIELDS;
  for (let t = 0; t < 5; t++){
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (r.status === 429 || r.status >= 500){ await sleep(20000 * (t + 1)); continue; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) { if (t === 4) throw e; await sleep(10000 * (t + 1)); }
  }
  throw new Error("Open Food Facts no respondió");
}

// ---- 1. Descargar ----
const rows = new Map(), skipped = {};
let total = 0, pages = 0;
for (let n = 1; n <= MAX_PAGES; n++){
  const j = await page(n);
  const list = j.products || [];
  pages = n; total += list.length;
  for (const p of list){
    const r = offToRow(p);
    if (r.skip){ skipped[r.skip] = (skipped[r.skip] || 0) + 1; continue; }
    if (!rows.has(r.code)) rows.set(r.code, r);
  }
  if (n === 1) console.log("Productos de Argentina con tabla completa según Open Food Facts:", j.count);
  if (n % 20 === 0) console.log("… página", n, "· válidos hasta ahora:", rows.size);
  if (list.length < 100) break;
  await sleep(6500);
}
const all = [...rows.values()];
console.log("Páginas:", pages, "· productos leídos:", total, "· válidos:", all.length);
console.log("Descartados:", JSON.stringify(skipped));
if (OUT) writeFileSync(OUT, rowsToSql(all));

// ---- 2. Cargar en Supabase ----
if (APPLY){
  const ref = process.env.PROJECT_REF, token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token){ console.error("Faltan PROJECT_REF o SUPABASE_ACCESS_TOKEN"); process.exit(1); }
  const api = "https://api.supabase.com/v1/projects/" + ref + "/database/query";
  const run = async query => {
    for (let t = 0; t < 5; t++){
      const r = await fetch(api, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      if (r.status === 429 || r.status >= 500){ await sleep(5000 * (t + 1)); continue; }
      const j = await r.json().catch(() => null);
      return { ok: r.ok, data: j };
    }
    return { ok: false, data: null };
  };
  let nuevos = 0, actualizados = 0, fallidos = 0, motivo = "";
  // Si una tanda falla por un dato raro, se parte a la mitad hasta aislar el producto
  // (así un producto mal cargado en OFF no frena al resto).
  const load = async list => {
    const r = await run(batchSql(list));
    if (r.ok && Array.isArray(r.data)){ nuevos += +r.data[0]?.nuevos || 0; actualizados += +r.data[0]?.actualizados || 0; return; }
    if (list.length === 1){ fallidos++; if (!motivo) motivo = String(r.data?.message || "sin detalle").slice(0, 200); return; }
    const h = Math.ceil(list.length / 2);
    await load(list.slice(0, h)); await load(list.slice(h));
  };
  for (let i = 0; i < all.length; i += 500) await load(all.slice(i, i + 500));
  console.log("Cargados · nuevos:", nuevos, "· actualizados:", actualizados, "· sin cambios (ya estaban revisados o cargados por usuarios):",
    all.length - nuevos - actualizados - fallidos, "· con error:", fallidos);
  if (motivo) console.log("Primer error:", motivo);
  const c = await run("select count(*) filter (where source = 'off') as off, count(*) as todos from public.products;");
  if (c.ok && Array.isArray(c.data)) console.log("En la base ahora · de Open Food Facts:", c.data[0].off, "· total:", c.data[0].todos);
  if (fallidos && !nuevos && !actualizados) process.exit(1);
}
