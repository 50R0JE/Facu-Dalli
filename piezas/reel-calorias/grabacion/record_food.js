// Graba la pantalla de Comida (contador de calorías) con Supabase simulado, escena por escena.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { setupPage } = require('./common');
const mock = require('./mock_client');
const OUT = path.join(__dirname, 'food_frames');
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const BASE = process.env.BASE || 'http://localhost:8767';

(async () => {
  const browser = await chromium.launch();
  const { page, ctx } = await setupPage(browser, { serviceWorkers: 'block' });
  await page.goto(BASE + '/privacidad/');
  await mock.install(ctx, page);
  await ctx.route(/openfoodfacts/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: 0, products: [] }) }));
  await ctx.addInitScript(s => localStorage.setItem('sb-wegptuzhsrwppbknqstf-auth-token', JSON.stringify(s)), mock.SESSION);
  await page.goto(BASE + '/app/', { waitUntil: 'networkidle' });
  const css = `#fx-touch{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
    background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.75);box-shadow:0 0 18px rgba(255,255,255,.35);pointer-events:none;
    opacity:0;transition:opacity .2s, transform .15s}#fx-touch.on{opacity:1}#fx-touch.tap{transform:scale(.72)}.gi-bar{display:none!important}.water-mini,.water-mini~*{display:none!important}`;
  await page.addStyleTag({ content: css });
  await page.waitForTimeout(2000);

  const cdp = await ctx.newCDPSession(page);
  let frames = [], rec = false, t0 = 0;
  cdp.on('Page.screencastFrame', f => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); if (rec) frames.push({ t: f.metadata.timestamp, data: f.data }); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1612 });

  const ensureTouch = () => page.evaluate(() => { if (!document.getElementById('fx-touch')) { const d = document.createElement('div'); d.id = 'fx-touch'; document.body.appendChild(d); } });
  const touch = (on, x, y, tap) => page.evaluate(([on, x, y, tap]) => { const d = document.getElementById('fx-touch'); if (!d) return; d.classList.toggle('on', on);
    if (x != null) { d.style.left = x + 'px'; d.style.top = y + 'px'; } if (tap) { d.classList.add('tap'); setTimeout(() => d.classList.remove('tap'), 160); } }, [on, x, y, tap]);
  const center = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const tapOn = async (sel) => {
    await ensureTouch(); const c = await center(sel); if (!c) { console.log('no', sel); return; } const [x, y] = c;
    await touch(true, x - 40, y + 60); await page.waitForTimeout(180);
    for (let i = 1; i <= 10; i++) { await touch(true, x - 40 + 40 * ease(i / 10), y + 60 - 60 * ease(i / 10)); await page.waitForTimeout(22); }
    await page.waitForTimeout(110); await touch(true, x, y, true); await page.click(sel); await page.waitForTimeout(200); await touch(false);
  };
  const scrollTo = (y, ms) => page.evaluate(([y, ms]) => new Promise(res => { const y0 = scrollY, t0 = performance.now(), e = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const st = n => { const t = Math.min(1, (n - t0) / ms); scrollTo(0, y0 + (y - y0) * e(t)); t < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); }), [y, ms]);
  const topOf = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }, sel);
  const scene = async (name, fn) => {
    frames = []; t0 = Date.now() / 1000; rec = true; await fn(); rec = false; await page.waitForTimeout(100);
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    const times = frames.map((f, i) => { fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64')); return f.t; });
    fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify({ start: t0, end: Date.now() / 1000, times }));
    console.log(name, frames.length, (Date.now() / 1000 - t0).toFixed(1) + 's');
  };

  await scene('hoy', async () => {
    await page.getByText('Comida', { exact: true }).last().click(); await page.waitForTimeout(2200);
  });
  await scene('comidas', async () => {
    await scrollTo(430, 1300); await page.waitForTimeout(500);
    const t = await topOf('[data-action="meal-add"][data-meal="cena"]'); await scrollTo(t - 520, 1400); await page.waitForTimeout(500);
  });
  await scene('agregar', async () => {
    await tapOn('[data-action="meal-add"][data-meal="cena"]'); await page.waitForTimeout(500);
    await page.type('[data-action="food-search"]', 'salmón', { delay: 90 }); await page.waitForTimeout(700);
    await tapOn('[data-action="food-pick"]'); await page.waitForTimeout(700);
    await tapOn('[data-action="portion-add"]'); await page.waitForTimeout(700);
  });
  await scene('suma', async () => { await scrollTo(0, 1300); await page.waitForTimeout(1800); });
  await scene('ayer', async () => { await tapOn('[data-action="day-prev"]'); await page.waitForTimeout(1800); });
  await scene('anteayer', async () => {
    await tapOn('[data-action="day-prev"]'); await page.waitForTimeout(1300);
    await scrollTo(470, 1500); await page.waitForTimeout(600);
  });
  await scene('volver', async () => {
    await scrollTo(0, 900); await tapOn('[data-action="day-next"]'); await page.waitForTimeout(500);
    await tapOn('[data-action="day-next"]'); await page.waitForTimeout(1400);
  });
  await browser.close();
})();
