// lib.mjs: loads the model and the generated data for the Node scripts.
// loadModel({R1, R2}) gives a separate copy of the model with its own switches, so that the sailing-test model
// (both false), each change alone and the merged model can run side by side. R1=0 / R2=0 in the environment set the default copy.
import fs from 'fs';
const src = fs.readFileSync(new URL('./model.js', import.meta.url), 'utf8');
export function loadModel(flags = {}) {
  const mod = { exports: {} }; new Function('module', 'exports', src)(mod, mod.exports);
  const M = mod.exports; if (flags.R1 !== undefined) M.C.R1 = !!flags.R1; if (flags.R2 !== undefined) M.C.R2 = !!flags.R2;
  M.C.C2 = flags.C2 !== undefined ? !!flags.C2 : process.env.C2 !== '0'; return M; // c2: C2=0 in the environment switches the fix off
}
export const SM = loadModel({ R1: process.env.R1 !== '0', R2: process.env.R2 !== '0' });
export const BASE = loadModel({ R1: false, R2: false });
// g1: SET=out/old reads the v2 data (estimated H-boat) from ../out/old instead of ../out
const SET = process.env.SET || 'out';
export const HULLS = JSON.parse(fs.readFileSync(new URL(`../${SET}/hulls.json`, import.meta.url)));
export const SAILS = JSON.parse(fs.readFileSync(new URL(`../${SET}/sails.json`, import.meta.url)));
export const KN = SM.KN, RAD = SM.RAD, DT = SM.C.dt;
export const makeBoat = (key, init, M = SM) => new M.Boat(HULLS[key], SAILS[key], init);
/** Advance with ctl(b, t) -> control object, env(t) -> {wind, windDir}. each(b) is called 20 times a second. */
export function run(b, seconds, ctl, env, each) {
  const n = Math.round(seconds / DT), every = Math.round(1 / 20 / DT);
  for (let i = 0; i < n; i++) {
    b.step(DT, ctl(b, b.t), env(b.t));
    if (!Number.isFinite(b.u + b.v + b.r + b.p)) throw new Error(`blew up at t = ${b.t.toFixed(2)}`);
    if (each && i % every === every - 1) each(b);
  }
}
/** g1: the stand-in helmsman of the scripts. Same law as model.js helmTo (1.5 deg of helm per deg off course and per deg/s of
 *  turn), but he feels the turning rate smoothed over HELM_FEEL seconds instead of at every 1/240 s sub-step. With the class
 *  H-boat (yaw inertia less than half the estimate, larger rudder) the raw law flips the rudder half a degree every sub-step
 *  and sculls the boat along; a hand cannot do that. Used for the old and the real data alike. */
export const HELM_FEEL = 0.2;
export function helmTo(b, courseRad, maxDeg) {
  if (b._rfT !== b.t - DT && b._rfT !== b.t) b._rf = b.r; // first call, or after a gap
  if (b._rfT !== b.t) { b._rf += (b.r - b._rf) * DT / HELM_FEEL; b._rfT = b.t; }
  const m = maxDeg || 30; return SM.clamp(1.5 * (SM.wrap(courseRad - b.psi) / RAD) - 1.5 * (b._rf / RAD), -m, m);
}
