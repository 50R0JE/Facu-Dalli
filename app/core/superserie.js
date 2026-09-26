// Superseries: ejercicios seguidos que se hacen alternando una serie de cada uno, sin
// descanso entre medio, y se descansa al terminar la vuelta. En la rutina se guarda solo
// ex.ss = true en el ejercicio que queda unido con el siguiente (la base ya lo acepta:
// routine_days_ok solo controla ids y links). Dos unidos = superserie; tres o más, triserie.

// Grupos del día: [{ start, end, letter }] solo de 2 o más ejercicios.
export function ssGroups(exs){
  const out = []; let i = 0;
  const list = exs || [];
  while (i < list.length){
    let j = i;
    while (j < list.length - 1 && list[j] && list[j].ss) j++;
    if (j > i) out.push({ start: i, end: j, letter: String.fromCharCode(65 + (out.length % 26)) });
    i = j + 1;
  }
  return out;
}
export function ssGroupOf(exs, idx){ return ssGroups(exs).find(g => idx >= g.start && idx <= g.end) || null; }
export const ssName = g => (g.end - g.start + 1) >= 3 ? "Triserie" : "Superserie";

// Después de tildar la serie `setIdx` del ejercicio `idx`: ¿se descansa ahora? y ¿a qué
// serie hay que ir? Dentro del grupo se pasa a la misma serie del ejercicio siguiente; en el
// último, se descansa y se vuelve al primero con la serie siguiente (la primera sin tildar).
export function ssNext(exs, idx, setIdx){
  const g = ssGroupOf(exs, idx);
  if (!g) return { rest: true, target: null };
  const firstOpen = (ex, from) => { const s = (ex.sets || []); for (let k = from; k < s.length; k++) if (!s[k].done) return s[k]; for (let k = 0; k < s.length; k++) if (!s[k].done) return s[k]; return null; };
  // Siguiente del grupo que todavía tenga esa serie (o alguna) sin hacer.
  for (let k = idx + 1; k <= g.end; k++){
    const ex = exs[k], s = ex && ex.sets && ex.sets[setIdx];
    if (s && !s.done) return { rest: false, target: { ex: ex.id, set: s.id } };
  }
  // Fin de la vuelta: se descansa y se sigue por el primero del grupo con series pendientes.
  for (let k = g.start; k <= g.end; k++){
    const s = firstOpen(exs[k], setIdx + 1);
    if (s) return { rest: true, target: { ex: exs[k].id, set: s.id } };
  }
  return { rest: true, target: null };
}
