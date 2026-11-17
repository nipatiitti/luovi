// draw_r2.js: one GIF frame for the r2-broach scenarios: per case a top view, a view from astern, the turning-moment bars and time traces.
(function (root) {
  const RAD = Math.PI / 180, COL = { ink: '#1b2430', water: '#dcebf5', hull: '#f4f1ea', line: '#39424e', heel: '#1f6fb5', helm: '#c62828', off: '#2e7d32', air: '#ff9800', grey: '#8a94a0', wind: '#5e35b1' };
  function frame(g, W, H, S, k) {
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, W, H); g.fillStyle = COL.ink; g.textBaseline = 'alphabetic';
    g.font = 'bold 17px sans-serif'; g.textAlign = 'center'; g.fillText(S.title, W / 2, 22);
    g.font = '13px sans-serif'; g.fillText(S.caption, W / 2, 41);
    const cw = W / S.cells.length;
    S.cells.forEach((c, i) => cell(g, i * cw, 50, cw, H - 50, S, c, Math.min(k, c.frames.length - 1)));
    g.strokeStyle = '#c9c5bb'; g.lineWidth = 1; g.beginPath(); g.moveTo(cw, 52); g.lineTo(cw, H - 4); g.stroke();
  }
  function cell(g, x0, y0, w, h, S, c, k) {
    const f = c.frames[k], B = S.boat, side = 1;
    g.textAlign = 'left'; g.fillStyle = COL.ink; g.font = 'bold 15px sans-serif'; g.fillText(c.label, x0 + 10, y0 + 16);
    g.font = '13px sans-serif'; g.fillStyle = COL.wind; g.fillText(`t = ${f.t.toFixed(1)} s   wind ${f.wind} kn: ${f.note}`, x0 + 10, y0 + 33);
    topView(g, x0 + 8, y0 + 40, w - 16, 236, S, c, k);
    sternView(g, x0 + 8, y0 + 282, 196, 206, S, f);
    bars(g, x0 + 210, y0 + 282, w - 218, 206, f);
    traces(g, x0 + 8, y0 + 494, w - 16, h - 500, S, c, k);
  }
  function topView(g, x, y, w, h, S, c, k) {
    const f = c.frames[k], B = S.boat, sc = 11.5, cx = x + w / 2, cy = y + h / 2;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = COL.water; g.fillRect(x, y, w, h);
    const P = (E, N) => [cx + (E - f.X) * sc, cy - (N - f.Y) * sc];
    g.fillStyle = '#b9d3e6'; const sp = 5, e0 = Math.floor((f.X - w / sc / 2) / sp) * sp, n0 = Math.floor((f.Y - h / sc / 2) / sp) * sp;
    for (let e = e0; e < f.X + w / sc / 2 + sp; e += sp) for (let n = n0; n < f.Y + h / sc / 2 + sp; n += sp) { const p = P(e, n); g.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
    g.strokeStyle = '#7fa6c4'; g.lineWidth = 2; g.beginPath(); for (let j = 0; j <= k; j++) { const p = P(c.frames[j].X, c.frames[j].Y); j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
    // the course she was asked to hold at the start (dashed)
    const body = (xf, ys) => P(f.X + xf * Math.sin(f.psi) + ys * Math.cos(f.psi), f.Y + xf * Math.cos(f.psi) - ys * Math.sin(f.psi));
    const fwd = (xs) => B.xcg - xs; // station (aft from the bow end of the waterline) -> metres forward of the centre of gravity
    const bow = fwd(-B.bowOverhang), stern = fwd(B.loa - B.bowOverhang), L = bow - stern, hw = (q) => 0.5 * B.beam * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + 0.86 * q)), 0.75);
    g.beginPath(); for (let j = 0; j <= 30; j++) { const q = j / 30, p = body(bow - q * L, hw(q)); j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    for (let j = 30; j >= 0; j--) { const q = j / 30, p = body(bow - q * L, -hw(q)); g.lineTo(p[0], p[1]); } g.closePath(); g.fillStyle = COL.hull; g.fill(); g.strokeStyle = COL.line; g.lineWidth = 1.5; g.stroke();
    const mast = fwd(B.mastX), lean = -Math.sin(f.phi) * 0; // sails drawn on the centreline
    const ln = (a, b, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const bm = f.boom * RAD, jb = f.jib * RAD;
    ln(body(mast, 0), body(mast - B.E * Math.cos(bm), B.E * Math.sin(bm)), '#444', 3);
    ln(body(mast + B.J, 0), body(mast + B.J - 2.9 * Math.cos(jb), 2.9 * Math.sin(jb)), '#777', 2.5);
    const rs = fwd(B.rudderX) - 0.1, d = f.delta; ln(body(rs, 0), body(rs - 0.9 * Math.cos(d), 0.9 * Math.sin(d)), f.grip < 0.6 ? COL.air : COL.helm, 4);
    // wind arrow (from north)
    g.fillStyle = COL.wind; g.strokeStyle = COL.wind; g.lineWidth = 3; const ax = x + 26, ay = y + 14, al = 16 + f.wind * 1.4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay + al); g.stroke(); g.beginPath(); g.moveTo(ax - 6, ay + al - 2); g.lineTo(ax + 6, ay + al - 2); g.lineTo(ax, ay + al + 9); g.fill();
    g.font = '12px sans-serif'; g.textAlign = 'left'; g.fillText('wind', ax + 10, ay + 12);
    g.fillStyle = COL.ink; g.textAlign = 'right'; g.font = 'bold 14px sans-serif'; g.fillText(`${f.kn.toFixed(1)} kn`, x + w - 8, y + 18);
    g.font = '12px sans-serif'; g.fillText('from above (dots 5 m apart, fixed in the water)', x + w - 8, y + h - 8);
    if (f.off !== undefined) { g.textAlign = 'left'; g.font = 'bold 13px sans-serif'; const lost = f.helm >= S.maxHelm - 0.5 && f.grip < 0.8; g.fillStyle = lost ? COL.helm : COL.ink; g.textAlign = 'center'; g.fillText(lost ? 'RUDDER HARD OVER, NOT HOLDING' : '', x + w / 2, y + 18); }
    g.restore(); g.strokeStyle = '#9fb6c6'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
  }
  function sternView(g, x, y, w, h, S, f) {
    const B = S.boat, sc = 62, cx = x + w / 2, wl = y + 92, phi = f.phi, cs = Math.cos(phi), sn = Math.sin(phi);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = '#fff'; g.fillRect(x, y, w, wl - y); g.fillStyle = COL.water; g.fillRect(x, wl, w, y + h - wl);
    const P = (ys, zeta) => [cx + (ys * cs + zeta * sn) * sc, wl - (zeta * cs - ys * sn + f.rise) * sc];
    const flare = (B.beam / 2) / B.halfBeamMax;
    const sec = (b, Tc, col, lw, fill) => { g.beginPath(); for (let j = 0; j <= 24; j++) { const t = j / 24 * Math.PI, p = P(-b * Math.cos(t), -Tc * Math.sin(t)); j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } let p = P(b * flare, B.freeboard); g.lineTo(p[0], p[1]); p = P(-b * flare, B.freeboard); g.lineTo(p[0], p[1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = col; g.lineWidth = lw; g.stroke(); };
    sec(B.halfBeamMax, B.canoeDepthMax, '#9aa3ad', 1.2, 'rgba(244,241,234,0.9)');           // widest section
    const ln = (a, b, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'butt'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    ln(P(0, -B.canoeDepthMax), P(0, -B.keelDepth), '#d3ccbd', 9);                              // keel (behind)
    ln(P(0, B.freeboard), P(0, B.freeboard + 3.2), '#888', 3);                                 // mast stump
    sec(B.rudHalfBeam, B.rudCanoe, COL.line, 1.6, 'rgba(230,225,214,0.95)');                   // section at the rudder
    // rudder blade along the centreplane: dry part, aired part, gripping part
    const root = B.rudCanoe, tip = B.rudderDepthUpright, wetFrom = Math.max(root, f.rise / Math.max(0.2, cs)); // where the blade enters the water
    const airedTo = wetFrom + f.air * (tip - wetFrom);
    if (wetFrom > root) ln(P(0, -root), P(0, -wetFrom), '#444', 6);
    ln(P(0, -wetFrom), P(0, -airedTo), COL.air, 6); ln(P(0, -airedTo), P(0, -tip), f.grip < 0.6 ? '#e57373' : COL.helm, 6);
    g.strokeStyle = '#3a7ca5'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, wl); g.lineTo(x + w, wl); g.stroke();
    const tx = phi < 0 ? x + w - 6 : x + 6; g.fillStyle = COL.ink; g.font = '12px sans-serif'; g.textAlign = phi < 0 ? 'right' : 'left'; g.fillText('from astern', tx, y + 14);
    g.font = 'bold 14px sans-serif'; g.fillStyle = COL.heel; g.fillText(`heel ${f.heel.toFixed(0)}°`, tx, y + 31); g.textAlign = 'left';
    g.font = '12px sans-serif'; g.fillStyle = COL.ink; g.fillText(`rudder tip ${f.tip.toFixed(2)} m deep`, x + 6, y + h - 36);
    g.fillStyle = COL.helm; g.fillRect(x + 6, y + h - 28, 10, 8); g.fillStyle = COL.ink; g.fillText('gripping', x + 20, y + h - 20);
    g.fillStyle = COL.air; g.fillRect(x + 80, y + h - 28, 10, 8); g.fillStyle = COL.ink; g.fillText('sucking air', x + 94, y + h - 20);
    g.fillStyle = '#444'; g.fillRect(x + 6, y + h - 14, 10, 8); g.fillStyle = COL.ink; g.fillText('out of the water', x + 20, y + h - 6); g.fillStyle = '#d3ccbd'; g.fillRect(x + 116, y + h - 14, 10, 8); g.fillStyle = COL.ink; g.fillText('keel', x + 130, y + h - 6);
    g.restore(); g.strokeStyle = '#9fb6c6'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
  }
  function bars(g, x, y, w, h, f) {
    g.fillStyle = '#fff'; g.fillRect(x, y, w, h); g.strokeStyle = '#c9c5bb'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
    g.fillStyle = COL.ink; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('Turning moments (kN m)', x + w / 2, y + 14);
    g.font = '11px sans-serif'; g.textAlign = 'left'; g.fillText('← bears away', x + 4, y + 28); g.textAlign = 'right'; g.fillText('rounds up →', x + w - 4, y + 28);
    const mid = x + w / 2, sc = (w / 2 - 6) / 9000, rows = [['sails: drive × leeward lever', f.nLever, '#7e57c2'], ['heeled hull and keel', f.nHull, '#00897b'], ['sails: side force ahead of keel', f.nSide, '#9e9e9e'], ['RUDDER', f.nRud, COL.helm]];
    rows.forEach((r, i) => { const yy = y + 36 + i * 27; g.fillStyle = r[2]; const L = Math.max(-w / 2 + 4, Math.min(w / 2 - 4, r[1] * sc)); g.fillRect(Math.min(mid, mid + L), yy + 12, Math.abs(L), 10);
      g.fillStyle = COL.ink; g.font = '11px sans-serif'; g.textAlign = 'left'; g.fillText(r[0], x + 5, yy + 9); g.textAlign = 'right'; g.fillText((r[1] / 1000).toFixed(1), x + w - 5, yy + 9); });
    g.strokeStyle = COL.ink; g.beginPath(); g.moveTo(mid, y + 34); g.lineTo(mid, y + 142); g.stroke();
    g.textAlign = 'left'; g.font = 'bold 13px sans-serif'; g.fillStyle = COL.helm; g.fillText(`rudder ${f.helm.toFixed(0)}° (weather helm)`, x + 6, y + 160);
    g.font = '12px sans-serif'; g.fillStyle = COL.ink; g.fillText(`rudder load ${f.load} N`, x + 6, y + 176);
    g.fillText(`grip ${(100 * f.grip).toFixed(0)}%`, x + 6, y + 192); g.fillStyle = f.air > 0.5 ? '#e65100' : COL.ink; g.fillText(`span drawn down / aired ${(100 * f.air).toFixed(0)}%`, x + 70, y + 192);
  }
  function traces(g, x, y, w, h, S, c, k) {
    const T = c.frames[c.frames.length - 1].t, px = x + 34, pw = w - 44, py = y + 8, ph = h - 30, lo = -10, hi = 75;
    g.fillStyle = '#fff'; g.fillRect(px, py, pw, ph); g.strokeStyle = '#c9c5bb'; g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    const X = (t) => px + pw * t / T, Y = (v) => py + ph * (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo));
    g.font = '11px sans-serif'; g.fillStyle = COL.ink; g.textAlign = 'right';
    for (const v of [0, 20, 40, 60]) { g.fillText(v + '°', px - 4, Y(v) + 4); g.strokeStyle = '#ece8df'; g.beginPath(); g.moveTo(px, Y(v)); g.lineTo(px + pw, Y(v)); g.stroke(); }
    g.textAlign = 'center'; for (let t = 0; t <= T; t += 5) g.fillText(t + ' s', X(t), py + ph + 13);
    g.strokeStyle = COL.helm; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(px, Y(S.maxHelm)); g.lineTo(px + pw, Y(S.maxHelm)); g.stroke(); g.setLineDash([]);
    g.textAlign = 'right'; g.fillStyle = COL.helm; g.fillText('rudder hard over', px + pw - 4, Y(S.maxHelm) - 3);
    const line = (key, col, dash) => { g.strokeStyle = col; g.lineWidth = 2.2; g.setLineDash(dash || []); g.beginPath(); for (let j = 0; j <= k; j++) { const p = c.frames[j]; j ? g.lineTo(X(p.t), Y(p[key])) : g.moveTo(X(p.t), Y(p[key])); } g.stroke(); g.setLineDash([]); };
    line('heel', COL.heel); line('helm', COL.helm); line('off', COL.off, [5, 3]);
    g.textAlign = 'left'; g.font = 'bold 12px sans-serif'; let lx = px + 6; for (const [t, col] of [['heel', COL.heel], ['rudder angle', COL.helm], [S.offLabel || 'luffed off the course asked (dashed)', COL.off]]) { g.fillStyle = col; g.fillText(t, lx, py + 13); lx += g.measureText(t).width + 12; }
  }
  root.R2Draw = { frame };
})(typeof self !== 'undefined' ? self : this);
