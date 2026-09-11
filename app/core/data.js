import { mkEx, mkExT } from './utils.js';

export const FOODS_RAW = [
// ---- LÁCTEOS Y HUEVOS ----
["Leche entera La Serenísima",61,3.2,4.8,3.3,200,"ml"],["Leche descremada",35,3.4,5,0.1,200,"ml"],["Leche parcialmente descremada",48,3.3,4.9,1.5,200,"ml"],
["Leche chocolatada Cindor",76,3.1,11,2.2,200,"ml"],["Leche en polvo entera",496,25,38,26,25],["Leche en polvo descremada",362,36,52,1,25],
["Yogur entero natural",61,3.5,4.7,3.3,190],["Yogur descremado natural",45,4,6,0.2,190],["Yogur bebible entero",65,2.8,10,1.8,220,"ml"],
["Yogur Ser 0%",42,4.5,5.5,0.1,190],["Yogur griego natural",97,9,4,5,170],["Yogur con cereales",110,3.5,18,2.5,150],
["Actimel",67,2.9,10.5,1.5,100],["Danonino",95,6,11,3,52],["Postre Ser Vainilla",78,3.2,13,1.5,120],
["Postre La Serenísima Danito",115,3,17,4,100],["Flan casero",130,4.5,20,3.5,120],["Queso cremoso",290,20,2,23,30],
["Queso fresco / port salut",280,18,2,22,30],["Queso por salut light",190,22,2,10,30],["Queso mozzarella",280,22,2,20,30],
["Queso mozzarella light",210,26,2,10,30],["Queso rallado (tipo reggianito)",380,32,1,27,10],["Queso cremoso untable",245,7,4,22,30],
["Queso crema Finlandia",250,6,4,24,30],["Queso crema light",145,10,5,9,30],["Queso de máquina",300,20,3,24,30],
["Queso sardo",370,26,1,29,30],["Queso pategrás",350,25,1,27,30],["Queso azul (roquefort)",350,21,2,29,30],
["Ricota",174,11,3,13,100],["Ricota descremada",130,13,4,6,100],["Requesón",96,11,3.6,4.3,100],
["Manteca",717,0.9,0.1,81,10],["Margarina untable",530,0.2,0.5,58,10],["Crema de leche",340,2.2,3,35,30],
["Huevo entero (1 unidad ~50g)",70,6.3,0.4,4.8,50],["Clara de huevo (1 unidad ~33g)",17,3.6,0.2,0.1,33],["Yema de huevo (1 unidad ~17g)",55,2.7,0.3,4.5,17],
// ---- CARNES ROJAS ----
["Carne vacuna magra (nalga)",187,28,0,8,150],["Carne vacuna (cuadril)",190,29,0,7.5,150],["Carne vacuna (peceto)",165,29,0,5,150],
["Carne vacuna (bola de lomo)",172,28,0,6,150],["Carne vacuna (lomo)",190,28,0,8,150],["Bife de chorizo",250,26,0,16,200],
["Bife angosto",230,25,0,14,200],["Bife ancho",240,25,0,15,200],["Asado (tira)",290,24,0,21,200],
["Vacío",270,23,0,19,200],["Matambre",260,22,0,19,150],["Entraña",230,24,0,15,180],
["Colita de cuadril",210,26,0,11,180],["Carne picada común",240,18,0,18,150],["Carne picada especial",165,20,0,9,150],
["Milanesa de carne (cruda)",270,20,15,14,150],["Milanesa de carne (frita, 1 unidad)",310,22,16,18,150],["Hígado vacuno",135,20,4,3.6,150],
["Riñón vacuno",95,17,0,3,150],["Achuras (chinchulines)",280,17,0,23,150],["Osobuco",137,20,0,6,200],
["Cordero (pierna)",294,25,0,21,150],
// ---- CERDO ----
["Bondiola de cerdo",230,22,0,15,150],["Bife de cerdo (carré)",143,21,0,6,150],["Costillas de cerdo",280,20,0,22,200],
["Lomo de cerdo",143,22,0,5.5,150],["Panceta",518,9,0,53,30],["Panceta ahumada (crocante)",541,37,1.4,42,20],
["Chorizo criollo (crudo)",300,15,2,25,100],["Chorizo parrillero (cocido)",310,16,2,27,100],
// ---- POLLO Y AVES ----
["Pechuga de pollo",165,31,0,3.6,150],["Pollo (muslo)",209,26,0,11,150],["Pollo (pata)",200,25,0,11,150],
["Pollo entero con piel",239,27,0,14,150],["Suprema de pollo (cruda)",165,31,0,3.6,150],["Milanesa de pollo (frita)",280,25,14,15,150],
["Pollo al spiedo (con piel)",255,26,0,16,150],["Pavita (pechuga)",135,29,0,1.5,150],["Hígado de pollo",119,17,1,4.7,100],
// ---- PESCADOS Y MARISCOS ----
["Merluza",90,18,0,1.5,150],["Salmón",208,20,0,13,150],["Atún al natural (lata)",116,26,0,1,120],
["Atún al aceite (lata, escurrido)",190,25,0,10,120],["Caballa",190,19,0,12,150],["Trucha",148,20,0,6.6,150],
["Lenguado",90,18,0,1.5,150],["Salmón rosado (lata)",153,20,0,7,120],["Camarones / langostinos",99,24,0.2,0.3,120],
["Calamar",92,15.6,3.1,1.4,120],["Pulpo",82,15,2.2,1,120],["Mejillones",86,12,3.7,2.2,120],
["Palitos de mar (surimi)",95,9,15,0.5,100],["Sardinas al natural (lata)",208,25,0,11,100],
// ---- FIAMBRES Y EMBUTIDOS ----
["Jamón cocido",110,18,1,4,30],["Jamón cocido light",95,20,1,1.5,30],["Jamón crudo",195,28,0,9,30],
["Paleta cocida",105,16,1.5,4,30],["Salame",405,22,1,35,30],["Salamín",435,24,1,38,30],
["Mortadela",280,15,3,24,30],["Bondiola ahumada",150,23,0,6,30],["Lomito ahumado (fiambre)",140,24,0,4.5,30],
["Pechuga de pavo (fiambre)",95,18,2,1.5,30],["Chorizo colorado",380,20,3,32,30],["Longaniza",340,17,2,29,30],
["Salchichas tipo Viena (1 unidad)",250,11,3,22,50],["Salchichón",290,14,3,25,30],["Bacon / panceta ahumada fina",500,37,0.5,39,20],
// ---- VERDULERÍA ----
["Papa (cruda)",77,2,17,0.1,150],["Papa hervida",87,1.9,20,0.1,150],["Papa al horno (1 mediana)",93,2.5,21,0.1,150],
["Batata",86,1.6,20,0.1,150],["Calabaza",26,1,7,0.1,150],["Zapallo anco",39,1.4,10,0.1,150],
["Zapallito verde",17,1.2,3.1,0.2,150],["Zanahoria",41,0.9,10,0.2,100],["Cebolla",40,1.1,9,0.1,100],
["Tomate",18,0.9,3.9,0.2,100],["Tomate perita",20,1,4,0.2,100],["Lechuga",15,1.4,2.9,0.2,50],
["Espinaca",23,2.9,3.6,0.4,80],["Acelga",19,1.8,3.7,0.2,80],["Brócoli",34,2.8,7,0.4,120],
["Coliflor",25,1.9,5,0.3,120],["Zapallito redondo",17,1.2,3.1,0.2,150],["Berenjena",25,1,6,0.2,120],
["Zucchini",17,1.2,3.1,0.3,120],["Morrón rojo",31,1,6,0.3,100],["Morrón verde",20,0.9,4.6,0.2,100],
["Pepino",15,0.7,3.6,0.1,100],["Choclo (mazorca)",96,3.4,21,1.5,150],["Choclo en grano (lata)",86,3.2,19,1.2,100],
["Arvejas",81,5.4,14,0.4,100],["Arvejas en lata",70,5,12,0.4,100],["Chaucha (judía verde)",31,1.8,7,0.2,100],
["Remolacha",43,1.6,10,0.2,100],["Rabanito",16,0.7,3.4,0.1,80],["Apio",16,0.7,3,0.2,80],
["Repollo blanco",25,1.3,5.8,0.1,100],["Repollo colorado",31,1.4,7.4,0.2,100],["Puerro",29,1.5,7,0.1,100],
["Ajo (1 diente ~3g)",4,0.2,1,0,3],["Champiñones",22,3.1,3.3,0.3,100],["Palta",160,2,8.5,15,100],
["Rúcula",25,2.6,3.7,0.7,50],
// ---- FRUTAS ----
["Manzana",52,0.3,14,0.2,150],["Banana",89,1.1,23,0.3,120],["Naranja",47,0.9,12,0.1,150],
["Mandarina",53,0.8,13,0.3,100],["Pera",57,0.4,15,0.1,150],["Uvas",69,0.7,18,0.2,100],
["Frutilla",32,0.7,7.7,0.3,150],["Kiwi",61,1.1,15,0.5,80],["Ananá",50,0.5,13,0.1,150],
["Melón",34,0.8,8,0.2,150],["Sandía",30,0.6,8,0.2,150],["Durazno",39,0.9,10,0.3,130],
["Ciruela",46,0.7,11,0.3,80],["Damasco",48,1.4,11,0.4,80],["Pomelo",42,0.8,11,0.1,150],
["Limón (1 unidad ~90g)",29,1.1,9.3,0.3,90],["Mango",60,0.8,15,0.4,150],["Palta (fruta) — ver Verdulería",160,2,8.5,15,100],
["Higo",74,0.8,19,0.3,60],["Cereza",63,1.1,16,0.2,100],["Frutas secas — pasas de uva",299,3.1,79,0.5,30],
["Ciruela desecada",240,2.2,64,0.4,30],["Dátil",282,2.5,75,0.4,30],["Banana chip (deshidratada)",519,2.3,58,33,30],
// ---- LEGUMBRES, CEREALES Y HARINAS ----
["Lentejas (cocidas)",116,9,20,0.4,150],["Garbanzos (cocidos)",164,8.9,27,2.6,150],["Porotos negros (cocidos)",132,8.9,24,0.5,150],
["Porotos alubia (cocidos)",127,8.7,23,0.5,150],["Soja (grano cocido)",173,17,10,9,100],["Arroz blanco (crudo)",130,2.7,28,0.3,80],
["Arroz blanco (cocido)",130,2.7,28,0.3,150],["Arroz integral (cocido)",111,2.6,23,0.9,150],["Arroz yamaní",111,2.6,23,0.9,150],
["Fideos secos (crudos)",158,5.8,31,0.9,80],["Fideos cocidos",131,5,25,1.1,150],["Fideos integrales (cocidos)",124,5.3,25,1.1,150],
["Polenta cocida",70,1.7,15,0.4,150],["Avena arrollada (cruda)",389,17,66,7,40],["Harina de trigo 0000",364,10,76,1,50],
["Harina integral",340,13,72,2.5,50],["Harina leudante",354,9.7,76,1,50],["Almidón de maíz (Maizena)",381,0.3,91,0.1,15],
["Semolín",360,13,74,1.2,50],["Quinoa (cocida)",120,4.4,21,1.9,150],["Trigo burgol (cocido)",83,3,19,0.2,150],
["Pan rallado",395,13,72,5,15],
// ---- PANIFICADOS Y PASTELERÍA ----
["Pan francés / flauta",270,9,53,1.5,50],["Pan lactal blanco (1 rebanada)",264,9,49,3,25],["Pan lactal integral (1 rebanada)",246,10,42,3.5,25],
["Pan de salvado (1 rebanada)",240,10,40,3,25],["Pan árabe / pita (1 unidad)",275,9,55,1.5,60],["Pan de campo",260,8,52,1.8,50],
["Grisines (3 unidades)",408,10,74,7,20],["Tostadas (1 unidad)",395,11,73,5,10],["Galletas de agua / crackers (3 u.)",440,10,72,12,20],
["Galletitas Criollitas (Bagley, 1 u.)",470,7,64,20,15],["Galletitas Traviata (Bagley, 3 u.)",470,7,65,20,25],["Galletitas Chocolinas (Bagley, 3 u.)",460,7,68,17,25],
["Galletitas Sonrisas (Bagley, 4 u.)",480,6,66,22,30],["Galletitas Rumba (Bagley, 3 u.)",475,6,65,22,25],["Alfajor Jorgito (1 u.)",395,4,55,17,50],
["Alfajor Havanna (1 u.)",480,6,58,25,55],["Alfajor Guaymallén (1 u.)",410,4,58,17,45],["Alfajor Cachafaz (1 u.)",420,4,58,18,50],
["Facturas (medialuna de manteca, 1 u.)",320,6,35,17,50],["Facturas (medialuna de grasa, 1 u.)",300,5,38,14,50],["Tostado jamón y queso (sandwich)",290,14,32,12,150],
["Sándwich de miga (2 u.)",250,9,30,10,90],["Torta de cumpleaños (porción)",370,4.5,48,18,100],["Budín de limón (porción)",370,5,48,18,80],
["Muffin de chocolate",410,5,52,20,80],["Vigilante (queso y dulce, porción)",330,9,45,12,80],["Chipá (1 unidad)",130,3,17,5,40],
// ---- PASTAS Y RELLENOS ----
["Ñoquis de papa (cocidos)",130,3.5,26,1,200],["Ravioles de ricota y verdura (cocidos)",165,7,25,4,200],["Ravioles de carne (cocidos)",180,8,24,5.5,200],
["Sorrentinos de jamón y queso (cocidos)",210,9,26,7.5,220],["Canelones de verdura (2 u. con salsa)",220,9,24,9,250],["Tallarines caseros (cocidos)",150,5.5,29,1.2,200],
["Fideos rellenos (mix, cocidos)",190,8,25,6,200],["Salsa de tomate (casera)",35,1.3,7,0.4,100],["Salsa filetto",50,1.2,8,1.5,100],
["Salsa blanca / bechamel",120,3,7,9,100],["Salsa pesto",303,4,4,31,30],["Salsa boloñesa",110,8,6,6,150],
// ---- ACEITES, GRASAS Y ADEREZOS ----
["Aceite de oliva",884,0,0,100,10],["Aceite de girasol",884,0,0,100,10],["Aceite de maíz",884,0,0,100,10],
["Mayonesa Hellmann's",680,1,3,73,15],["Mayonesa light",320,1,7,32,15],["Ketchup",110,1.5,26,0.2,15],
["Mostaza",70,4,8,3,10],["Salsa golf",380,1,10,38,15],["Aderezo César",450,1.5,7,46,15],
["Vinagre",18,0,0.4,0,10],["Chimichurri",270,1,4,28,20],
// ---- FRUTOS SECOS, SEMILLAS Y DULCES NATURALES ----
["Maní",567,26,16,49,30],["Maní salado (paquete)",590,25,18,50,30],["Almendras",579,21,22,50,30],
["Nueces",654,15,14,65,30],["Nuez pecan",691,9,14,72,30],["Avellanas",628,15,17,61,30],
["Castañas de cajú",553,18,30,44,30],["Pistachos",560,20,28,45,30],["Semillas de chía",486,17,42,31,15],
["Semillas de lino",534,18,29,42,15],["Semillas de girasol",584,21,20,51,30],["Semillas de sésamo",573,18,23,50,15],
["Mix frutos secos y pasas",520,15,35,38,30],["Miel",304,0.3,82,0,15],["Dulce de leche",315,6,56,7,20],
["Mermelada",250,0.4,63,0.1,20],["Dulce de membrillo",260,0.4,64,0.1,30],["Pasta de maní (mantequilla de maní)",588,25,20,50,30],
// ---- ACEITUNAS Y ENCURTIDOS ----
["Aceitunas verdes",145,1,3.8,15,30],["Aceitunas negras",115,0.8,6,11,30],["Pepinillos en vinagre",11,0.3,2.3,0.1,30],
// ---- SNACKS Y GOLOSINAS ----
["Papas fritas (Lays, paquete chico)",536,6,52,34,45],["Papas fritas (paquete)",536,6,52,34,150],["Palitos salados (paquete)",480,9,65,20,50],
["Doritos",498,7,60,25,50],["Pochoclo salado (microondas)",480,9,58,24,50],["Pochoclo dulce",420,6,80,10,50],
["Chizitos",560,5,55,35,45],["Chocolate Águila (tableta)",530,7,58,28,25],["Chocolate Milka (tableta)",535,6,58,29,25],
["Bon o Bon (1 unidad)",510,5,55,29,15],["Rhodesia (1 unidad)",480,6,60,24,20],["Jack (1 unidad)",495,6,62,25,25],
["Cofler (1 unidad)",500,6,55,28,20],["Shot (1 unidad)",480,5,65,22,20],["Topline (1 unidad)",475,4,66,21,18],
["Mantecol (porción)",520,14,45,32,30],["Alfajor de maicena (1 u.)",420,4,60,18,40],["Turrón de maní (1 u.)",440,10,58,18,25],
["Chupetín (1 unidad)",180,0,45,0,15],["Caramelos (5 unidades)",390,0,97,0,20],["Gomitas / ositos (porción)",340,4,78,0.5,30],
["Chicles (5 unidades)",270,0,68,0,7],["Obleas (1 unidad)",470,5,63,22,25],["Barrita de cereal Cerealitas",380,6,72,7,25],
["Barrita Granix",390,7,64,10,25],
// ---- HELADOS Y POSTRES ----
["Helado de crema (por 100g)",207,3.5,24,11,100],["Helado de agua / frutal",130,0,32,0,100],["Palito helado tipo Bombón",280,3,28,17,60],
["Postre Jauja (1 pote)",250,4,30,12,120],["Gelatina (preparada)",62,1.5,14,0,150],["Flan Royal (preparado)",115,3,20,2.5,120],
["Mousse de chocolate (porción)",280,5,25,18,100],["Tiramisú (porción)",340,5,32,20,120],
// ---- BEBIDAS SIN ALCOHOL ----
["Agua mineral",0,0,0,0,500,"ml"],["Agua saborizada Levité",18,0,4.5,0,500,"ml"],["Coca-Cola",42,0,10.6,0,350,"ml"],
["Coca-Cola Zero",0.3,0,0,0,350,"ml"],["Pepsi",41,0,10.5,0,350,"ml"],["Sprite",37,0,9.3,0,350,"ml"],
["Fanta",42,0,10.5,0,350,"ml"],["Paso de los Toros (pomelo)",38,0,9.5,0,350,"ml"],["Gatorade",24,0,6,0,500,"ml"],
["Powerade",24,0,6,0,500,"ml"],["Speed energizante",48,0,12,0,250,"ml"],["Red Bull",45,0,11,0,250,"ml"],
["Jugo Cepita",45,0.3,11,0,200,"ml"],["Jugo Baggio",40,0.2,10,0,200,"ml"],["Jugo exprimido natural (naranja)",45,0.7,10.4,0.2,200,"ml"],
["Café solo (sin azúcar)",2,0.1,0,0,50,"ml"],["Café con leche",55,3,5,2.5,200,"ml"],["Té (sin azúcar)",1,0,0.3,0,200,"ml"],
["Mate cocido (sin azúcar)",1,0,0.2,0,200,"ml"],["Yerba mate (infusión, mate cebado)",5,0.5,1,0,200,"ml"],["Licuado de banana con leche",95,3,17,2,250,"ml"],
["Smoothie de frutas",90,1,21,0.3,250,"ml"],["Leche chocolatada (ver Lácteos)",76,3.1,11,2.2,200,"ml"],["Isotónica casera (agua+sal+limón)",10,0,2.5,0,500,"ml"],
// ---- BEBIDAS ALCOHÓLICAS ----
["Cerveza Quilmes",43,0.5,3.6,0,350,"ml"],["Cerveza IPA artesanal",56,0.6,4.6,0,350,"ml"],["Cerveza sin alcohol",25,0.4,5.8,0,350,"ml"],
["Vino tinto (copa)",85,0.1,2.6,0,150,"ml"],["Vino blanco (copa)",82,0.1,2.6,0,150,"ml"],["Espumante / champagne (copa)",90,0.2,3,0,150,"ml"],
["Fernet (medida)",118,0,10,0,50,"ml"],["Whisky (medida)",106,0,0,0,45,"ml"],["Vodka (medida)",97,0,0,0,45,"ml"],
["Gin (medida)",97,0,0,0,45,"ml"],["Aperol Spritz (vaso)",120,0.2,12,0,200,"ml"],["Campari (medida)",120,0,15,0,50,"ml"],
["Sidra (copa)",95,0,7,0,200,"ml"],
// ---- SUPLEMENTOS Y BARRAS PROTEICAS ----
["Proteína whey (1 scoop ~30g)",120,24,3,1.5,30],["Proteína whey ENA (1 scoop)",117,23,3,1.5,30],["Proteína whey Xtrenght (1 scoop)",115,24,2.5,1,30],
["Proteína vegana (1 scoop ~30g)",110,20,5,1.5,30],["Caseína (1 scoop ~30g)",110,24,2,1,30],["Ganador de peso / Mass (1 scoop ~50g)",190,10,32,3,50],
["Creatina monohidrato (1 dosis 5g)",0,0,0,0,5],["BCAA (1 dosis ~10g)",5,1,0,0,10],["Glutamina (1 dosis ~5g)",0,0,0,0,5],
["Pre-entreno (1 dosis)",5,0,1,0,10],["Barra proteica ENA (1 unidad)",200,20,18,7,60],["Barra proteica Xtrenght (1 unidad)",190,20,16,6.5,60],
["Barra proteica Gold Nutrition (1 u.)",180,15,20,5,50],["Barra proteica Quest",190,20,21,7,60],["Barra de cereal fit (1 unidad)",95,1.5,18,2,25],
["Alfajor proteico (1 unidad)",210,15,20,8,50],["Gelatina proteica (1 pote)",90,15,5,1,150],["Pancakes proteicos (mix, preparados 3 u.)",280,25,25,8,150],
["Clara líquida pasteurizada (100 ml)",48,10,0.7,0.1,100,"ml"],["Isotónico en polvo (1 dosis)",90,0,22,0,300],["Multivitamínico (1 comprimido)",2,0,0.4,0,1],
["Omega 3 (1 cápsula)",9,0,0,1,1],["Colágeno hidrolizado (1 dosis ~10g)",36,9,0,0,10],["Melatonina (1 comprimido)",1,0,0.2,0,1],
// ---- DIETÉTICA Y FARMACIA ----
["Edulcorante líquido (10 gotas)",0,0,0,0,1],["Edulcorante en polvo (1 sobre)",4,0,1,0,1],["Stevia (1 sobre)",0,0,0.3,0,1],
["Azúcar mascabo",380,0,100,0,10],["Azúcar blanca",387,0,100,0,10],["Harina de almendras",579,21,22,50,30],
["Harina de avena",389,17,66,7,40],["Leche de almendras",17,0.6,0.6,1.5,200,"ml"],["Leche de coco (bebida, no crema)",25,0.2,3,2,200,"ml"],
["Leche de avena",45,1,7,1.5,200,"ml"],["Yogur de soja",55,3.5,4,2.5,190],["Tofu",76,8,1.9,4.8,100],
["Seitán",370,75,14,2,100],["Hamburguesa de vegetales / lentejas (1 u.)",180,10,18,7,90],["Pan sin TACC (1 rebanada)",250,4,52,2,25],
["Fideos sin TACC (cocidos)",150,3,32,1,150],["Granola casera",450,10,60,17,40],["Cereales de desayuno (copos de maíz)",378,7,84,1,30],
["Cereales integrales con fibra",360,8,75,3,30],["Salvado de trigo",216,16,64,4.3,15],["Germen de trigo",360,25,45,10,15],
// ---- CONGELADOS Y PRECOCIDOS ----
["Hamburguesa de carne (1 u. cruda)",250,17,2,20,100],["Nuggets de pollo (5 u.)",290,14,18,18,100],["Tarta de verdura (porción)",230,7,20,13,150],
["Empanada de carne (horno, 1 u.)",230,8,22,12,90],["Empanada de jamón y queso (1 u.)",240,9,23,13,90],["Empanada de humita (1 u.)",210,6,26,9,90],
["Pizza muzzarella (porción)",270,11,32,11,150],["Pizza especial (porción)",300,13,32,13,170],["Papas fritas congeladas (horno)",165,2.5,25,6,150],
["Rabas rebozadas (porción)",220,10,20,11,150],["Milanesa de soja (1 u.)",210,18,12,10,100],
// ---- COMIDAS RÁPIDAS Y RESTAURANTE ----
["Hamburguesa completa (con pan, 1 u.)",480,25,38,25,220],["Big Mac (McDonald's)",550,25,45,30,220],["Papas fritas McDonald's (medianas)",340,4,44,17,110],
["Cuarto de libra con queso",520,30,40,26,200],["McNuggets (6 u.)",270,15,17,17,110],["Milkshake McDonald's (mediano)",380,8,60,12,300],
["Pizza muzzarella (porción de local)",290,12,33,12,150],["Lomito completo",650,35,45,35,350],["Choripán",480,20,35,28,180],
["Sushi (8 piezas mixtas)",320,12,55,5,240],["Ensalada César con pollo",380,28,15,22,300],["Shawarma / kebab",550,28,45,28,300],
["Sándwich de milanesa completo",600,28,55,28,250],["Bowl de pollo y arroz (fitness)",450,35,45,12,350],["Wrap de pollo",380,22,38,14,220],
// ---- VERDULERÍA — fuente oficial: SARA 2, Ministerio de Salud / Argenfoods ----
["Acelga, cruda (SARA2/Min.Salud)",18,1.8,2.1,0.2,100],["Achicoria, cruda (SARA2/Min.Salud)",12,1.6,0.7,0.3,100],["Ají rojo / morrón rojo, crudo (SARA2/Min.Salud)",22,1,3.9,0.3,100],
["Ají verde o amarillo / morrón verde o amarillo, crudo (SARA2/Min.Salud)",17,0.9,2.9,0.2,100],["Ajo, crudo (SARA2/Min.Salud)",91,4.4,17.9,0.2,100],["Albahaca, cruda (SARA2/Min.Salud)",23,3.2,1.1,0.6,100],
["Alcaucil, crudo (SARA2/Min.Salud)",41,2.9,6.5,0.4,100],["Apio, crudo (SARA2/Min.Salud)",10,0.7,1.4,0.2,100],["Arveja, fresca, cruda (SARA2/Min.Salud)",83,8.9,10.9,0.4,100],
["Berenjena, cruda (SARA2/Min.Salud)",16,1.1,2.5,0.2,100],["Berro, crudo (SARA2/Min.Salud)",18,1.7,2.2,0.3,100],["Brócoli, crudo (SARA2/Min.Salud)",27,3.3,2.9,0.2,100],
["Brotes de soja, crudo (SARA2/Min.Salud)",30,3,4.1,0.2,100],["Cebolla de verdeo, cruda (SARA2/Min.Salud)",28,1.8,4.7,0.2,100],["Cebolla, cruda (SARA2/Min.Salud)",36,1.1,7.6,0.1,100],
["Champignones, frescos, crudos (SARA2/Min.Salud)",24,3.1,2.3,0.3,100],["Chaucha, fresca, cruda (SARA2/Min.Salud)",29,2.4,4.3,0.2,100],["Coliflor, crudo (SARA2/Min.Salud)",23,2.4,2.9,0.2,100],
["Espárrago, crudo (SARA2/Min.Salud)",18,2.2,1.8,0.2,100],["Espinaca, cruda (SARA2/Min.Salud)",21,2.9,1.4,0.4,100],["Hongos, frescos, crudos (SARA2/Min.Salud)",24,3.1,2.3,0.3,100],
["Lechuga, cruda (SARA2/Min.Salud)",12,1.2,1.4,0.2,100],["Palmitos, enlatados (SARA2/Min.Salud)",25,2.5,2.2,0.6,100],["Pepino, crudo (SARA2/Min.Salud)",12,0.7,2,0.1,100],
["Perejil, crudo (SARA2/Min.Salud)",47,3.7,5.7,1,100],["Puerro, crudo (SARA2/Min.Salud)",38,2.5,6.1,0.4,100],["Rabanito, crudo (SARA2/Min.Salud)",23,1.3,4.2,0.1,100],
["Remolacha, cruda (SARA2/Min.Salud)",44,2.4,8.3,0.2,100],["Repollito de Bruselas, crudos (SARA2/Min.Salud)",43,4.4,5.1,0.5,100],["Repollo, crudo (SARA2/Min.Salud)",19,1.3,3.3,0.1,100],
["R�cula, cruda (SARA2/Min.Salud)",24,2.6,2.1,0.7,100],["Tomate, crudo (SARA2/Min.Salud)",17,1,2.9,0.2,100],["Tomate, puré de tomate (SARA2/Min.Salud)",37,1.7,7.1,0.2,100],
["Zanahoria, cruda (SARA2/Min.Salud)",43,1.1,9.2,0.2,100],["Zapallito, crudo (SARA2/Min.Salud)",15,0.8,2.1,0.3,100],["Zapallo, crudo (SARA2/Min.Salud)",36,1,7.8,0.1,100],
["Zucchini, crudo (SARA2/Min.Salud)",16,1.2,2.1,0.3,100],
// ---- FRUTAS — fuente oficial: SARA 2, Ministerio de Salud / Argenfoods ----
["Ananá (SARA2/Min.Salud)",50,0.4,11.7,0.2,120],["Arándanos (SARA2/Min.Salud)",54,0.7,12.1,0.3,120],["Banana (SARA2/Min.Salud)",92,1.2,20.4,0.2,120],
["Cereza (SARA2/Min.Salud)",65,1.1,13.9,0.5,120],["Ciruela (SARA2/Min.Salud)",51,0.7,11.5,0.2,120],["Damasco (SARA2/Min.Salud)",41,1,9.1,0.1,120],
["Durazno (SARA2/Min.Salud)",45,0.5,10.5,0.1,120],["Frambuesa (SARA2/Min.Salud)",32,1.2,5.4,0.7,120],["Frutilla (SARA2/Min.Salud)",31,0.8,5.7,0.6,120],
["Higo (SARA2/Min.Salud)",74,1.4,16.3,0.4,120],["Kiwi (SARA2/Min.Salud)",56,1.1,11.7,0.5,120],["Limón (SARA2/Min.Salud)",35,0.9,6.5,0.6,120],
["Mandarina (SARA2/Min.Salud)",52,0.8,11.5,0.3,120],["Mango (SARA2/Min.Salud)",60,0.8,13.4,0.4,120],["Manzana con piel (SARA2/Min.Salud)",48,0.3,11.4,0.2,120],
["Melón (SARA2/Min.Salud)",37,0.5,8.3,0.1,120],["Membrillo (SARA2/Min.Salud)",56,0.3,13.4,0.1,120],["Mora (SARA2/Min.Salud)",27,1.4,4.3,0.5,120],
["Naranja (SARA2/Min.Salud)",43,0.9,9.3,0.1,120],["Palta (SARA2/Min.Salud)",190,1.9,1.8,19.5,120],["Pera (SARA2/Min.Salud)",55,0.7,12.1,0.4,120],
["Pomelo (SARA2/Min.Salud)",22,0.5,4.8,0.1,120],["Sandía (SARA2/Min.Salud)",32,0.5,7.2,0.2,120],["Uva (SARA2/Min.Salud)",73,0.7,17.2,0.2,120],
["Uva pasa (SARA2/Min.Salud)",315,3.3,74.8,0.3,120],["Ciruela pasa / ciruela seca (SARA2/Min.Salud)",236,1.9,56.8,0.1,120],["Dátiles (SARA2/Min.Salud)",282,2.1,67.7,0.3,120],
["Coco rallado (SARA2/Min.Salud)",504,2.9,43.2,35.5,120],["Aceituna negra (SARA2/Min.Salud)",119,0.8,4.4,10.9,120],["Aceituna verde (SARA2/Min.Salud)",130,1.5,0.5,13.5,120],
// ---- LEGUMBRES, CEREALES, PAN Y PASTAS — fuente oficial: SARA 2, Ministerio de Salud / Argenfoods ----
["Arroz blanco, crudo (SARA2/Min.Salud)",339,6.9,77.5,0.2,100],["Arroz integral, crudo (SARA2/Min.Salud)",350,7.5,72.7,3.2,100],["Avena, arrollada, cruda (SARA2/Min.Salud)",357,15.6,56.9,7.5,100],
["Batata, cruda (SARA2/Min.Salud)",73,1.1,17.1,0.1,100],["Fideos secos, crudos (SARA2/Min.Salud)",352,13,71.5,1.5,100],["Garbanzos, crudos (SARA2/Min.Salud)",339,20.5,50.8,6,100],
["Harina de trigo, cruda (SARA2/Min.Salud)",329,10.3,69.8,1,100],["Lentejas, crudas (SARA2/Min.Salud)",301,20.8,52.7,0.8,100],["Pan francés o pan casero sin agregado de grasa o aceite (SARA2/Min.Salud)",268,8.4,57,0.7,100],
["Pan de salvado (SARA2/Min.Salud)",263,7.7,40.7,7.7,100],["Pan lactal, SIN TACC (SARA2/Min.Salud)",230,4.3,41.5,5.2,100],["Pan de miga (SARA2/Min.Salud)",241,7.2,48.3,2.1,100],
["Pan árabe (SARA2/Min.Salud)",261,9.1,53.5,1.2,100],["Pan dulce (SARA2/Min.Salud)",358,9.4,54.1,11.6,100],["Papa, cruda (SARA2/Min.Salud)",79,2.7,16.9,0.1,100],
["Porotos, crudos (SARA2/Min.Salud)",276,21.1,45.3,1.1,100],["Quinoa, semilla, cruda (SARA2/Min.Salud)",330,13.8,57.2,5.1,100],["Grisines (SARA2/Min.Salud)",380,10.9,72.9,5,100],
["Choclo, crudo (SARA2/Min.Salud)",97,3.7,17.8,1.2,100],["Amaranto, crudo (SARA2/Min.Salud)",366,15.4,58.6,7.8,100],
// ---- CARNES — fuente oficial: Argenfoods (UNLu) ----
["Cerdo, chorizo, fresco, crudo (Argenfoods)",454,13,1.1,44.2,150],["Cerdo, costilla, a la parrilla (Argenfoods)",320,25.2,0,24.3,150],["Cerdo, jamón cocido (Argenfoods)",211,20.3,0,14.4,150],
["Cerdo, jamón crudo (Argenfoods)",473,18,0,44.6,150],["Cerdo, panceta (Argenfoods)",670,8.3,0,70.8,150],["Cordero, carne de la paleta, crudo (Argenfoods)",99,18.7,0,2.7,150],
["Pollo, asado a la parrilla (Argenfoods)",168,29.8,0,5.4,150],["Pollo, asado al horno (Argenfoods)",162,28.4,0,5.4,150],["Pollo, hervido (Argenfoods)",198,23.1,0,11.7,150],
["Vacuno, asado, fresco, crudo (Argenfoods)",170,18.4,0,10.7,150],["Vacuno, bife, a la parrilla (Argenfoods)",189,24.6,0,10.1,150],["Vacuno, bife angosto, fresco, crudo (Argenfoods)",190,21,0,12,150],
["Vacuno, bola de lomo, fresco, crudo (Argenfoods)",114,22,0,3.2,150],["Vacuno, colita de cuadril, fresco, crudo (Argenfoods)",143,21,0,6.7,150],["Vacuno, cuadril y bife angosto flaco, fresco, crudo (Argenfoods)",111,21,0,3,150],
["Vacuno, en conserva, enlatado (Argenfoods)",224,23.7,0,14.4,150],["Vacuno, hamburguesas cocidas (Argenfoods)",248,20.5,2.6,18.4,150],["Vacuno, hamburguesas crudas (Argenfoods)",218,17.3,2.6,16.5,150],
["Vacuno, hígado, crudo (Argenfoods)",132,19.7,6,3.2,150],["Vacuno, lomo, fresco, crudo (Argenfoods)",116,20,0,4,150],["Vacuno, nalga, fresco, crudo (Argenfoods)",97,21.2,0,1.4,150],
["Vacuno, paleta, fresco, crudo (Argenfoods)",125,19,0,5.5,150],["Vacuno, peceto, fresco, crudo (Argenfoods)",125,23,0,1.9,150],["Vacuno, riñón, fresco, crudo (Argenfoods)",137,15,0.9,8.1,150],
["Vacuno, tapa de cuadril, fresco, crudo (Argenfoods)",211,20,0,15,150],["Vacuno, vacío, a la parrilla (Argenfoods)",258,25.6,0,17.3,150],["Vacuno, vacío flaco, fresco, crudo (Argenfoods)",171,23.8,0,8.4,150],
["Salchichas tipo Viena (Argenfoods)",211,11.3,3.9,13.6,150],
// ---- LÁCTEOS Y QUESOS — fuente oficial: Argenfoods (UNLu) ----
["Leche de vaca, entera, fluida, pasteurizada (Argenfoods)",57,3.1,4.6,2.9,100,"ml"],["Leche de vaca parcialm. descremada, adic. con vit A y D (Argenfoods)",44,3.2,4.6,1.4,100,"ml"],["Leche en polvo descremada (Argenfoods)",370,35.5,52.2,1,100],
["Leche en polvo entera (Argenfoods)",489,25.8,40.9,24.8,100],["Manteca, fresca (Argenfoods)",758,0.5,0,84,100],["Queso crema, entero, untable (Argenfoods)",246,6.6,3.9,22.6,100],
["Queso descremado, untable (Argenfoods)",82,13.7,6.1,0.3,100],["Queso semidescremado, untable (Argenfoods)",104,11.5,5.5,4,100],["Queso Camembert (Argenfoods)",287,20.1,0,23,100],
["Queso cremoso (Argenfoods)",302,19.7,4.2,22.9,100],["Queso cuartirolo (Argenfoods)",291,20.8,3.9,21.4,100],["Queso mozzarella (Argenfoods)",282,23.6,3.3,19.3,100],
["Queso Por Salut (Argenfoods)",301,20.4,3.7,22.7,100],["Queso azul (Argenfoods)",377,20,4.3,31.1,100],["Queso Cheddar (Argenfoods)",357,29.5,0,26.5,100],
["Queso Fontina (Argenfoods)",340,24.3,0,33.6,100],["Queso Gruyere (Argenfoods)",379,28.6,0,29.4,100],["Queso Holanda (Argenfoods)",345,25.1,0,27.2,100],
["Queso Pategrás (Argenfoods)",410,24.8,0,34.5,100],["Queso Roquefort (Argenfoods)",426,19.2,0,38.8,100],["Queso Parmesano (Argenfoods)",350,32.7,0,24.4,100],
["Queso Provolone (Argenfoods)",391,32.1,0,29.2,100],["Queso Reggianito (Argenfoods)",365,33.4,3.4,24.2,100],["Queso Sardo (Argenfoods)",402,30,0,29.1,100],
["Ricota de leche entera (Argenfoods)",168,11.6,4,11.8,100],["Yogur descremado (Argenfoods)",59,4.3,5.9,0.2,100],["Yogur descremado bebible (Argenfoods)",30,3.3,4.1,0.1,100,"ml"],
["Yogur entero bebible (Argenfoods)",82,2.8,12.7,2.2,100,"ml"],["Yogur entero natural (Argenfoods)",66,4.6,5.3,3,100],["Yogur entero saborizado (Argenfoods)",88,4.4,12.4,2.4,100],
// ---- HUEVOS — fuente oficial: Argenfoods (UNLu) ----
["Huevo de codorniz, entero, crudo (Argenfoods)",174,13.6,0.1,13.3,50],["Huevo de gallina, clara, cocida (Argenfoods)",54,12.8,0,0.3,50],["Huevo de gallina, clara, cruda (Argenfoods)",48,11.6,0,0.2,50],
["Huevo de gallina, entero, crudo (Argenfoods)",156,12,0.4,11.8,50],["Huevo de gallina, frito (Argenfoods)",196,16.3,0,14.5,50],["Huevo de gallina, poché (Argenfoods)",152,13.4,0,10.9,50],
["Huevo de gallina, yema, cruda (Argenfoods)",325,16.6,0,28.7,50],
// ---- PESCADOS Y MARISCOS — fuente oficial: Argenfoods (UNLu) ----
["Abadejo, fresco, crudo (Argenfoods)",72,15.8,0,0.9,150],["Anchoa, fresca, cruda (Argenfoods)",92,21.5,0,0.4,150],["Anchoíta, fresca, cruda (Argenfoods)",129,19.2,0,5.4,150],
["Besugo, fresco, crudo (Argenfoods)",100,20.4,0,2,150],["Bonito, fresco, crudo (Argenfoods)",219,22,0,14.5,150],["Brótola, fresca, cruda (Argenfoods)",83,17.6,0,1.2,150],
["Caballa, fresca, cruda (Argenfoods)",232,22,0,15.8,150],["Congrio, fresco, crudo (Argenfoods)",107,17.2,0,4,150],["Corvina blanca, fresca, cruda (Argenfoods)",97,19.5,0,1.9,150],
["Corvina negra, fresca, cruda (Argenfoods)",84,18.8,0,0.8,150],["Dorado, fresco, crudo (Argenfoods)",80,18.8,0,0.5,150],["Jurel, fresco, crudo (Argenfoods)",149,19,0,8,150],
["Lenguado, fresco, crudo (Argenfoods)",78,17.5,0,0.8,150],["Lisa, fresca, cruda (Argenfoods)",146,17.9,0,7.8,150],["Merluza, fresca, cruda (Argenfoods)",81,17.1,0,1.3,150],
["Mero, fresco, crudo (Argenfoods)",83,17.9,0,1,150],["Pejerrey de mar, fresco, crudo (Argenfoods)",86,18.6,0,1.2,150],["Pescadilla, fresca, cruda (Argenfoods)",97,17.8,0,2.8,150],
["Salmón (referencia general, ver Argenfoods pescados grasos) (Argenfoods)",219,22,0,14.5,150],["Calamar, fresco, entero, crudo (Argenfoods)",80,18.5,0,0.7,150],["Camarón, fresco, crudo (Argenfoods)",91,21,0,0.8,150],
["Centolla, fresca, cruda (Argenfoods)",66,13.9,0,1.1,150],["Langostino, fresco, crudo (Argenfoods)",97,22,0,0.9,150],["Mejillón, fresco, crudo (Argenfoods)",64,11.9,0,1.1,150],
// ---- ACEITES Y GRASAS — fuente oficial: Argenfoods (UNLu) ----
["Aceite de girasol (Argenfoods)",900,0,0,100,10],["Aceite de maíz (Argenfoods)",900,0,0,100,10],["Aceite de oliva (Argenfoods)",900,0,0,100,10],
["Aceite de canola (Argenfoods)",900,0,0,100,10],["Aceite de uva (Argenfoods)",900,0,0,100,10],["Grasa de cerdo (Argenfoods)",898,0,0,99.8,10],
["Grasa vacuna (Argenfoods)",899,0,0,99.9,10],["Margarina 100% vegetal (Argenfoods)",747,0,0,83,10],["Margarina reducida en calorías (Argenfoods)",504,0,0,56,10],
// ---- FRUTOS SECOS — fuente oficial: Argenfoods (UNLu) ----
["Avellana, pepita, seca (Argenfoods)",668,12.7,17.7,60.9,30],["Castaña de Pará, pepita, cruda (Argenfoods)",731,18.1,2.4,72.1,30],["Maní, semilla con piel, crudo (Argenfoods)",576,33.2,11.1,44.3,30],
["Maní, semilla sin piel, tostado (Argenfoods)",592,34.8,10.8,45.5,30],["Nuez, pepita (Argenfoods)",715,13.9,13.2,67.4,30],["Piñón de araucaria, pepita, crudo (Argenfoods)",221,14.6,37.9,1.2,30],
["Pistacho, pepita, crudo (Argenfoods)",648,22.3,18.1,54,30],
// ---- GOLOSINAS Y DULCES — fuente oficial: Argenfoods (UNLu) ----
["Chocolatín (Argenfoods)",549,5.4,62.4,31.5,20],["Dulce de leche (Argenfoods)",314,6.5,57.4,6.6,20],["Dulce de leche light (Argenfoods)",260,6.2,52.9,1.6,20],
["Dulce de leche repostero (Argenfoods)",317,7.3,55,7.5,20],["Mermelada de ciruela (Argenfoods)",306,3.7,73.1,0.2,20],["Mermelada de durazno (Argenfoods)",304,3.5,76.4,0.1,20],
["Mermelada de frutilla (Argenfoods)",309,3.8,73.2,0.6,20],["Batata, dulce (cascos) (Argenfoods)",263,0.9,65,0.1,20]
];

export const FOODS = FOODS_RAW.map(a=>({name:a[0],kcal:a[1],p:a[2],c:a[3],f:a[4],portion:a[5],unit:a[6]||"g"}));

export const EX_CATS = [["pecho","Pecho"],["espalda","Espalda"],["hombros","Hombros"],["biceps","Bíceps"],["triceps","Tríceps"],["cuadriceps","Cuádriceps"],["isquios","Isquios"],["gluteos","Glúteos"],["gemelos","Gemelos"],["abs","Abdominales"],["antebrazo","Antebrazo"],["cuello","Cuello"]];

export const EX_DB = {
  pecho:["Press de banca plano (barra)","Press de banca inclinado (barra)","Press de banca declinado","Press plano con mancuernas","Press inclinado con mancuernas","Press plano en Smith","Press inclinado en Smith","Aperturas con mancuernas","Aperturas inclinadas","Aperturas en máquina","Cruce de poleas","Vuelos en polea","Fondos en paralelas","Flexiones de brazos","Press de pecho en máquina","Peck deck","Cruce de poleas descendente"],
  espalda:["Dominadas","Dominadas neutras","Jalón al pecho","Jalón neutro","Jalón en V","Jalón en estocada","Jalón con brazos rectos en polea","Remo con barra","Remo Pendlay","Remo unilateral con mancuerna","Remo en máquina","Remo en máquina unilateral","Remo en polea baja","Remo en barra T","Jalón con brazos rectos y mancuerna","Hiperextensiones lumbares","Jalón unilateral en estocada","Remo neutro abierto en polea baja","Jalón prono","Remo T","Remo en polea baja unilateral","Remo alto en polea"],
  hombros:["Press militar con barra","Press Arnold","Press de hombros con mancuernas","Press de hombros en Smith","Vuelos laterales con mancuernas","Vuelos laterales en polea","Vuelos laterales en máquina","Vuelos posteriores","Posterior en máquina","Posterior en polea","Elevaciones frontales","Jalón a la cara","Encogimientos de hombros","Vuelos laterales sentado","Elevaciones laterales","Vuelo lateral en polea (énfasis estiramiento)"],
  biceps:["Curl con barra","Curl con barra Z","Curl con mancuernas","Curl alternado","Curl martillo","Curl predicador","Curl en banco inclinado","Curl en polea","Curl en polea detrás del cuerpo","Curl concentrado","Curl araña","Curl bíceps en polea baja frontal","Curl Bayesian","Curl predicador en polea","Curl martillo en polea"],
  triceps:["Press francés con barra","Press francés con mancuernas","Extensión en polea","Extensión con soga","Patada de tríceps","Press cerrado","Fondos entre bancos","Extensión sobre la cabeza","Katana en polea","Katana en Smith","Fondos en paralelas","Extensión de tríceps parado en polea","Extensión de tríceps unilateral en polea"],
  cuadriceps:["Sentadilla libre","Sentadilla frontal","Sentadilla en Smith","Sentadilla hack","Prensa 45","Prensa horizontal","Extensión de cuádriceps","Extensión de cuádriceps a una pierna","Zancadas","Sentadilla búlgara","Sentadilla con mancuerna al pecho","Subida al cajón","Sentadilla sissy","Cuadricera","Prensa 45°"],
  isquios:["Curl femoral acostado","Curl femoral sentado","Curl femoral de pie","Peso muerto rumano","Peso muerto rumano con mancuernas","Peso muerto piernas rígidas","Peso muerto convencional","Buenos días","Curl nórdico","Camilla de isquios"],
  gluteos:["Empuje de cadera","Empuje de cadera en máquina","Puente de glúteo","Patada de glúteo en polea","Patada de glúteo en máquina","Abductores","Abducción en polea","Aductores","Peso muerto sumo","Aductores en máquina"],
  gemelos:["Gemelos de pie","Gemelos sentado","Gemelos en prensa","Gemelos en Smith","Gemelos burro","Gemelos a una pierna","Gemelos en máquina"],
  abs:["Encogimiento abdominal","Encogimiento declinado","Elevación de piernas","Elevación de piernas colgado","Plancha","Rueda abdominal","Encogimiento en polea","Giro ruso","Escaladores","Oblicuos","Plancha lateral","Encogimiento invertido","Bicicleta abdominal","Puntas a la barra","Plancha hueca","Bicho muerto","Leñador en polea","Encogimiento en máquina","Bandera","Abdominales en V","Crunch en banco"],
  antebrazo:["Curl de muñeca","Curl de muñeca invertido","Curl invertido con barra","Caminata del granjero","Curl de antebrazo en polea","Curl de muñeca con mancuerna","Curl Zottman","Enrollador de muñeca","Colgarse de la barra","Pinza con disco","Pinza de mano"],
  cuello:["Flexión de cuello con disco","Extensión de cuello con disco","Flexión lateral de cuello","Flexión de cuello con arnés","Puente de cuello","Rotaciones de cuello"]
};

export const DEFAULT = {
  days: [
    { id:"d1", name:"Torso", subtitle:"Lunes · Hombros · Espalda · Pecho · Brazos",
      note:"ENTRADA EN CALOR — A1 Pullover unilateral con banda: 2×10 c/lado · A2 Remo sentado con bandas: 2×15",
      exercises:[
      mkExT("Vuelos laterales sentado","hombros",["8-14","8-14","14-18"],"Mano apenas por delante del cuerpo. Excéntrica controlada. Codos extendidos.",{o:"B1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Jalón unilateral en estocada","espalda",["12-16","12-16","12-16"],"En estocada o banco regulable. Apenas inclinado hacia el lado que trabaja. Pensar en clavar la mano al suelo y llevar el codo a la cadera.",{o:"C1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Remo neutro abierto en polea baja","espalda",["8-12","8-12"],"Tronco a 90°. Solo se mueven escápulas y brazos. Llevar la barra a la boca del estómago. Codos bastante separados.",{o:"D1",rir:"2-0",rest:"2'-4'",goal:"Progreso en reps"}),
      mkExT("Press inclinado con mancuernas","pecho",["7-10","7-10","9-12"],"Banco a 30°, buena retracción, recorrido completo. Excéntrica 3\".",{o:"E1",rir:"2-0",rest:"1:30-2:30",goal:"Progreso en reps, pasarse del rango"}),
      mkExT("Peck deck","pecho",["9-12","9-12"],"Pausa 1/2\" en contracción. Volver lentamente todo lo que puedas. Máximo recorrido. Codos apenas flexionados.",{o:"F1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Curl bíceps en polea baja frontal","biceps",["7-11","7-11","11-15"],"Ubicarse alejado de la polea, brazos hacia adelante. Full ROM, excéntrica controlada.",{o:"G1",rir:"1-0",rest:"1:30-2:30",goal:"Progreso en reps"}),
      mkExT("Extensión de tríceps parado en polea","triceps",["8-12","8-12"],"Máximo rango de recorrido, excéntrica 2\" y mini pausa abajo.",{o:"H1",rir:"1-0",rest:"1:30-2:30",goal:"Progreso en reps"}) ]},

    { id:"d2", name:"Piernas", subtitle:"Martes · Isquios · Cuádriceps · Gemelos · Abdominales",
      note:"ENTRADA EN CALOR — A1 Movilidad de cadera en estocada lateral: 2×8 c/lado · A2 Sentadilla de copa isométrica: 2×20 seg",
      exercises:[
      mkExT("Camilla de isquios","isquios",["8-12","8-12","8-12"],"Pausa en contracción + excéntrica muy controlada y rango completo.",{o:"B1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Aductores en máquina","gluteos",["10-16","10-16"],"Excéntrica controlada y pausa 1/2\" en contracción.",{o:"C1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Sentadilla en Smith","cuadriceps",["6-9","6-9"],"Excéntrica controlada 3\". Pies en la parte baja de la máquina. Ancho de hombros, puntas rotadas hacia afuera. Abrir las rodillas al bajar.",{o:"D1",rir:"2-0",rest:"3'-5'",goal:"Progreso en reps"}),
      mkExT("Prensa 45°","cuadriceps",["7-10","7-10"],"Excéntrica 2\". Set up de pies igual a la hack.",{o:"E1",rir:"2-0",rest:"3'-5'",goal:"Progreso en reps"}),
      mkExT("Cuadricera","cuadriceps",["11-15","11-15"],"Pausa arriba, máximo control en la excéntrica, terminar con parciales.",{o:"F1",rir:"2-0",rest:"2'-3'",goal:"Aumentar cargas"}),
      mkExT("Gemelos en máquina","gemelos",["10-15","10-15"],"Terminar con parciales hasta no mover el pie. Pausa 1/2\" arriba y abajo.",{o:"G1",rir:"1-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Crunch en banco","abs",["10-15","10-15"],"Pausa en contracción + excéntrica muy controlada y rango completo.",{o:"H1",rir:"1-0",rest:"2'-3'",goal:"Progreso en reps"}) ]},

    { id:"d3", name:"Pecho/Espalda/Hombro", subtitle:"Jueves · Hombros · Pecho · Espalda",
      note:"ENTRADA EN CALOR — A1 Pullover unilateral con banda: 2×10 c/lado · A2 Band pull apart: 2×12",
      exercises:[
      mkExT("Elevaciones laterales","hombros",["9-13","13-16","13-16"],"Mano apenas por delante del cuerpo. Excéntrica controlada. Codos extendidos.",{o:"B1",rir:"2-0",rest:"2'-3'",goal:"1ra con 12 kg, 2da y 3ra con 10 kg"}),
      mkExT("Press plano en Smith","pecho",["5-8","5-8","8-12"],"Mantener buen leg drive y activación escapular. Excéntrica controlada, sin rebotar.",{o:"C1",rir:"2-0",rest:"3'-5'",goal:"Progreso en reps, pasarse del rango"}),
      mkExT("Jalón prono","espalda",["6-9","6-9","9-14"],"Tronco apenas inclinado, sin balanceos. Agarre una mano por fuera del ancho de hombros. Excéntrica 2\".",{o:"D1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Vuelo lateral en polea (énfasis estiramiento)","hombros",["9-14","15-20"],"Usar tobillera. Polea a la altura de la rodilla. Frenar antes del hombro, volver al máximo rango muy controlado.",{o:"E1",rir:"2-0",rest:"1:30-2:30",goal:"1ra con 10 kg, 2da con 5 kg a 20 reps"}),
      mkExT("Remo T","espalda",["6-8","6-8","10-12"],"Protraer y retraer las escápulas. Mantener 1/2\" la contracción. Toma prona.",{o:"F1",rir:"2-0",rest:"2'-4'",goal:"1ra subir carga, el resto progreso en reps"}),
      mkExT("Cruce de poleas descendente","pecho",["9-12","9-12"],"Codos extendidos, pequeña pausa en contracción, excéntrica controlada.",{o:"G1",rir:"2-1",rest:"3'-4'",goal:"Progreso en reps"}),
      mkExT("Remo en polea baja unilateral","espalda",["8-12","8-12"],"Inclinate hacia el lado que trabajás, llevá el codo hacia la cadera, excéntrica de 2 segundos.",{o:"H1",rir:"2-0",rest:"2'-4'",goal:"Progreso en reps"}) ]},

    { id:"d4", name:"Pierna/Brazo", subtitle:"Viernes · Isquios · Cuádriceps · Bíceps · Tríceps",
      note:"ENTRADA EN CALOR — A1 Movilidad de cadera en estocada lateral: 2×8 c/lado · A2 Sentadilla de copa isométrica: 2×20 seg",
      exercises:[
      mkExT("Peso muerto rumano","isquios",["6-9","6-9"],"Excéntrica 2\". Rodilla casi extendida. Cadera bien hacia atrás. Barra pegada a la tibia.",{o:"B1",rir:"2-0",rest:"3'-5'",goal:"Mejorar los 80 kg"}),
      mkExT("Prensa 45°","cuadriceps",["7-10","7-10","10-13"],"Excéntrica 2\". Set up de pies igual a la hack.",{o:"C1",rir:"2-0",rest:"3'-5'",goal:"Progreso en reps"}),
      mkExT("Cuadricera","cuadriceps",["11-15","11-15"],"Pausa arriba, máximo control en la excéntrica, terminar con parciales.",{o:"D1",rir:"2-0",rest:"2'-3'",goal:"Aumentar cargas"}),
      mkExT("Press francés con mancuernas","triceps",["7-11","7-11"],"Máximo rango posible, pausa 1/2\" con la barra en la frente.",{o:"F1",rir:"2-0",rest:"2'-3'",goal:"Progreso en reps"}),
      mkExT("Curl predicador","biceps",["7-10","7-10","11-15"],"Banco casi a 90° (un poco menos), estirar por completo y excéntrica de 2\".",{o:"G1",rir:"2-0",rest:"3'",goal:"Progreso en reps"}),
      mkExT("Extensión de tríceps parado en polea","triceps",["8-10","8-10","9-12"],"Tronco apenas inclinado, sin balanceos. Excéntrica 2\".",{o:"H1",rir:"2-1",rest:"2'-4'",goal:"Progreso en reps"}),
      mkExT("Curl Bayesian","biceps",["9-14","9-14"],"Máximo rango de recorrido, excéntrica 2\" y mini pausa abajo.",{o:"I1",rir:"1-0",rest:"1:30-2:30",goal:"Aumentar cargas"}) ]}
  ],
  habits: []
};

export const PPL_DAYS = [
  { id:"ppl1", name:"Tirón (Pull)", subtitle:"Lunes · Espalda · Bíceps", exercises:[
    mkEx("Remo en barra T",2,"espalda"),
    mkEx("Remo en polea baja unilateral",2,"espalda"),
    mkEx("Curl en banco inclinado",2,"biceps"),
    mkEx("Jalón al pecho",2,"espalda"),
    mkEx("Curl predicador en polea",2,"biceps"),
    mkEx("Vuelos posteriores",2,"hombros"),
    mkEx("Curl martillo en polea",2,"biceps"),
    mkEx("Encogimiento abdominal",2,"abs")
  ]},
  { id:"ppl2", name:"Empuje (Push)", subtitle:"Martes · Hombros · Pecho · Tríceps", exercises:[
    mkEx("Vuelos laterales sentado",3,"hombros"),
    mkEx("Press inclinado en Smith",3,"pecho"),
    mkEx("Fondos en paralelas",2,"pecho"),
    mkEx("Peck deck",2,"pecho"),
    mkEx("Vuelos laterales en polea",3,"hombros"),
    mkEx("Press francés con barra",2,"triceps"),
    mkEx("Katana en polea",2,"triceps")
  ]},
  { id:"ppl3", name:"Piernas (Legs)", subtitle:"Miércoles · Cuádriceps · Isquios · Glúteos", exercises:[
    mkEx("Gemelos de pie",3,"gemelos"),
    mkEx("Hiperextensiones lumbares",2,"espalda"),
    mkEx("Curl femoral acostado",3,"isquios"),
    mkEx("Sentadilla libre",2,"cuadriceps"),
    mkEx("Extensión de cuádriceps",2,"cuadriceps"),
    mkEx("Aductores en máquina",2,"gluteos"),
    mkEx("Encogimiento abdominal",2,"abs")
  ]},
  { id:"ppl4", name:"Descanso Activo", subtitle:"Jueves · Cardio", note:"Descanso activo: 30 minutos de cardio intenso.", exercises:[] },
  { id:"ppl5", name:"Torso (Upper)", subtitle:"Viernes · Hombros · Pecho · Espalda · Brazos", exercises:[
    mkEx("Vuelos laterales en polea",3,"hombros"),
    mkEx("Posterior en polea",2,"hombros"),
    mkEx("Press inclinado con mancuernas",2,"pecho"),
    mkEx("Jalón al pecho",2,"espalda"),
    mkEx("Peck deck",2,"pecho"),
    mkEx("Remo alto en polea",2,"espalda"),
    mkEx("Curl con mancuernas",2,"biceps"),
    mkEx("Extensión de tríceps unilateral en polea",3,"triceps")
  ]},
  { id:"ppl6", name:"Piernas (Lower)", subtitle:"Sábado · Cuádriceps · Isquios · Glúteos", exercises:[
    mkEx("Gemelos de pie",3,"gemelos"),
    mkEx("Peso muerto rumano",2,"isquios"),
    mkEx("Prensa 45",3,"cuadriceps"),
    mkEx("Extensión de cuádriceps",2,"cuadriceps"),
    mkEx("Aductores en máquina",2,"gluteos"),
    mkEx("Bandera",2,"abs")
  ]}
];

export const SCALES = [
  ["soreness","Dolor muscular",["Nada","Poco","Moderado","Mucho"]],
  ["performance","Rendimiento",["Malo","Regular","Bueno","Muy bueno"]],
  ["motivation","Motivación",["Baja","Media","Alta"]],
  ["hunger","Hambre",["Nada","Poca","Moderada","Mucha"]],
  ["fatigue","Cansancio",["Nada","Poco","Moderado","Mucho"]],
  ["sleep","Calidad de sueño",["Mala","Regular","Buena","Muy buena"]]
];

export const CHECKIN_Q = [
  ["q1","¿Qué fue lo más positivo de la semana? ¿De qué estás más orgulloso?"],
  ["q2","Entrenamiento: ¿pudiste progresar? ¿Alguna molestia articular o lesión? ¿Algún ejercicio que no conectes?"],
  ["q3","Recuperación: ¿te recuperás a tiempo? ¿Vas a la siguiente sesión con molestias musculares?"],
  ["q4","Actividad: ¿completaste tus pasos diarios y el cardio semanal? Sé honesto, ¿cuántos pasos hiciste?"],
  ["q5","Nutrición: ¿te mantuviste en el plan? ¿Comidas libres, alcohol, picoteos?"],
  ["q6","¿Cuánto café/estimulantes consumiste y con qué frecuencia?"],
  ["q7","Estrés y descanso: ¿cuántas horas dormís? ¿Es de calidad? ¿Cómo vienen tus niveles de estrés?"],
  ["q8","Digestión: ¿digerís bien las comidas? ¿Vas al baño con normalidad?"],
  ["q9","¿Te sentís apoyado con tus metas? ¿Tu trabajo te permite cumplir con todo?"],
  ["q10","Apariencia: ¿sentís que tu físico está progresando? ¿Estás a gusto con lo que ves?"],
  ["q11","¿Encontraste alguna dificultad esta semana? (entrenamiento, hábitos, nutrición, descanso)"],
  ["q12","Preguntá lo que necesites"],
  ["q13","¿Alguna interrupción la semana/mes que viene?"]
];

export const RC = 2*Math.PI*52;

export const ES_DAYS = {"Upper 1":"Torso 1","Upper 2":"Torso 2","Lower 1":"Pierna 1","Lower 2":"Pierna 2","Upper":"Torso","Lower":"Pierna"};

export const ES_MAP = {
  "Cable Lateral Raises":"Vuelos laterales en polea","DB Lateral Raises":"Vuelos laterales con mancuernas",
  "Press Plano Mancuernas":"Press plano con mancuernas","Press Banca":"Press de banca plano (barra)",
  "Máquina Remo Unilateral":"Remo en máquina unilateral","Maquina Remo Unilateral":"Remo en máquina unilateral","Remo Hammer":"Remo en máquina unilateral",
  "Upper pec Cable Flies":"Vuelos en polea","Aperturas Descendentes (Upper Pec)":"Aperturas inclinadas",
  "Jalón Polea Abierto":"Jalón al pecho","Jalon Polea Abierto":"Jalón al pecho","Jalón V":"Jalón en V","Jalón Neutro":"Jalón neutro",
  "Extensiones de Tríceps":"Extensión en polea","Extensiones de Triceps":"Extensión en polea","Extensión de Tríceps":"Extensión en polea",
  "Bíceps Polea Barra Dado Vuelta":"Curl en polea","Biceps Polea Barra Dado Vuelta":"Curl en polea","Biceps Curl en Polea":"Curl en polea","Biceps Curl":"Curl con mancuernas",
  "Gemelos":"Gemelos de pie","Standing Calves":"Gemelos de pie","Gemelos burro (donkey)":"Gemelos burro",
  "Isquios Acostado":"Curl femoral acostado","Leg Curl":"Curl femoral acostado",
  "RDL":"Peso muerto rumano","Peso muerto rumano (RDL)":"Peso muerto rumano",
  "Prensa":"Prensa 45","Extensión Cuad":"Extensión de cuádriceps","Extension Cuad":"Extensión de cuádriceps",
  "Extensiones Cuads":"Extensión de cuádriceps","Extensión de quads":"Extensión de cuádriceps","Extensión unilateral":"Extensión de cuádriceps a una pierna",
  "Abdominales Bandera":"Bandera","Dragon flag":"Bandera","Crunches":"Encogimiento abdominal","Crunch":"Encogimiento abdominal",
  "Decline Crunches":"Encogimiento declinado","Crunch declinado":"Encogimiento declinado","Crunch en polea":"Encogimiento en polea",
  "Crunch invertido":"Encogimiento invertido","Crunch en máquina":"Encogimiento en máquina",
  "T-Bar Row":"Remo en barra T","Horizontal Row":"Remo en máquina","Remo Unilateral":"Remo unilateral con mancuerna",
  "Smith OHP":"Press de hombros en Smith","Press Smith Inclinado":"Press inclinado en Smith","Pecho Inclinado Smith":"Press inclinado en Smith",
  "Smith Squat":"Sentadilla en Smith","Hack Squat":"Sentadilla hack","Sissy squat":"Sentadilla sissy","Búlgaras":"Sentadilla búlgara",
  "Sentadilla goblet":"Sentadilla con mancuerna al pecho","Step Up":"Subida al cajón",
  "Pec Dec":"Aperturas en máquina","Pec Deck":"Aperturas en máquina","Posterior en Pec Deck":"Posterior en máquina","Chest Press (máquina)":"Press de pecho en máquina",
  "Press Francés":"Press francés con barra","Press francés (barra)":"Press francés con barra","Francés":"Press francés con barra",
  "Predicador Unilat Mancuerna":"Curl predicador","Curl predicador (Scott)":"Curl predicador","Bayesian":"Curl en polea detrás del cuerpo","Curl Bayesian":"Curl en polea detrás del cuerpo",
  "Lower back hyperextension":"Hiperextensiones lumbares","Posterior":"Vuelos posteriores","Vuelos con Mancuernas":"Vuelos laterales con mancuernas",
  "Hip Thrust":"Empuje de cadera","Hip Thrust en máquina":"Empuje de cadera en máquina",
  "Press militar (barra)":"Press militar con barra","Encogimientos (shrugs)":"Encogimientos de hombros","Face Pull":"Jalón a la cara",
  "Pullover en polea":"Jalón con brazos rectos en polea","Pullover con mancuerna":"Jalón con brazos rectos y mancuerna",
  "Buenos días (good morning)":"Buenos días","Russian Twist":"Giro ruso","Mountain Climbers":"Escaladores","Toes to bar":"Puntas a la barra",
  "Hollow hold":"Plancha hueca","Dead bug":"Bicho muerto","V-ups":"Abdominales en V",
  "Curl Reverse con barra":"Curl invertido con barra","Curl antebrazo + Reverse":"Curl de muñeca","Farmer Walk":"Caminata del granjero",
  "Wrist roller (enrollador)":"Enrollador de muñeca","Dead hang (colgarse)":"Colgarse de la barra","Plate pinch":"Pinza con disco","Grippers de mano":"Pinza de mano",
  "Neck curl con arnés":"Flexión de cuello con arnés","Puente de cuello (lucha)":"Puente de cuello"
};
