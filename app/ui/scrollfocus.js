import { State } from '../core/state.js';

export let exerciseObserver = null;

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
  if(State.view!=="entreno") return;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced) return;
  const nodes = document.querySelectorAll("#view .card, #view .ex-collapsed");
  if(!nodes.length) return;
  exerciseObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ entry.target.classList.toggle("ex-focused", entry.isIntersecting); });
  }, { root:null, rootMargin:"-45% 0px -45% 0px", threshold:0 });
  nodes.forEach(n=>exerciseObserver.observe(n));
}
