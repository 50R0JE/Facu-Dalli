export let audioCtx = null;

export function initAudio(){ try{ audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==="suspended") audioCtx.resume(); }catch(e){} }

export function beep(){
  try{ initAudio(); if(!audioCtx) throw 0; const now=audioCtx.currentTime;
    for(let i=0;i<3;i++){ const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
      o.type="sine"; o.frequency.value=880; const t=now+i*0.28;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
      o.start(t); o.stop(t+0.2); } }catch(e){}
  try{ if(navigator.vibrate) navigator.vibrate([200,100,200,100,200]); }catch(e){}
}
