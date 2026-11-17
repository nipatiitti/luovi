// class_hboat.mjs: turns the class geometry of the owner's "H-boat Model" artifact (data/class/hboat.json, derived.json;
// copies, read as data) into this model's boat-data format -> data/hboat_class.json, which boats_def.mjs reads.
// Offline. The loft follows the artifact's own recipe (src/hboat/sections.ts, hull.ts): every printed cell of a station is a
// point of its section, a centripetal Catmull-Rom curve through them (mirror ghost at the keel), resampled by girth, and a
// monotone cubic in x between the printed stations. Flotation: the artifact's "sailing" condition (class-minimum boat 1450 kg,
// sails and gear 27 kg, crew 300 kg). Model frame: x aft from the forward end of that waterline, depths below that waterline.
import fs from 'fs';
const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const H = rd('./data/class/hboat.json'), D = rd('./data/class/derived.json'), O = H.hull.offsets, mm = (v) => v / 1000;
const cond = D.conditions.sailing, trim = cond.trimDeg * Math.PI / 180, yw = (x) => (cond.sinkage + Math.sin(trim) * x) / Math.cos(trim); // water surface in the body frame

// ---- station sections from the printed table
const WLk = O.columns[2], WLmm = O.waterlinesMm, Dg = O.diagonalsMm, Bk = O.columns[4], Bmm = O.buttocksMm;
function stationPts(r) {
  const [st, deck, wl, diag, butt, sheer, , keel] = r, keelY = mm(keel[0]), sZ = mm(deck), sY = mm(sheer), pts = [[0, keelY, 'k']];
  WLk.forEach((k, i) => { const v = wl[i]; if (v === null) return; const y = mm(WLmm[k]); if (y > sY + 1e-9 || y < keelY - 1e-9 || (v === 0 && Math.abs(y - keelY) < 0.002)) return; pts.push([mm(v), y, 'w']); });
  ['D1', 'D2', 'D3', 'D4'].forEach((k, i) => { const v = diag[i]; if (v === null) return; const d = Dg[k], dz = d.to[0] - d.from[0], dy = d.to[1] - d.from[1], L = Math.hypot(dz, dy); pts.push([mm(d.from[0] + dz * v / L), mm(d.from[1] + dy * v / L), 'd']); });
  Bk.forEach((k, i) => { const v = butt[i]; if (v === null) return; const z = mm(Bmm[k]); if (z > sZ + 1e-9) return; pts.push([z, mm(v), 'b']); });
  pts.push([sZ, sY, 's']); pts.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.003) { const m = b[2] === 's' ? b : a[2] === 'k' ? a : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]]; pts.splice(i - 1, 2, m); i--; } }
  return { st, x: (st - 5) * O.stationSpacingMm / 1000, keelY, pts: pts.map((p) => [p[0], p[1]]) };
}
function catmullRom(P, sub, ghost) { // centripetal
  const n = P.length, G = [ghost, ...P, [2 * P[n - 1][0] - P[n - 2][0], 2 * P[n - 1][1] - P[n - 2][1]]], out = [];
  for (let i = 1; i < G.length - 2; i++) {
    const p0 = G[i - 1], p1 = G[i], p2 = G[i + 1], p3 = G[i + 2], kn = (a, b) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t0 = 0, t1 = t0 + kn(p0, p1), t2 = t1 + kn(p1, p2), t3 = t2 + kn(p2, p3), L = (a, b, ta, tb, t) => [a[0] + (b[0] - a[0]) * (t - ta) / (tb - ta), a[1] + (b[1] - a[1]) * (t - ta) / (tb - ta)];
    for (let k = 0; k < sub; k++) { const t = t1 + (t2 - t1) * k / sub, A1 = L(p0, p1, t0, t1, t), A2 = L(p1, p2, t1, t2, t), A3 = L(p2, p3, t2, t3, t), B1 = L(A1, A2, t0, t2, t), B2 = L(A2, A3, t1, t3, t); out.push(L(B1, B2, t1, t2, t)); }
  }
  out.push(P[n - 1]); return out;
}
function resample(C, N) { const s = [0]; for (let i = 1; i < C.length; i++) s.push(s[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1])); const out = []; let j = 0;
  for (let k = 0; k < N; k++) { const t = s[s.length - 1] * k / (N - 1); while (j < s.length - 2 && s[j + 1] < t) j++; const f = (t - s[j]) / Math.max(1e-12, s[j + 1] - s[j]); out.push([C[j][0] + (C[j + 1][0] - C[j][0]) * f, C[j][1] + (C[j + 1][1] - C[j][1]) * f]); } return out; }
function pchip(xs, ys) { const n = xs.length, h = [], dl = [], m = new Array(n); for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); dl.push((ys[i + 1] - ys[i]) / h[i]); }
  m[0] = dl[0]; m[n - 1] = dl[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = dl[i - 1] * dl[i] <= 0 ? 0 : (3 * (h[i - 1] + h[i])) / ((2 * h[i] + h[i - 1]) / dl[i - 1] + (h[i] + 2 * h[i - 1]) / dl[i]);
  return (x) => { let i = 0; while (i < n - 2 && x > xs[i + 1]) i++; const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]; }; }
const NG = 97, ST = O.rows.map(stationPts), SEC = ST.map((s) => resample(catmullRom(s.pts, 24, [-s.pts[1][0], s.pts[1][1]]), NG)), XS = ST.map((s) => s.x);
const zf = [], yf = []; for (let i = 0; i < NG; i++) { zf.push(pchip(XS, SEC.map((s) => s[i][0]))); yf.push(pchip(XS, SEC.map((s) => s[i][1]))); }
const half = (x) => zf.map((f, i) => [Math.max(0, f(x)), yf[i](x)]); // keel -> sheer, starboard
const keelY = (x) => yf[0](x);
/** Immersed half section at x: waterline half breadth, area (both sides), centreline depth, wetted girth (both sides). */
function immersedAt(x) {
  const P = half(x), w = yw(x), q = []; let girth = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i]; if (a[1] < w) q.push(a); const b = P[i + 1]; if (b && (a[1] < w) !== (b[1] < w)) { const f = (w - a[1]) / (b[1] - a[1]); q.push([a[0] + (b[0] - a[0]) * f, w]); } }
  if (q.length < 2) return { b: 0, S: 0, Tc: 0, girth: 0 };
  for (let i = 1; i < q.length; i++) girth += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
  const poly = [...q, [0, w]]; let S = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; S += a[0] * b[1] - b[0] * a[1]; }
  return { b: Math.max(...q.filter((p) => Math.abs(p[1] - w) < 1e-9).map((p) => p[0]), 0), S: Math.abs(S), Tc: w - P[0][1], girth: 2 * girth };
}
// ---- waterline ends (where the keel line crosses the water) and the station table
const root = (f, a, b) => { for (let i = 0; i < 60; i++) { const m = 0.5 * (a + b); if (f(a) * f(m) <= 0) b = m; else a = m; } return 0.5 * (a + b); };
const xF = root((x) => keelY(x) - yw(x), 2.2, 3.4), xA = root((x) => keelY(x) - yw(x), -3.9, -2.6), L = xF - xA;
const n = 129, dx = L / (n - 1), stations = [], fine = { vol: 0, wet: 0, Aw: 0, mx: 0, mAw: 0, Amax: 0, bmax: 0, Tmax: 0 };
for (let i = 0; i < n; i++) { const xb = xF - i * dx, s = immersedAt(xb); // ellipse of the real waterline half breadth and the real immersed area
  const ok = s.b > 1e-4 && s.S > 1e-6; stations.push([+(i * dx).toFixed(4), ok ? +s.b.toFixed(4) : 0, ok ? +(2 * s.S / (Math.PI * s.b)).toFixed(4) : 0, +Math.max(0, s.Tc).toFixed(4)]); }
{ const N = 2000, h = L / N; for (let i = 0; i < N; i++) { const xb = xF - (i + 0.5) * h, s = immersedAt(xb); fine.vol += s.S * h; fine.wet += s.girth * h; fine.Aw += 2 * s.b * h; fine.mx += s.S * h * (i + 0.5) * h; fine.mAw += 2 * s.b * h * (i + 0.5) * h; fine.Amax = Math.max(fine.Amax, s.S); fine.bmax = Math.max(fine.bmax, s.b); fine.Tmax = Math.max(fine.Tmax, s.Tc); } }
// ---- appendages as bottom profiles [x aft of the bow end of the waterline, depth below the water]
const A = H.appendages, toM = (p) => [+(xF - p[0]).toFixed(4), +(yw(p[0]) - p[1]).toFixed(4)];
const ke = A.keel, teMean = 0.5 * (ke.trailingEdge[1][0] + ke.trailingEdge[2][0]); // raked trailing edge -> upright at its mean position below the root
const keelBody = [[1.26, -0.446], [0.945, -0.546], ...ke.leadingEdge.filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]), [teMean, ke.tipY]];
const sk = A.skeg.profileBottom, ru = A.rudder.planform_xy_body, ruTe = 0.5 * (ru[0][0] + ru[ru.length - 1][0]);
const ruLe = ru.slice(1, -2).reverse(); // forward top corner, down the leading edge, round the tip corner
const blades = [
  { name: 'keel', profile: keelBody.map(toM), halfThick: 0.08, edgeRadius: 0.01 },
  { name: 'skeg', profile: [[teMean, sk[0][1]], ...sk].map(toM), halfThick: A.skeg.bottomRadius },
  { name: 'rudder', profile: [...ruLe, [ruTe, ru[0][1]]].map(toM), halfThick: 0.5 * (A.rudder.halfThickness.root + A.rudder.halfThickness.tip) },
];
blades[2].turnsFrom = blades[2].profile[0][0]; blades[2].turnsFully = blades[2].turnsFrom + 0.001;
// ---- rig: the format has an upright mast at mastX. Heights from the sheer at the mast (ORC's datum); mastX puts the centre of
// area of the format's sail plan at the fore-and-aft position of the centre of area of the real (raked, 4.8 deg) outlines.
const R = D.rig, cen = (o) => { let a = 0, cx = 0; for (let i = 0; i < o.length; i++) { const p = o[i], q = o[(i + 1) % o.length], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; } return [Math.abs(a / 2), cx / (3 * a)]; };
const [aM, xM] = cen(R.sails.main.outline), [aJ, xJ] = cen(R.sails.jib.outline);
const P = R.checks.P.model, E = R.checks.E.model, I = +R.checks.I.model.toFixed(3), J = R.checks.J.model, mainArea = 15.85, jibArea = 10.48; // areas: ORC certificate, as before
const heel = R.mastPoints.heel, band1 = R.mastPoints.band1, sheerAtMast = R.mastPoints.forestayTang[1] - R.checks.I.model, freeboard = sheerAtMast - yw(heel[0]);
const BAS = band1[1] - sheerAtMast, p = E * P / mainArea - 1, cf = 2 * jibArea / I;
const relMain = -(E / 2) * (p + 1) / (2 * p + 1), relJib = (2 / 3) * (J - cf / 2); // format's centres of area ahead of its mast
const xCEreal = (aM * xM + aJ * xJ) / (aM + aJ), mastBody = xCEreal - (mainArea * relMain + jibArea * relJib) / (mainArea + jibArea);
const S = D.mass.sailing, st = D.stability.gz;
const def = {
  L: +L.toFixed(3), loa: D.principal.loa, beam: D.principal.beamMax, bowOverhang: +(H.hull.stem.stemHead[0] - xF).toFixed(3),
  canoe: { stations: stations.map((s) => s.slice(0, 3)) }, blades,
  mass: +S.mass.toFixed(0), crewMass: 300, crewYMax: 1.09, GM: +cond.gmTransverse.toFixed(3), kYaw: +S.radiiOfGyration.yaw.toFixed(2), kRoll: +S.radiiOfGyration.roll.toFixed(2), xcg: +(xF - S.cg[0]).toFixed(3),
  hydro: { LWL: +L.toFixed(3), BWL: +(2 * fine.bmax).toFixed(3), Tc: +fine.Tmax.toFixed(3), volc: +fine.vol.toFixed(3), Aw: +fine.Aw.toFixed(3), Cp: +(fine.vol / (fine.Amax * L)).toFixed(3), Cm: +(fine.Amax / (2 * fine.bmax * fine.Tmax)).toFixed(3), LCBfpp: +(fine.mx / fine.vol).toFixed(3), LCFfpp: +(fine.mAw / fine.Aw).toFixed(3) },
  rig: { mastX: +(xF - mastBody).toFixed(3), freeboard: +freeboard.toFixed(3), P, E, BAS: +BAS.toFixed(3), I, J, mainArea, jibArea },
};
const check = { waterline: { xFwd: +xF.toFixed(3), xAft: +xA.toFixed(3), L: +L.toFixed(4), derived: cond.lwl }, bwl: { mine: +(2 * fine.bmax).toFixed(4), derived: cond.bwl },
  canoeVolume: { loft: +fine.vol.toFixed(4), derivedTotalLessAppendages: +(cond.volume - D.meshes.keel.volume - D.meshes.stub.volume - D.meshes.skeg.volume - D.meshes.rudder.volume).toFixed(4), derivedTotal: cond.volume },
  canoeWetted: { loft: +fine.wet.toFixed(3), derivedTotal: cond.wettedArea, derivedAppendageMeshes: +(D.meshes.keel.area + D.meshes.stub.area + D.meshes.skeg.area + D.meshes.rudder.area).toFixed(3) },
  realDepthVsEllipse: stations.filter((s, i) => i % 16 === 0).map((s) => ({ x: s[0], halfBeam: s[1], ellipseDepth: s[2], realCentrelineDepth: s[3] })),
  rig: { mastHeelBody: heel[0], mastBodyUsed: +mastBody.toFixed(3), sailCentreBody: +xCEreal.toFixed(3), mainCentre: +xM.toFixed(3), jibCentre: +xJ.toFixed(3), sheerAtMast: +sheerAtMast.toFixed(3), boomAboveWater: +(freeboard + BAS).toFixed(3) },
  gz: [10, 20, 30, 45].map((h) => { const g = st.find((q) => q.heelDeg === h); return { heel: h, gzWeighedBoat: g.gz, gmSin: +(D.conditions.classMinimum.gmTransverse * Math.sin(h * Math.PI / 180)).toFixed(4) }; }),
  realStations: stations.map((s) => s[3]) };
fs.writeFileSync(new URL('../out/hboat_class.json', import.meta.url), JSON.stringify({ def, check }));
const { realStations, ...show } = check; console.log(JSON.stringify(show, null, 1)); console.log(JSON.stringify({ ...def, canoe: '...' , blades: def.blades}, null, 0));
