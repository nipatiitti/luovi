// render_r2.mjs: node render_r2.mjs <scenario> : draws out/<scenario>.json with draw_r2.js in headless Chromium, GIF by ffmpeg.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname), out = path.join(here, 'out');
const name = process.argv[2], scen = JSON.parse(fs.readFileSync(path.join(out, name + '.json'))), W = 900, H = 760, dir = path.join(out, 'frames-' + name);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<canvas id=c width=${W} height=${H}></canvas>`);
await page.addScriptTag({ content: fs.readFileSync(path.join(here, 'draw_r2.js'), 'utf8') });
await page.evaluate((s) => { window.scen = s; }, scen);
const n = Math.max(...scen.cells.map((c) => c.frames.length)), only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
for (let k = 0; k < n; k++) {
  if (only && !only.includes(k)) continue;
  const url = await page.evaluate((k) => { const cv = document.getElementById('c'); R2Draw.frame(cv.getContext('2d'), cv.width, cv.height, scen, k); return cv.toDataURL('image/png'); }, k);
  fs.writeFileSync(path.join(dir, `f${String(k).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
if (only) { for (const k of only) fs.copyFileSync(path.join(dir, `f${String(k).padStart(4, '0')}.png`), path.join(out, `${name}-look${k}.png`)); process.exit(0); }
const gif = path.join(out, name + '.gif');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '15', '-i', path.join(dir, 'f%04d.png'), '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', gif]);
fs.rmSync(dir, { recursive: true, force: true });
console.log(name, n, 'frames', (fs.statSync(gif).size / 1e6).toFixed(2), 'MB');
