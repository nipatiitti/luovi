// Browser-side drawing for the four GIFs. window.DATA is set by render.js; window.draw(kind, i) paints frame i.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const INK = '#1a1a1a', MUTE = '#666', GRID = '#dcdcdc', COL = { leech: '#2b6cd4', luff: '#e8590c', force: '#c2185b', ref: '#111', a: '#1b9e77', b: '#7570b3', c: '#d95f02' };
const QC = 0.5 * 1.225 * 64 * 3; // newtons per metre of height for a coefficient of one (3 m chord, 8 m/s)
function text(s, x, y, o) { o = o || {}; ctx.font = (o.bold ? 'bold ' : '') + (o.size || 14) + 'px sans-serif'; ctx.fillStyle = o.col || INK; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.fillText(s, x, y); }
function arrow(x0, y0, x1, y1, col, w) { const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return; const ux = (x1 - x0) / L, uy = (y1 - y0) / L, h = Math.min(10, L * 0.45) * (w > 2 ? 1.3 : 1);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * h * 0.8, y1 - uy * h * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5); ctx.lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5); ctx.closePath(); ctx.fill(); }
function header(title, caption) { ctx.fillStyle = '#fafaf7'; ctx.fillRect(0, 0, cv.width, cv.height); text(title, 14, 26, { size: 19, bold: true }); text(caption, 14, 48, { size: 14, col: '#333' }); }
function scene(box, sc, cx, cy, fr, o) { // world metres to pixels, y up
  o = o || {}; const X = x => box.x + box.w / 2 + (x - cx) * sc, Y = y => box.y + box.h / 2 - (y - cy) * sc;
  ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.w, box.h);
  // faint wind streaks
  const wa = o.windAngle, wx = Math.cos(wa), wy = Math.sin(wa); ctx.globalAlpha = 0.5;
  for (let k = -4; k <= 4; k++) { const px = box.x + box.w / 2 - wx * box.w * 0.42 - wy * k * box.h / 9 * -1, py = box.y + box.h / 2 + wy * box.h * 0.42 - wx * k * box.h / 9;
    if (px > box.x + 6 && px < box.x + box.w - 6 && py > box.y + 6 && py < box.y + box.h - 6) arrow(px, py, px + wx * 26, py - wy * 26, '#9db4c8', 1.5); }
  ctx.globalAlpha = 1;
  if (o.centreline) { ctx.strokeStyle = '#bbb'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(box.x, Y(0)); ctx.lineTo(box.x + box.w, Y(0)); ctx.stroke(); ctx.setLineDash([]); }
  const w = fr.w, cols = o.wakeCols || [COL.leech, COL.luff];
  for (let k = 0; k < w.length; k += 3) { ctx.fillStyle = cols[w[k + 2] % cols.length]; ctx.beginPath(); ctx.arc(X(w[k]), Y(w[k + 1]), o.dot || 2.6, 0, 6.3); ctx.fill(); }
  fr.sails.forEach((s, m) => {
    if (o.loads) for (let i = 0; i < s.pc.length; i++) { const p = s.pc[i], L = s.ld[i] * o.loads; arrow(X(p[0]), Y(p[1]), X(p[0]) + p[2] * L, Y(p[1]) - p[3] * L, s.ld[i] >= 0 ? '#5b8def' : '#d6336c', 1.6); }
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); s.o.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
    if (o.nodes) { const n = o.nodes; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let i = 0; i <= n; i++) { const t = i / n * (s.o.length - 1), j = Math.min(s.o.length - 2, Math.floor(t)), f = t - j, x = s.o[j][0] + f * (s.o[j + 1][0] - s.o[j][0]), y = s.o[j][1] + f * (s.o[j + 1][1] - s.o[j][1]); ctx.beginPath(); ctx.arc(X(x), Y(y), 3.2, 0, 6.3); ctx.fill(); ctx.stroke(); } }
    const lf = s.o[0], le = s.o[s.o.length - 1]; ctx.fillStyle = s.shed ? COL.luff : INK; ctx.beginPath(); ctx.arc(X(lf[0]), Y(lf[1]), 5, 0, 6.3); ctx.fill();
    if (o.labels) { text(o.labels[m][0], X(lf[0]) + o.labels[m][2], Y(lf[1]) + o.labels[m][3], { size: 12, col: MUTE, align: 'center' }); text(o.labels[m][1], X(le[0]) + 4, Y(le[1]) + 16, { size: 12, col: MUTE }); }
    const F = o.forces ? o.forces[m] : null; if (F) { const mid = s.o[Math.floor(s.o.length / 2)]; arrow(X(mid[0]), Y(mid[1]), X(mid[0]) + F[0] * o.fscale, Y(mid[1]) - F[1] * o.fscale, COL.force, 3.5); } });
  ctx.restore(); ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
  // scale bar
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(box.x + 12, box.y + box.h - 12); ctx.lineTo(box.x + 12 + sc, box.y + box.h - 12); ctx.stroke(); text('1 m', box.x + 16 + sc, box.y + box.h - 8, { size: 12, col: MUTE });
}
function plot(box, xr, yr, xl, yl, o) { o = o || {}; const X = x => box.x + (x - xr[0]) / (xr[1] - xr[0]) * box.w, Y = y => box.y + box.h - (y - yr[0]) / (yr[1] - yr[0]) * box.h;
  ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.w, box.h); ctx.lineWidth = 1;
  for (const t of o.xt) { ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(X(t), box.y); ctx.lineTo(X(t), box.y + box.h); ctx.stroke(); text(String(t), X(t), box.y + box.h + 14, { size: 11, col: MUTE, align: 'center' }); }
  for (const t of o.yt) { ctx.strokeStyle = t === 0 ? '#999' : GRID; ctx.beginPath(); ctx.moveTo(box.x, Y(t)); ctx.lineTo(box.x + box.w, Y(t)); ctx.stroke(); text(String(t), box.x - 5, Y(t) + 4, { size: 11, col: MUTE, align: 'right' }); }
  ctx.strokeStyle = '#888'; ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
  text(xl, box.x + box.w / 2, box.y + box.h + 29, { size: 12, align: 'center' }); text(yl, box.x, box.y - 6, { size: 13, bold: true });
  return { X, Y, line(pts, col, w, dash) { ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []); ctx.lineJoin = 'round'; ctx.beginPath(); let pen = false;
      for (const p of pts) { if (p === null) { pen = false; continue; } if (pen) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); pen = true; } ctx.stroke(); ctx.restore(); },
    dots(pts, col, r, hollow) { for (const p of pts) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), r || 4, 0, 6.3); if (hollow) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = col; ctx.fill(); } } },
    sq(pts, col, r) { ctx.fillStyle = col; for (const p of pts) ctx.fillRect(X(p[0]) - r, Y(p[1]) - r, 2 * r, 2 * r); },
    cursor(x, col) { ctx.strokeStyle = col || '#bbb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x), box.y); ctx.lineTo(X(x), box.y + box.h); ctx.stroke(); } }; }
function legend(x, y, items) { let yy = y; for (const it of items) { if (it.kind === 'line') { ctx.strokeStyle = it.col; ctx.lineWidth = it.w || 2.5; ctx.setLineDash(it.dash || []); ctx.beginPath(); ctx.moveTo(x, yy - 4); ctx.lineTo(x + 22, yy - 4); ctx.stroke(); ctx.setLineDash([]); }
    else if (it.kind === 'sq') { ctx.fillStyle = it.col; ctx.fillRect(x + 7, yy - 8, 8, 8); } else { ctx.beginPath(); ctx.arc(x + 11, yy - 4, 4, 0, 6.3); if (it.hollow) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = it.col; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = it.col; ctx.fill(); } }
    text(it.label, x + 28, yy, { size: 11.5, col: '#222' }); yy += 15; } }
const D = Math.PI / 180;
const FJ = [[30, 1.117, 0.645], [40, 1.203, 1.009], [50, 1.157, 1.379], [60, 0.985, 1.706], [70, 0.708, 1.945], [90, 0, 2.13]]; // flat plate, Fage & Johansen 1927
function dotKey(x, y) { legend(x, y, [{ kind: 'dot', col: COL.leech, label: 'spin shed at the leech' }, { kind: 'dot', col: COL.luff, label: 'spin shed at the luff (stall, luffing)' }, { kind: 'line', col: COL.force, w: 3.5, label: 'force on the sail' }]); }

function draw1(i) { const d = window.DATA, fr = d.frames[i];
  header('One sail section, wind swung right round (10% camber, 12 panels)', 'Watch: the luff turns orange and starts shedding when the sail stalls; lift and drag draw themselves against measurements.');
  const box = { x: 12, y: 62, w: 440, h: 410 }; scene(box, 36, 1.5, 0, fr, { windAngle: fr.a * D, forces: [[fr.F[0] / QC, fr.F[1] / QC]], fscale: 48, labels: [['luff', 'leech', -4, 20]] });
  text('wind ' + (fr.a >= 0 ? '+' : '') + fr.a.toFixed(0) + '° to the sail, 8 m/s', box.x + 10, box.y + 20, { size: 14, bold: true });
  text('luff suction ' + fr.sails[0].S.toFixed(2) + (fr.sails[0].shed ? '  (at the limit: shedding)' : '  (holding)'), box.x + 10, box.y + 38, { size: 13, col: fr.sails[0].shed ? COL.luff : '#333' });
  dotKey(box.x + 8, box.y + box.h + 20);
  const xt = [-180, -90, 0, 90, 180], sofar = d.frames.slice(0, i + 1), brk = (k) => { const o = []; sofar.forEach((f, j) => { if (j && Math.abs(f.a - sofar[j - 1].a) > 90) o.push(null); o.push([f.a, f[k]]); }); return o; };
  const p1 = plot({ x: 505, y: 80, w: 380, h: 180 }, [-180, 180], [-2.6, 2.6], '', 'Lift coefficient (force square to the wind)', { xt, yt: [-2, -1, 0, 1, 2] });
  p1.line([[-6, 2 * Math.PI * (Math.sin(-6 * D) + 0.2)], [5.7, 2 * Math.PI * (Math.sin(5.7 * D) + 0.2)]], '#111', 1.5, [5, 3]);
  p1.dots([[0, 0.9], [13, 1.75]], '#111', 4.5, true); p1.sq(FJ.map(r => [r[0], r[1]]), '#777', 3.5); p1.line(brk('cl'), COL.a, 2.5); p1.cursor(fr.a);
  legend(250, 492, [{ kind: 'line', col: COL.a, label: 'model' }, { kind: 'line', col: '#111', w: 1.5, dash: [5, 3], label: 'thin-aerofoil theory' }, { kind: 'dot', col: '#111', hollow: true, label: 'measured, 10% camber (Marchaj)' }, { kind: 'sq', col: '#777', label: 'measured flat plate (1927)' }]);
  const p2 = plot({ x: 505, y: 302, w: 380, h: 180 }, [-180, 180], [-0.2, 2.8], 'wind angle to the sail (degrees); negative = sail aback', 'Drag coefficient (force along the wind)', { xt, yt: [0, 1, 2] });
  ctx.fillStyle = 'rgba(120,120,120,0.18)'; ctx.fillRect(p2.X(82), p2.Y(2.4), p2.X(98) - p2.X(82), p2.Y(1.6) - p2.Y(2.4)); text('square to the wind: 1.6 to 2.4', p2.X(78), p2.Y(2.5), { size: 11, col: MUTE, align: 'right' });
  p2.sq(FJ.map(r => [r[0], r[2]]), '#777', 3.5); p2.line(brk('cd'), COL.a, 2.5); p2.cursor(fr.a); }

function draw2(i) { const d = window.DATA, Ns = [6, 12, 24], cols = [COL.c, COL.a, COL.b];
  header('Does the answer depend on how finely the sail is cut up? (20% camber: 6, 12, 24 panels)', 'Watch: fully stalled, all three agree. Near the stall, 12 and 24 panels agree but 6 panels stalls late (10%) or goes wild (20%).');
  Ns.forEach((N, k) => { const fr = d.runs[k][i], box = { x: 12 + k * 294, y: 62, w: 286, h: 228 }; scene(box, 30, 1.5, 0.5, fr, { windAngle: fr.a * D, forces: [[fr.F[0] / QC, fr.F[1] / QC]], fscale: 24, nodes: N, dot: 2.2 });
    text(N + ' panels', box.x + 8, box.y + 18, { size: 14, bold: true, col: cols[k] }); if (k === 0) text('wind ' + fr.a.toFixed(0) + '°', box.x + 200, box.y + 18, { size: 14, bold: true }); });
  const a = d.runs[0][i].a, xt = [0, 10, 20, 30, 40, 50, 60];
  const mk = (x, yr, yt, yl, key, src) => { const p = plot({ x, y: 318, w: 250, h: 165 }, [0, 60], yr, 'wind angle to the sail (degrees)', yl, { xt, yt });
    Ns.forEach((N, k) => p.line(src(k).slice(0, i + 1), cols[k], 2.2)); p.cursor(a); return p; };
  const pa = mk(40, [0, 6], [0, 2, 4, 6], 'Lift, 20% camber', 'cl', k => d.runs[k].map(f => [f.a, f.cl])); pa.dots([[0, 0.6], [22, 2.2]], '#111', 4.5, true);
  mk(335, [0, 2], [0, 1, 2], 'Drag, 20% camber', 'cd', k => d.runs[k].map(f => [f.a, f.cd]));
  const pc = mk(630, [0, 3], [0, 1, 2, 3], 'Lift, 10% camber', 'cl', k => d.runs10[k].map(f => [f[0], f[1]])); pc.dots([[0, 0.9], [13, 1.75]], '#111', 4.5, true);
  legend(200, 338, [{ kind: 'line', col: cols[0], label: '6 panels' }, { kind: 'line', col: cols[1], label: '12 panels' }, { kind: 'line', col: cols[2], label: '24 panels' }, { kind: 'dot', col: '#111', hollow: true, label: 'measured' }]);
  text('Measured points: 22% camber arc (Bot et al.) and 10% camber plate (Marchaj). Luff shedding only, no leech separation.', 14, 538, { size: 12, col: MUTE }); }

function draw3(i) { const d = window.DATA, fr = d.frames[i], b = d.beta * D;
  header('Jib ahead of the main, jib sheeted in from 24° to 2°', 'Watch the little arrows on the front of the main turn red: the jib is backwinding it. Blue pushes to leeward, red to windward.');
  const box = { x: 12, y: 62, w: 470, h: 410 }; scene(box, 68, 0.45, 0.35, fr, { windAngle: b, centreline: true, loads: 14, wakeCols: [COL.leech, COL.luff, COL.leech, COL.luff], forces: fr.F.map(F => [F[0] / QC, F[1] / QC]), fscale: 40, labels: [['jib', '', 30, -14], ['main', '', 60, 22]] });
  text('jib sheet ' + fr.dj.toFixed(0) + '° off the centreline', box.x + 10, box.y + 20, { size: 14, bold: true }); text('wind 12° off the bow, main sheet 8°; bow to the left, leeward up', box.x + 10, box.y + 38, { size: 12, col: '#333' });
  legend(box.x + 8, box.y + box.h + 20, [{ kind: 'line', col: '#5b8def', label: 'pressure pushing to leeward' }, { kind: 'line', col: '#d6336c', label: 'pressure pushing to windward' }, { kind: 'line', col: COL.force, w: 3.5, label: 'force on each sail' }]);
  const sofar = d.frames.slice(18, i + 1), xt = [24, 20, 16, 12, 8, 4];
  const p1 = plot({ x: 535, y: 80, w: 350, h: 180 }, [25, 1], [-2.6, 2.6], '', 'Push on the front of the main (pressure coefficient)', { xt, yt: [-2, -1, 0, 1, 2] });
  p1.line([[25, 2.03], [1, 2.03]], '#111', 1.5, [5, 3]); p1.line(sofar.map(f => [f.dj, f.sails[1].ld[0]]), COL.b, 2.5); p1.line(sofar.map(f => [f.dj, f.sails[1].S * 10]), COL.c, 2); p1.cursor(fr.dj);
  legend(260, 492, [{ kind: 'line', col: COL.b, label: 'pressure on the first 8% of the main' }, { kind: 'line', col: '#111', w: 1.5, dash: [5, 3], label: 'the same with no jib' }, { kind: 'line', col: COL.c, w: 2, label: 'main luff suction x10 (sheds at 1)' }]);
  const p2 = plot({ x: 535, y: 302, w: 350, h: 180 }, [25, 1], [0, 90], 'jib sheet angle (degrees)  —  sheeting in →', 'Drive, newtons per metre of luff', { xt, yt: [0, 20, 40, 60, 80] });
  p2.line(d.jAlone.map(r => [r[0], r[1]]), COL.a, 1.5, [5, 3]); p2.line([[25, d.mainAlone.drive], [1, d.mainAlone.drive]], COL.b, 1.5, [5, 3]);
  p2.line(sofar.map(f => [f.dj, -f.F[0][0]]), COL.a, 2.5); p2.line(sofar.map(f => [f.dj, -f.F[1][0]]), COL.b, 2.5); p2.cursor(fr.dj);
  legend(545, 322, [{ kind: 'line', col: COL.a, label: 'jib' }, { kind: 'line', col: COL.b, label: 'main' }, { kind: 'line', col: '#555', w: 1.5, dash: [5, 3], label: 'each sail alone' }]); }

function draw4(i) { const d = window.DATA, fr = d.frames[i];
  header('Through head to wind: the sail luffs, then fills aback', 'Watch: the sail luffs, the cloth flips, it fills aback. Coming back, the purple line should retrace the grey mirror dots.');
  const box = { x: 12, y: 62, w: 440, h: 410 }; scene(box, 52, 1.5, 0, fr, { windAngle: fr.a * D, forces: [[fr.F[0] / QC, fr.F[1] / QC]], fscale: 60, labels: [['luff', 'leech', -4, 22]] });
  text('wind ' + (fr.a >= 0 ? '+' : '') + fr.a.toFixed(0) + '° to the sail' + (fr.a < -1 ? '  (aback)' : ''), box.x + 10, box.y + 20, { size: 14, bold: true });
  text('luff suction ' + fr.sails[0].S.toFixed(2) + (fr.sails[0].shed ? '  (shedding)' : ''), box.x + 10, box.y + 38, { size: 13, col: fr.sails[0].shed ? COL.luff : '#333' });
  dotKey(box.x + 8, box.y + box.h + 20);
  const n = d.frames.length, i0 = Math.round(n * 3 / 17), half = Math.round(n * 12 / 17), out = d.frames.slice(i0, Math.max(i0, Math.min(i + 1, half))).map(f => [f.a, f.cl]), back = i >= half ? d.frames.slice(half, i + 1).map(f => [f.a, f.cl]) : [];
  const p = plot({ x: 505, y: 80, w: 380, h: 400 }, [-10, 10], [-2.6, 2.6], 'wind angle to the sail (degrees); negative = aback', 'Lift coefficient (side push on the sail)', { xt: [-8, -4, 0, 4, 8], yt: [-2, -1, 0, 1, 2] });
  p.dots(d.frames.slice(i0, Math.round(n * 8 / 17)).filter((f, j) => j % 3 === 0).map(f => [-f.a, -f.cl]), '#999', 2.5); p.line(out, COL.a, 2.5); p.line(back, COL.b, 2.5); p.cursor(fr.a);
  legend(515, 110, [{ kind: 'line', col: COL.a, label: 'bearing through the wind (4° a second)' }, { kind: 'line', col: COL.b, label: 'coming back' }, { kind: 'dot', col: '#999', label: 'mirror image of the first pass' }]); }
window.draw = (kind, i) => ({ 1: draw1, 2: draw2, 3: draw3, 4: draw4 })[kind](i);
window.count = kind => kind === 2 ? window.DATA.runs[0].length : window.DATA.frames.length;
