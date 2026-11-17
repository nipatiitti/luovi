// draw.js: the one drawing used by both the GIFs and the steerable page. Canvas 2D, no dependencies.
// A "snap" is Boat.snapshot() (model.js); a "track" is an array of [X, Y, sternX, sternY] in world metres.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SailDraw = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const RAD = Math.PI / 180;
  const LIGHT = { bg: '#f4f6f8', panel: '#ffffff', ink: '#16212b', dim: '#5d6b78', grid: '#c9d3dc', hull: '#e9e2d0', hullEdge: '#39424b', sail: '#1b4f8a', jib: '#2a7d6f',
    track: '#6a7f92', track2: '#b3bfca', sailF: '#c2410c', keelF: '#1d4ed8', rudF: '#7e22ce', wind: '#0f766e', ok: '#16a34a', warn: '#d97706', bad: '#dc2626', water: '#dfeaf2', strip: '#fff4d6', stripInk: '#6b4e00', crew: '#b91c1c', air: '#f59e0b', dry: '#8a94a0' };
  const DARK = { bg: '#10161c', panel: '#18212a', ink: '#e6edf3', dim: '#9aa8b5', grid: '#33414e', hull: '#57534a', hullEdge: '#d6dde3', sail: '#7fb3ee', jib: '#6fd0bf',
    track: '#8fa6ba', track2: '#465564', sailF: '#fb923c', keelF: '#7aa2ff', rudF: '#c79bff', wind: '#5eead4', ok: '#4ade80', warn: '#fbbf24', bad: '#f87171', water: '#15222d', strip: '#3a2f10', stripInk: '#f5d98a', crew: '#fca5a5', air: '#fbbf24', dry: '#7b8794' };

  function arrow(ctx, x0, y0, x1, y1, color, dashed, w) {
    const len = Math.hypot(x1 - x0, y1 - y0); if (len < 2) return;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len, h = Math.min(9, len * 0.5);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w || 2.5; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * h * 0.8, y1 - uy * h * 0.8); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5); ctx.lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const light = (c, f) => (f > 0.8 ? c.ok : f > 0.4 ? c.warn : c.bad);

  /** View from above. rect {x,y,w,h}; o: { scale px/m, colors, forceScale px/N, windDir rad, wind m/s } */
  function topView(ctx, rect, B, s, track, o) {
    const c = o.colors, sc = o.scale, cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    ctx.fillStyle = c.water; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const wx = (X) => cx + (X - s.X) * sc, wy = (Y) => cy - (Y - s.Y) * sc;
    // water marks every 5 m so that the motion over the water shows
    ctx.fillStyle = c.grid; const g = 5, hw = rect.w / 2 / sc, hh = rect.h / 2 / sc;
    for (let X = Math.floor((s.X - hw) / g) * g; X <= s.X + hw; X += g) for (let Y = Math.floor((s.Y - hh) / g) * g; Y <= s.Y + hh; Y += g) ctx.fillRect(wx(X) - 1.5, wy(Y) - 1.5, 3, 3);
    // wake: path of the middle of the boat, and of the stern
    if (track && track.length > 1) {
      for (const [k, col, lw] of [[2, c.track2, 1.5], [0, c.track, 2]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        for (let i = 0; i < track.length; i++) { const p = track[i]; if (i === 0) ctx.moveTo(wx(p[k]), wy(p[k + 1])); else ctx.lineTo(wx(p[k]), wy(p[k + 1])); }
        ctx.lineTo(k === 0 ? cx : wx(s.X - (B.loa - B.bowOverhang - B.xcg) * Math.sin(s.psi)), k === 0 ? cy : wy(s.Y - (B.loa - B.bowOverhang - B.xcg) * Math.cos(s.psi))); ctx.stroke();
      }
    }
    // boat, in body axes: forward is up on screen before rotating by the heading
    ctx.translate(cx, cy); ctx.rotate(s.psi);
    const P = (xf, y) => [y * sc, -xf * sc]; // xf forward of the centre of gravity, y to starboard
    const bow = B.xcg + B.bowOverhang, stern = -(B.loa - B.bowOverhang - B.xcg), hb = B.beam / 2;
    ctx.beginPath();
    let p = P(bow, 0); ctx.moveTo(p[0], p[1]);
    const xb = bow - 0.58 * B.loa;
    ctx.bezierCurveTo(...P(bow - 0.2 * B.loa, hb * 0.75), ...P(xb + 0.15 * B.loa, hb), ...P(xb, hb));
    ctx.bezierCurveTo(...P(xb - 0.2 * B.loa, hb), ...P(stern + 0.05 * B.loa, hb * 0.7), ...P(stern, hb * 0.45));
    p = P(stern, -hb * 0.45); ctx.lineTo(p[0], p[1]);
    ctx.bezierCurveTo(...P(stern + 0.05 * B.loa, -hb * 0.7), ...P(xb - 0.2 * B.loa, -hb), ...P(xb, -hb));
    ctx.bezierCurveTo(...P(xb + 0.15 * B.loa, -hb), ...P(bow - 0.2 * B.loa, -hb * 0.75), ...P(bow, 0));
    ctx.fillStyle = c.hull; ctx.fill(); ctx.strokeStyle = c.hullEdge; ctx.lineWidth = 1.5; ctx.stroke();
    // underwater blades (dim) and the turning part
    ctx.lineCap = 'round';
    for (const bl of B.blades) {
      const a = B.xcg - bl.leRoot, b = B.xcg - bl.teRoot;
      if (bl.turnsFrom === undefined) { ctx.strokeStyle = c.dim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...P(a, 0)); ctx.lineTo(...P(b, 0)); ctx.stroke(); }
      else {
        const piv = B.xcg - bl.turnsFrom, len = bl.teRoot - bl.turnsFrom;
        ctx.strokeStyle = c.dim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...P(a, 0)); ctx.lineTo(...P(piv, 0)); ctx.stroke();
        ctx.strokeStyle = c.rudF; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(...P(piv, 0)); ctx.lineTo(...P(piv - len * Math.cos(s.delta), len * Math.sin(s.delta))); ctx.stroke();
      }
    }
    // crew
    const crewX = -0.12 * B.loa; p = P(crewX, s.crew * B.crewYMax);
    ctx.fillStyle = c.crew; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(3, 0.28 * sc), 0, 7); ctx.fill();
    // sails: curved lines from the luff, belly to leeward
    const mastXf = B.xcg - B.rig.mastX;
    if (s.sailsUp !== 0) {
      const sailLine = (x0, len, angDeg, col, wdt) => {
        const a = angDeg * RAD, ex = x0 - len * Math.cos(a), ey = len * Math.sin(a);
        const lee = s.awaDeg >= 0 ? -1 : 1, belly = 0.1 * len;
        const mx = (x0 + ex) / 2 - Math.sin(a) * 0 , my = ey / 2;
        const nx = Math.sin(a) * lee * (ey * lee >= -1e-9 ? 1 : 1), ny = Math.cos(a) * lee;
        ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(...P(x0, 0));
        ctx.quadraticCurveTo(...P(mx + 2 * belly * nx * 0.5, my + 2 * belly * ny * 0.5), ...P(ex, ey)); ctx.stroke();
      };
      sailLine(mastXf, B.rig.E, s.boomDeg, c.sail, 3.5);
      sailLine(mastXf + B.rig.J, 2 * B.rig.jibArea / B.rig.I, s.jibDeg, c.jib, 3);
    }
    ctx.fillStyle = c.hullEdge; ctx.beginPath(); ctx.arc(...P(mastXf, 0), 2.5, 0, 7); ctx.fill();
    // forces, body axes. Sail arrows dashed (table), keel and rudder solid (model)
    const fs = o.forceScale;
    const ceX = mastXf - 0.3 * B.rig.E;
    if (s.sailsUp !== 0) {
      let q = P(ceX, 0); arrow(ctx, q[0], q[1], q[0], q[1] - s.sailX * fs, c.sailF, true);
      arrow(ctx, q[0], q[1], q[0] + s.sailY * fs, q[1], c.sailF, true);
    }
    let q = P(B.xcg - o.keelX, 0); arrow(ctx, q[0], q[1], q[0] + s.keelY * fs, q[1], c.keelF, false);
    q = P(B.xcg - o.rudderX, 0); arrow(ctx, q[0], q[1], q[0] + s.rudderY * fs, q[1] - (s.rudderX || 0) * fs, c.rudF, false);
    ctx.restore();
    // true wind arrow, top of the view
    if (o.wind > 0.05) {
      const a = o.windDir || 0, len = 14 + 2.2 * o.wind, x0 = rect.x + rect.w / 2 + Math.sin(a) * 0, y0 = rect.y + 8;
      ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
      arrow(ctx, x0 + Math.sin(a) * len * 0, y0, x0 - Math.sin(a) * len, y0 + Math.cos(a) * len, c.wind, false, 3);
      ctx.fillStyle = c.wind; ctx.font = `600 ${o.font}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${(o.wind / 0.5144).toFixed(0)} kn`, x0 + 8, y0 + 2); ctx.restore();
    }
  }

  /** View from astern: heel, sails, crew. */
  function sternView(ctx, rect, B, s, o) {
    const c = o.colors; ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    ctx.fillStyle = c.panel; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const H = B.rig.freeboard + B.rig.BAS + B.rig.P, D = B.T ? Math.max(...B.T) : 1.3;
    const sc = Math.min(rect.h / (H + D + 0.6) * (o.insetZoom || 1), rect.w / (B.beam * 2.2)), cx = rect.x + rect.w / 2, wl = rect.y + rect.h - (D + 0.3) * sc;
    ctx.fillStyle = c.water; ctx.fillRect(rect.x, wl, rect.w, rect.h);
    ctx.translate(cx, wl - (s.rise || 0) * sc); ctx.rotate(s.phi); // starboard is on the right when seen from astern; the heeled hull rises to keep its volume
    const hb = B.beam / 2, fb = B.rig.freeboard, cd = Math.max(...B.canoeDepth);
    ctx.beginPath(); ctx.moveTo(-hb * sc, -fb * sc); ctx.lineTo(hb * sc, -fb * sc);
    ctx.bezierCurveTo(hb * sc, 0, hb * 0.6 * sc, cd * 1.3 * sc, 0, cd * 1.3 * sc); ctx.bezierCurveTo(-hb * 0.6 * sc, cd * 1.3 * sc, -hb * sc, 0, -hb * sc, -fb * sc);
    ctx.fillStyle = c.hull; ctx.fill(); ctx.strokeStyle = c.hullEdge; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = c.hullEdge; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, cd * sc); ctx.lineTo(0, D * sc); ctx.stroke(); // keel
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -fb * sc); ctx.lineTo(0, -H * sc); ctx.stroke(); // mast
    if (s.sailsUp !== 0) {
      const zb = fb + B.rig.BAS, be = B.rig.E * Math.sin(s.boomDeg * RAD), tw = 1.6;
      ctx.fillStyle = c.sail; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(0, -zb * sc); ctx.lineTo(be * sc, -zb * sc); ctx.quadraticCurveTo(be * tw * 0.6 * sc, -(zb + 0.6 * B.rig.P) * sc, 0, -H * sc); ctx.closePath(); ctx.fill();
      const je = (2 * B.rig.jibArea / B.rig.I) * Math.sin(s.jibDeg * RAD);
      ctx.fillStyle = c.jib; ctx.beginPath(); ctx.moveTo(0, -fb * sc); ctx.lineTo(je * sc, -(fb + 0.3) * sc); ctx.quadraticCurveTo(je * 0.8 * sc, -(fb + 0.5 * B.rig.I) * sc, 0, -(fb + B.rig.I) * sc); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    // rudder blade (it hides the top of the keel from astern): out of the water, sucking air, in solid water
    let wetShare = null;
    if (o.rudderX !== undefined && B.T && s.rudderAir !== undefined) {
      const i = Math.max(0, Math.min(B.n - 1, Math.round(o.rudderX / B.dx))), root = B.canoeDepth[i], tip = B.T[i], cs = Math.max(0.2, Math.cos(s.phi));
      const wetFrom = Math.min(tip, Math.max(root, (s.rise || 0) / cs)), airedTo = wetFrom + Math.min(1, s.rudderAir) * (tip - wetFrom), lw = Math.max(4, 0.11 * sc);
      const seg = (a, b, col) => { if (b - a < 1e-3) return; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(0, a * sc); ctx.lineTo(0, b * sc); ctx.stroke(); };
      seg(root, wetFrom, c.dry); seg(wetFrom, airedTo, c.air); seg(airedTo, tip, s.rudderAttach < 0.4 ? c.bad : c.rudF);
      wetShare = tip > root ? (tip - airedTo) / (tip - root) : 1;
    }
    ctx.fillStyle = c.crew; ctx.beginPath(); ctx.arc(s.crew * B.crewYMax * sc, -(fb + 0.35) * sc, Math.max(3, 0.3 * sc), 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = c.dim; ctx.font = `${Math.round(o.font * 0.8)}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('from astern', rect.x + 4, rect.y + 3);
    if (wetShare !== null) { // gauge: how much of the rudder blade is in solid water
      const fs = Math.round(o.font * 0.8), gw = Math.max(6, Math.round(o.font * 0.5)), gh = Math.min(rect.h * 0.34, o.font * 3.4), gx = rect.x + 5, gy = rect.y + rect.h - gh - fs - 8, wet = Math.max(0, Math.min(1, wetShare));
      ctx.fillStyle = s.rudderAir > 0.5 ? c.bad : s.rudderAir > 0.15 ? c.air : c.dry; ctx.fillRect(gx, gy, gw, gh * (1 - wet));
      ctx.fillStyle = c.rudF; ctx.fillRect(gx, gy + gh * (1 - wet), gw, gh * wet); ctx.strokeStyle = c.hullEdge; ctx.lineWidth = 1; ctx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1);
      ctx.fillStyle = c.ink; ctx.font = `600 ${fs}px system-ui, sans-serif`; ctx.textBaseline = 'bottom'; const full = `rudder ${Math.round(100 * wet)}% in water`; ctx.fillText(ctx.measureText(full).width <= rect.w - 8 ? full : `${Math.round(100 * wet)}% wet`, gx, rect.y + rect.h - 3);
    }
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  }

  /** Stall lights: main, jib, rudder. */
  function lights(ctx, x, y, s, o) {
    const c = o.colors, r = o.font * 0.42; ctx.font = `600 ${Math.round(o.font * 0.85)}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const items = [['main', s.sailsUp === 0 ? null : s.fMain], ['jib', s.sailsUp === 0 ? null : s.fJib], ['rudder', s.rudderAttach]].concat(s.rudderAir === undefined ? [] : [['aired', s.rudderAir > 0.5 ? 0 : s.rudderAir > 0.15 ? 0.6 : null]]).map((q) => [o.shortLights ? q[0] === 'aired' ? 'Air' : q[0].slice(0, 1).toUpperCase() + q[0].slice(1, 3) : q[0], q[1]]);
    let xx = x;
    for (const [name, f] of items) {
      ctx.fillStyle = f === null ? c.grid : light(c, f); ctx.beginPath(); ctx.arc(xx + r, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = c.dim; ctx.fillText(name, xx + 2 * r + 3, y + 0.5); xx += 2 * r + 8 + ctx.measureText(name).width;
    }
  }

  /** Readouts as rows of label and value. extra: [[label, value], ...] */
  function readouts(ctx, x, y, w, s, o, extra) {
    const c = o.colors, f = o.font, rows = [['speed', `${s.speedKn.toFixed(1)} kn`], ['leeway', `${s.leewayDeg.toFixed(0)}°`], ['heel', `${Math.abs(s.heelDeg).toFixed(0)}°`],
      ['rudder', `${s.rudderDeg.toFixed(0)}°`], ['rudder load', `${Math.round(Math.hypot(s.rudderY, s.rudderX || 0) / 10) * 10} N`]].concat(extra || []);
    ctx.textBaseline = 'top';
    rows.forEach((r, i) => {
      ctx.font = `${f}px system-ui, sans-serif`; ctx.fillStyle = c.dim; ctx.textAlign = 'left'; ctx.fillText(r[0], x, y + i * f * 1.28);
      ctx.font = `700 ${f}px system-ui, sans-serif`; ctx.fillStyle = c.ink; ctx.textAlign = 'right'; ctx.fillText(r[1], x + w, y + i * f * 1.28);
    });
    return rows.length * f * 1.28;
  }

  /** One cell of a GIF: title, view from above, inset from astern, lights, readouts. */
  function cell(ctx, rect, B, s, track, o) {
    const c = o.colors, f = o.font, pad = 6;
    ctx.fillStyle = c.panel; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    ctx.fillStyle = c.ink; ctx.font = `700 ${f}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(o.title || '', rect.x + pad, rect.y + pad);
    if (s.note) { ctx.fillStyle = c.sailF; ctx.textAlign = 'right'; ctx.font = `600 ${Math.round(f * 0.9)}px system-ui, sans-serif`; ctx.fillText(s.note, rect.x + rect.w - pad, rect.y + pad + 1); }
    const top = rect.y + pad + f * 1.35, availH = rect.h - (top - rect.y) - pad;
    if (o.stack) { // view from above across the top; inset and readouts below it
      const nrows = 5 + (o.extra ? o.extra(s).length : 0), readH = f * 1.5 + nrows * f * 1.28, viewH = availH - readH - pad, iw = Math.round((rect.w - 3 * pad) * 0.32);
      topView(ctx, { x: rect.x + pad, y: top, w: rect.w - 2 * pad, h: viewH }, B, s, track, o);
      const y2 = top + viewH + pad;
      sternView(ctx, { x: rect.x + pad, y: y2, w: iw, h: readH }, B, s, o);
      const sx = rect.x + 2 * pad + iw, sw = rect.w - 3 * pad - iw;
      lights(ctx, sx, y2 + f * 0.6, s, o);
      readouts(ctx, sx, y2 + f * 1.5, sw, s, o, o.extra ? o.extra(s) : null);
      return;
    }
    const sideW = Math.round(rect.w * (o.sideFrac || 0.42)), viewW = rect.w - sideW - pad * 2, viewH = availH;
    topView(ctx, { x: rect.x + pad, y: top, w: viewW, h: viewH }, B, s, track, o);
    const sx = rect.x + pad + viewW + pad, sw = sideW - pad;
    const nrows = 5 + (o.extra ? o.extra(s).length : 0), insetH = Math.max(40, viewH - f * 1.6 - nrows * f * 1.28);
    sternView(ctx, { x: sx, y: top, w: sw, h: insetH }, B, s, o);
    lights(ctx, sx, top + insetH + f * 0.75, s, o);
    readouts(ctx, sx, top + insetH + f * 1.5, sw, s, o, o.extra ? o.extra(s) : null);
  }

  /** The placeholder strip. Returns its height. */
  function strip(ctx, x, y, w, lines, o) {
    const c = o.colors, f = o.font; ctx.font = `${f}px system-ui, sans-serif`;
    const text = (typeof scen !== 'undefined' && scen && scen.caption ? 'WATCH FOR: ' : 'STAND-INS, not the model: ') + lines.join('  ·  ');
    const words = text.split(' '), rows = []; let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w - 16 && cur) { rows.push(cur); cur = wd; } else cur = t; }
    rows.push(cur);
    const h = rows.length * f * 1.3 + 10;
    ctx.fillStyle = c.strip; ctx.fillRect(x, y, w, h); ctx.fillStyle = c.stripInk; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    rows.forEach((r, i) => ctx.fillText(r, x + 8, y + 5 + i * f * 1.3));
    return h;
  }

  /** A whole GIF frame: header, grid of cells, legend, strip. scen: see scenarios.mjs. */
  function gifFrame(ctx, W, H, scen, k, hulls, meta) {
    const c = LIGHT, f = scen.font || 17;
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.ink; ctx.font = `700 ${f + 3}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(scen.title, 10, 8);
    ctx.font = `${f}px system-ui, sans-serif`; ctx.fillStyle = c.dim; ctx.textAlign = 'right'; ctx.fillText(`t = ${(k / scen.fps * (scen.speedup || 1)).toFixed(1)} s${scen.speedup && scen.speedup !== 1 ? ' (' + scen.speedup + 'x)' : ''}`, W - 10, 10);
    const stripLines = scen.strip; ctx.font = `${f - 2}px system-ui, sans-serif`;
    const legendH = f * 1.5;
    // measure strip height first
    const tmpH = (function () { const text = (typeof scen !== 'undefined' && scen && scen.caption ? 'WATCH FOR: ' : 'STAND-INS, not the model: ') + stripLines.join('  ·  '); const words = text.split(' '); let rows = 1, cur = ''; for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > W - 16 && cur) { rows++; cur = wd; } else cur = t; } return rows * (f - 2) * 1.3 + 10; })();
    const top = f + 20, gridH = H - top - tmpH - legendH - 4, cw = W / scen.cols, chh = gridH / scen.rows;
    scen.cells.forEach((cellDef, i) => {
      const col = i % scen.cols, row = Math.floor(i / scen.cols), B = hulls[cellDef.boat], fr = cellDef.frames[Math.min(k, cellDef.frames.length - 1)];
      const track = cellDef.track.slice(0, Math.min(k, cellDef.frames.length - 1) + 1);
      cell(ctx, { x: col * cw + 3, y: top + row * chh + 3, w: cw - 6, h: chh - 6 }, B, fr, track,
        { colors: c, font: f, scale: scen.scale || 9, forceScale: scen.forceScale || 0.03, title: cellDef.title, wind: fr.wind || 0, windDir: 0, insetZoom: scen.insetZoom, keelX: meta[cellDef.boat].keelX, rudderX: meta[cellDef.boat].rudderX, sideFrac: scen.sideFrac, stack: scen.stack, shortLights: scen.cols > 2, extra: scen.extraKeys ? (s) => scen.extraKeys.map(([lab, key, dig, unit]) => [lab, `${(+s[key]).toFixed(dig)}${unit}`]) : null });
    });
    // legend
    const ly = top + gridH + 2; ctx.font = `${f - 2}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; let lx = 10;
    for (const [col, dash, name] of [[c.sailF, true, 'sail drive and heeling force (table)'], [c.keelF, false, 'keel and hull'], [c.rudF, false, 'rudder'], [c.track, false, 'wake: middle of boat'], [c.track2, false, 'stern']]) {
      arrow(ctx, lx, ly + legendH / 2, lx + 26, ly + legendH / 2, col, dash, 2.5); ctx.fillStyle = c.dim; ctx.fillText(name, lx + 31, ly + legendH / 2 + 1); lx += 31 + ctx.measureText(name).width + 14;
    }
    strip(ctx, 0, H - tmpH, W, stripLines, { colors: c, font: f - 2 });
  }

  return { LIGHT, DARK, arrow, topView, sternView, lights, readouts, cell, strip, gifFrame };
});
