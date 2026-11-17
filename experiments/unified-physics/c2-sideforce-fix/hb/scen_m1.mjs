// scen_m1.mjs: the whole test list for one copy of the model. node scen_m1.mjs <tag> ; R1=0 and/or R2=0 switch a change off.
// Definitions are the originals': hard over as scen_rudder.mjs, tack as scen_all.mjs, hands-off as r1 t_track.mjs,
// steady helm as r2 diag.mjs, puffs and bearing away as r2 scen_r2.mjs (stand-in helmsman, 35 degree limit).
import fs from 'fs'; import { SM, HULLS, makeBoat, run, KN, RAD, helmTo } from './lib.mjs';
const tag = process.argv[2] || 'combined', r = (v, d = 1) => +(+v).toFixed(d), hdg = (b) => SM.wrap(b.psi) / RAD, N = { flags: { R1: SM.C.R1, R2: SM.C.R2 } };
const settle = (key, course = -45, w = 12, main = 8, jib = 12, maxHelm = 30) => { const b = makeBoat(key, { psiDeg: course, u: 2.5 }); run(b, 50, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, maxHelm), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 })); b.t = 0; b.X = 0; b.Y = 0; return b; };
const guard = (f) => { try { return f(); } catch (e) { return { blewUp: String(e.message) }; } };

// 1. hard over, coasting, sails down
N.hardOver = {};
for (const key of ['hboat', 'ifboat']) for (const kn of [5, 1]) for (const ang of [30, 45, 60]) N.hardOver[`${key} ${kn}kn ${ang}`] = guard(() => {
  const b = makeBoat(key, { psiDeg: 0, u: kn * KN }); run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.t = 0; b.u = kn * KN;
  const st = { peakRate: 0, minAtt: 1, peakLoad: 0, peakAir: 0 }, sp = {}, hd = {};
  run(b, 14, (bb, t) => ({ tillerDeg: t < 1 ? 0 : ang, sails: false }), () => ({ wind: 0 }), (bb) => { const o = bb.out, tt = bb.t - 1; st.peakRate = Math.max(st.peakRate, bb.r / RAD); st.minAtt = Math.min(st.minAtt, o.rudderAttach); st.peakLoad = Math.max(st.peakLoad, Math.hypot(o.rudderY, o.rudderX)); st.peakAir = Math.max(st.peakAir, o.rudderAir || 0);
    for (const q of [4, 8]) if (Math.abs(tt - q) < 0.026) { sp[q] = bb.speed() / KN; hd[q] = bb.psi / RAD; } });
  return { peakRate: r(st.peakRate), hdg4: r(hd[4], 0), hdg8: r(hd[8], 0), lost4pct: r(100 * (1 - sp[4] / kn), 0), minAttach: r(st.minAtt, 2), peakLoadN: Math.round(st.peakLoad), peakAir: r(st.peakAir, 2) };
});

// 2. tack, starboard to port, 12 knots
N.tack = {};
for (const key of ['hboat', 'ifboat']) for (const helm of [20, 35]) N.tack[`${key} ${helm}`] = guard(() => {
  const b = settle(key), U0 = b.speed(), vmg0 = b.u * Math.cos(b.psi) - b.v * Math.sin(b.psi), lead = 2, total = 40; let phase = 0, tHead = null, tNew = null, minSp = 1e9, pkHeel = 0;
  run(b, total, (bb, t) => { const h = hdg(bb); if (t < lead) return { tillerDeg: helmTo(bb, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }; if (phase === 0 && h > 20) phase = 1; const through = h > 0;
    return { tillerDeg: phase === 0 ? helm : helmTo(bb, 45 * RAD), mainSheet: 8, jibSheet: 12, jibSide: through ? -1 : 1, crew: through ? -1 : 1 }; }, () => ({ wind: 12 * KN, windDir: 0 }),
  (bb) => { const t = bb.t - lead, h = hdg(bb); if (t > 0) { if (tHead === null && h >= 0) tHead = t; if (tNew === null && h >= 42) tNew = t; minSp = Math.min(minSp, bb.speed()); } });
  return { headToWindS: r(tHead), newCourseS: r(tNew), speedLostPct: r(100 * (1 - minSp / U0), 0), lostToWindwardM: r(vmg0 * (total - lead) - (b.Y - vmg0 * lead)) };
});

// 3. hands off, close-hauled 12 knots, 15 s: tiller centred, and let go (a free blade needs R1; otherwise it is centred too)
N.handsOff = {};
for (const key of ['hboat', 'ifboat']) for (const mode of ['centred', 'let go']) N.handsOff[`${key} ${mode}`] = guard(() => {
  const b = settle(key), p0 = b.psi, d0 = b.delta / RAD; run(b, 15, () => ({ tillerDeg: 0, tillerFree: mode === 'let go', mainSheet: 8, jibSheet: 12, crew: 1 }), () => ({ wind: 12 * KN, windDir: 0 }));
  return { steadyRudder: r(d0, 2), offAfter15s: r((b.psi - p0) / RAD), sense: (b.psi - p0) > 0 ? 'luffs' : 'bears away', rudderEnds: r(b.delta / RAD) }; });

// 4. steady close-hauled (and beam reach) helm and heel against wind; + = weather helm
N.steady = {};
for (const key of ['hboat', 'ifboat']) for (const [nm, course, main, jib] of [['close-hauled', -45, 8, 12], ['beam reach', -90, 30, 28]]) for (const w of [8, 12, 16, 20, 24]) N.steady[`${key} ${nm} ${w}`] = guard(() => {
  const b = makeBoat(key, { psiDeg: course, u: 2.5 }), a = { n: 0, d: 0, h: 0, sp: 0, air: 0, hd: 0, at: 0, lw: 0 };
  run(b, 60, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, 60), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 }), (bb) => { if (bb.t > 50) { a.n++; a.d += bb.delta / RAD; a.h += bb.phi / RAD; a.sp += bb.speed() / KN; a.lw += bb.leewayDeg(); a.air += bb.out.rudderAir || 0; a.at += bb.out.rudderAttach; a.hd += hdg(bb) - course; } });
  return { kn: r(a.sp / a.n, 2), leeway: r(a.lw / a.n), heel: r(-a.h / a.n), weatherHelm: r(-a.d / a.n), grip: r(a.at / a.n, 2), air: r(a.air / a.n, 2), offCourse: r(a.hd / a.n) }; });

// 5. beam-reach puff from 12 knots (ramp 3 to 5 s), course held; and main eased 1.5 s after the puff starts. 6. bear away, main pinned.
export function record(M, key, { course, main, jib, w0, w1, easeAt, newCourse, T = 22 }, each) {
  const b = makeBoat(key, { psiDeg: course, u: 2.5 }, M), MAXHELM = 35;
  run(b, 50, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, MAXHELM), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w0 * KN, windDir: 0 })); b.t = 0; b.X = 0; b.Y = 0;
  const wind = (t) => w0 + (w1 - w0) * M.clamp((t - 3) / 2, 0, 1), st = { startKn: r(b.speed() / KN), startHeel: r(Math.abs(b.phi) / RAD, 0), peakHeel: 0, peakHelm: 0, minGrip: 1, peakAir: 0, peakOff: -99, peakLoad: 0 };
  run(b, T, (bb, t) => ({ tillerDeg: helmTo(bb, (t > 3 && newCourse !== undefined ? newCourse : course) * RAD, MAXHELM), mainSheet: easeAt !== undefined && t > easeAt ? 70 : main, jibSheet: jib, crew: 1 }), (t) => ({ wind: wind(t) * KN, windDir: 0 }), (bb) => {
    const o = bb.out, side = o.awaDeg >= 0 ? 1 : -1, want = bb.t > 3 && newCourse !== undefined ? newCourse : course, off = M.wrap(bb.psi) / RAD - want;
    st.peakHeel = Math.max(st.peakHeel, Math.abs(bb.phi) / RAD); st.peakHelm = Math.max(st.peakHelm, -bb.delta * side / RAD); st.minGrip = Math.min(st.minGrip, o.rudderAttach); st.peakAir = Math.max(st.peakAir, o.rudderAir || 0); st.peakLoad = Math.max(st.peakLoad, Math.abs(o.rudderY));
    if (bb.t > 3) st.peakOff = Math.max(st.peakOff, off); if (each) each(bb, wind(bb.t), off, want); });
  st.endHdg = r(M.wrap(b.psi) / RAD, 0); st.endHeel = r(Math.abs(b.phi) / RAD, 0); st.endKn = r(b.speed() / KN); st.endOff = r(M.wrap(b.psi) / RAD - (newCourse !== undefined ? newCourse : course), 0);
  for (const q of ['peakHeel', 'peakHelm', 'peakOff']) st[q] = r(st[q], 0); st.minGrip = r(st.minGrip, 2); st.peakAir = r(st.peakAir, 2); st.peakLoad = Math.round(st.peakLoad);
  return st;
}
if (process.argv[1].endsWith('scen_m1.mjs')) {
  const BR = { course: -90, main: 30, jib: 28 }, CH = { course: -45, main: 8, jib: 12 };
  N.puff = {}; N.bearAway = {};
  for (const key of ['hboat', 'ifboat']) {
    for (const w1 of [22, 28, 32]) { N.puff[`${key} ${w1} held`] = guard(() => record(SM, key, { ...BR, w0: 12, w1 })); N.puff[`${key} ${w1} eased`] = guard(() => record(SM, key, { ...BR, w0: 12, w1, easeAt: 4.5 })); }
    for (const w of [20, 24]) N.bearAway[`${key} ${w} pinned`] = guard(() => record(SM, key, { ...CH, w0: w, w1: w, newCourse: -110 }));
  }
  fs.writeFileSync(new URL(`../out/numbers-${tag}.json`, import.meta.url), JSON.stringify(N, null, 1));
  for (const [sec, o] of Object.entries(N)) if (sec !== 'flags') for (const [k, v] of Object.entries(o)) console.log(tag, sec, '|', k, '|', JSON.stringify(v));
}
