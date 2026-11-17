// test_page.mjs: headless test of sailing-test.html at desktop and phone size. Sails for over a minute each,
// including a tack, with keys (desktop) and touch (phone); reports console errors, requests, frame time, layout.
import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const file = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), 'out/sailing-test.html');
const browser = await chromium.launch();
const state = (page) => page.evaluate(() => { const S = window.__sim, b = S.boat; return { t: S.simT, hdg: Math.atan2(Math.sin(b.psi), Math.cos(b.psi)) * 180 / Math.PI, kn: Math.hypot(b.u, b.v) / 0.5144, heel: b.phi * 180 / Math.PI, jibSide: b.jibSide, stepMs: S.stepMs, frames: S.frames, key: S.key, helm: +document.getElementById('helm').value }; });
async function session(name, opts, drive) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage(), errors = [], requests = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { if (!r.url().startsWith('file://')) requests.push(r.url()); });
  await page.goto(file); await page.waitForTimeout(1500);
  const s0 = await state(page), t0 = Date.now();
  const log = await drive(page);
  const s1 = await state(page), wall = (Date.now() - t0) / 1000;
  const layout = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, canvas: document.getElementById('cv').getBoundingClientRect().toJSON(), bodyPad: getComputedStyle(document.body).paddingLeft, bg: getComputedStyle(document.body).backgroundColor }));
  await page.screenshot({ path: path.resolve(path.dirname(new URL(import.meta.url).pathname), `out/page-${name}.png`), fullPage: true });
  console.log(`[${name}] simulated ${(s1.t - s0.t).toFixed(1)} s in ${wall.toFixed(1)} s wall; ${((s1.frames - s0.frames) / wall).toFixed(0)} frames/s; model ${s1.stepMs.toFixed(2)} ms per frame; errors ${errors.length} ${errors.slice(0, 3).join(' | ')}; external requests ${requests.length}; scrollWidth ${layout.scrollW} / ${layout.innerW}; body padding ${layout.bodyPad}; bg ${layout.bg}`);
  console.log(`[${name}] ` + log.join('; '));
  await ctx.close();
  return { errors, requests, layout };
}
const fmt = (s) => `t ${s.t.toFixed(0)} hdg ${s.hdg.toFixed(0)} ${s.kn.toFixed(1)} kn heel ${s.heel.toFixed(0)} jib ${s.jibSide} helm ${s.helm}`;
const desktop = session('desktop', { viewport: { width: 1280, height: 800 } }, async (page) => {
  const log = [];
  await page.waitForTimeout(12000); log.push('settled: ' + fmt(await state(page)));
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight'); // helm over for the tack
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(100); if ((await state(page)).hdg > 5) break; }
  await page.keyboard.press('j'); await page.keyboard.down('q'); await page.waitForTimeout(1800); await page.keyboard.up('q'); // jib and crew across
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(100); if ((await state(page)).hdg > 38) break; }
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('h'); log.push('after tack: ' + fmt(await state(page)));
  await page.waitForTimeout(15000); log.push('port tack, hold course: ' + fmt(await state(page)));
  await page.keyboard.press('p'); await page.keyboard.down('z'); await page.waitForTimeout(700); await page.keyboard.up('z'); await page.waitForTimeout(8000); log.push('puff, main eased: ' + fmt(await state(page)));
  await page.keyboard.down('a'); await page.waitForTimeout(900); await page.keyboard.up('a');
  await page.keyboard.press('b'); await page.waitForTimeout(12000); log.push('other boat: ' + (await state(page)).key + ' ' + fmt(await state(page)));
  await page.keyboard.press('f'); await page.keyboard.press(' '); await page.waitForTimeout(500); await page.keyboard.press(' '); await page.keyboard.press('r'); await page.waitForTimeout(12000); log.push('reset: ' + fmt(await state(page)));
  return log;
});
const phone = session('phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, colorScheme: 'dark' }, async (page) => {
  const log = [], setRange = (id, v) => page.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);
  await page.waitForTimeout(12000); log.push('settled: ' + fmt(await state(page)));
  // drag across the picture by touch to put the helm over
  const box = await page.locator('#cv').boundingBox(), cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', box.x + 100, box.y + 150); for (let i = 1; i <= 8; i++) { await touch('touchMove', box.x + 100 + i * 11, box.y + 150); await page.waitForTimeout(30); } await touch('touchEnd');
  log.push('after drag: ' + fmt(await state(page)));
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(100); if ((await state(page)).hdg > 5) break; }
  await page.tap('#b-tack'); await setRange('crew', -100);
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(100); if ((await state(page)).hdg > 38) break; }
  await page.tap('#b-centre'); await page.tap('#b-hold'); log.push('after tack: ' + fmt(await state(page)));
  await page.waitForTimeout(14000); log.push('port tack: ' + fmt(await state(page)));
  await page.tap('#b-puff'); await setRange('main', 30); await page.waitForTimeout(8000); log.push('puff, main eased: ' + fmt(await state(page)));
  await page.tap('#boats button:nth-child(2)'); await page.waitForTimeout(14000); log.push('other boat: ' + (await state(page)).key + ' ' + fmt(await state(page)));
  await page.tap('#b-fly'); await page.waitForTimeout(6000); log.push('jib flying: ' + fmt(await state(page)));
  return log;
});
const res = await Promise.all([desktop, phone]);
await browser.close();
if (res.some((r) => r.errors.length || r.requests.length || r.layout.scrollW > r.layout.innerW)) { console.log('FAIL'); process.exit(1); } else console.log('PASS');
