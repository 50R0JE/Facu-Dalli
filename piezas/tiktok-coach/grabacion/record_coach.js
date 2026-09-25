// Graba el panel de coach (con Supabase simulado) en formato celular, escena por escena.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { setupPage } = require('./common');
const mock = require('./mock');
const OUT = path.join(__dirname, 'coach_frames');
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

(async () => {
  const browser = await chromium.launch();
  const { page, ctx } = await setupPage(browser, { serviceWorkers: 'block' });
  await page.goto('http://localhost:8766/privacidad/');
  await mock.install(ctx, page);
  await ctx.addInitScript(s => localStorage.setItem('sb-wegptuzhsrwppbknqstf-auth-token', JSON.stringify(s)), mock.SESSION);
  await page.goto('http://localhost:8766/app/', { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `#fx-touch{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
    background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.75);box-shadow:0 0 18px rgba(255,255,255,.35);pointer-events:none;
    opacity:0;transition:opacity .2s, transform .15s}#fx-touch.on{opacity:1}#fx-touch.tap{transform:scale(.72)}.gi-bar{display:none!important}` });
  await page.evaluate(() => { const d = document.createElement('div'); d.id = 'fx-touch'; document.body.appendChild(d); });
  await page.waitForTimeout(2500);

  const cdp = await ctx.newCDPSession(page);
  let frames = [], rec = false, t0 = 0;
  cdp.on('Page.screencastFrame', f => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); if (rec) frames.push({ t: f.metadata.timestamp, data: f.data }); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1612 });

  const touch = (on, x, y, tap) => page.evaluate(([on, x, y, tap]) => { const d = document.getElementById('fx-touch'); if (!d) return; d.classList.toggle('on', on);
    if (x != null) { d.style.left = x + 'px'; d.style.top = y + 'px'; } if (tap) { d.classList.add('tap'); setTimeout(() => d.classList.remove('tap'), 160); } }, [on, x, y, tap]);
  const ensureTouch = () => page.evaluate(() => { if (!document.getElementById('fx-touch')) { const d = document.createElement('div'); d.id = 'fx-touch'; document.body.appendChild(d); } });
  const scrollHost = (y, ms) => page.evaluate(([y, ms]) => new Promise(res => { const h = document.getElementById('coachHost');
    const y0 = h.scrollTop, t0 = performance.now(), e = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const st = n => { const t = Math.min(1, (n - t0) / ms); h.scrollTop = y0 + (y - y0) * e(t); t < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); }), [y, ms]);
  const topOf = sel => page.evaluate(s => { const h = document.getElementById('coachHost'); const e = document.querySelector(s); if (!e) return null;
    return Math.round(e.getBoundingClientRect().top - h.getBoundingClientRect().top + h.scrollTop); }, sel);
  const scrollToSel = async (sel, off, ms) => { const t = await topOf(sel); if (t != null) await scrollHost(Math.max(0, t - off), ms); };
  const center = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const tapOn = async (sel, click = true) => {
    await ensureTouch();
    const c = await center(sel); if (!c) { console.log('no', sel); return; } const [x, y] = c;
    await touch(true, x - 40, y + 60); await page.waitForTimeout(200);
    for (let i = 1; i <= 10; i++) { await touch(true, x - 40 + 40 * ease(i / 10), y + 60 - 60 * ease(i / 10)); await page.waitForTimeout(22); }
    await page.waitForTimeout(120); await touch(true, x, y, true); if (click) await page.click(sel); await page.waitForTimeout(220); await touch(false);
  };
  const selectOpt = async (sel, idx) => { await tapOn(sel, false); await page.evaluate(([s, i]) => { const e = document.querySelector(s); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, idx]); };
  const typeInto = async (sel, text) => { await tapOn(sel); await page.fill(sel, ''); await page.type(sel, text, { delay: 38 }); };
  const scene = async (name, fn) => {
    frames = []; t0 = Date.now() / 1000; rec = true; await fn(); rec = false; await page.waitForTimeout(100);
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    const times = frames.map((f, i) => { fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64')); return f.t; });
    fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify({ start: t0, end: Date.now() / 1000, times }));
    console.log(name, frames.length, (Date.now() / 1000 - t0).toFixed(1) + 's');
  };

  await scene('lista', async () => {
    await page.waitForTimeout(700); await scrollHost(330, 1200); await page.waitForTimeout(900); await scrollHost(0, 900);
  });
  await scene('codigo', async () => { await tapOn('[data-coach="copy-invite"]'); await page.waitForTimeout(1300); });
  await scene('rutinas', async () => {
    await tapOn('[data-coach="view-tpls"]'); await page.waitForTimeout(1500);
    await tapOn('[data-coach="view-clients"]'); await page.waitForTimeout(500);
  });
  await scene('abrir', async () => {
    await tapOn('.co-trow[data-coach="open"]:nth-of-type(3)'); await page.waitForTimeout(1600);
  });
  await scene('mensaje', async () => {
    await typeInto('[data-coach="nt-text"]', 'Mañana subimos 2,5 kg en sentadilla 💪');
    await page.waitForTimeout(500);
  });
  await scene('ficha', async () => { await scrollToSel('.ci-card', 60, 1400); await page.waitForTimeout(700); await scrollHost((await topOf('.ci-card')) + 520, 1400); await page.waitForTimeout(500); });
  await scene('bloque', async () => { await scrollToSel('.bw', 330, 1300); await page.waitForTimeout(600); await tapOn('.bw.now'); await page.waitForTimeout(900); });
  await scene('diario', async () => {
    await scrollToSel('[data-coach="daily-pick"]', 140, 1200); await selectOpt('[data-coach="daily-pick"]', 1); await page.waitForTimeout(700);
    await scrollToSel('[data-coach="daily-pick"]', 140, 700); await page.waitForTimeout(900);
  });
  await scene('checkin', async () => {
    await scrollToSel('[data-coach="ck-pick"]', 140, 1100); await selectOpt('[data-coach="ck-pick"]', 1); await page.waitForTimeout(600);
    await scrollToSel('[data-coach="ck-pick"]', 120, 600); await page.waitForTimeout(500); await scrollHost((await topOf('[data-coach="ck-pick"]')) + 380, 1400); await page.waitForTimeout(400);
  });
  await scene('entrenos', async () => {
    await scrollToSel('[data-coach="sess-pick"]', 140, 1100); await selectOpt('[data-coach="sess-pick"]', 1); await page.waitForTimeout(600);
    await scrollToSel('[data-coach="sess-pick"]', 120, 600); await scrollHost((await topOf('[data-coach="sess-pick"]')) + 360, 1500); await page.waitForTimeout(400);
  });
  await scene('volumen', async () => { await scrollToSel('.co-split, .vol-wrap, .co-panel:nth-last-of-type(2)', 60, 1000); await page.waitForTimeout(300);
    const t = await topOf('.co-tabs'); const H = await page.evaluate(() => { const h = document.getElementById('coachHost'); return h.scrollHeight - h.clientHeight; });
    await scrollHost(H - 1300, 1500); await page.waitForTimeout(500); await scrollHost(H, 1800); await page.waitForTimeout(500); });
  await scene('rutina', async () => {
    await scrollHost(0, 800); await tapOn('[data-coach="client-tab"][data-t="rutina"]'); await page.waitForTimeout(900);
    await scrollToSel('.co-exc', 140, 1200); await page.waitForTimeout(400);
  });
  await scene('editar', async () => {
    const ex = '.co-exc-collapsed .co-exc-cmain';
    await tapOn(ex); await page.waitForTimeout(900);
    await scrollToSel('.co-exc-open .co-prow', 150, 900); await page.waitForTimeout(600);
    await scrollToSel('.co-exc-open details.co-exc-fold', 260, 900);
    await tapOn('.co-exc-open details.co-exc-fold summary'); await page.waitForTimeout(400); await typeInto('.co-exc-open [data-coach="rt-video"]', 'https://youtu.be/k7Qx2LmVb9s'); await page.waitForTimeout(1200);
  });
  await scene('progreso', async () => {
    await tapOn('.co-exc-open details.co-exc-fold:last-of-type summary'); await page.waitForTimeout(600);
    await scrollToSel('.co-exc-open .co-exc-prog', 200, 900); await page.waitForTimeout(1200);
  });
  await scene('plan', async () => {
    await scrollHost(0, 700); await tapOn('[data-coach="client-tab"][data-t="plan"]'); await page.waitForTimeout(900);
    await scrollHost(260, 1000); await page.waitForTimeout(700);
    const t = await topOf('.opt-sec'); if (t) await scrollHost(t - 180, 1800); await page.waitForTimeout(700);
  });
  await scene('preguntas', async () => {
    await scrollHost(0, 500); await tapOn('[data-coach="back"]'); await page.waitForTimeout(700);
    await tapOn('.co-q-btn'); await page.waitForTimeout(1300); await page.evaluate(() => { const h = document.querySelector('.q-sheet, .sheet, [class*="q-"]'); }); await page.waitForTimeout(600);
  });
  await browser.close();
})();
