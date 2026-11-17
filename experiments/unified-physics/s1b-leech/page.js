// Browser-side drawing for the four GIFs. window.DATA is set by render.js; window.draw(kind, i) paints frame i.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const INK = '#1a1a1a', MUTE = '#666', GRID = '#dcdcdc', COL = { sep: '#8e24aa', leech: '#2b6cd4', luff: '#e8590c', force: '#c2185b', ref: '#111', a: '#1b9e77', b: '#7570b3', c: '#d95f02' };
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
  const w = fr.w, cols = [COL.leech, COL.luff, COL.sep];
  for (let k = 0; k < w.length; k += 3) { ctx.fillStyle = cols[w[k + 2] % cols.length]; ctx.beginPath(); ctx.arc(X(w[k]), Y(w[k + 1]), o.dot || 2.6, 0, 6.3); ctx.fill(); }
  fr.sails.forEach((s, m) => {
    if (o.loads) for (let i = 0; i < s.pc.length; i++) { const p = s.pc[i], L = s.ld[i] * o.loads; arrow(X(p[0]), Y(p[1]), X(p[0]) + p[2] * L, Y(p[1]) - p[3] * L, s.ld[i] >= 0 ? '#5b8def' : '#d6336c', 1.6); }
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); s.o.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
    if (o.nodes) { const n = o.nodes; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let i = 0; i <= n; i++) { const t = i / n * (s.o.length - 1), j = Math.min(s.o.length - 2, Math.floor(t)), f = t - j, x = s.o[j][0] + f * (s.o[j + 1][0] - s.o[j][0]), y = s.o[j][1] + f * (s.o[j + 1][1] - s.o[j][1]); ctx.beginPath(); ctx.arc(X(x), Y(y), 3.2, 0, 6.3); ctx.fill(); ctx.stroke(); } }
    if (s.f < 0.985 && !o.noSep) { const px = X(s.sp[0]), py = Y(s.sp[1]); ctx.fillStyle = COL.sep; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py - 8); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 8); ctx.lineTo(px - 7, py); ctx.closePath(); ctx.fill(); ctx.stroke(); }
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
function dotKey(x, y) { legend(x, y, [{ kind: 'dot', col: COL.leech, label: 'spin shed at the leech' }, { kind: 'dot', col: COL.sep, label: 'spin shed where the flow leaves the lee side' }, { kind: 'dot', col: COL.luff, label: 'spin shed at the luff (stalled from the front)' }]); }
const M12L = [[-4, 0.28], [-2, 0.7], [0, 1.0], [2, 1.37], [4, 1.40], [6, 1.5], [8, 1.70], [12, 1.89], [16, 2.02], [18, 2.03], [20, 2.0], [22, 1.87], [24, 1.9]], M12D = [[0, 0.05], [4, 0.06], [8, 0.09], [12, 0.14], [14, 0.24], [16, 0.37], [18, 0.48], [20, 0.60], [22, 0.69], [24, 0.78]];
const M18L = [[-4, 0.42], [-2, 0.6], [0, 0.85], [2, 1.47], [4, 1.93], [6, 2.02], [8, 1.90], [10, 1.84], [12, 1.93], [16, 2.16], [20, 2.3], [22, 2.47], [24, 2.42]], M18D = [[0, 0.10], [4, 0.11], [8, 0.15], [12, 0.18], [16, 0.22], [18, 0.26], [20, 0.38], [22, 0.60], [24, 0.82]];

function sheetGif(i, pair) { const d = window.DATA, fr = d.frames[i], b = d.beta * D, mi = pair ? 1 : 0, ms = fr.sails[mi], xr = pair ? [17, -5] : [21, -1], xt = pair ? [16, 12, 8, 4, 0, -4] : [20, 16, 12, 8, 4, 0];
  header(pair ? 'Mainsail sheeted in too far and eased again, behind the jib' : 'Mainsail alone, sheeted in too far and eased again', 'Watch the purple diamond: where the flow leaves the lee side. Drive should fade gradually while heeling force stays.');
  const box = { x: 12, y: 62, w: 470, h: 400 }; scene(box, pair ? 68 : 80, pair ? 0.45 : 1.5, pair ? 0.35 : 0.5, fr, { windAngle: b, centreline: true, loads: pair ? 12 : 0, forces: fr.F.map(F => [F[0] / QC, F[1] / QC]), fscale: pair ? 40 : 55 });
  text('main sheet ' + fr.dm.toFixed(0) + '° off the centreline', box.x + 10, box.y + 20, { size: 14, bold: true }); text('wind 22° off the bow, 8 m/s; bow to the left, leeward up', box.x + 10, box.y + 38, { size: 12, col: '#333' });
  text('flow leaves the main at ' + (ms.f >= 0.985 ? 'the leech' : Math.round(ms.f * 100) + '% of the chord') + (ms.shed ? '; luff shedding' : ''), box.x + 10, box.y + 56, { size: 13, col: ms.shed ? COL.luff : COL.sep });
  dotKey(box.x + 8, box.y + box.h + 20); legend(box.x + 290, box.y + box.h + 20, [{ kind: 'line', col: COL.force, w: 3.5, label: 'force on the sail' }, { kind: 'line', col: COL.a, label: 'sheeting in' }, { kind: 'line', col: COL.b, label: 'easing' }, { kind: 'dot', col: '#111', hollow: true, label: 'held steady at that sheet' }]);
  const n = d.frames.length, i0 = Math.round(n * 2.5 / 25), half = Math.round(n * 12.5 / 25);
  const path = (k, sg) => [d.frames.slice(i0, Math.max(i0, Math.min(i + 1, half))).map(f => [f.dm, sg * f.F[mi][k]]), i >= half ? d.frames.slice(half, i + 1).map(f => [f.dm, sg * f.F[mi][k]]) : []];
  const p1 = plot({ x: 535, y: 80, w: 350, h: 180 }, xr, pair ? [-10, 50] : [0, 100], '', 'Drive from the main (newtons per metre of luff)', { xt, yt: pair ? [0, 20, 40] : [0, 25, 50, 75, 100] });
  let q = path(0, -1); p1.line(q[0], COL.a, 2.5); p1.line(q[1], COL.b, 2.5); p1.dots(d.steady.map(r => [r[0], r[1]]), '#111', 3.5, true); p1.cursor(fr.dm);
  const p2 = plot({ x: 535, y: 302, w: 350, h: 180 }, xr, [0, 300], 'main sheet angle (degrees)  —  sheeting in →', 'Heeling force from the main (newtons per metre)', { xt, yt: [0, 100, 200, 300] });
  q = path(1, 1); p2.line(q[0], COL.a, 2.5); p2.line(q[1], COL.b, 2.5); p2.dots(d.steady.map(r => [r[0], r[2]]), '#111', 3.5, true); p2.cursor(fr.dm); }
function draw1(i) { sheetGif(i, false); }
function draw3(i) { sheetGif(i, true); }
function draw2(i) { const d = window.DATA, names = ['flat', '12% camber', '18% camber'], cols = [COL.c, COL.a, COL.b];
  header('Flat, 12% and 18% camber swung right round the wind, against measurements', 'Watch the right-hand plots: lines are the model, rings are wind-tunnel points read off Milgram (1971) and Fage & Johansen (1927).');
  names.forEach((nm, k) => { const fr = d.runs[k][i], box = { x: 12 + k * 294, y: 62, w: 286, h: 196 }; scene(box, 26, 1.5, 0, fr, { windAngle: fr.a * D, forces: [[fr.F[0] / QC, fr.F[1] / QC]], fscale: 26, dot: 2.2 });
    text(nm, box.x + 8, box.y + 18, { size: 14, bold: true, col: cols[k] }); if (k === 0) text('wind ' + (fr.a >= 0 ? '+' : '') + fr.a.toFixed(0) + '°', box.x + 190, box.y + 18, { size: 14, bold: true }); });
  const a = d.runs[0][i].a, brk = (k, key) => { const o = [], fs = d.runs[k].slice(0, i + 1); fs.forEach((f, j) => { if (j && Math.abs(f.a - fs[j - 1].a) > 90) o.push(null); o.push([f.a, f[key]]); }); return o; };
  const mk = (x, xr, yr, xt, yt, yl, key) => { const p = plot({ x, y: 300, w: 180, h: 185 }, xr, yr, 'wind angle (degrees)', yl, { xt, yt }); [0, 1, 2].forEach(k => p.line(brk(k, key), cols[k], 2)); if (a >= xr[0] && a <= xr[1]) p.cursor(a); return p; };
  const fc = [-180, -90, 0, 90, 180];
  mk(36, [-180, 180], [-3, 3], fc, [-2, 0, 2], 'Lift, full circle', 'cl').dots(FJ.map(r => [r[0], r[1]]), cols[0], 3, true);
  mk(256, [-180, 180], [-0.2, 2.8], fc, [0, 1, 2], 'Drag, full circle', 'cd').dots(FJ.map(r => [r[0], r[2]]), cols[0], 3, true);
  const p3 = mk(476, [-5, 30], [0, 3], [0, 10, 20, 30], [0, 1, 2, 3], 'Lift, 0 to 30°', 'cl'); p3.dots(M12L, cols[1], 3, true); p3.dots(M18L, cols[2], 3, true); p3.dots([[30, 1.117]], cols[0], 3, true);
  const p4 = mk(696, [-5, 30], [0, 1], [0, 10, 20, 30], [0, 0.5, 1], 'Drag, 0 to 30°', 'cd'); p4.dots(M12D, cols[1], 3, true); p4.dots(M18D, cols[2], 3, true); p4.dots([[30, 0.645]], cols[0], 3, true);
  legend(14, 532, [{ kind: 'dot', col: COL.leech, label: 'leech' }]); legend(84, 532, [{ kind: 'dot', col: COL.sep, label: 'lee-side separation' }]); legend(234, 532, [{ kind: 'dot', col: COL.luff, label: 'luff' }]); text('(where each dot of spin was shed).  Measured sections had a 3% thick rounded nose; reading error about 0.05.', 300, 532, { size: 11.5, col: MUTE }); }
window.draw = (kind, i) => ({ 1: draw1, 2: draw2, 3: draw3 })[kind](i);
window.count = kind => kind === 2 ? window.DATA.runs[0].length : window.DATA.frames.length;
