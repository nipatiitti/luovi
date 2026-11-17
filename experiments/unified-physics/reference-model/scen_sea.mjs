// scen_sea.mjs <tag> [steps per second]: the H-boat sailing in the reference sea (wind 7 m/s, fetch 15 km), close-hauled and on
// a beam reach, 40 s to settle and 60 s measured, against the same run on flat water. Writes out/sea-<tag>.json (numbers) and
// out/frames-<case>-<tag>.json (20 frames a second). A third argument `rad` switches on the reference-only damping.
// With SEA=1 C2=0 WAVE=delft in the environment it gives v2-radiation's numbers back exactly.
import fs from 'fs';
import { SM, makeBoat, KN, RAD, G } from './sealib.mjs';
import { helmTo } from './lib.mjs';
const tag = process.argv[2] || 'law', dt = 1 / (+process.argv[3] || 240), radOn = process.argv[4] === 'rad';
export const SEA = { wind: 7, fetch: 15000, gamma: 1, dir: 0, seed: 2026 };
const sea = SM.makeSea(SEA), Lwl = 6.386, vOchi = 0.093 * Math.sqrt(G * Lwl); // Ochi 1964: a slam needs forefoot emergence and a re-entry speed above 0.093 sqrt(g L)
const b0 = makeBoat('hboat'), sd = b0.d.sea, iFore = sd.stations.findIndex((q) => q.s >= 0.1 * Lwl - 1e-9), iStem = 1;
if (radOn) { const k0 = Math.round(-sd.h0 / sd.dh); let Aw = 0, m = 0; for (const q of sd.stations) { Aw += q.B[k0] * sd.ds; m += 1000 * q.A[k0] * sd.ds; } SM.C.RADIATION = Math.sqrt(1000 * G * Aw / (b0.d.mass + m)); }
const out = { sea: sea.info, dt, radiation: SM.C.RADIATION, cases: {} }, r3 = (v, d = 3) => +(+v).toFixed(d);
for (const [name, course, main, jib] of [['closehauled', -45, 8, 12], ['reach', -90, 30, 28]]) {
  const res = {};
  for (const wet of [false, true]) {
    const b = makeBoat('hboat', { psiDeg: course, u: 2.5 }), env = { wind: SEA.wind, windDir: 0, sea: wet ? sea : null }, ctl = (bb) => ({ tillerDeg: helmTo(bb, course * RAD), mainSheet: main, jibSheet: jib, crew: 1 });
    const settle = 40, rec = 60, n = Math.round((settle + rec) / dt), every = Math.round(1 / 20 / dt), frames = [];
    let sp = 0, ns = 0, zs = 0, z2 = 0, th = 0, th2 = 0, he = 0, he2 = 0, aB = 0, aC = 0, aB2 = 0, aC2 = 0, slams = 0, emerg = 0, out_ = false, stemMax = -9, bury = 0, wasBuried = false, spMin = 9, spMax = 0, thMax = 0, zMax = 0, blew = null, t0 = 0, cost = 0;
    for (let i = 0; i < n; i++) {
      const c0 = process.hrtime.bigint(); b.step(dt, ctl(b), env); cost += Number(process.hrtime.bigint() - c0);
      if (!Number.isFinite(b.u + b.v + b.r + b.p + b.zeta + b.theta)) { blew = b.t; break; }
      if (b.t < settle) continue;
      const v = b.speed() / KN, T = b.theta / RAD, H = b.phi / RAD; sp += v; ns++; zs += b.zeta; z2 += b.zeta ** 2; th += T; th2 += T * T; he += H; he2 += H * H; spMin = Math.min(spMin, v); spMax = Math.max(spMax, v);
      aB = Math.max(aB, Math.abs(b.accBow)); aC = Math.max(aC, Math.abs(b.accCockpit)); aB2 += b.accBow ** 2; aC2 += b.accCockpit ** 2;
      const q = sd.stations[iFore], dry = b.s_imm[iFore] < q.keelH; if (dry && !out_) emerg++; if (!dry && out_ && -b.s_wrelS[iFore] > vOchi) slams++; out_ = dry;
      const rel = b.s_imm[iStem] - sd.stations[iStem].sheerH; stemMax = Math.max(stemMax, rel); const bur = rel > 0; if (bur && !wasBuried) bury++; wasBuried = bur;
      if (i % every === every - 1) frames.push({ t: r3(b.t - settle, 2), z: r3(b.zeta), th: r3(T, 2), heel: r3(H, 1), kn: r3(v, 2), aB: r3(b.accBow, 2), aC: r3(b.accCockpit, 2), psi: r3(b.psi), X: r3(b.X, 2), Y: r3(b.Y, 2), eta: Array.from(b.s_eta, (x) => r3(x)), imm: Array.from(b.s_imm, (x) => r3(x)), slope: r3(Math.atan(b.s_sly[40]) / RAD, 1) });
    }
    const sdv = (s1, s2) => Math.sqrt(Math.max(0, s2 / ns - (s1 / ns) ** 2));
    res[wet ? 'sea' : 'flat'] = { blewUpAt: blew, speedKn: r3(sp / ns), speedMin: r3(spMin), speedMax: r3(spMax), heaveRms: r3(sdv(zs, z2)), heaveMean: r3(zs / ns), pitchRmsDeg: r3(sdv(th, th2), 2), pitchMeanDeg: r3(th / ns, 2), heelMeanDeg: r3(he / ns, 1), heelRmsDeg: r3(sdv(he, he2), 2),
      accBowPeak: r3(aB, 2), accBowRms: r3(Math.sqrt(aB2 / ns), 2), accCockpitPeak: r3(aC, 2), accCockpitRms: r3(Math.sqrt(aC2 / ns), 2), forefootEmergences: emerg, slamsOchi: slams, stemBuried: bury, stemheadFreeboardMin: r3(-stemMax), usPerStep: r3(cost / n / 1000, 1) };
    if (wet || name === 'closehauled') fs.writeFileSync(new URL(`./out/frames-${name}-${wet ? 'sea' : 'flat'}-${tag}.json`, import.meta.url), JSON.stringify({ sea: sea.info, frames }));
  }
  res.speedLostKn = r3(res.flat.speedKn - res.sea.speedKn); out.cases[name] = res; console.log(name, JSON.stringify(res, null, 0));
}
console.log(JSON.stringify(out.sea));
fs.writeFileSync(new URL(`./out/sea-${tag}.json`, import.meta.url), JSON.stringify(out, null, 1));
