// scen_lib.mjs: helpers shared by the scripted manoeuvres: record frames for the GIFs, write scenario files.
import fs from 'fs';
import { SM, HULLS, makeBoat, run, KN, RAD, DT, helmTo } from './lib.mjs';
export const FPS = 10;
export const r2 = (v, d = 2) => +(+v).toFixed(d);
/** Recorder: call rec.take(b, extra) 20 times a second from run(); keeps every other sample (10 a second). */
export function recorder(B) {
  const frames = [], track = []; let i = 0;
  return { frames, track, take(b, extra) {
    if (i++ % 2) return;
    const s = b.snapshot(), sx = b.X - (B.loa - B.bowOverhang - B.xcg) * Math.sin(b.psi), sy = b.Y - (B.loa - B.bowOverhang - B.xcg) * Math.cos(b.psi);
    const f = { X: r2(s.X), Y: r2(s.Y), psi: r2(s.psi, 3), phi: r2(s.phi, 3), delta: r2(s.delta, 3), crew: r2(s.crew), boomDeg: r2(s.boomDeg, 1), jibDeg: r2(s.jibDeg, 1), sailX: Math.round(s.sailX), sailY: Math.round(s.sailY),
      keelY: Math.round(s.keelY), rudderY: Math.round(s.rudderY), rudderX: Math.round(s.rudderX), rudderAttach: r2(s.rudderAttach), rudderAir: r2(s.rudderAir), rise: r2(s.rise || 0, 3), fMain: r2(s.fMain), fJib: r2(s.fJib), awaDeg: r2(s.awaDeg, 0), sailsUp: s.sailsUp,
      speedKn: r2(s.speedKn), leewayDeg: r2(s.leewayDeg, 1), heelDeg: r2(s.heelDeg, 1), rudderDeg: r2(s.rudderDeg, 1), flow: r2(s.rudderFlowDeg, 1), rate: r2(b.r / RAD, 1), ...extra };
    frames.push(f); track.push([f.X, f.Y, r2(sx), r2(sy)]);
  } };
}
export function meta() { const m = {}; for (const k of Object.keys(HULLS)) { const b = makeBoat(k); m[k] = { keelX: b.keelX, rudderX: b.rudderX }; } return m; }
export function writeScenario(name, scen) {
  scen.fps = FPS; scen.strip = scen.strip || SM.PLACEHOLDERS; scen.meta = meta();
  fs.writeFileSync(new URL(`../out/${name}.json`, import.meta.url), JSON.stringify(scen));
}
/** Settle on a close-hauled or other course with fixed sheets; returns the boat with t reset. */
export function settle(key, { windKn = 12, courseDeg = -45, main = 8, jib = 12, crew = 1, seconds = 50 } = {}) {
  const b = makeBoat(key, { psiDeg: courseDeg, u: 2.5 });
  run(b, seconds, (bb) => ({ tillerDeg: helmTo(bb, courseDeg * RAD), mainSheet: main, jibSheet: jib, crew: crew * (courseDeg < 0 ? 1 : -1) }), () => ({ wind: windKn * KN, windDir: 0 }));
  b.t = 0; b.X = 0; b.Y = 0; return b;
}
export { SM, HULLS, makeBoat, run, KN, RAD, DT };
