// Sugerencia de progresión (doble progresión): con lo que hiciste la última vez en ese
// ejercicio y el rango de reps del coach ("8-12"), propone el paso de hoy.
//   · Si en la vez pasada todas las series llegaron al tope del rango → subí el peso y
//     volvé al piso del rango.
//   · Si no → mismo peso y una rep más (sin pasar el tope).
//   · Sin peso (peso corporal) → una rep más. Por tiempo → 5 segundos más.
// Es solo una sugerencia: no cambia nada hasta que tocás «Usar».

const num = v => parseFloat(String(v == null ? "" : v).replace(",", ".")) || 0;
export const kgText = k => (Math.round(k * 100) / 100).toString().replace(".", ",");

// "8-12" → [8, 12]; "10" → [10, 10]; lo demás (AMRAP, "al fallo", vacío) → null.
export function repRange(t){
  const m = String(t || "").match(/(\d+)\s*(?:-|–|a)\s*(\d+)/);
  if (m) { const a = +m[1], b = +m[2]; return a > 0 && b >= a ? [a, b] : null; }
  const one = String(t || "").match(/^\s*(\d+)\s*(reps?)?\s*$/i);
  return one ? [+one[1], +one[1]] : null;
}

// Cuánto subir: 1 kg hasta 10 kg, 2 kg hasta 20 kg (los saltos de las mancuernas) y
// después 2,5 kg.
export function nextKg(kg){ return kg < 10 ? kg + 1 : kg < 20 ? kg + 2 : Math.round((kg + 2.5) * 2) / 2; }

export function suggest(ex, prevSets, timed){
  const prev = (prevSets || []).filter(s => num(s.kg) > 0 || num(s.reps) > 0 || num(s.secs) > 0);
  if (!prev.length) return null;
  if (timed){
    const best = Math.max(...prev.map(s => num(s.secs)));
    if (!(best > 0)) return null;
    return { kg: null, text: (best + 5) + " s", why: "La vez pasada aguantaste " + best + " s: sumá 5 segundos." };
  }
  // Serie de referencia: la de más peso (y a igual peso, la de más reps).
  const top = prev.reduce((a, s) => (num(s.kg) > num(a.kg) || (num(s.kg) === num(a.kg) && num(s.reps) > num(a.reps))) ? s : a, prev[0]);
  const kg = num(top.kg), reps = Math.round(num(top.reps));
  if (!(reps > 0)) return null;
  if (!(kg > 0)) return { kg: null, text: (reps + 1) + " reps", why: "La vez pasada hiciste " + reps + ": sumá una más." };
  // Rango del coach, serie por serie (si no hay, el de la primera serie que tenga).
  const sets = ex.sets || [];
  const rangeOf = i => repRange((sets[i] || {}).target) || repRange((sets.find(s => repRange(s.target)) || {}).target);
  const r = rangeOf(0);
  const atTop = r && prev.every((s, i) => { const ri = rangeOf(i) || r; return num(s.kg) < kg || Math.round(num(s.reps)) >= ri[1]; });
  if (atTop){
    const nk = nextKg(kg);
    return { kg: nk, text: kgText(nk) + " kg × " + r[0], why: "Llegaste a " + r[1] + " reps con " + kgText(kg) + " kg: subí el peso." };
  }
  if (r && reps >= r[1]) return { kg, text: kgText(kg) + " kg × " + r[1], why: "Completá " + r[1] + " reps en todas las series antes de subir." };
  const nr = r ? Math.min(r[1], reps + 1) : reps + 1;
  return { kg, text: kgText(kg) + " kg × " + nr, why: "Mismo peso que la vez pasada, una rep más." };
}
