// Unidad natural de cada alimento, con nombre y peso: "1 banana (120 g)", "1 feta (20 g)",
// "1 cucharada (15 g)", "1 vaso (200 ml)". Es lo que suma el − / + de la hoja del alimento
// y los gramos con los que se abre. Lo que no tiene una unidad natural (carne picada,
// arroz, un guiso) queda como "porción" con la porción sugerida de la base.
//
// Orden de prioridad:
//   1) Lo que ya dice el nombre: "(1 u. ≈ 50 g)", "(1 scoop ≈ 30 g)", "(medida 50 ml)"…
//   2) Palabras del nombre (lo más específico primero).
//   3) Bebidas y líquidos: vaso. 4) Porción de la base.
// Pesos de referencia: tablas de porciones del Ministerio de Salud (Guías Alimentarias
// para la Población Argentina) y pesos medios de mercado; son de la parte que se come.
import { norm } from './utils.js';

// [regex, singular, plural, gramos]
const RULES = [
  // Platos: mandan sobre el ingrediente que diga el nombre ("Ravioles de ricota" no es
  // una cucharada de ricota).
  [/^ tapas para empanadas/, "tapa", "tapas", 30], [/^ tapas para tarta/, "porción", "porciones", null],
  [/^ (raviol|sorrentino|capelet|canelon|noqui|tallarin|lasana|agnolotti)/, "porción", "porciones", null],
  [/^ (tarta|pascualina)/, "porción", "porciones", 180], [/^ helado|palito bombon/, "bocha", "bochas", 70],
  [/^ (flan|postre|mousse|panqueque|bocadito|pan de leche|crema pastelera|arroz con leche)/, "porción", "porciones", null],
  [/^ (pancho|choripan|morcipan|chorizo al pan|bondiola al pan|mila en pan|sandwich|lomito completo|tostado)/, "unidad", "unidades", null],
  [/^ barrita/, "barrita", "barritas", null], [/^ pasta de aceitunas/, "cucharada", "cucharadas", 15],
  [/^ limonada/, "vaso", "vasos", 250], [/clara liquida/, "porción", "porciones", null],
  // Huevos
  [/huevo de codorniz/, "huevo", "huevos", 10], [/^ clara/, "clara", "claras", 33], [/^ yema/, "yema", "yemas", 17],
  [/^ huevo (entero|frito|duro)/, "huevo", "huevos", 50],
  // Frutas
  [/^ manzana (?!desh)/, "manzana", "manzanas", 180], [/^ banana(?! chips)/, "banana", "bananas", 120],
  [/^ naranja/, "naranja", "naranjas", 200], [/^ mandarina/, "mandarina", "mandarinas", 110], [/^ pomelo/, "pomelo", "pomelos", 250],
  [/^ pera\b/, "pera", "peras", 170], [/^ kiwi/, "kiwi", "kiwis", 75], [/^ durazno(?! en)/, "durazno", "duraznos", 150],
  [/^ pelon/, "pelón", "pelones", 130], [/^ ciruela(?! pasa)/, "ciruela", "ciruelas", 60], [/^ damasco/, "damasco", "damascos", 40],
  [/^ higo(?!s secos)/, "higo", "higos", 50], [/^ frutilla/, "frutilla", "frutillas", 15], [/^ limon/, "limón", "limones", 60],
  [/^ lima\b/, "lima", "limas", 60], [/^ mango/, "mango", "mangos", 300], [/^ palta(?! untable)/, "palta", "paltas", 150],
  [/^ (melon|sandia)/, "tajada", "tajadas", 250], [/^ anana(?! en)/, "rodaja", "rodajas", 90],
  [/^ (uva|arandano|frambuesa|mora|cereza)/, "taza", "tazas", 150], [/datil/, "dátil", "dátiles", 8],
  [/aceituna/, "aceituna", "aceitunas", 4], [/pasas de uva|orejon|higos secos|deshidratad|frutos secos|^ (mani|almendra|nuez|nueces|avellana|pistacho|castana|pinon)/, "puñado", "puñados", 30],
  [/^ semillas|^ mix de semillas/, "cucharada", "cucharadas", 10], [/coco rallado/, "cucharada", "cucharadas", 10],
  // Verduras
  [/^ papa\b/, "papa", "papas", 170], [/^ batata\b/, "batata", "batatas", 200], [/tomate cherry/, "tomate", "tomates", 15],
  [/^ tomate\b(?! (triturado|seco))/, "tomate", "tomates", 150], [/^ zanahoria/, "zanahoria", "zanahorias", 80],
  [/^ cebolla(?! de verdeo)/, "cebolla", "cebollas", 150], [/^ morron/, "morrón", "morrones", 160],
  [/^ (zapallito|zucchini)(?!s rellenos)/, "unidad", "unidades", 200], [/^ pepino/, "pepino", "pepinos", 200],
  [/^ berenjena\b(?!s)/, "berenjena", "berenjenas", 250], [/^ choclo\b(?! (en grano|cremoso))/, "choclo", "choclos", 150],
  [/^ ajo/, "diente", "dientes", 3], [/^ (lechuga|rucula|espinaca|acelga|radicheta|kale|berro)/, "taza", "tazas", 30],
  [/^ (brocoli|coliflor|champinon|repollitos)/, "taza", "tazas", 90],
  // Panificados y galletitas
  [/^ pan frances/, "pancito", "pancitos", 60], [/^ pan (lactal|de molde|integral casero|de salvado|multicereal|de centeno)/, "rebanada", "rebanadas", 25],
  [/^ pan de miga/, "rebanada", "rebanadas", 20], [/^ pan arabe|pan pita/, "pan", "panes", 70],
  [/^ pan de hamburguesa/, "pan", "panes", 60], [/^ pan de pancho/, "pan", "panes", 45], [/^ pan de viena/, "pan", "panes", 50],
  [/^ tostadas? de/, "tostada", "tostadas", 10], [/galletas? de arroz/, "galleta", "galletas", 9], [/oreo/, "galletita", "galletitas", 11],
  [/galletit|criollita|chocolina|traviata|express|club social|crackers/, "galletita", "galletitas", 7],
  [/grisin/, "grisín", "grisines", 5], [/medialuna/, "medialuna", "medialunas", 45], [/factura|bola de fraile|berlinesa|vigilante/, "factura", "facturas", 55],
  [/chipa/, "chipá", "chipás", 20], [/bizcochito/, "bizcochito", "bizcochitos", 5], [/churro/, "churro", "churros", 40],
  [/\bscon\b/, "scon", "scons", 40], [/magdalena|muffin/, "unidad", "unidades", 60], [/budin|bizcochuelo|pionono/, "rebanada", "rebanadas", 60],
  [/rapidita|tortillas de trigo/, "rapidita", "rapiditas", 40], [/alfajor/, "alfajor", "alfajores", 50],
  // Lácteos y quesos
  [/^ leche(?! (en polvo|condensada))|leche de (almendras|coco|avena|soja|arroz)|kefir/, "vaso", "vasos", 200],
  [/yogur bebible|yogur proteico bebible/, "vaso", "vasos", 200], [/^ yogur/, "pote", "potes", 190],
  [/queso (rallado|reggianito|parmesano)|rallado de sobre/, "cucharada", "cucharadas", 5],
  [/queso (crema|untable)|queso crema con|ricota|requeson/, "cucharada", "cucharadas", 20],
  [/^ queso|^ muzzarella|^ mozzarella/, "feta", "fetas", 20], [/crema de leche|crema chantilly/, "cucharada", "cucharadas", 15],
  [/^ manteca|margarina|ghee/, "cucharadita", "cucharaditas", 5],
  // Dulces, untables y aderezos
  [/dulce de leche|mermelada|jalea|^ miel|pasta de mani|crema de avellanas/, "cucharada", "cucharadas", 20],
  [/^ azucar|cacao amargo/, "cucharadita", "cucharaditas", 5], [/edulcorante/, "cucharadita", "cucharaditas", 1],
  [/^ aceite|^ grasa/, "cucharada", "cucharadas", 13],
  [/mayonesa|ketchup|mostaza|salsa golf|aderezo|barbacoa|salsa de soja|chimichurri|vinagre|aceto|salsa criolla|provenzal/, "cucharada", "cucharadas", 15],
  // Carnes, pescados y fiambres
  [/^ bife|churrasco|churrasquito/, "bife", "bifes", 200], [/^ milanesa|^ mila\b/, "milanesa", "milanesas", 120],
  [/hamburguesa (casera|congelada|de (soja|garbanzo|quinoa|pollo)(?! con pan))|medallon/, "medallón", "medallones", 80],
  [/salchicha/, "salchicha", "salchichas", 45], [/^ chorizo(?! al pan)/, "chorizo", "chorizos", 100], [/^ morcilla/, "morcilla", "morcillas", 100],
  [/^ pechuga(?! de pavo \(fiambre)|suprema/, "pechuga", "pechugas", 200], [/pata muslo|muslo/, "presa", "presas", 250],
  [/alitas/, "alita", "alitas", 30], [/nugget/, "nugget", "nuggets", 18],
  [/^ (jamon|paleta cocida|salame|salamin|mortadela|bondiola curada|pechuga de pavo|lomito ahumado|pastron|leberwurst|cantimpalo|queso de cerdo|pollo al pastor)/, "feta", "fetas", 15],
  [/^ (merluza|abadejo|lenguado|pescadilla|corvina|besugo|brotola|mero|salmon (rosado|blanco)|trucha|tilapia|surubi|pacu|boga|dorado|pejerrey|atun fresco|merluza negra)/, "filet", "filets", 150],
  [/(atun|caballa|salmon|sardinas) (al natural|en aceite|en lata)/, "lata", "latas", 120],
  // Comidas
  [/empanada(?! tapas)/, "empanada", "empanadas", 90], [/tapas para empanadas/, "tapa", "tapas", 30],
  [/^ (pizza|fugazza|fugazzeta)/, "porción", "porciones", 120], [/^ (tarta|pascualina)|^ tortilla/, "porción", "porciones", 180],
  [/^ (pancho|choripan|morcipan)|al pan\b|sandwich|lomito completo|hamburguesa .*con pan|hamburguesa completa|big mac|cuarto de libra|mila en pan|tostado/, "unidad", "unidades", null],
  // Snacks y golosinas
  [/caramelo/, "caramelo", "caramelos", 5], [/chicle/, "chicle", "chicles", 2], [/gomita/, "gomita", "gomitas", 3],
  [/^ helado|palito bombon/, "bocha", "bochas", 70], [/barrita|barra proteica/, "barrita", "barritas", null],
  // Bebidas
  [/^ (cafe|cortado|capuchino|latte|te\b|te con|mate cocido|submarino|chocolatada caliente)/, "taza", "tazas", 200],
  [/^ vino|espumante|champagne|sidra|clerico/, "copa", "copas", 150], [/^ cerveza/, "vaso", "vasos", 330],
  [/^ (gaseosa|agua|soda|jugo|limonada|kombucha|bebida|licuado|batido|terere)/, "vaso", "vasos", 250],
];

// Unidad escrita en el nombre: "(1 u. ≈ 50 g)", "(1 scoop ≈ 30 g)", "(medida 50 ml)", "(1 u.)".
function fromName(name) {
  const n = String(name || "");
  let m = n.match(/\(1 ([a-záéíóúñ.]+)(?:\s*≈\s*(\d+(?:[.,]\d+)?)\s*(?:g|ml))?/i);
  if (m) {
    const w = m[1].replace(/\.$/, "").toLowerCase();
    const one = w === "u" ? "unidad" : w;
    const PL = { unidad: "unidades", "porción": "porciones", porcion: "porciones", dosis: "dosis" };
    const many = PL[one] || (one.endsWith("s") ? one : (/[aeiouáéíóú]$/.test(one) ? one + "s" : one + "es"));
    return { one, many, g: m[2] ? parseFloat(m[2].replace(",", ".")) : null };
  }
  m = n.match(/\(medida (\d+) ml\)/i);
  if (m) return { one: "medida", many: "medidas", g: +m[1] };
  return null;
}

const memo = new Map();
// Unidad del alimento (en su estado base). { one, many, g, natural } — natural = false si
// es la "porción" genérica de la base.
export function foodUnit(food) {
  if (!food) return { one: "porción", many: "porciones", g: 100, natural: false };
  const key = food.name + "|" + food.portion;
  if (memo.has(key)) return memo.get(key);
  const hint = fromName(food.name);
  let rule = null;
  const n = " " + norm(food.name).replace(/\s*\(.*?\)\s*/g, " ").trim() + " ";
  for (const [re, one, many, g] of RULES) { if (re.test(n)) { rule = { one, many, g }; break; } }
  // "(1 u. ≈ 50 g)" da el peso; la palabra ("huevo", "medialuna") la da la regla si hay.
  let u = hint && hint.one === "unidad" && rule && rule.one !== "porción" ? { one: rule.one, many: rule.many, g: hint.g || rule.g } : (hint || rule);
  if (!u && food.unit === "ml") u = { one: "vaso", many: "vasos", g: food.portion >= 150 ? food.portion : 200 };
  // Menos de 5 g (un disparo de aceite, un sobre de edulcorante) se guarda con un decimal.
  const r = g => g < 5 ? Math.round(g * 10) / 10 : Math.round(g);
  const out = u ? { one: u.one, many: u.many, g: r(u.g || food.portion || 100), natural: u.one !== "porción" }
                : { one: "porción", many: "porciones", g: r(food.portion || 100), natural: false };
  memo.set(key, out);
  return out;
}

// "2 bananas (240 g)", "≈ 1,5 tazas (225 g)", "1 porción (150 g)".
export function unitText(grams, u, unit) {
  const g = parseFloat(String(grams).replace(",", ".")) || 0;
  const n = u.g ? g / u.g : 0;
  const exact = Math.abs(n - Math.round(n)) < 0.05;
  const num = exact ? String(Math.round(n)) : "≈ " + (Math.round(n * 10) / 10).toString().replace(".", ",");
  const word = exact && Math.round(n) === 1 ? u.one : u.many;
  return num + " " + word + " (" + Math.round(g) + " " + (unit === "ml" ? "ml" : "g") + ")";
}
