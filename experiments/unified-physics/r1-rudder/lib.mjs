// lib.mjs: loads the model and the generated data for the Node scripts.
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const SM = require('./model.js'); if (process.env.R1 === '0') SM.C.R1 = false;
export const HULLS = JSON.parse(fs.readFileSync(new URL('./out/hulls.json', import.meta.url)));
export const SAILS = JSON.parse(fs.readFileSync(new URL('./out/sails.json', import.meta.url)));
export const KN = SM.KN, RAD = SM.RAD, DT = SM.C.dt;
// r1-rudder: the sailing-test hull tables (canoe body above the rudder turning with it) are kept for the "before" runs
export const HULLS0 = JSON.parse(fs.readFileSync(new URL('./data/hulls_orig.json', import.meta.url)));
export const makeBoat = (key, init) => new SM.Boat((SM.C.R1 ? HULLS : HULLS0)[key], SAILS[key], init);
/** Advance with ctl(b, t) -> control object, env(t) -> {wind, windDir}. each(b) is called 20 times a second. */
export function run(b, seconds, ctl, env, each) {
  const n = Math.round(seconds / DT), every = Math.round(1 / 20 / DT);
  for (let i = 0; i < n; i++) {
    b.step(DT, ctl(b, b.t), env(b.t));
    if (!Number.isFinite(b.u + b.v + b.r + b.p)) throw new Error(`blew up at t = ${b.t.toFixed(2)}`);
    if (each && i % every === every - 1) each(b);
  }
}
