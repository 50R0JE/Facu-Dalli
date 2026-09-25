// Biblioteca de videos de técnica: un Short de YouTube por ejercicio, de canales conocidos.
// Solo se enlaza (se abre en YouTube): no se descarga ni se vuelve a subir nada, así el video
// sigue siendo de su autor, con su canal y su crédito. Si el coach pega su propio link en el
// ejercicio, manda el del coach.
// Cada lunes el workflow "Videos" revisa que sigan existiendo (scripts/verificar-videos.mjs).
//
// Clave: nombre del ejercicio como está en EX_DB (sin tildes ni mayúsculas, ver norm()).
// Valor: [id del Short, canal].

const V = {
  "Press de banca plano (barra)": ["RCxikBS5Qy8", "Jeremy Ethier en Español"],
  "Press inclinado con mancuernas": ["8fXfwG4ftaQ", "Andrew Kwong (DeltaBolic)"],
  "Press plano con mancuernas": ["DEuVNH1ZVOE", "Nuffield Health"],
  "Aperturas con mancuernas": ["atcyT99YDeI", "Mind Pump TV"],
  "Cruce de poleas": ["mFJj1Z4-jF8", "Mark Ottobre"],
  "Fondos en paralelas": ["2c1l6dleAS0", "VAHVA Fitness"],
  "Flexiones de brazos": ["wD1M-f69Yy8", "FitnessFAQs"],
  "Peck deck": ["g3T7LsEeDWQ", "Davis Diley"],
  "Dominadas": ["ZPG8OsHKXLw", "Jeremy Ethier"],
  "Jalón al pecho": ["02Qci1-0Aao", "Average To Jacked"],
  "Remo con barra": ["Nqh7q3zDCoQ", "Jeremy Ethier"],
  "Remo unilateral con mancuerna": ["nveMA9ko3yk", "SWEAT"],
  "Remo en polea baja": ["BbYc8JbD8dI", "TylerPath"],
  "Remo en barra T": ["1iQSSqin3ro", "Mark Ottobre"],
  "Jalón con brazos rectos en polea": ["lnec6DdscJU", "Andrew Kwong (DeltaBolic)"],
  "Hiperextensiones lumbares": ["P489_62b8JU", "Nuffield Health"],
  "Press militar con barra": ["afR3tPH6y_g", "Average To Jacked"],
  "Press de hombros con mancuernas": ["k6tzKisR3NY", "Andrew Kwong (DeltaBolic)"],
  "Vuelos laterales con mancuernas": ["0_Zq2pWpstA", "Menno Henselmans"],
  "Vuelos laterales en polea": ["X8tZOGFovj0", "TylerPath"],
  "Vuelos posteriores": ["LsT-bR_zxLo", "Andrew Kwong (DeltaBolic)"],
  "Jalón a la cara": ["C45c3fR4o28", "High Calling Fitness"],
  "Encogimientos de hombros": ["XE62wQAModU", "JayCutlerTV"],
  "Curl con barra": ["9_ijHhcwlkM", "Max Euceda"],
  "Curl con mancuernas": ["ICAXJVmOJik", "ScottHermanFitness"],
  "Curl martillo": ["jzsytGMjGYo", "Fitgurlmel"],
  "Curl predicador": ["iKgfqFkdeWY", "Gymreapers"],
  "Curl en banco inclinado": ["uCUaRFlA9vE", "Andrew Kwong (DeltaBolic)"],
  "Curl Bayesian": ["lhV7kgeihNk", "Brodey | Fitness Coach"],
  "Press francés con barra": ["2A5EXRycNKU", "Hayden Steele"],
  "Extensión con soga": ["v2fMq8RjNBw", "Buff Dudes Workouts"],
  "Extensión sobre la cabeza": ["J565P8FzJXA", "Andrew Kwong (DeltaBolic)"],
  "Press cerrado": ["xXd7sddHGa0", "Andrew Kwong (DeltaBolic)"],
  "Patada de tríceps": ["MlI2HzCzjv8", "TylerPath"],
  "Sentadilla libre": ["iZTxa8NJH2g", "Jeremy Ethier"],
  "Sentadilla frontal": ["zJ3v09-ubKk", "Nerd Fitness"],
  "Sentadilla hack": ["udzewuz-BQY", "Gerardi Performance"],
  "Prensa 45": ["nDh_BlnLCGc", "Jeff Nippard"],
  "Extensión de cuádriceps": ["Tae3aeJe5Ks", "Andrew Kwong (DeltaBolic)"],
  "Zancadas": ["V7nP1QjaCLY", "Dr. Jacob Goodin"],
  "Sentadilla búlgara": ["bwhl_9jN_3o", "Squat University"],
  "Curl femoral acostado": ["bgfHeL6eR9Q", "Ryan Jewers"],
  "Curl femoral sentado": ["lcW1M2VKNYc", "Ryan Jewers"],
  "Peso muerto rumano": ["ecuZtKTNI9U", "Bodybuilding.com"],
  "Peso muerto convencional": ["ZaTM37cfiDs", "Jeff Nippard"],
  "Curl nórdico": ["wwgtGMHhS8Y", "E3 Rehab"],
  "Empuje de cadera": ["-1cAnwFNBLg", "Bret Contreras Glute Guy"],
  "Puente de glúteo": ["X_IGw8U_e38", "WeShape"],
  "Patada de glúteo en polea": ["n-cgsNePyFo", "Gerardi Performance"],
  "Abductores": ["01HilwRf8m8", "Gerardi Performance"],
  "Peso muerto sumo": ["6qV7yjWzoYc", "SET FOR SET"],
  "Gemelos de pie": ["B30JglFGx8Y", "Ryan Jewers"],
  "Gemelos sentado": ["A20iize9ZYs", "GoodeFit Video Hub"],
  "Encogimiento abdominal": ["uwSy6MbPP3c", "Nick Del Toro"],
  "Elevación de piernas colgado": ["WFAziRYp2bg", "TylerPath"],
  "Plancha": ["HaH4JvdBCfE", "RawBuilt"],
  "Plancha lateral": ["V2cUr7zG4hw", "SWEAT"],
  "Rueda abdominal": ["C_j2Ux1Se5c", "BJ Gaddour"],
  "Encogimiento en polea": ["dkGwcfo9zto", "Kade Howell"],
  "Bicho muerto": ["Aoipu_fl3HA", "Dr. Carl Baird"],
  "Giro ruso": ["GOWStgpAbX4", "Doctor O'Donovan"],
  "Caminata del granjero": ["XPYXSwaXzCo", "SET FOR SET"],
  "Colgarse de la barra": ["dOCQjaasbGs", "FitnessFAQs"],
};

// Otros nombres con los que aparece el mismo ejercicio.
const ALIAS = {
  "Remo T": "Remo en barra T",
  "Elevaciones laterales": "Vuelos laterales con mancuernas",
  "Curl alternado": "Curl con mancuernas",
  "Vuelo lateral en polea (énfasis estiramiento)": "Vuelos laterales en polea",
  "Prensa 45°": "Prensa 45",
  "Peso muerto rumano con mancuernas": "Peso muerto rumano",
  "Peso muerto piernas rígidas": "Peso muerto rumano",
  "Sentadilla": "Sentadilla libre",
  "Press de banca": "Press de banca plano (barra)",
  "Hip thrust": "Empuje de cadera",
  "Face pull": "Jalón a la cara",
  "Dead bug": "Bicho muerto",
  "Paseo del granjero": "Caminata del granjero",
  "Plancha abdominal": "Plancha",
  "Plancha frontal": "Plancha",
};

const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[°º]/g, "").replace(/\s+/g, " ").trim();

const IDX = {};
Object.keys(V).forEach(k => { IDX[norm(k)] = V[k]; });
Object.keys(ALIAS).forEach(k => { const v = V[ALIAS[k]]; if(v) IDX[norm(k)] = v; });

// Video de la biblioteca para un nombre de ejercicio: { url, channel } o null.
export function libVideo(name){
  const v = IDX[norm(name)];
  return v ? { url: "https://www.youtube.com/shorts/" + v[0], channel: v[1] } : null;
}

// El video que ve el cliente: el link del coach si hay; si no, el de la biblioteca.
export function exVideo(ex){
  if(ex && ex.video && /^https:\/\//i.test(ex.video)) return { url: ex.video, channel: "" };
  return libVideo(ex && ex.name);
}
