// node render.js <kind> <name.gif> <fps> : reads out/gif<kind>.json, writes out/<name.gif>; draws frames in headless Chromium, then ffmpeg makes the GIF.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
(async () => { const OUT = path.join(__dirname, 'out'), kind = +process.argv[2], out = path.resolve(OUT, process.argv[3]), fps = +process.argv[4] || 20, only = process.argv[5];
  const dir = path.join(OUT, 'frames' + kind); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 900, height: 545 } });
  await pg.setContent('<html><body style="margin:0;background:#fafaf7"><canvas id="c" width="900" height="545"></canvas></body></html>');
  await pg.evaluate(d => { window.DATA = JSON.parse(d); }, fs.readFileSync(path.join(OUT, `gif${kind}.json`), 'utf8'));
  await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8') });
  const n = await pg.evaluate(k => window.count(k), kind), el = await pg.$('#c');
  const list = only ? only.split(',').map(Number) : [...Array(n).keys()];
  for (const i of list) { await pg.evaluate(([k, j]) => window.draw(k, j), [kind, i]); await el.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') }); }
  await b.close(); if (only) return;
  // hold the last frame for two seconds
  for (let k = 0; k < fps * 2; k++) fs.copyFileSync(path.join(dir, String(n - 1).padStart(4, '0') + '.png'), path.join(dir, String(n + k).padStart(4, '0') + '.png'));
  execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${dir}/%04d.png -vf "split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none" ${out}`);
  console.log(out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB', n, 'frames');
})();
