// lib.mjs: loads the model and the generated data (out/hulls.json, out/sails.json) for the Node scripts.
// loadModel(flags) gives a separate copy of the model with its own switches, so that variants can run side by side.
// Environment: R1=0, R2=0, C2=0 switch a change off in the default copy; SEA=0 or SEA=1 force heave and pitch off or on
// (default 'auto': on when a sea is supplied); WAVE=delft keeps the Delft wave-drag curves (see wavedrag.mjs).
import fs from 'fs';
import { applyWaveDrag } from './wavedrag.mjs';
const src = fs.readFileSync(new URL('./model.js', import.meta.url), 'utf8');
export function loadModel(flags = {}) {
  const mod = { exports: {} }; new Function('module', 'exports', src)(mod, mod.exports);
  const M = mod.exports; for (const k of ['R1', 'R2', 'C2', 'MEMORY']) if (flags[k] !== undefined) M.C[k] = !!flags[k];
  if (flags.SEA !== undefined) M.C.SEA = flags.SEA === 'auto' ? 'auto' : !!flags.SEA;
  return M;
}
const env = process.env;
export const SM = loadModel({ R1: env.R1 !== '0', R2: env.R2 !== '0', C2: env.C2 !== '0', SEA: env.SEA === undefined ? 'auto' : env.SEA === '1' });
const rd = (p) => { const f = new URL(p, import.meta.url); if (!fs.existsSync(f)) throw new Error(`${p} is missing: run "node build_data.mjs" in this folder first`); return JSON.parse(fs.readFileSync(f, 'utf8')); };
export const HULLS = applyWaveDrag(rd('./out/hulls.json'));
export const SAILS = rd('./out/sails.json');
export const KN = SM.KN, RAD = SM.RAD, DT = SM.C.dt;
export const makeBoat = (key, init, M = SM) => new M.Boat(HULLS[key], SAILS[key], init);
/** Advance with ctl(b, t) -> control object, env(t) -> {wind, windDir, sea}. each(b) is called 20 times a second. */
export function run(b, seconds, ctl, env, each) {
  const n = Math.round(seconds / DT), every = Math.round(1 / 20 / DT);
  for (let i = 0; i < n; i++) {
    b.step(DT, ctl(b, b.t), env(b.t));
    if (!Number.isFinite(b.u + b.v + b.r + b.p)) throw new Error(`blew up at t = ${b.t.toFixed(2)}`);
    if (each && i % every === every - 1) each(b);
  }
}
/** The stand-in helmsman of the scripts. Same law as model.js helmTo (1.5 deg of helm per deg off course and per deg/s of
 *  turn), but he feels the turning rate smoothed over HELM_FEEL seconds instead of at every 1/240 s sub-step. With the class
 *  H-boat the raw law flips the rudder half a degree every sub-step and sculls the boat along; a hand cannot do that. */
export const HELM_FEEL = 0.2;
export function helmTo(b, courseRad, maxDeg) {
  if (b._rfT !== b.t - DT && b._rfT !== b.t) b._rf = b.r; // first call, or after a gap
  if (b._rfT !== b.t) { b._rf += (b.r - b._rf) * DT / HELM_FEEL; b._rfT = b.t; }
  const m = maxDeg || 30; return SM.clamp(1.5 * (SM.wrap(courseRad - b.psi) / RAD) - 1.5 * (b._rf / RAD), -m, m);
}
