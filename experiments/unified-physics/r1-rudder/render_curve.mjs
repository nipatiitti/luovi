import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname), out = path.join(here, 'out'), name = 'r1-force-curve';
const data = JSON.parse(fs.readFileSync(path.join(out, name + '.json'))), W = 900, H = 640, dir = path.join(out, 'frames-' + name);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<canvas id=c width=${W} height=${H}></canvas>`);
await page.evaluate((d) => { window.D = d;
  window.draw = (k) => { const cv = document.getElementById('c'), g = cv.getContext('2d'), W = cv.width, H = cv.height, RAD = Math.PI / 180;
    const ink = '#1b2430', dim = '#5b6675', OLD = '#c2410c', NEW = '#1d4ed8', REF = '#111827';
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, W, H); g.fillStyle = ink; g.textBaseline = 'top'; g.textAlign = 'left';
    g.font = '700 20px system-ui, sans-serif'; g.fillText('H-boat held straight at 5 knots: force on the rudder against rudder angle', 10, 8);
    const n = D.angs.length, kk = Math.min(k, n - 1), ang = D.angs[kk];
    // left: the blade in the stream, old above, new below
    const blade = (cx, cy, r, col, label) => { g.save(); g.translate(cx, cy);
      g.strokeStyle = '#9db4c8'; g.lineWidth = 1.5; for (let y = -70; y <= 70; y += 35) { g.beginPath(); g.moveTo(-120, y); g.lineTo(-60, y); g.stroke(); g.beginPath(); g.moveTo(-60, y); g.lineTo(-68, y - 4); g.moveTo(-60, y); g.lineTo(-68, y + 4); g.stroke(); }
      g.save(); g.rotate(ang * RAD); g.fillStyle = '#e9dfc8'; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.ellipse(45, 0, 48, 6, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); g.restore();
      // force: lift up the page is "side force", drag along the stream
      const sc = 55, fx = r.CD * sc, fy = -r.CL * sc, px = 30 * Math.cos(ang * RAD), py = 30 * Math.sin(ang * RAD);
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + fx, py + fy); g.stroke(); const a = Math.atan2(fy, fx); g.beginPath(); g.moveTo(px + fx, py + fy); g.lineTo(px + fx - 12 * Math.cos(a - 0.4), py + fy - 12 * Math.sin(a - 0.4)); g.lineTo(px + fx - 12 * Math.cos(a + 0.4), py + fy - 12 * Math.sin(a + 0.4)); g.fill();
      g.restore(); g.fillStyle = col; g.font = '700 17px system-ui, sans-serif'; g.fillText(label, cx - 120, cy - 118);
      g.fillStyle = ink; g.font = '16px system-ui, sans-serif'; g.fillText(`turning force ${Math.round(r.CL * 1109 / 10) * 10} N   brake ${Math.round(r.CD * 1109 / 10) * 10} N`, cx - 120, cy + 92);
      const X = r.att, lc = X > 0.7 ? '#16a34a' : X > 0.3 ? '#d97706' : '#dc2626'; g.fillStyle = lc; g.beginPath(); g.arc(cx + 105, cy - 108, 8, 0, 7); g.fill(); g.fillStyle = dim; g.textAlign = 'right'; g.fillText(X > 0.7 ? 'attached' : X > 0.3 ? 'letting go' : 'stalled', cx + 92, cy - 117); g.textAlign = 'left'; };
    blade(140, 195, D.old[kk], OLD, 'OLD model'); blade(140, 435, D.new[kk], NEW, 'NEW model');
    g.fillStyle = ink; g.font = '700 18px system-ui, sans-serif'; g.fillText(`rudder angle ${ang.toFixed(0)}°`, 20, 40);
    // right: two plots
    const plot = (x0, y0, w, h, key, ymax, title, refs) => { g.strokeStyle = '#c9d1db'; g.lineWidth = 1; g.fillStyle = dim; g.font = '14px system-ui, sans-serif';
      for (let a = 0; a <= 60; a += 15) { const x = x0 + w * a / 60; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + h); g.stroke(); g.textAlign = 'center'; g.fillText(a + '°', x, y0 + h + 4); }
      for (let v = 0; v <= ymax + 1e-9; v += 0.5) { const y = y0 + h - h * v / ymax; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); g.textAlign = 'right'; g.fillText(v.toFixed(1), x0 - 5, y - 8); }
      g.textAlign = 'left'; g.fillStyle = ink; g.font = '700 16px system-ui, sans-serif'; g.fillText(title, x0, y0 - 22);
      const X = (a) => x0 + w * a / 60, Y = (v) => y0 + h - h * Math.min(v, ymax) / ymax;
      refs(X, Y);
      for (const [nm, col] of [['old', OLD], ['new', NEW]]) { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= kk; i++) { const p = D[nm][i]; if (i === 0) g.moveTo(X(p.a), Y(p[key])); else g.lineTo(X(p.a), Y(p[key])); } g.stroke(); const p = D[nm][kk]; g.fillStyle = col; g.beginPath(); g.arc(X(p.a), Y(p[key]), 5, 0, 7); g.fill(); } };
    const plate = (a) => { const s = Math.sin(a * RAD); return 1.2 * s / (0.56 + 0.44 * s); };
    const dash = (f) => { g.setLineDash([7, 5]); g.strokeStyle = REF; g.lineWidth = 2; g.beginPath(); f(); g.stroke(); g.setLineDash([]); };
    plot(340, 85, 540, 195, 'CL', 2.5, 'Turning force (lift number: force / water pressure / blade area)', (X, Y) => {
      dash(() => { for (let a = 20; a <= 60; a += 1) { const v = plate(a) * Math.cos(a * RAD); if (a === 20) g.moveTo(X(a), Y(v)); else g.lineTo(X(a), Y(v)); } });
      dash(() => { g.moveTo(X(0), Y(0)); g.lineTo(X(16), Y(4.07 * 16 * RAD)); });
      g.fillStyle = 'rgba(17,24,39,0.18)'; g.fillRect(X(18), Y(1.33), X(23) - X(18), Y(1.25) - Y(1.33)); g.fillStyle = 'rgba(22,163,74,0.35)'; g.fillRect(X(14), Y(0.76), X(19) - X(14), Y(0.57) - Y(0.76)); });
    plot(340, 345, 540, 195, 'CD', 2.5, 'Brake (drag number)', (X, Y) => { dash(() => { for (let a = 20; a <= 60; a += 1) { const v = plate(a) * Math.sin(a * RAD); if (a === 20) g.moveTo(X(a), Y(v)); else g.lineTo(X(a), Y(v)); } }); });
    g.font = '14px system-ui, sans-serif'; let lx = 20, ly = 580;
    for (const [col, t, kind] of [[OLD, 'old model', 'l'], [NEW, 'new model', 'l'], [REF, 'tank slope, then flat-plate law', 'd'], ['rgba(17,24,39,0.3)', 'tank peak, big foils', 'b'], ['rgba(22,163,74,0.5)', 'yacht rudder models (Miller)', 'b']]) {
      if (kind === 'b') { g.fillStyle = col; g.fillRect(lx, ly + 2, 16, 12); } else { g.strokeStyle = col; g.lineWidth = 3; if (kind === 'd') g.setLineDash([6, 4]); g.beginPath(); g.moveTo(lx, ly + 8); g.lineTo(lx + 22, ly + 8); g.stroke(); g.setLineDash([]); }
      g.fillStyle = dim; g.textAlign = 'left'; g.fillText(t, lx + 26, ly); lx += 40 + g.measureText(t).width; }
    g.fillStyle = '#fdf3c7'; g.fillRect(0, H - 30, W, 30); g.fillStyle = '#6b4e00'; g.font = '14.5px system-ui, sans-serif';
    g.fillText('WATCH FOR: the old blade kept gaining force to 2.0, above every tank value; the new one stalls near 17°, then follows the flat plate.', 8, H - 23);
  }; }, data);
const n = data.angs.length + 20;
for (let k = 0; k < n; k++) { const url = await page.evaluate((k) => { draw(k); return document.getElementById('c').toDataURL('image/png'); }, k); fs.writeFileSync(path.join(dir, `f${String(k).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64')); }
await browser.close();
const gif = path.join(out, name + '.gif');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '5', '-i', path.join(dir, 'f%04d.png'), '-vf', 'fps=15,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', gif]);
for (const q of [0.3, 0.95]) fs.copyFileSync(path.join(dir, `f${String(Math.floor(q * (n - 1))).padStart(4, '0')}.png`), path.join(out, `${name}-look${Math.round(q * 100)}.png`));
fs.rmSync(dir, { recursive: true, force: true }); console.log(name, n, 'frames', (fs.statSync(gif).size / 1e6).toFixed(2), 'MB');
