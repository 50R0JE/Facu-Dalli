export function auCreateNoise(){
  const permutation=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  const p=new Array(512);
  for(let i=0;i<256;i++){ p[256+i]=p[i]=permutation[i]; }
  const fade=t=>t*t*t*(t*(t*6-15)+10);
  const lerp=(t,a,b)=>a+t*(b-a);
  const grad=(hash,x,y,z)=>{ const h=hash&15; const u=h<8?x:y; const v=h<4?y:(h===12||h===14?x:z); return ((h&1)===0?u:-u)+((h&2)===0?v:-v); };
  return { simplex3:(x,y,z)=>{
    const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
    x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
    const u=fade(x), v=fade(y), w=fade(z);
    const A=p[X]+Y, AA=p[A]+Z, AB=p[A+1]+Z, B=p[X+1]+Y, BA=p[B]+Z, BB=p[B+1]+Z;
    return lerp(w, lerp(v, lerp(u,grad(p[AA],x,y,z),grad(p[BA],x-1,y,z)), lerp(u,grad(p[AB],x,y-1,z),grad(p[BB],x-1,y-1,z))),
                   lerp(v, lerp(u,grad(p[AA+1],x,y,z-1),grad(p[BA+1],x-1,y,z-1)), lerp(u,grad(p[AB+1],x,y-1,z-1),grad(p[BB+1],x-1,y-1,z-1))));
  }};
}

export let authParticlesHandle = null;

export function stopAuthParticles(){ if(authParticlesHandle){ try{ authParticlesHandle.stop(); }catch(e){} authParticlesHandle=null; } }

export function startAuthParticles(canvas){
  stopAuthParticles();
  if(!canvas) return;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d",{alpha:true}); if(!ctx) return;
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  function resize(){
    const w=canvas.parentElement.clientWidth, h=canvas.parentElement.clientHeight;
    canvas.width=Math.max(1,Math.round(w*dpr)); canvas.height=Math.max(1,Math.round(h*dpr));
    canvas.style.width=w+"px"; canvas.style.height=h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  const w0=window.innerWidth;
  const count = w0<560 ? 90 : (w0<1000 ? 170 : 260); // menos partículas en mobile: rendimiento
  const noise = auCreateNoise();
  const particles = Array.from({length:count}, ()=>({
    x:Math.random()*canvas.clientWidth, y:Math.random()*canvas.clientHeight,
    size:Math.random()*1.6+0.6, life:Math.random()*100, maxLife:140+Math.random()*90
  }));
  let raf=null, stopped=false;
  function frame(){
    if(stopped) return;
    const w=canvas.clientWidth, h=canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    for(const p of particles){
      p.life+=1;
      if(p.life>p.maxLife){ p.life=0; p.x=Math.random()*w; p.y=Math.random()*h; }
      const op=Math.sin((p.life/p.maxLife)*Math.PI)*0.55;
      const n=noise.simplex3(p.x*0.0025, p.y*0.0025, Date.now()*0.00008);
      const angle=n*Math.PI*4;
      p.x+=Math.cos(angle)*0.55; p.y+=Math.sin(angle)*0.55;
      if(p.x<0) p.x=w; if(p.x>w) p.x=0; if(p.y<0) p.y=h; if(p.y>h) p.y=0;
      ctx.fillStyle="rgba(150,224,181,"+Math.max(0,op*0.6).toFixed(3)+")";
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
    raf=requestAnimationFrame(frame);
  }
  if(!reduceMotion) frame(); // respeta prefers-reduced-motion: sin loop, queda solo el fondo estático
  function onResize(){ resize(); }
  window.addEventListener("resize", onResize);
  authParticlesHandle = { stop(){ stopped=true; if(raf) cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); } };
}

export let silkCtx = null;

export let silkCanvasEl = null;

export let silkRafId = null;

export let silkParticles = [];

export let silkNoise = null;

export let silkVisible = false;

export let silkInited = false;

export function silkReducedMotion(){ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

export function silkMakeParticles(w, h){
  const count = w<560 ? 90 : (w<1000 ? 170 : 260); // misma escala adaptativa que el login
  return Array.from({length:count}, () => ({
    x: Math.random()*w, y: Math.random()*h,
    size: Math.random()*1.6+0.6, life: Math.random()*100, maxLife: 140+Math.random()*90
  }));
}

export function initSilk(){
  if(silkInited) return; silkInited = true;
  silkCanvasEl = document.getElementById("silkCanvas"); if(!silkCanvasEl) return;
  try { silkCtx = silkCanvasEl.getContext("2d", {alpha:true}); } catch(e){}
  if(!silkCtx) return; // sin canvas 2D disponible: el fondo simplemente no aparece, no rompe nada
  silkNoise = auCreateNoise();
  silkResize();
  window.addEventListener("resize", silkResize);
  document.addEventListener("visibilitychange", silkOnVisibilityChange);
  silkLoop();
}

export function silkResize(){
  if(!silkCanvasEl || !silkCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  silkCanvasEl.width = Math.max(1, Math.round(w*dpr));
  silkCanvasEl.height = Math.max(1, Math.round(h*dpr));
  silkCanvasEl.style.width = w+"px"; silkCanvasEl.style.height = h+"px";
  silkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  silkParticles = silkMakeParticles(w, h);
}

export function silkLoop(){
  if(document.visibilityState!=="visible" || !silkVisible){ silkRafId=null; return; } // pausa real: no seguimos pidiendo frames
  silkRafId = requestAnimationFrame(silkLoop);
  if(!silkCtx || !silkCanvasEl || !silkNoise) return;
  const w = silkCanvasEl.clientWidth || window.innerWidth;
  const h = silkCanvasEl.clientHeight || window.innerHeight;
  const speedFactor = silkReducedMotion() ? 0.12 : 1; // reduced motion: movimiento muy reducido, no estático
  silkCtx.clearRect(0, 0, w, h);
  for(const p of silkParticles){
    p.life += 1;
    if(p.life>p.maxLife){ p.life=0; p.x=Math.random()*w; p.y=Math.random()*h; }
    const op = Math.sin((p.life/p.maxLife)*Math.PI)*0.55;
    const n = silkNoise.simplex3(p.x*0.0025, p.y*0.0025, Date.now()*0.00008);
    const angle = n*Math.PI*4;
    p.x += Math.cos(angle)*0.55*speedFactor; p.y += Math.sin(angle)*0.55*speedFactor;
    if(p.x<0) p.x=w; if(p.x>w) p.x=0; if(p.y<0) p.y=h; if(p.y>h) p.y=0;
    silkCtx.fillStyle = "rgba(150,224,181,"+Math.max(0,op*0.6).toFixed(3)+")";
    silkCtx.beginPath(); silkCtx.arc(p.x,p.y,p.size,0,Math.PI*2); silkCtx.fill();
  }
}

export function silkOnVisibilityChange(){
  if(document.visibilityState==="visible" && silkVisible && silkRafId==null) silkLoop();
}

export function showSilkBg(){
  if(!silkInited) initSilk();
  silkVisible = true;
  const c=document.getElementById("silkCanvas");
  if(c) c.classList.add("on");
  document.body.classList.add("silk-on");
  if(silkRafId==null) silkLoop();
}

export function hideSilkBg(){
  silkVisible = false;
  const c=document.getElementById("silkCanvas");
  if(c) c.classList.remove("on");
  document.body.classList.remove("silk-on");
  document.body.classList.remove("silk-coach");
}
