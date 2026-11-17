// diag.mjs: steady rudder angle and turning-moment budget against wind, close-hauled and beam reach.
import { SM, makeBoat, run, KN, RAD } from './lib.mjs';
const boats = (process.env.BOATS || 'hboat').split(',');
const cases = [['close-hauled', -45, 8, 12], ['beam reach', -90, 30, 28], ['beam reach, main pinned', -90, 8, 28]];
for (const key of boats) for (const [nm, course, main, jib] of cases) {
  console.log(`\n${key} ${nm} (main ${main}, jib ${jib}); moments in N m, + = turning to windward`);
  console.log('wind  speed heel  leeway w.helm flow  att  | drive  sailLever sailSide hull   rudder  air | tiller free: luffs in 15 s, heel');
  for (const w of [8, 12, 16, 20, 24]) {
    const b = makeBoat(key, { psiDeg: course, u: 2.5 }); let ok = true;
    const ctl = (bb) => ({ tillerDeg: SM.helmTo(bb, course * RAD, 60), mainSheet: main, jibSheet: jib, crew: 1 });
    const acc = { n: 0, d: 0, h: 0, sp: 0, lw: 0, fl: 0, at: 0, dr: 0, a: 0, b: 0, c: 0, e: 0, hd: 0, air: 0 };
    try { run(b, 60, ctl, () => ({ wind: w * KN, windDir: 0 }), (bb) => { if (bb.t > 50) { const o = bb.out; acc.n++; acc.d += bb.delta / RAD; acc.h += bb.phi / RAD; acc.sp += bb.speed() / KN; acc.lw += bb.leewayDeg(); acc.fl += o.rudderFlowDeg; acc.at += o.rudderAttach; acc.dr += o.sailX; acc.a += o.nLever; acc.b += o.nSailSide; acc.c += o.nHull; acc.e += o.nRud; acc.air += o.rudderAir || 0; acc.hd += SM.wrap(bb.psi) / RAD - course; } }); } catch (e) { ok = false; }
    const m = (k) => acc[k] / acc.n; const f = (v, d = 1, wd = 6) => v.toFixed(d).padStart(wd);
    // free tiller for 15 s
    let dh = NaN, hl = NaN; const p0 = b.psi;
    try { run(b, 15, () => ({ tillerDeg: 0, mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 })); dh = (b.psi - p0) / RAD; hl = b.phi / RAD; } catch (e) {}
    console.log(`${String(w).padStart(3)} ${f(m('sp'), 2)} ${f(-m('h'))} ${f(m('lw'))} ${f(-m('d'))} ${f(-m('fl'))} ${f(m('at'), 2, 5)} | ${f(m('dr'), 0)} ${f(m('a'), 0, 8)} ${f(m('b'), 0, 8)} ${f(m('c'), 0, 7)} ${f(m('e'), 0, 7)} ${f(acc.air / acc.n, 2, 5)} | ${f(dh)} ${f(hl)} ${ok ? '' : 'BLEW UP'} hdgErr ${f(m('hd'))}`);
  }
}
