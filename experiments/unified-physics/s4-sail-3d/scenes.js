// Scenes use window.DATA prepared by capture.js
const Q = 0.5 * 1.225 * 36; // dynamic pressure at the reference height, Pa
const ORC = { b: [28, 60, 90, 120, 150, 180], CL: [1.347, 1.239, 1.125, 0.838, 0.296, -0.112], CD: [0.033, 0.113, 0.383, 0.969, 1.316, 1.345] };
function clipBox(x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore(); }
function centroid(g) { let x = 0, y = 0, z = 0; for (let p = 0; p < g.Np; p++) for (let k = 0; k < 4; k++) { x += g.corners[12 * p + 3 * k]; y += g.corners[12 * p + 3 * k + 1]; z += g.corners[12 * p + 3 * k + 2]; } const n = 4 * g.Np; return [x / n, y / n, z / n]; }
function hull(view, len) { const P = proj(view); ctx.beginPath(); const pts = [[4.2, 0], [2.5, 0.9], [-1, 1.5], [-5.6, 1.1], [-5.6, -1.1], [-1, -1.5], [2.5, -0.9]]; pts.forEach((p, i) => { const [sx, sy] = P(p[0], p[1], 1.1); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.closePath(); ctx.fillStyle = 'rgba(120,130,140,0.13)'; ctx.fill(); ctx.strokeStyle = 'rgba(90,100,110,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }

SCENES.sweep = { n: () => DATA.sweep.cases.length * 20, draw(i) {
  const D = DATA.sweep, k = Math.floor(i / 20), c = D.cases[k], fr = c.frames[10 + (i % 20)];
  header('One rigid mainsail, wind swinging from close reach to dead run', 'Watch: past 105 deg the boom is on the shrouds and the luff sheds (orange wake). The red curve should follow the black dots; it runs about twice too high.');
  const vt = { kind: 'top', cx: 100, cy: 345, sc: 27 }, vo = { kind: 'ob', cx: 405, cy: 470, sc: 23 };
  frameBox(10, 56, 285, 494, 'FROM ABOVE (bow up)'); frameBox(300, 56, 290, 494, 'FROM THE LEE QUARTER');
  clipBox(11, 76, 283, 473, () => { hull(vt); drawWake(vt, fr.wk); drawSail(vt, c.geom, fr.dp, Q); const ce = centroid(c.geom); forceArrows(vt, fr.F[0], ce, 2.2 / (Q * c.area)); windArrow(vt, c.beta, 232, 500, 'apparent wind'); });
  clipBox(301, 76, 288, 473, () => { hull(vo); drawWake(vo, fr.wk); drawSail(vo, c.geom, fr.dp, Q); });
  text('wind ' + c.beta + ' deg off the bow, boom out ' + c.boom + ' deg', 18, 92, { sz: 12.5, b: 1 });
  text(c.nshed ? 'luff shedding on ' + c.nshed + ' of 12 strips' : 'luff holding (attached flow)', 18, 108, { sz: 12, c: c.nshed ? '#b5670f' : DRIVE });
  legend(308, 96, [{ c: WAKE, t: 'wake from the leech' }, { c: LUFFW, t: 'wake shed at the luff' }, { c: EDGEW, t: 'wake from head and foot' }]);
  legend(18, 500, [{ c: DRIVE, t: 'drive', w: 3.5 }, { c: HEEL, t: 'heeling force', w: 3.5 }, { c: INK, t: 'total' }]);
  colourKey(385, 536);
  const mk = (key, b, yr, yt, yl) => { const ax = plot(b, { xr: [30, 180], yr, xt: [30, 60, 90, 120, 150, 180], yt, xl: 'apparent wind angle, degrees off the bow', yl });
    dots(ax, ORC.b.map((x, j) => [x, ORC[key][j]]), REF, 3.5, true);
    for (const [res, col2, w] of [['4x8', '#b9a0d6', 1.5], ['8x16', '#7fb0e0', 1.5]]) line(ax, D.curves[res].filter(p => p.beta <= c.beta).map(p => [p.beta, p[key]]), col2, w);
    line(ax, D.fb.filter(p => p.beta <= c.beta).map(p => [p.beta, p[key]]), DRIVE, 2, [5, 3]);
    const pts = D.curves['6x12'].filter(p => p.beta <= c.beta); line(ax, pts.map(p => [p.beta, p[key]]), HEEL, 2.5);
    for (const p of pts) { const e = p.rawNoise * Math.hypot(p.CL, p.CD); ctx.strokeStyle = HEEL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax.X(p.beta), ax.Y(Math.min(yr[1], p[key] + e))); ctx.lineTo(ax.X(p.beta), ax.Y(Math.max(yr[0], p[key] - e))); ctx.stroke(); }
    dots(ax, pts.slice(-1).map(p => [p.beta, p[key]]), HEEL, 4.5); return ax; };
  mk('CL', { x: 640, y: 80, w: 245, h: 150 }, [-0.5, 3.5], [0, 1, 2, 3], 'Lift coefficient (force across the wind)');
  const ax = mk('CD', { x: 640, y: 290, w: 245, h: 150 }, [0, 3.5], [0, 1, 2, 3], 'Drag coefficient (force along the wind)');
  ctx.fillStyle = REF; ctx.fillRect(ax.X(180) - 4, ax.Y(1.2) - 4, 8, 8);
  legend(642, 490, [{ c: HEEL, t: 'lattice, 6 by 12 panels (bar = raw force swing)', w: 2.5 }, { c: '#b9a0d6', t: '4 by 8' }, { c: '#7fb0e0', t: '8 by 16' }, { c: DRIVE, t: 'fallback: strip separation state', dash: [5, 3] }, { c: REF, t: 'ORC mainsail table; square: flat plate 1.2', dot: 1, hollow: 1 }]);
} };

SCENES.res = { n: () => DATA.res.betas.length * 30, draw(i) {
  const D = DATA.res, kb = Math.floor(i / 30), beta = D.betas[kb];
  header('Same sail, same wind, three panel counts, past stall', 'Watch: the three should agree and sit near 1.2 to 1.4. The force is 2 to 3.4, and falls as panels are added.');
  ['4x8', '6x12', '8x16'].forEach((res, j) => {
    const c = D.cases[res][kb], fr = c.frames[i % 30], x0 = 10 + j * 295, vo = { kind: 'ob', cx: x0 + 185, cy: 335, sc: 15 };
    frameBox(x0, 56, 290, 494, res.replace('x', ' BY ') + ' PANELS');
    clipBox(x0 + 1, 76, 288, 300, () => { hull(vo); drawWake(vo, fr.wk); drawSail(vo, c.geom, fr.dp, Q); });
    text('wind ' + beta + ' deg off the bow, boom out ' + c.boom + ' deg', x0 + 8, 92, { sz: 12, b: 1 });
    const ser = c.ser.map((s, t) => [t * 0.05, Math.hypot(s[0], s[1])]);
    const ax = plot({ x: x0 + 34, y: 400, w: 240, h: 100 }, { xr: [0, 8], yr: [0, 6], xt: [0, 2, 4, 6, 8], yt: [0, 2, 4, 6], xl: 'time, seconds', yl: 'Total force coefficient' });
    ctx.fillStyle = 'rgba(31,138,76,0.25)'; ctx.fillRect(ax.X(0), ax.Y(1.4), 240, ax.Y(1.2) - ax.Y(1.4)); text('published: about 1.3', ax.X(8) - 4, ax.Y(1.4) - 4, { sz: 10.5, c: DRIVE, al: 'right' }); line(ax, ser.slice(2, 130 + (i % 30) + 1), HEEL, 1.5); const m = Math.hypot(c.CX, c.CY);
    line(ax, [[4, m], [8, m]], INK, 1.5, [4, 3]);
    text('mean ' + m.toFixed(2) + '     unsteadiness ' + (100 * c.noise).toFixed(0) + '%', x0 + 34, 545, { sz: 12, b: 1 });
  });
  legend(600, 96, []);
} };

function lerpA(a, b, t) { const o = new Array(a.length); for (let k = 0; k < a.length; k++) o[k] = a[k] + (b[k] - a[k]) * t; return o; }
SCENES.twist = { n: () => 4 * 40 + 30, draw(i) {
  const D = DATA.twist, R = D.rows, u = Math.min(3.9999, i / 40), k = Math.floor(u), t = u - k, A = R[k], B = R[k + 1];
  const g = { Np: A.geom.Np, corners: lerpA(A.geom.corners, B.geom.corners, t) }, dp = lerpA(A.frame.dp, B.frame.dp, t);
  const L = (key) => A[key] + (B[key] - A[key]) * t, tw = L('tw');
  header('Main and jib close-hauled: easing the mainsheet to twist the main', 'Watch: as the head opens, the heeling force falls and its centre drops, while drive changes much less.');
  const vo = { kind: 'ob', cx: 150, cy: 475, sc: 24 }, va = { kind: 'aft', cx: 400, cy: 500, sc: 26 };
  frameBox(10, 56, 290, 494, 'FROM THE LEE QUARTER'); frameBox(305, 56, 250, 494, 'FROM ASTERN');
  clipBox(11, 76, 288, 473, () => { hull(vo); drawSail(vo, g, dp, Q); });
  clipBox(306, 76, 248, 473, () => { drawSail(va, g, dp, Q); const P = proj(va); const zce = L('zce'), CY = L('CY'), CX = L('CX');
    ctx.strokeStyle = MUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(310, 500); ctx.lineTo(550, 500); ctx.stroke(); text('water', 548, 514, { sz: 11, c: MUT, al: 'right' });
    const [x0, y0] = P(0, 0.4, zce); arrow(x0, y0, x0 + CY * 75, y0, HEEL, 4); ctx.beginPath(); ctx.arc(x0, y0, 5, 0, 7); ctx.fillStyle = INK; ctx.fill();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(318, y0); ctx.lineTo(x0, y0); ctx.stroke(); ctx.setLineDash([]);
    text('centre of effort', 318, y0 - 18, { sz: 11.5 }); text(zce.toFixed(2) + ' m above water', 318, y0 - 5, { sz: 11.5, b: 1 }); text('heeling force', x0 + 8, y0 + 16, { sz: 11.5, c: HEEL }); });
  text('main twist ' + tw.toFixed(0) + ' deg (foot to head)', 18, 92, { sz: 13, b: 1 }); text('wind 30 deg off the bow, jib unchanged', 18, 108, { sz: 12, c: MUT });
  colourKey(95, 536);
  const cur = R.filter(r => r.tw <= tw + 1e-9);
  const ax = plot({ x: 610, y: 82, w: 270, h: 170 }, { xr: [0, 30], yr: [0, 2], xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 0.5, 1, 1.5, 2], yl: 'Force coefficients (both sails)' });
  line(ax, cur.map(r => [r.tw, r.CY]).concat([[tw, L('CY')]]), HEEL, 2.5); line(ax, cur.map(r => [r.tw, r.CX]).concat([[tw, L('CX')]]), DRIVE, 2.5);
  dots(ax, [[4.5, 1.39], [24.9, 1.16]], HEEL, 4, true); dots(ax, [[4.5, 0.33], [15, 0.39], [24.9, 0.35]], DRIVE, 4, true);
  legend(612, 290, [{ c: HEEL, t: 'heeling (side) force, lattice', w: 2.5 }, { c: DRIVE, t: 'drive, lattice', w: 2.5 }, { c: HEEL, t: 'measured on Fujin: side force 1.39 to 1.16', dot: 1, hollow: 1 }, { c: DRIVE, t: 'measured: drive 0.33 to 0.39, peak near 15 deg', dot: 1, hollow: 1 }]);
  const ax2 = plot({ x: 610, y: 375, w: 270, h: 120 }, { xr: [0, 30], yr: [5, 8], xt: [0, 5, 10, 15, 20, 25, 30], yt: [5, 6, 7, 8], xl: 'mainsail twist, degrees', yl: 'Height of centre of effort, m above water' });
  line(ax2, cur.map(r => [r.tw, r.zce]).concat([[tw, L('zce')]]), INK, 2.5);
  text('measured drive at the two ends is approximate', 610, 540, { sz: 10.5, c: MUT }); text('(the paper gives the range and where the peak is)', 610, 553, { sz: 10.5, c: MUT });
} };

SCENES.slot = { n: () => 30 + 3 * 45 + 35, draw(i) {
  const D = DATA.slot, R = D.rows, js = R.filter(r => r.main && r.jibF && r.jib > 2); // jib 18,14,10,6
  let g, dp, Sm, mainF, jibF, label, alone = i < 30;
  if (alone) { const r = R[0]; g = r.geom; dp = r.frame.dp; Sm = r.Smain; mainF = r.main; jibF = null; label = 'main alone'; }
  else { const u = Math.min(2.9999, (i - 30) / 45), k = Math.floor(u), t = u - k, A = js[k], B = js[k + 1];
    g = { Np: A.geom.Np, corners: lerpA(A.geom.corners, B.geom.corners, t) }; dp = lerpA(A.frame.dp, B.frame.dp, t); Sm = lerpA(A.Smain, B.Smain, t); mainF = lerpA(A.main, B.main, t); jibF = lerpA(A.jibF, B.jibF, t);
    label = 'jib sheeted to ' + (A.jib + (B.jib - A.jib) * t).toFixed(0) + ' deg off the centreline'; }
  header('The slot: main alone, then a jib sheeted harder and harder', 'Watch the front of the main: the jib unloads it, and sheeted too far in it pushes the luff to windward (blue = backwinded).');
  const vt = { kind: 'top', cx: 95, cy: 330, sc: 46 }, vo = { kind: 'ob', cx: 425, cy: 475, sc: 24 };
  frameBox(10, 56, 290, 494, 'CUT AT ONE THIRD HEIGHT, FROM ABOVE'); frameBox(305, 56, 285, 494, 'FROM THE LEE QUARTER');
  clipBox(11, 76, 288, 473, () => { const P = proj(vt), Ns = 12, Nc = 6, j = 4;
    for (let s = 0; s * Nc * Ns < g.Np; s++) { for (let ii = 0; ii < Nc; ii++) { const p = s * Nc * Ns + ii * Ns + j, c = g.corners, a = P(c[12 * p], c[12 * p + 1], 0), b = P(c[12 * p + 9], c[12 * p + 10], 0);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L2 = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L2, ny = (b[0] - a[0]) / L2, v = dp[p] / Q;
        const sgn = nx > 0 ? 1 : -1; arrow(mx, my, mx + sgn * nx * v * 16, my + sgn * ny * v * 16, v >= 0 ? '#d2691e' : '#2b6cb0', 2.5); } }
    text('bow this way', 95, 116, { sz: 11, c: MUT, al: 'center' }); windArrow(vt, 30, 235, 150, 'apparent wind'); if (!alone) text('jib', 60, 215, { sz: 12, b: 1 }); text('main', 50, 400, { sz: 12, b: 1 }); text('arrows: pressure on each panel', 100, 520, { sz: 11, c: MUT }); text('orange to leeward, blue to windward', 100, 534, { sz: 11, c: MUT }); });
  clipBox(306, 76, 283, 473, () => { hull(vo); drawSail(vo, g, dp, Q); });
  text(label, 18, 92, { sz: 13, b: 1 }); colourKey(385, 536);
  // bars: main luff suction by height
  const bx = 690, by = 96, bh = 250; text('Suction round the main\'s luff, by height', 612, 76, { sz: 12, b: 1 });
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.stroke();
  for (let j = 0; j < 12; j++) { const y = by + bh - (j + 1) * bh / 12 + 2, w = Sm[j] * 160; ctx.fillStyle = Sm[j] >= 0 ? '#d2691e' : '#2b6cb0'; ctx.fillRect(Math.min(bx, bx + w), y, Math.abs(w), bh / 12 - 4); }
  text('head', 868, by + 12, { sz: 11, c: MUT }); text('foot', 868, by + bh - 4, { sz: 11, c: MUT }); text('backwinded', bx - 6, by + bh + 14, { sz: 11, c: '#2b6cb0', al: 'right' }); text('pulling to leeward', bx + 6, by + bh + 14, { sz: 11, c: '#d2691e' });
  const ja = D.rows[1].jibF; const bars = [['main drive', mainF[0], DRIVE, R[0].main[0]], ['main heeling force', mainF[1], HEEL, R[0].main[1]], ['jib drive', jibF ? jibF[0] : 0, DRIVE, ja[0]], ['jib heeling force', jibF ? jibF[1] : 0, HEEL, ja[1]]];
  text('Force coefficients (tick = that sail on its own)', 612, 392, { sz: 12, b: 1 });
  bars.forEach((b, k) => { const y = 405 + k * 34; text(b[0], 612, y + 14, { sz: 11.5 }); ctx.fillStyle = b[2]; ctx.fillRect(730, y + 2, b[1] * 100, 16); ctx.fillStyle = INK; ctx.fillRect(730 + b[3] * 100 - 1, y - 2, 2.5, 24); text(b[1].toFixed(2), 735 + Math.max(b[1], b[3]) * 100 + 4, y + 15, { sz: 11.5, b: 1 }); });
} };
