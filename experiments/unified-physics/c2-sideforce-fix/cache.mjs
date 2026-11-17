// cache.mjs: builds every hold-out hull once (h1b's hull code is slow) -> out/bodies.json
import { writeFileSync } from 'node:fs';
import { boatData, cases } from './tow.mjs';
const out = {};
for (const c of cases) { const bd = boatData(c); for (const k of ['A', 'T']) bd.data[k] = Array.from(bd.data[k]); out[c.sys] = bd; }
writeFileSync(new URL('./out/bodies.json', import.meta.url), JSON.stringify(out));
console.log('cached', Object.keys(out).length);
