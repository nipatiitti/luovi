// node capture.js <scene> : builds DATA from out/results/, renders frames with headless Chromium, encodes a GIF with ffmpeg.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process'); const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'out'), scene = process.argv[2], fps = +(process.argv[3] || 15); const R = f => JSON.parse(fs.readFileSync(path.join(OUT, 'results', f)));
const betas = [30, 60, 90, 105, 120, 135, 150, 165, 180]; let DATA = {};
if (scene === 'sweep') { const curves = {}; for (const res of ['4x8', '6x12', '8x16']) curves[res] = betas.filter(b => fs.existsSync(path.join(OUT, 'results', `pw_${res}_${b}.json`))).map(b => { const r = R(`pw_${res}_${b}.json`); return { beta: b, CL: r.CL, CD: r.CD, noise: r.noise, rawNoise: r.rawNoise }; });
  const fb = [30, 45, 60, 75, 90, 105, 112, 120, 127, 135, 150, 165, 180].map(b => { const r = R(`fb_6x12_${b}.json`); return { beta: b, CL: r.CL, CD: r.CD }; });
  DATA.sweep = { curves, fb, cases: betas.map(b => { const r = R(`pw_6x12_${b}.json`); return { beta: b, boom: r.boom, nshed: r.nshed, area: r.area, geom: r.geom, frames: r.frames }; }) }; }
if (scene === 'res') { const bs = [120, 135, 150, 180], cases = {}; for (const res of ['4x8', '6x12', '8x16']) cases[res] = bs.map(b => { const r = R(`pw_${res}_${b}.json`); return { boom: r.boom, CX: r.CX, CY: r.CY, noise: r.noise, geom: r.geom, frames: r.frames, ser: r.ser }; }); DATA.res = { betas: bs, cases }; }
if (scene === 'twist') DATA.twist = R('fujin_twist.json');
if (scene === 'slot') DATA.slot = R('fujin_slot.json');
(async () => {
  const dir = path.join(OUT, 'frames_' + scene); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 900, height: 560 } });
  pg.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await pg.goto('file://' + path.join(__dirname, 'render.html')); await pg.evaluate(d => { window.DATA = d; }, DATA);
  const n = await pg.evaluate(s => SCENES[s].n(), scene); const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
  for (let i = 0; i < n; i++) { if (only && !only.includes(i)) continue; await pg.evaluate(([s, k]) => SCENES[s].draw(k), [scene, i]); await pg.locator('#c').screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') }); }
  await br.close(); if (only) return;
  execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${dir}/%04d.png -vf "split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" ${path.join(OUT, 's4-' + scene + '.gif')}`);
  console.log(scene, n, 'frames', (fs.statSync(path.join(OUT, 's4-' + scene + '.gif')).size / 1e6).toFixed(2), 'MB');
})();
