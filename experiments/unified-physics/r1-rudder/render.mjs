// render.mjs: draws a scenario file with draw.js in headless Chromium and makes a GIF with ffmpeg.
//   node render.mjs g0-rudder-hboat [frameStep]
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname), out = path.join(here, 'out');
const name = process.argv[2], scen = JSON.parse(fs.readFileSync(path.join(out, name + '.json'))), hulls = JSON.parse(fs.readFileSync(path.join(out, 'hulls.json')));
const W = scen.W || 900, H = scen.H || 760, dir = path.join(out, 'frames-' + name);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<canvas id=c width=${W} height=${H}></canvas>`);
await page.addScriptTag({ content: fs.readFileSync(path.join(here, 'draw.js'), 'utf8') });
await page.evaluate(([s, h]) => { window.scen = s; window.hulls = h; }, [scen, hulls]);
const n = Math.max(...scen.cells.map((c) => c.frames.length));
for (let k = 0; k < n; k++) {
  const url = await page.evaluate((k) => { const cv = document.getElementById('c'); SailDraw.gifFrame(cv.getContext('2d'), cv.width, cv.height, scen, k, hulls, scen.meta); return cv.toDataURL('image/png'); }, k);
  fs.writeFileSync(path.join(dir, `f${String(k).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
const gif = path.join(out, name + '.gif');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(scen.fps), '-i', path.join(dir, 'f%04d.png'), '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', gif]);
// keep three frames to look at
for (const q of [0.15, 0.5, 0.9]) fs.copyFileSync(path.join(dir, `f${String(Math.floor(q * (n - 1))).padStart(4, '0')}.png`), path.join(out, `${name}-look${Math.round(q * 100)}.png`));
fs.rmSync(dir, { recursive: true, force: true });
console.log(name, n, 'frames', (fs.statSync(gif).size / 1e6).toFixed(2), 'MB');
