// shot_air.mjs: headless look at the page with the rudder aired (beam reach, 24 knots, course held), phone size.
import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../out');
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); await page.goto('file://' + path.join(out, 'wrapped-for-test.html')); await page.waitForTimeout(500);
await page.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }; set('wind', 24); set('main', 30); set('jib', 28); const S = window.__sim; S.boat.psi = -Math.PI / 2; S.hold = -Math.PI / 2; });
await page.waitForTimeout(9000);
console.log(await page.evaluate(() => { const b = window.__sim.boat; return { air: b.out.rudderAir, grip: b.out.rudderAttach, heel: b.phi * 57.3, helm: document.getElementById('helm').value }; }));
await page.screenshot({ path: path.join(out, 'page-phone-aired.png') }); await browser.close();
