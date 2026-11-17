// scenarios.mjs
// The manoeuvres of experiment H4 as small functions over sim.mjs. Each returns numbers and,
// if asked, frames for the renderer. A later interactive test can reuse `advance` with its
// own helm function.
import { Boat, MODEL } from './sim.mjs';

export const KN = 0.5144;
export const DT = 1 / 240;
const rad = Math.PI / 180;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (a, lo, hi) => Math.min(hi, Math.max(lo, a));

/** The stand-in helmsman, same for every boat: rudder = KP * heading error - KD * turn rate. */
export const HELM = { KP: 1.5, KD: 1.5, maxDeg: 30 };
export const helmTo = (b, courseDeg) =>
  clamp(HELM.KP * (wrap(courseDeg * rad - b.psi) / rad) - HELM.KD * (b.r / rad), -HELM.maxDeg, HELM.maxDeg);

export const RATES = { gentle: 8, normal: 25, slammed: 120 }; // rudder rate [deg/s]
export const CLOSE_HAULED = 45; // heading off the true wind [deg]

/** Leeway [deg], positive when the boat slides away from the wind. */
export function leeway(b) {
  const windFromStarboard = Math.sin(-b.psi) >= 0 ? 1 : -1;
  return Math.atan2(-b.v * windFromStarboard, Math.abs(b.u)) / rad;
}
export const speed = (b) => Math.hypot(b.u, b.v);

function frame(b, env) {
  const o = b.out;
  return {
    t: +b.t.toFixed(3), X: +b.X.toFixed(3), Y: +b.Y.toFixed(3), psi: +(b.psi / rad).toFixed(2), heel: +(b.phi / rad).toFixed(2),
    u: +b.u.toFixed(3), v: +b.v.toFixed(3), r: +(b.r / rad).toFixed(2), rud: +(b.delta / rad).toFixed(2),
    wind: +(env.wind ?? 0).toFixed(2), sx: Math.round(o.sailX), sy: Math.round(o.sailY), ky: Math.round(o.keelY),
    ka: +o.keelArm.toFixed(2), ry: Math.round(o.rudderY), lee: +leeway(b).toFixed(2), sp: +speed(b).toFixed(3),
    m: b.markers.filter((_, i) => i % 2 === 0).map((m) => [+m.x.toFixed(2), +(m.Patt + m.Pw + m.Pcf).toFixed(3)]),
  };
}

/**
 * Advance a boat. helm(b, t) returns { deltaCmdDeg, rateDegPerS }; env(t) returns the
 * environment of Boat.step. log gets a sample 60 times a second, frames 15 times a second.
 */
export function advance(b, seconds, helm, env, rec = {}, dt = DT) {
  const n = Math.round(seconds / dt);
  const every60 = Math.max(1, Math.round(1 / 60 / dt)), every15 = Math.max(1, Math.round(1 / 15 / dt));
  for (let i = 0; i < n; i++) {
    const e = env(b.t);
    b.step(dt, helm(b, b.t), e);
    if (!Number.isFinite(b.u + b.v + b.r + b.p)) throw new Error(`blew up at t = ${b.t.toFixed(2)} s`);
    if (rec.log && i % every60 === 0) {
      rec.log.push({ t: b.t, sp: speed(b), u: b.u, lee: leeway(b), psi: b.psi / rad, heel: b.phi / rad, r: b.r / rad,
        rud: b.delta / rad, ry: b.out.rudderY, Y: b.Y, X: b.X, turnDrag: b.out.turnDrag, induced: b.out.induced });
    }
    if (rec.frames && i % every15 === 0) rec.frames.push(frame(b, e));
  }
}

const mean = (a, f) => a.reduce((s, q) => s + f(q), 0) / a.length;

/** (1) Settle close-hauled on starboard tack. Returns the boat and its steady numbers. */
export function settle(cfg, windKn = 12, seconds = 70, dt = DT) {
  const b = new Boat(cfg, { psiDeg: -CLOSE_HAULED, u: 2.4 });
  const env = () => ({ wind: windKn * KN });
  const helm = (bb) => ({ deltaCmdDeg: helmTo(bb, -CLOSE_HAULED), rateDegPerS: RATES.normal });
  advance(b, seconds - 5, helm, env, {}, dt);
  const log = [];
  advance(b, 5, helm, env, { log }, dt);
  const steady = {
    speedKn: mean(log, (q) => q.sp) / KN, leewayDeg: mean(log, (q) => q.lee), rudderDeg: mean(log, (q) => q.rud),
    heelDeg: mean(log, (q) => q.heel), rudderForceN: mean(log, (q) => q.ry),
    vmg: (log[log.length - 1].Y - log[0].Y) / (log[log.length - 1].t - log[0].t),
    entrainedKg: b.out.entrained, yawAddedKgM2: b.out.yawAdded, wettedM2: cfg.table.wetted,
    ripple: Math.max(...log.map((q) => q.sp)) - Math.min(...log.map((q) => q.sp)),
  };
  b.t = 0; b.exited = [];
  return { b, steady };
}

/** (2) Tack from starboard to port with a scripted helm at one rudder rate. */
export function tack(cfg, rate, opts = {}) {
  const dt = opts.dt ?? DT;
  const { b, steady } = settle(cfg, 12, 70, dt);
  const env = () => ({ wind: 12 * KN });
  const rec = { log: [], frames: opts.frames ? [] : null };
  const lead = 3, after = 42;
  let over = false;
  const helm = (bb, t) => {
    if (t < lead) return { deltaCmdDeg: helmTo(bb, -CLOSE_HAULED), rateDegPerS: RATES.normal };
    if (!over && wrap(bb.psi + CLOSE_HAULED * rad) / rad < 90 - 25) return { deltaCmdDeg: HELM.maxDeg, rateDegPerS: rate };
    over = true;
    return { deltaCmdDeg: helmTo(bb, CLOSE_HAULED), rateDegPerS: rate };
  };
  advance(b, lead + after, helm, env, rec, dt);
  const L = rec.log, i0 = L.findIndex((q) => q.t >= lead);
  const U0 = steady.speedKn * KN, Y0 = L[i0].Y;
  // through 90 degrees = within 3 degrees of the new course (a sluggish boat creeps up to it)
  const i90 = L.findIndex((q, i) => i > i0 && q.psi >= CLOSE_HAULED - 3);
  const iHead = L.findIndex((q, i) => i > i0 && q.psi >= 0);
  let iMin = i0; for (let i = i0; i < L.length; i++) if (L[i].sp < L[iMin].sp) iMin = i;
  const iRec = L.findIndex((q, i) => i > iMin && q.sp >= 0.9 * U0);
  const iLee = L.findIndex((q, i) => i > i0 && q.psi >= 10);
  let peakLee = 0, tPeakLee = 0;
  if (iLee > 0) for (let i = iLee; i < L.length; i++) if (L[i].lee > peakLee) { peakLee = L[i].lee; tPeakLee = L[i].t - lead; }
  const end = L[L.length - 1];
  const lossWindward = steady.vmg * (end.t - L[i0].t) - (end.Y - Y0);
  return {
    steady, frames: rec.frames, exited: b.exited, log: opts.keepLog ? L : undefined,
    t90: i90 > 0 ? L[i90].t - lead : null, tHeadToWind: iHead > 0 ? L[iHead].t - lead : null,
    speedLostKn: (U0 - L[iMin].sp) / KN, speedLostPct: 100 * (1 - L[iMin].sp / U0), tMinSpeed: L[iMin].t - lead,
    lossWindwardM: lossWindward, lossWindwardLengths: lossWindward / cfg.table.L,
    peakLeewayDeg: peakLee, tPeakLeeway: tPeakLee, tRecover90: iRec > 0 ? L[iRec].t - lead : null,
    peakTurnRate: Math.max(...L.map((q) => q.r)), overshootDeg: Math.max(...L.map((q) => q.psi)) - CLOSE_HAULED,
    finalSpeedKn: end.sp / KN, lead,
  };
}

/** (3) Coast head to wind, sails off, from 5 knots. */
export function coast(cfg) {
  const b = new Boat(cfg, { psiDeg: 0, u: 5 * KN });
  const rec = { log: [] };
  advance(b, 60, (bb) => ({ deltaCmdDeg: helmTo(bb, 0), rateDegPerS: RATES.normal }), () => ({ wind: 12 * KN, sails: false }), rec);
  const half = rec.log.find((q) => q.u <= 2.5 * KN), stop = rec.log.find((q) => q.u <= 0);
  let monotone = true; for (let i = 1; i < rec.log.length; i++) if (rec.log[i].u > rec.log[i - 1].u + 1e-9) monotone = false;
  return { distHalfM: half.Y, distHalfLengths: half.Y / cfg.table.L, tHalf: half.t, tStop: stop ? stop.t : null, distStopM: stop ? stop.Y : null, speedOnlyDecays: monotone };
}

/** (4) Puff: 10 knots stepping to 15 over half a second, helmsman holding the course. */
export function puff(cfg, opts = {}) {
  const { b, steady } = settle(cfg, 10);
  const lead = 4;
  const env = (t) => ({ wind: (10 + 5 * clamp((t - lead) / 0.5, 0, 1)) * KN });
  const rec = { log: [], frames: opts.frames ? [] : null };
  advance(b, lead + 40, (bb) => ({ deltaCmdDeg: helmTo(bb, -CLOSE_HAULED), rateDegPerS: RATES.normal }), env, rec);
  const L = rec.log, i0 = L.findIndex((q) => q.t >= lead), end = L.slice(-120);
  const timing = (f) => {
    const a = f(L[i0]), z = mean(end, f);
    const at = (frac) => { const q = L.find((s, i) => i >= i0 && (f(s) - a) / (z - a) >= frac); return q ? q.t - lead : null; };
    return { from: a, to: z, t10: at(0.1), t50: at(0.5), t90: at(0.9) };
  };
  return { steady, frames: rec.frames, exited: b.exited, lead, heel: timing((q) => q.heel), helmLoad: timing((q) => q.ry),
    rudder: timing((q) => q.rud), speed: timing((q) => q.sp / KN), leeway: timing((q) => q.lee),
    peakHeel: Math.max(...L.map((q) => Math.abs(q.heel))), peakLeeway: Math.max(...L.map((q) => q.lee)) };
}

/** (5) Hands off: tiller lashed at its trim angle, then a shove in yaw (N m for half a second). */
export function handsOff(cfg, kickNm) {
  const { b, steady } = settle(cfg, 12);
  const rec = { log: [] };
  const psi0 = b.psi / rad;
  advance(b, 40, () => ({ deltaCmdDeg: steady.rudderDeg, rateDegPerS: RATES.normal }),
    (t) => ({ wind: 12 * KN, kickN: t > 1 && t < 1.5 ? kickNm : 0 }), rec);
  const dev = (t) => { const q = rec.log.find((s) => s.t >= t + 1.5); return q ? q.psi - psi0 : null; };
  const reach = (deg) => { const q = rec.log.find((s) => s.t > 1 && Math.abs(s.psi - psi0) >= deg); return q ? q.t - 1 : null; };
  return { peakTurnRate: Math.max(...rec.log.map((q) => Math.abs(q.r))), dev3: dev(3), dev10: dev(10), dev20: dev(20), tTo10deg: reach(10), tTo20deg: reach(20),
    trace: rec.log.filter((_, i) => i % 15 === 0).map((q) => [+q.t.toFixed(2), +(q.psi - psi0).toFixed(2)]) };
}

/**
 * (5b) Tiller let go: the rudder floats to where it carries no side load (a free tiller),
 * approximated by turning it at 0.2 degrees a second per newton of side force left on it.
 */
export function tillerFree(cfg) {
  const { b, steady } = settle(cfg, 12);
  const rec = { log: [] };
  const psi0 = b.psi / rad;
  advance(b, 40, (bb, t) => (t < 1
    ? { deltaCmdDeg: helmTo(bb, -CLOSE_HAULED), rateDegPerS: RATES.normal }
    : { deltaCmdDeg: bb.delta / rad + Math.sign(bb.out.rudderY), rateDegPerS: Math.min(60, 0.2 * Math.abs(bb.out.rudderY)) }),
  () => ({ wind: 12 * KN }), rec);
  const reach = (deg) => { const q = rec.log.find((s) => s.t > 1 && Math.abs(s.psi - psi0) >= deg); return q ? q.t - 1 : null; };
  const dev = (t) => { const q = rec.log.find((s) => s.t >= t + 1); return q ? q.psi - psi0 : null; };
  return { tTo5deg: reach(5), tTo10deg: reach(10), tTo20deg: reach(20), dev5: dev(5), dev10: dev(10), dev20: dev(20), dev38: dev(38),
    rudderAt5: rec.log.find((s) => s.t >= 6).rud,
    trace: rec.log.filter((_, i) => i % 15 === 0).map((q) => [+q.t.toFixed(2), +(q.psi - psi0).toFixed(2)]) };
}

/**
 * Keel wash at the rudder: boat towed straight at 5 knots, then given 0.2 m/s of sideways
 * slide in a tenth of a second. The rudder feels its own slide at once and the keel's wash
 * when the water the keel pushed has travelled aft to it.
 */
export function washDelay(cfg) {
  const b = new Boat(cfg, { u: 5 * KN });
  const env = { wind: 0, sails: false, captive: true };
  const tr = [];
  for (let i = 0; i < 240 * 9; i++) {
    b.v = -0.2 * clamp((b.t - 4) / 0.1, 0, 1);
    b.step(DT, { deltaCmdDeg: 0 }, env);
    if (i % 4 === 0 && b.t > 3.5) tr.push([+(b.t - 4).toFixed(3), +b.out.rudderY.toFixed(1), +b.out.keelY.toFixed(1)]);
  }
  const peak = Math.max(...tr.map((q) => q[1])), fin = tr[tr.length - 1][1];
  const iPeak = tr.findIndex((q) => q[1] === peak);
  const half = tr.find((q, i) => i > iPeak && q[1] <= 0.5 * (peak + fin));
  return { peakN: peak, tPeak: tr[iPeak][0], settledN: fin, tHalfDrop: half ? half[0] : null, trace: tr.filter((_, i) => i % 3 === 0) };
}

/** (6) Sternway: head to wind at rest, sail squared across (aback), then rudder over. */
export function sternway(cfg, opts = {}) {
  const b = new Boat(cfg, { psiDeg: 0, u: 0 });
  const rec = { log: [], frames: opts.frames ? [] : null };
  const env = () => ({ wind: 12 * KN, aback: true });
  let tOver = null;
  const helm = (bb, t) => {
    if (tOver === null && bb.u <= -1 * KN) tOver = t;
    return { deltaCmdDeg: tOver === null ? 0 : 20, rateDegPerS: RATES.normal };
  };
  advance(b, 18, helm, env, rec);
  const at = (t) => rec.log.find((q) => q.t >= tOver + t);
  return { frames: rec.frames, exited: b.exited, tOver, turnRateAfter3s: at(3)?.r, headingAfter6s: at(6)?.psi, speedAtRudderKn: -1,
    rudderForceAfter3s: at(3)?.ry, helmReversed: (at(3)?.r ?? 0) < 0, finalSpeedKn: rec.log[rec.log.length - 1].u / KN };
}
export { MODEL };
