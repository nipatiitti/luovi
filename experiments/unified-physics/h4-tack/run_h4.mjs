// run_h4.mjs: runs every manoeuvre of experiment H4 and writes out/results.json (numbers) and
// out/frames.json (what render_h4.py draws).   node run_h4.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { finBoat, longBoat, morph, hBoatReal, ifBoatReal, COMMON } from './boats.mjs';
import * as S from './scenarios.mjs';
import { MODEL, SAIL } from './sim.mjs';
import { CONSTANTS } from './slicelaw.mjs';

const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'frames' || k === 'exited' || k === 'log' ? undefined : typeof v === 'number' ? +v.toPrecision(4) : v)));
const shape = (cfg) => ({ name: cfg.name, L: cfg.table.L, x: cfg.table.x.map((q) => +q.toFixed(3)), T: cfg.table.T.map((q) => +q.toFixed(3)),
  canoe: cfg.table.canoeDraft.map((q) => +q.toFixed(3)), b: cfg.table.halfBeam.map((q) => +q.toFixed(3)), rud: cfg.table.rud.map((q) => +q.toFixed(2)),
  rudderX: cfg.rudderX, keelX: cfg.keelX, xcg: cfg.xcg, ceX: cfg.rig.ceX });
const wake = (ex) => ex.filter((_, i) => i % 3 === 0).map((e) => [+e.t.toFixed(2), +e.X.toFixed(2), +e.Y.toFixed(2), +e.P.toFixed(3)]);

const t0 = Date.now();
const out = { constants: { law: CONSTANTS, model: MODEL, sail: SAIL, common: COMMON, helm: S.HELM, rates: S.RATES, dt: S.DT }, boats: {} };
const frames = { shapes: {}, tack: {}, rates: {}, puff: {}, sternway: {} };

for (const cfg of [finBoat(), longBoat()]) {
  const k = cfg.key, r = (out.boats[k] = { name: cfg.name });
  frames.shapes[k] = shape(cfg);
  r.steady = S.settle(cfg).steady;
  r.tack = {};
  for (const [name, rate] of Object.entries(S.RATES)) {
    const t = S.tack(cfg, rate, { frames: true });
    r.tack[name] = strip(t);
    if (name === 'normal') frames.tack[k] = { frames: t.frames, wake: wake(t.exited), lead: t.lead, m: strip(t) };
    if (k === 'fin') frames.rates[name] = { frames: t.frames, wake: wake(t.exited), lead: t.lead, m: strip(t) };
  }
  r.coast = S.coast(cfg);
  const p = S.puff(cfg, { frames: true });
  r.puff = strip(p); frames.puff[k] = { frames: p.frames, wake: wake(p.exited), lead: p.lead, m: strip(p) };
  r.handsOff = { lashedShoveToLeeward: S.handsOff(cfg, 1500), lashedShoveToWindward: S.handsOff(cfg, -1500), tillerFree: S.tillerFree(cfg) };
  r.wash = S.washDelay(cfg);
  const s = S.sternway(cfg, { frames: true });
  r.sternway = strip(s); frames.sternway[k] = { frames: s.frames, wake: wake(s.exited), m: strip(s) };
  console.log(k, 'done', Date.now() - t0, 'ms');
}

// keel morph through the tack (and the other feel numbers), five steps
out.morph = [0, 0.25, 0.5, 0.75, 1].map((m) => {
  const cfg = morph(m);
  const t = S.tack(cfg, S.RATES.normal);
  const st = strip(t);
  return { m, steady: st.steady, t90: st.t90, speedLostPct: st.speedLostPct, lossWindwardM: st.lossWindwardM, peakLeewayDeg: st.peakLeewayDeg,
    tRecover90: st.tRecover90, peakTurnRate: st.peakTurnRate, coastHalfLengths: S.coast(cfg).distHalfLengths,
    shovePeakRate: S.handsOff(cfg, 1500).peakTurnRate, shoveDev3: S.handsOff(cfg, 1500).dev3, freeTo10deg: S.tillerFree(cfg).tTo10deg, freeDev10: S.tillerFree(cfg).dev10 };
});
console.log('morph done', Date.now() - t0, 'ms');

// stiffness: the long-keel boat made light, so the entrained water is many times its mass
out.stiffness = [];
for (const mass of [1450, 600, 250]) {
  for (const dt of [1 / 60, 1 / 240, 1 / 960]) {
    const cfg = longBoat({ mass, GM: (1.0 * 1450) / mass });
    let row;
    try {
      const t = S.tack(cfg, S.RATES.slammed, { dt, keepLog: true });
      let rough = 0; // largest jump of yaw rate between samples 1/60 s apart [deg/s]
      for (let i = 1; i < t.log.length; i++) rough = Math.max(rough, Math.abs(t.log[i].r - t.log[i - 1].r));
      row = { mass, dt, ratio: t.steady.entrainedKg / mass, t90: t.t90, speedLostPct: t.speedLostPct, roughness: rough, ok: true };
    } catch (e) { row = { mass, dt, ok: false, error: e.message }; }
    out.stiffness.push(strip(row));
  }
}
console.log('stiffness done', Date.now() - t0, 'ms');

// second pair, labelled: class weights and sail areas from memory
out.classPair = {};
for (const cfg of [hBoatReal(), ifBoatReal()]) {
  const t = strip(S.tack(cfg, S.RATES.normal));
  out.classPair[cfg.key] = { name: cfg.name, mass: cfg.mass, sail: cfg.rig.area, steady: t.steady, t90: t.t90, speedLostPct: t.speedLostPct,
    lossWindwardM: t.lossWindwardM, tRecover90: t.tRecover90, coastHalfLengths: S.coast(cfg).distHalfLengths };
}

mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/results.json', import.meta.url), JSON.stringify(strip(out), null, 1));
writeFileSync(new URL('./out/frames.json', import.meta.url), JSON.stringify(frames));
console.log('total', Date.now() - t0, 'ms');
