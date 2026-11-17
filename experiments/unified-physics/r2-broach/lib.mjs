// lib.mjs: loads the model and the generated data for the Node scripts.
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const SM = require(process.env.MODEL || './model.js');
export const HULLS = JSON.parse(fs.readFileSync(new URL('./out/hulls.json', import.meta.url)));
export const SAILS = JSON.parse(fs.readFileSync(new URL('./out/sails.json', import.meta.url)));
export const KN = SM.KN, RAD = SM.RAD, DT = SM.C.dt;
export const makeBoat = (key, init) => new SM.Boat(HULLS[key], SAILS[key], init);
/** Advance with ctl(b, t) -> control object, env(t) -> {wind, windDir}. each(b) is called 20 times a second. */
export function run(b, seconds, ctl, env, each) {
  const n = Math.round(seconds / DT), every = Math.round(1 / 20 / DT);
  for (let i = 0; i < n; i++) {
    b.step(DT, ctl(b, b.t), env(b.t));
    if (!Number.isFinite(b.u + b.v + b.r + b.p)) throw new Error(`blew up at t = ${b.t.toFixed(2)}`);
    if (each && i % every === every - 1) each(b);
  }
}
