// scenarios.mjs: the scripted manoeuvres, one function each, shared by scen_m1.mjs (the whole test list) and smoke.mjs.
// Definitions are the originals': hard over as r1 scen_rudder.mjs, tack as scen_all.mjs, hands-off as r1 t_track.mjs,
// steady helm as r2 diag.mjs, puffs and bearing away as r2 scen_r2.mjs (stand-in helmsman, 35 degree limit).
// Winds are given in knots here as in those scripts (8, 12, 16, 20, 24 kn = 4.1, 6.2, 8.2, 10.3, 12.3 m/s).
// S is a boat source: { makeBoat(key, init) }. The default builds boats from out/hulls.json with the active wave-drag curve.
import { SM, makeBoat as makeDefault, run, KN, RAD, helmTo } from './lib.mjs';
export const DEFAULT = { makeBoat: makeDefault };
const r = (v, d = 1) => +(+v).toFixed(d), hdg = (b) => SM.wrap(b.psi) / RAD;
const settle = (S, key, course = -45, w = 12, main = 8, jib = 12, maxHelm = 30) => { const b = S.makeBoat(key, { psiDeg: course, u: 2.5 }); run(b, 50, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, maxHelm), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 })); b.t = 0; b.X = 0; b.Y = 0; return b; };

/** Hard over, coasting from kn knots, sails down: the tiller goes to ang degrees after 1 s. */
export function hardOver(S, key, kn, ang) {
  const { makeBoat } = S;
  const b = makeBoat(key, { psiDeg: 0, u: kn * KN }); run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.t = 0; b.u = kn * KN;
  const st = { peakRate: 0, minAtt: 1, peakLoad: 0, peakAir: 0 }, sp = {}, hd = {};
  run(b, 14, (bb, t) => ({ tillerDeg: t < 1 ? 0 : ang, sails: false }), () => ({ wind: 0 }), (bb) => { const o = bb.out, tt = bb.t - 1; st.peakRate = Math.max(st.peakRate, bb.r / RAD); st.minAtt = Math.min(st.minAtt, o.rudderAttach); st.peakLoad = Math.max(st.peakLoad, Math.hypot(o.rudderY, o.rudderX)); st.peakAir = Math.max(st.peakAir, o.rudderAir || 0);
    for (const q of [4, 8]) if (Math.abs(tt - q) < 0.026) { sp[q] = bb.speed() / KN; hd[q] = bb.psi / RAD; } });
  return { peakRate: r(st.peakRate), hdg4: r(hd[4], 0), hdg8: r(hd[8], 0), lost4pct: r(100 * (1 - sp[4] / kn), 0), minAttach: r(st.minAtt, 2), peakLoadN: Math.round(st.peakLoad), peakAir: r(st.peakAir, 2) };
}

/** Tack from starboard to port at 12 knots of wind with `helm` degrees of rudder until 20 degrees past head to wind. */
export function tack(S, key, helm) {
  const b = settle(S, key), U0 = b.speed(), vmg0 = b.u * Math.cos(b.psi) - b.v * Math.sin(b.psi), lead = 2, total = 40; let phase = 0, tHead = null, tNew = null, minSp = 1e9, pkHeel = 0;
  run(b, total, (bb, t) => { const h = hdg(bb); if (t < lead) return { tillerDeg: helmTo(bb, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }; if (phase === 0 && h > 20) phase = 1; const through = h > 0;
    return { tillerDeg: phase === 0 ? helm : helmTo(bb, 45 * RAD), mainSheet: 8, jibSheet: 12, jibSide: through ? -1 : 1, crew: through ? -1 : 1 }; }, () => ({ wind: 12 * KN, windDir: 0 }),
  (bb) => { const t = bb.t - lead, h = hdg(bb); if (t > 0) { if (tHead === null && h >= 0) tHead = t; if (tNew === null && h >= 42) tNew = t; minSp = Math.min(minSp, bb.speed()); } });
  return { headToWindS: r(tHead), newCourseS: r(tNew), speedLostPct: r(100 * (1 - minSp / U0), 0), lostToWindwardM: r(vmg0 * (total - lead) - (b.Y - vmg0 * lead)) };
}

/** Hands off, close-hauled at 12 knots of wind, 15 s: tiller centred, or let go (mode 'let go'). */
export function handsOff(S, key, mode) {
  const b = settle(S, key), p0 = b.psi, d0 = b.delta / RAD; run(b, 15, () => ({ tillerDeg: 0, tillerFree: mode === 'let go', mainSheet: 8, jibSheet: 12, crew: 1 }), () => ({ wind: 12 * KN, windDir: 0 }));
  return { steadyRudder: r(d0, 2), offAfter15s: r((b.psi - p0) / RAD), sense: (b.psi - p0) > 0 ? 'luffs' : 'bears away', rudderEnds: r(b.delta / RAD) };
}

/** Steady sailing for 60 s on a held course, averaged over the last 10 s. + helm = weather helm. */
export function steady(S, key, course, main, jib, w) {
  const { makeBoat } = S;
  const b = makeBoat(key, { psiDeg: course, u: 2.5 }), a = { n: 0, d: 0, h: 0, sp: 0, air: 0, hd: 0, at: 0, lw: 0 };
  run(b, 60, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, 60), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 }), (bb) => { if (bb.t > 50) { a.n++; a.d += bb.delta / RAD; a.h += bb.phi / RAD; a.sp += bb.speed() / KN; a.lw += bb.leewayDeg(); a.air += bb.out.rudderAir || 0; a.at += bb.out.rudderAttach; a.hd += hdg(bb) - course; } });
  return { kn: r(a.sp / a.n, 2), leeway: r(a.lw / a.n), heel: r(-a.h / a.n), weatherHelm: r(-a.d / a.n), grip: r(a.at / a.n, 2), air: r(a.air / a.n, 2), offCourse: r(a.hd / a.n) };
}

/** Beam-reach puff from w0 to w1 knots (ramp 3 to 5 s), course held; easeAt eases the main; newCourse bears away. */
export function record(S, key, { course, main, jib, w0, w1, easeAt, newCourse, T = 22 }, each) {
  const { makeBoat } = S, M = SM, b = makeBoat(key, { psiDeg: course, u: 2.5 }), MAXHELM = 35;
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
