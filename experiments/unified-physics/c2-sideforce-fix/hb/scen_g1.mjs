// scen_g1.mjs: the GIF. H-boat close-hauled in 12 knots, a puff to 20 knots (3 to 13 s), then a tack (17 s, 35 degrees of helm):
// the estimated data of v2 against the class data, same model, same helmsman (lib.mjs helmTo), sheets pinned.
import fs from 'fs'; import { SM, SAILS, HULLS, run, KN, RAD, helmTo } from './lib.mjs'; import { recorder, FPS } from './scen_lib.mjs';
const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const OLD = rd('../out/old/hulls.json').hboat, OLDS = rd('../out/old/sails.json').hboat, hulls = { old: OLD, real: HULLS.hboat }, sails = { old: OLDS, real: SAILS.hboat };
const windAt = (t) => 12 + 8 * SM.clamp(Math.min((t - 3) / 2, (13 - t) / 2), 0, 1), cells = [], meta = {}, T = 32, tTack = 17, hdg = (b) => SM.wrap(b.psi) / RAD;
for (const [k, title] of [['old', 'ESTIMATED (v2 data)'], ['real', 'FROM THE CLASS OFFSETS']]) {
  const B = hulls[k], b = new SM.Boat(B, sails[k], { psiDeg: -45, u: 2.5 }), rec = recorder(B); meta[k] = { keelX: b.keelX, rudderX: b.rudderX };
  run(b, 50, (bb) => ({ tillerDeg: helmTo(bb, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }), () => ({ wind: 12 * KN, windDir: 0 })); b.t = 0; b.X = 0; b.Y = 0;
  let phase = 0, tNew = null; const st = { puffHelm: 0, puffHeel: 0, puffOff: 0 };
  run(b, T, (bb, t) => { const h = hdg(bb); if (t < tTack) return { tillerDeg: helmTo(bb, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 };
    if (phase === 0 && h > 20) phase = 1; const through = h > 0;
    return { tillerDeg: phase === 0 ? 35 : helmTo(bb, 45 * RAD), mainSheet: 8, jibSheet: 12, jibSide: through ? -1 : 1, crew: through ? -1 : 1 }; },
  (t) => ({ wind: windAt(t) * KN, windDir: 0 }), (bb) => { const t = bb.t, w = windAt(t);
    if (t > 3 && t < 13) { st.puffHelm = Math.max(st.puffHelm, -bb.delta / RAD); st.puffHeel = Math.max(st.puffHeel, -bb.phi / RAD); st.puffOff = Math.max(st.puffOff, hdg(bb) + 45); }
    if (t > tTack && tNew === null && hdg(bb) >= 42) tNew = t - tTack;
    rec.take(bb, { wind: w * KN, windKn: +w.toFixed(0), note: t < 3 ? '12 knots' : t < 13 ? `puff ${w.toFixed(0)} knots, sheets pinned` : t < tTack ? '12 knots' : phase === 0 ? 'helm down 35°' : 'new tack' }); });
  cells.push({ boat: k, title, frames: rec.frames, track: rec.track });
  console.log(k, 'puff: peak weather helm', st.puffHelm.toFixed(1), 'peak heel', st.puffHeel.toFixed(0), 'luffed', st.puffOff.toFixed(0), '| tack: on the new course after', tNew && tNew.toFixed(1), 's; end', b.speed() / KN);
}
fs.writeFileSync(new URL('../out/g1-old-vs-real.json', import.meta.url), JSON.stringify({ title: 'H-boat close-hauled: puff to 20 knots, then a tack. Old data | class offsets', cols: 2, rows: 1, cells, scale: 16, forceScale: 0.03, font: 16, stack: true, insetZoom: 1.6,
  extraKeys: [['wind', 'windKn', 0, ' kn']], W: 900, H: 760, fps: FPS, strip: SM.PLACEHOLDERS, meta, hulls }));
