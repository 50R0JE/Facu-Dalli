// Graba la landing (servida localmente) en formato celular con CDP screencast.
// Cada escena se guarda como cuadros JPG + tiempos, para armar el reel después.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { setupPage } = require('./common');
const OUT = path.join(__dirname, 'frames');

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const { page, ctx } = await setupPage(browser);
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  // dedo simulado: un círculo que sigue al puntero y "late" al tocar
  await page.addStyleTag({ content: `#fx-touch{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
    background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.75);box-shadow:0 0 18px rgba(255,255,255,.35);pointer-events:none;
    opacity:0;transition:opacity .2s, transform .15s}#fx-touch.on{opacity:1}#fx-touch.tap{transform:scale(.72)}` });
  await page.evaluate(() => { const d = document.createElement('div'); d.id = 'fx-touch'; document.body.appendChild(d); });
  await page.waitForTimeout(2500);

  const cdp = await ctx.newCDPSession(page);
  let frames = [], rec = false, t0 = 0;
  cdp.on('Page.screencastFrame', async f => {
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    if (rec) frames.push({ t: f.metadata.timestamp, data: f.data });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1612, everyNthFrame: 1 });

  const touch = async (on, x, y, tap) => page.evaluate(([on, x, y, tap]) => {
    const d = document.getElementById('fx-touch'); d.classList.toggle('on', on);
    if (x != null) { d.style.left = x + 'px'; d.style.top = y + 'px'; }
    if (tap) { d.classList.add('tap'); setTimeout(() => d.classList.remove('tap'), 160); }
  }, [on, x, y, tap]);
  const scrollTo = (y, ms) => page.evaluate(([y, ms]) => new Promise(res => {
    const y0 = scrollY, t0 = performance.now(), e = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = now => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + (y - y0) * e(t)); t < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step);
  }), [y, ms]);
  const topOf = sel => page.evaluate(s => { const e = document.querySelector(s); return Math.round(e.getBoundingClientRect().top + scrollY); }, sel);
  const center = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const tapOn = async (sel, click = true) => {
    const [x, y] = await center(sel);
    await touch(true, x - 40, y + 60); await page.waitForTimeout(250);
    for (let i = 1; i <= 12; i++) { await touch(true, x - 40 + 40 * ease(i / 12), y + 60 - 60 * ease(i / 12)); await page.waitForTimeout(25); }
    await page.waitForTimeout(150); await touch(true, x, y, true); if (click) await page.click(sel); await page.waitForTimeout(250); await touch(false);
  };
  const scene = async (name, fn) => {
    frames = []; t0 = Date.now() / 1000; rec = true;
    await fn();
    rec = false; await page.waitForTimeout(100);
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    const times = frames.map((f, i) => { fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64')); return f.t; });
    fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify({ start: t0, end: Date.now() / 1000, times }));
    console.log(name, frames.length, (Date.now() / 1000 - t0).toFixed(1) + 's');
  };

  // 1) hero: el dedo limpia el vidrio
  await scene('hero', async () => {
    await page.waitForTimeout(600);
    const pts = []; for (let i = 0; i <= 70; i++) { const s = i / 70; pts.push([70 + 250 * s, 330 + 110 * Math.sin(s * Math.PI * 2.2)]); }
    await touch(true, pts[0][0], pts[0][1]); await page.mouse.move(pts[0][0], pts[0][1]);
    for (const [x, y] of pts) { await page.mouse.move(x, y); await touch(true, x, y); await page.waitForTimeout(28); }
    await touch(false); await page.waitForTimeout(1800);
  });
  // 2) cómo funciona: paso 1 (copiar el código del coach)
  await scene('paso1', async () => {
    await scrollTo(await topOf('#como') + 20, 1100); await page.waitForTimeout(600);
    await tapOn('#dCopy'); await page.waitForTimeout(1300);
  });
  // 3) paso 2: marcar la serie
  await scene('paso2', async () => {
    await scrollTo(await topOf('#dCheck') - 470, 1000); await page.waitForTimeout(400);
    await tapOn('#dCheck'); await page.waitForTimeout(1500);
  });
  // 4) paso 3: volumen semanal
  await scene('paso3', async () => {
    await scrollTo(await topOf('#dChart') - 430, 1000); await page.waitForTimeout(400);
    await tapOn('#dChart'); await page.waitForTimeout(1600);
  });
  // 5) marquesina + todo lo que entrenás
  await scene('app', async () => {
    await scrollTo(await topOf('#app') - 120, 1400); await page.waitForTimeout(500);
    await scrollTo(await topOf('#app') + 520, 2200); await page.waitForTimeout(500);
  });
  // 6) lo nuevo
  await scene('nuevo', async () => {
    await scrollTo(await topOf('#nuevo') + 60, 1300); await page.waitForTimeout(700);
    await scrollTo(await topOf('#nuevo') + 820, 2200); await page.waitForTimeout(500);
  });
  // 7) dos partes
  await scene('coach', async () => {
    await scrollTo(await topOf('#coach') + 60, 1300); await page.waitForTimeout(500);
    await scrollTo(await topOf('#coach') + 560, 1800); await page.waitForTimeout(400);
  });
  // 8) planes
  await scene('precios', async () => {
    await scrollTo(await topOf('#precios') + 60, 1300); await page.waitForTimeout(600);
    await scrollTo(await topOf('#precios') + 1160, 2800); await page.waitForTimeout(600);
  });
  // 9) cierre
  await scene('final', async () => {
    await scrollTo(await topOf('#final') - 40, 1300); await page.waitForTimeout(500);
    await tapOn('#final a', false); await page.waitForTimeout(600);
  });
  await browser.close();
})();
