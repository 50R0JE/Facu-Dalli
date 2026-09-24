import { esc } from '../core/utils.js';

import { ComidaState, cookPortion, entryBase, previewStr, selectedFoodValues } from '../screens/comida.js';

export const SheetState = {

  sheetGen: 0,

};

export function renderSheet(){
  let title, grams, base, isEdit;
  const sf = ComidaState.selectedFood;
  if (sf){ title=sf.name; grams=ComidaState.sheetGrams!=null ? ComidaState.sheetGrams : cookPortion(sf, ComidaState.cookState); base=selectedFoodValues(); isEdit=false; }
  else if (ComidaState.editEntry){ title=ComidaState.editEntry.name; grams=ComidaState.editEntry.grams; base=entryBase(ComidaState.editEntry); isEdit=true; }
  else return "";
  return `
    <div class="sheet-bg" data-action="portion-cancel"></div>
    <div class="sheet">
      <div class="sheet-title">${esc(title)}</div>
      ${sf && sf.cook ? `<div class="sheet-cook" role="radiogroup" aria-label="¿Cómo lo pesaste?">
        <span class="sheet-cook-lbl">¿Cómo lo pesaste?</span>
        <div class="seg">${["crudo","cocido"].map(st=>`<button class="${ComidaState.cookState===st?'on':''}" role="radio" aria-checked="${ComidaState.cookState===st}" data-action="portion-cook" data-val="${st}">${st==="crudo"?"Crudo":"Cocido"}</button>`).join("")}</div>
      </div>` : ""}
      <div class="sheet-row">
        <input id="portionGrams" class="sheet-input" type="text" inputmode="decimal" enterkeyhint="done" value="${grams}" data-action="portion-grams" data-enter="${isEdit?'portion-save':'portion-add'}">
        <span class="sheet-unit">${base.unit==="ml"?"ml":"gramos"}</span>
      </div>
      <div class="sheet-preview" id="portionPreview">${previewStr(base, grams)}</div>
      <div class="sheet-btns">
        <button class="ctrl ghost" data-action="portion-cancel">Cancelar</button>
        <button class="ctrl primary" data-action="${isEdit?'portion-save':'portion-add'}">${isEdit?'Guardar':'Agregar'}</button>
      </div>
    </div>`;
}

export function closeSheet(mutate, opts){
  opts = opts || {};
  const host = opts.host || "#sheetHost";
  const card = opts.card || ".sheet";
  const duration = opts.duration || 220;
  const root = document.querySelector(host);
  const cardEl = root && root.querySelector(card);
  const bgEl = root && root.querySelector(".sheet-bg, .cp-bg");
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!cardEl || reduced){ SheetState.sheetGen++; mutate(); return; }
  cardEl.classList.add("closing");
  if(bgEl) bgEl.classList.add("closing");
  const gen = ++SheetState.sheetGen;
  setTimeout(()=>{ if(gen===SheetState.sheetGen) mutate(); }, duration);
}

export let collapseGen = {};

export function collapseExerciseAnimated(exId, after, flash){
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const card = document.querySelector('.card[data-ex-id="'+exId+'"]');
  if(!card || reduced){ after(); return; }
  const gen = (collapseGen[exId] = (collapseGen[exId]||0) + 1);
  const startCollapse = ()=>{
    card.classList.add("ex-collapsing");
    setTimeout(()=>{ if(collapseGen[exId]===gen) after(); }, 150);
  };
  // El flash solo aplica cuando el ejercicio se acaba de completar (ver main.js): un
  // destello verde breve que refuerza el check antes de encogerse a la fila compacta.
  // El colapso manual (botón de flecha) va directo al encogido, sin flash.
  if(!flash){ startCollapse(); return; }
  card.classList.add("ex-complete-flash");
  setTimeout(()=>{
    if(collapseGen[exId]!==gen) return;
    card.classList.remove("ex-complete-flash");
    startCollapse();
  }, 220);
}
