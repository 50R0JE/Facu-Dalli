import { State } from '../core/state.js';

export let exerciseObserver = null;

let exerciseFocusScrollHandler = null;

export const revealedBlocks = new Set();

export let scrollRevealObserver = null;

export function initScrollReveal(){
  if (scrollRevealObserver) { scrollRevealObserver.disconnect(); scrollRevealObserver = null; }
  const blocks = document.querySelectorAll("#view [data-reveal]");
  if (!blocks.length) return;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) { blocks.forEach(b=>b.classList.add("reveal-in")); return; }
  scrollRevealObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      entry.target.classList.add("reveal-in");
      revealedBlocks.add(entry.target.dataset.reveal);
      scrollRevealObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
  blocks.forEach(b=>{
    if (revealedBlocks.has(b.dataset.reveal)) b.classList.add("reveal-in");
    else scrollRevealObserver.observe(b);
  });
}

export function setupExerciseFocus(){
  if(exerciseObserver){ exerciseObserver.disconnect(); exerciseObserver=null; }
  if(exerciseFocusScrollHandler){ window.removeEventListener("scroll", exerciseFocusScrollHandler); exerciseFocusScrollHandler=null; }
  if(State.view!=="entreno") return;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced) return;
  // Solo .card: son los ejercicios todavía en curso, donde tiene sentido ayudar a
  // ubicar en cuál estás parado. .ex-collapsed (ya completados) queda afuera a
  // propósito — ver el comentario en components.css junto a .ex-collapsed.
  const nodes = document.querySelectorAll("#view .card");
  if(!nodes.length) return;
  exerciseObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ entry.target.classList.toggle("ex-focused", entry.isIntersecting); });
  }, { root:null, rootMargin:"-45% 0px -45% 0px", threshold:0 });
  nodes.forEach(n=>exerciseObserver.observe(n));

  // La banda central que usa el observer (rootMargin -45%) es angosta: si el último
  // bloque queda pegado al final de la página, puede no haber suficiente scroll para
  // llevar su centro hasta esa banda antes de tocar el fondo del documento — el
  // observer nunca lo marca como intersecting y termina el scroll sin ningún bloque
  // enfocado. Como fallback, cuando el scroll llega al fondo forzamos el foco sobre
  // el último bloque.
  const last = nodes[nodes.length-1];
  exerciseFocusScrollHandler = ()=>{
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if(atBottom) nodes.forEach(n=>n.classList.toggle("ex-focused", n===last));
  };
  window.addEventListener("scroll", exerciseFocusScrollHandler, { passive:true });
  exerciseFocusScrollHandler();
}
