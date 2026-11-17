// scen_m1.mjs <tag>: the whole test list of sailing-test-v3 for one copy of the model -> out/numbers-<tag>.json (about 45 s).
// R1=0, R2=0, C2=0, SEA=0|1 and WAVE=delft in the environment choose the copy (see lib.mjs).
import fs from 'fs';
import { SM, HULLS } from './lib.mjs';
import { DEFAULT as S, hardOver, tack, handsOff, steady, record } from './scenarios.mjs';
const tag = process.argv[2] || 'reference', N = { flags: { R1: SM.C.R1, R2: SM.C.R2, C2: SM.C.C2, SEA: SM.C.SEA, waveDrag: HULLS.hboat.waveDrag.source } };
const guard = (f) => { try { return f(); } catch (e) { return { blewUp: String(e.message) }; } };
const KEYS = ['hboat', 'ifboat'], BR = { course: -90, main: 30, jib: 28 }, CH = { course: -45, main: 8, jib: 12 };
N.hardOver = {}; for (const key of KEYS) for (const kn of [5, 1]) for (const ang of [30, 45, 60]) N.hardOver[`${key} ${kn}kn ${ang}`] = guard(() => hardOver(S, key, kn, ang));
N.tack = {}; for (const key of KEYS) for (const helm of [20, 35]) N.tack[`${key} ${helm}`] = guard(() => tack(S, key, helm));
N.handsOff = {}; for (const key of KEYS) for (const mode of ['centred', 'let go']) N.handsOff[`${key} ${mode}`] = guard(() => handsOff(S, key, mode));
N.steady = {}; for (const key of KEYS) for (const [nm, c] of [['close-hauled', CH], ['beam reach', BR]]) for (const w of [8, 12, 16, 20, 24]) N.steady[`${key} ${nm} ${w}`] = guard(() => steady(S, key, c.course, c.main, c.jib, w));
N.puff = {}; N.bearAway = {};
for (const key of KEYS) {
  for (const w1 of [22, 28, 32]) { N.puff[`${key} ${w1} held`] = guard(() => record(S, key, { ...BR, w0: 12, w1 })); N.puff[`${key} ${w1} eased`] = guard(() => record(S, key, { ...BR, w0: 12, w1, easeAt: 4.5 })); }
  for (const w of [20, 24]) N.bearAway[`${key} ${w} pinned`] = guard(() => record(S, key, { ...CH, w0: w, w1: w, newCourse: -110 }));
}
fs.writeFileSync(new URL(`./out/numbers-${tag}.json`, import.meta.url), JSON.stringify(N, null, 1));
for (const [sec, o] of Object.entries(N)) if (sec !== 'flags') for (const [k, v] of Object.entries(o)) console.log(tag, sec, '|', k, '|', JSON.stringify(v));
