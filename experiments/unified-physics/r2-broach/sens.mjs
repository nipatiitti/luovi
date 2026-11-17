// sensitivity (not adopted): the same H-boat with the keel 0.40 m further forward; and the Folkboat
import fs from 'fs'; import { OLD, NEW, make, run, helm, hdg, KN, RAD } from './r2lib.mjs';
const KF = JSON.parse(fs.readFileSync(new URL('./out/hulls_kf.json', import.meta.url))).hboat;
const rows = [['H-boat as given', 'hboat', undefined], ['H-boat, keel 0.40 m forward', 'hboat', KF], ['Folkboat', 'ifboat', undefined]];
for (const [nm, key, hull] of rows) for (const [tag, SM] of [['before', OLD], ['after', NEW]]) {
  let line = `${nm} ${tag}: close-hauled weather helm (deg) / heel at 8,12,16,20,24 kn: `;
  for (const w of [8, 12, 16, 20, 24]) { const b = make(SM, key, { psiDeg: -45, u: 2.5 }, hull); let d = 0, h = 0, n = 0;
    try { run(b, 60, (bb) => ({ tillerDeg: helm(bb, -45, 60), mainSheet: 8, jibSheet: 12, crew: 1 }), () => ({ wind: w * KN, windDir: 0 }), (bb) => { if (bb.t > 50) { d -= bb.delta / RAD; h -= bb.phi / RAD; n++; } }); line += `${(d / n).toFixed(1)}/${(h / n).toFixed(0)}  `; } catch (e) { line += 'blew  '; } }
  console.log(line);
}
