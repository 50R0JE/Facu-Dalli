import { esc } from '../core/utils.js';

import { ComidaState, entryBase, previewStr } from '../screens/comida.js';

export const SheetState = {

  sheetGen: 0,

};

export function renderSheet(){
  let title, grams, base, isEdit;
  if (ComidaState.selectedFood){ title=ComidaState.selectedFood.name; grams=ComidaState.selectedFood.portion; base=ComidaState.selectedFood; isEdit=false; }
  else if (ComidaState.editEntry){ title=ComidaState.editEntry.name; grams=ComidaState.editEntry.grams; base=entryBase(ComidaState.editEntry); isEdit=true; }
  else return "";
  return `
    <div class="sheet-bg" data-action="portion-cancel"></div>
    <div class="sheet">
      <div class="sheet-title">${esc(title)}</div>
      <div class="sheet-row">
        <input id="portionGrams" class="sheet-input" type="text" inputmode="numeric" value="${grams}" data-action="portion-grams">
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

export function collapseExerciseAnimated(exId, after){
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const card = document.querySelector('.card[data-ex-id="'+exId+'"]');
  if(!card || reduced){ after(); return; }
  card.classList.add("ex-collapsing");
  const gen = (collapseGen[exId] = (collapseGen[exId]||0) + 1);
  setTimeout(()=>{ if(collapseGen[exId]===gen) after(); }, 150);
}
