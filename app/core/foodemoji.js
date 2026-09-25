// Emoji de cada alimento (como Fitia): primero por palabras del nombre, que es lo más
// preciso ("Milanesa de pollo" → 🍗 aunque esté en "Comidas y congelados"); si no hay
// ninguna, por la categoría de la base de alimentos; si tampoco, un plato.
import { FOODS } from './data.js';
import { norm } from './utils.js';

// El orden importa: lo más específico primero (helado de chocolate → 🍦, no 🍫).
const RULES = [
  [/milanesa de (soja|berenjena|calabaza|zapallo|quinoa|lentejas?|garbanzos?)|seitan|tempeh|medallon de (lentejas|vegetales)/, "🥗"],
  [/aceite de oliva|aceitunas?/, "🫒"], [/\baceite\b|\bgrasa (vacuna|de cerdo)\b|rocio vegetal/, "🫙"],
  [/\bbife\b|asado de tira|\bvacio\b|matambre|churrasco/, "🥩"],
  [/huevo|clara|yema|omelet/, "🥚"],
  [/gaseosa|agua saborizada|bebida isotonica|energizante|\bjugo\b/, "🥤"],
  [/helad|palito|bombon helado/, "🍦"], [/\btorta\b|budin|brownie|lemon pie|chocotorta|cheesecake|tarta dulce/, "🍰"],
  [/alfajor|galletit|galleta|oreo|cookie|vainilla/, "🍪"], [/chocolat|cacao|nutella|bon ?o ?bon/, "🍫"],
  [/caramelo|chicle|gomita|golosina|turron|garrapinada/, "🍬"], [/dulce de|mermelada|\bmiel\b|azucar|edulcorante|membrillo/, "🍯"],
  [/medialuna|factura|croissant|churro/, "🥐"], [/donut|dona/, "🍩"],
  [/pizza|fugazza/, "🍕"], [/hamburgues|burger|patty/, "🍔"], [/pancho|salchicha|hot ?dog/, "🌭"],
  [/empanada|canelon|raviol|sorrentino|capelet|tortelin/, "🥟"], [/sandwich|sanguche|tostado (de|jyq|jamon)|\bwrap\b|lomito|choripan/, "🥪"],
  [/\btacos?\b|burrito|quesadilla|fajita|nacho/, "🌮"], [/sushi|\broll\b|sashimi/, "🍣"], [/ensalada/, "🥗"],
  [/sopa|caldo|guiso|locro|puchero|estofado/, "🍲"], [/tarta|pascualina|quiche|torrej/, "🥧"],
  [/whey|proteina en polvo|scoop|creatina|batido|shake|suplement|colageno/, "🥤"],
  [/\bcafe\b|capuchino|cortado|espresso|latte|\bmate\b|\bte\b|infusion/, "☕"],
  [/cerveza|birra/, "🍺"], [/\bvino\b|champagne|espumante|sidra|fernet|vermut|aperitivo|whisky|vodka|\bron\b|\bgin\b|tequila|licor/, "🍷"],
  [/gaseosa|\bcoca\b|coca cola|pepsi|sprite|fanta|\bsoda\b|jugo|agua saborizada|bebida isotonica|gatorade|powerade|energizante|monster|speed/, "🥤"],
  [/\bagua\b/, "💧"], [/\bleche\b/, "🥛"], [/yogur|actimel|danonino|kefir/, "🥣"], [/queso|ricota|requeson|mozzarella|muzzarella/, "🧀"],
  [/manteca|margarina/, "🧈"], [/huevo|clara|yema|omelet/, "🥚"],
  [/pollo|pechuga|pata muslo|suprema|pavo|ala de|alitas|nugget/, "🍗"], [/pescado|merluza|salmon|atun|trucha|abadejo|sardina|caballa|mariscos|camaron|langostino|calamar|mejillon|brotola|pejerrey|tilapia/, "🐟"],
  [/jamon|salame|bondiola|mortadela|fiambre|panceta|bacon|leberwurst|chorizo|morcilla/, "🥓"],
  [/carne|bife|asado|vacio|nalga|peceto|cuadril|lomo|entrana|matambre|milanesa|churrasco|picada|carne picada|costilla|cerdo|solomillo|bondiola|hamburguesa/, "🥩"],
  [/arroz|risotto/, "🍚"], [/fideo|pasta|spaghetti|tallarin|mostachol|tirabuzon|noqui|lasagna|lasana/, "🍝"],
  [/\bpan\b|tostada|galleta de arroz|grisin|bizcocho|chipa|baguette|facturas|bagel|pebete|miga/, "🍞"],
  [/avena|granola|cereal|copos|muesli|quinoa|polenta|salvado|trigo|burgol|harina/, "🌾"],
  [/\bpapas?\b|batata|mandioca|\bpure\b/, "🥔"], [/choclo|maiz/, "🌽"], [/palta|aguacate/, "🥑"], [/tomate/, "🍅"], [/zanahoria/, "🥕"],
  [/lechuga|espinaca|acelga|rucula|kale|repollo|radicheta/, "🥬"], [/brocoli|coliflor|brote/, "🥦"], [/berenjena/, "🍆"],
  [/pepino|zapallito|zucchini|calabacin/, "🥒"], [/morron|pimiento|aji|jalapeno/, "🫑"], [/cebolla|ajo|puerro|verdeo/, "🧅"],
  [/zapallo|calabaza|anco/, "🎃"], [/hongo|champinon/, "🍄"], [/aceituna|aceite de oliva|oliva/, "🫒"],
  [/lenteja|garbanzo|poroto|arveja|soja|tofu|edamame|hummus|habas/, "🫘"],
  [/\bmani\b|almendra|nuez|nueces|castana|avellana|pistacho|semilla|chia|lino|girasol|sesamo|frutos secos|pasas/, "🥜"],
  [/banana/, "🍌"], [/manzana/, "🍎"], [/\bperas?\b/, "🍐"], [/naranja|mandarina|pomelo/, "🍊"], [/\blimon\b/, "🍋"],
  [/frutilla|fresa/, "🍓"], [/\buvas?\b/, "🍇"], [/sandia/, "🍉"], [/melon/, "🍈"], [/anana|\bpina\b/, "🍍"],
  [/durazno|damasco|pelon/, "🍑"], [/cereza/, "🍒"], [/kiwi/, "🥝"], [/mango/, "🥭"], [/arandano|frutos rojos|\bmoras?\b|frambuesa/, "🫐"],
  [/\bcoco\b/, "🥥"], [/aceite|mayonesa|ketchup|mostaza|salsa|aderezo|vinagre/, "🫙"],
];

const CAT = {
  "Lácteos": "🥛", "Quesos": "🧀", "Huevos": "🥚", "Carne vacuna": "🥩", "Cerdo": "🥩", "Pollo y aves": "🍗",
  "Pescados y mariscos": "🐟", "Fiambres y embutidos": "🥓", "Verduras": "🥦", "Frutas": "🍎", "Legumbres": "🫘",
  "Cereales, harinas y pastas": "🌾", "Pastas frescas y rellenas (cocidas)": "🍝", "Panificados": "🍞",
  "Aceites, aderezos y untables": "🫙", "Frutos secos y semillas": "🥜", "Dulces y azúcares": "🍯",
  "Golosinas y snacks": "🍫", "Helados y postres": "🍨", "Bebidas": "🥤", "Bebidas con alcohol": "🍷",
  "Suplementos": "🥤", "Vegetariano y sin TACC": "🥗", "Comidas y congelados": "🍽️",
};

let byName = null;
function catOf(name) {
  if (!byName) { byName = new Map(); (FOODS || []).forEach(f => { if (f && f.name) byName.set(f.name, f.cat); }); }
  // Lo anotado con crudo/cocido lleva " (crudo)" / " (cocido)" al final del nombre.
  return byName.get(String(name || "").replace(/ \((crudo|cocido)\)$/, "")) || null;
}

const memo = new Map();
export function foodEmoji(name, cat) {
  const key = name + "|" + (cat || "");
  if (memo.has(key)) return memo.get(key);
  const n = " " + norm(String(name || "")) + " ";
  let e = null;
  for (const [re, em] of RULES) { if (re.test(n)) { e = em; break; } }
  if (!e) e = CAT[cat || catOf(name)] || "🍽️";
  memo.set(key, e);
  return e;
}
