// r2lib.mjs: both models side by side (before = the sailing-test model with read-outs only; after = r2 heeled geometry).
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const OLD = require('./model_old.js'), NEW = require('./model.js');
export const HULLS = JSON.parse(fs.readFileSync(new URL('./out/hulls.json', import.meta.url)));
export const SAILS = JSON.parse(fs.readFileSync(new URL('./out/sails.json', import.meta.url)));
export const KN = NEW.KN, RAD = NEW.RAD, DT = NEW.C.dt;
export const make = (SM, key, init, hull) => new SM.Boat(hull || HULLS[key], SAILS[key], init);
export function run(b, seconds, ctl, env, each) {
  const n = Math.round(seconds / DT), every = Math.round(1 / 20 / DT);
  for (let i = 0; i < n; i++) { b.step(DT, ctl(b, b.t), env(b.t)); if (!Number.isFinite(b.u + b.v + b.r + b.p)) throw new Error('blew up at ' + b.t.toFixed(2)); if (each && i % every === every - 1) each(b); }
}
export const helm = (b, courseDeg, maxDeg) => NEW.helmTo(b, courseDeg * RAD, maxDeg);
export const hdg = (b) => NEW.wrap(b.psi) / RAD;
