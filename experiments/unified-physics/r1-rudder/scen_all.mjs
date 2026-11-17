// Scripted manoeuvres 1 to 4 for both boats. Same script for every boat; all numbers go to out/numbers.json.
import fs from 'fs';
import { recorder, writeScenario, settle, run, HULLS, SM, KN, RAD, r2 } from './scen_lib.mjs';
const keys = Object.keys(HULLS), W12 = 12, CH = { main: 8, jib: 12 }, numbers = {};
const hdg = (b) => SM.wrap(b.psi) / RAD;
const steady = (b) => ({ speedKn: r2(b.speed() / KN), leewayDeg: r2(b.leewayDeg(), 1), heelDeg: r2(Math.abs(b.phi) / RAD, 1), rudderDeg: r2(b.delta / RAD, 1) });

// ---- 1. tack at 10, 20, 35 degrees of helm (starboard to port tack; wind from north)
{
  const cells = []; numbers.tack = [];
  for (const helm of [10, 20, 35]) for (const key of keys) {
    const b = settle(key, { windKn: W12, courseDeg: -45, ...CH }), rec = recorder(HULLS[key]), st0 = steady(b), U0 = b.speed();
    const vmg0 = b.u * Math.cos(b.psi) - b.v * Math.sin(b.psi);
    let phase = 0, tHead = null, tNew = null, minSp = 1e9, tMin = 0, tRec = null; const lead = 2, total = 40;
    run(b, total, (bb, t) => {
      const h = hdg(bb);
      if (t < lead) return { tillerDeg: SM.helmTo(bb, -45 * RAD), mainSheet: CH.main, jibSheet: CH.jib, crew: 1 };
      if (phase === 0 && h > 20) phase = 1;
      const through = h > 0; // bow through the wind: jib across, crew across
      return { tillerDeg: phase === 0 ? helm : SM.helmTo(bb, 45 * RAD), mainSheet: CH.main, jibSheet: CH.jib, jibSide: through ? -1 : 1, crew: through ? -1 : 1 };
    }, () => ({ wind: W12 * KN, windDir: 0 }), (bb) => {
      const t = bb.t - lead, h = hdg(bb), sp = bb.speed();
      if (bb.t <= 24) rec.take(bb, { wind: W12 * KN, note: bb.t < lead ? 'close-hauled' : phase === 0 ? `helm ${helm}°` : 'steering the new course' });
      if (t > 0) { if (tHead === null && h >= 0) tHead = t; if (tNew === null && h >= 42) tNew = t; if (sp < minSp) { minSp = sp; tMin = t; } if (tRec === null && t > tMin + 0.5 && tNew !== null && sp >= 0.9 * U0) tRec = t; }
    });
    const lost = vmg0 * (total - lead) - (b.Y - vmg0 * lead); // metres to windward against carrying on untacked
    numbers.tack.push({ boat: key, helmDeg: helm, before: st0, headToWindS: r2(tHead, 1), onNewCourseS: r2(tNew, 1), speedLostPct: r2(100 * (1 - minSp / U0), 0), minSpeedKn: r2(minSp / KN), lostToWindwardM: r2(lost, 1), backTo90pctS: tRec === null ? null : r2(tRec, 1) });
    cells.push({ boat: key, title: `${HULLS[key].name}, helm ${helm}°`, frames: rec.frames, track: rec.track });
  }
  writeScenario('g1-tack', { title: 'Tack at 10, 20 and 35 degrees of helm, 12 knots', cols: 2, rows: 3, cells, scale: 6.5, forceScale: 0.022, font: 16, sideFrac: 0.47, W: 900, H: 900 });
}

// ---- 2. puff close-hauled, 12 to 18 knots at t = 3 s, handled three ways
{
  const cells = []; numbers.puff = [];
  const ways = [['hold everything', (bb) => ({ tillerDeg: SM.helmTo(bb, -45 * RAD), mainSheet: CH.main })], ['ease the main', (bb, t) => ({ tillerDeg: SM.helmTo(bb, -45 * RAD), mainSheet: t > 3.5 ? 30 : CH.main })], ['let the tiller go', (bb, t) => ({ tillerDeg: t > 3 ? 0 : SM.helmTo(bb, -45 * RAD), mainSheet: CH.main })]];
  for (const [name, way] of ways) for (const key of keys) {
    const b = settle(key, { windKn: W12, courseDeg: -45, ...CH }), rec = recorder(HULLS[key]), st0 = steady(b);
    let peakHeel = 0, peakRud = 0, peakLoad = 0; const wind = (t) => (12 + 6 * SM.clamp((t - 3) / 1, 0, 1)) * KN;
    run(b, 20, (bb, t) => ({ jibSheet: CH.jib, crew: 1, ...way(bb, t) }), (t) => ({ wind: wind(t), windDir: 0 }), (bb) => {
      rec.take(bb, { wind: wind(bb.t), note: bb.t < 3 ? '12 kn' : `puff 18 kn: ${name}` });
      peakHeel = Math.max(peakHeel, Math.abs(bb.phi) / RAD); peakRud = Math.max(peakRud, Math.abs(bb.delta) / RAD); peakLoad = Math.max(peakLoad, Math.abs(bb.out.rudderY));
    });
    numbers.puff.push({ boat: key, way: name, before: st0, peakHeelDeg: r2(peakHeel, 0), peakRudderDeg: r2(peakRud, 0), peakRudderLoadN: Math.round(peakLoad), headingChangeDeg: r2(hdg(b) + 45, 0), speedAfter17sKn: r2(b.speed() / KN), heelAfter17sDeg: r2(Math.abs(b.phi) / RAD, 0) });
    cells.push({ boat: key, title: `${HULLS[key].name}: ${name}`, frames: rec.frames, track: rec.track });
  }
  writeScenario('g2-puff', { title: 'Puff close-hauled, 12 to 18 knots, handled three ways', cols: 2, rows: 3, cells, scale: 6.5, forceScale: 0.016, font: 16, sideFrac: 0.47, W: 900, H: 900 });
}

// ---- 3. bearing away to a broad reach: main eased with the helm, or pinned for 10 s first
{
  const cells = []; numbers.bearAway = [];
  for (const [name, easeAt] of [['main eased with the helm', 2], ['main pinned, eased at 12 s', 12]]) for (const key of keys) {
    const b = settle(key, { windKn: W12, courseDeg: -45, ...CH }), rec = recorder(HULLS[key]);
    let hAt12 = null, tReach = null, peakHeel = 0, peakRud = 0, peakLoad = 0, heelAt12 = 0;
    run(b, 24, (bb, t) => t < 2 ? { tillerDeg: SM.helmTo(bb, -45 * RAD), mainSheet: CH.main, jibSheet: CH.jib, crew: 1 }
      : { tillerDeg: SM.helmTo(bb, -135 * RAD), mainSheet: t > easeAt ? 70 : CH.main, jibSheet: 40, crew: 1 }, () => ({ wind: W12 * KN, windDir: 0 }), (bb) => {
      rec.take(bb, { wind: W12 * KN, note: bb.t < 2 ? 'close-hauled' : bb.t > easeAt ? 'helm up, main eased' : 'helm up, MAIN PINNED' });
      if (hAt12 === null && bb.t >= 12) { hAt12 = hdg(bb); heelAt12 = Math.abs(bb.phi) / RAD; } if (tReach === null && hdg(bb) < -125) tReach = bb.t - 2;
      if (bb.t > 2) { peakHeel = Math.max(peakHeel, Math.abs(bb.phi) / RAD); peakRud = Math.max(peakRud, Math.abs(bb.delta) / RAD); peakLoad = Math.max(peakLoad, Math.abs(bb.out.rudderY)); }
    });
    numbers.bearAway.push({ boat: key, way: name, turnedBy12sDeg: r2(-45 - hAt12, 0), heelAt12sDeg: r2(heelAt12, 0), onBroadReachS: tReach === null ? null : r2(tReach, 1), peakHeelDeg: r2(peakHeel, 0), peakRudderDeg: r2(peakRud, 0), peakRudderLoadN: Math.round(peakLoad), finalSpeedKn: r2(b.speed() / KN) });
    cells.push({ boat: key, title: `${HULLS[key].name}: ${name}`, frames: rec.frames, track: rec.track });
  }
  writeScenario('g3-bear-away', { title: 'Bearing away to a broad reach, 12 knots: main eased, or pinned first', cols: 2, rows: 2, cells, scale: 6.5, forceScale: 0.022, font: 17, sideFrac: 0.45, W: 900, H: 760 });
}

// ---- 4. stop and start: luff and coast, sternway with reversed helm, back the jib, sheet in
{
  const cells = []; numbers.stopStart = [];
  for (const key of keys) {
    const b = settle(key, { windKn: W12, courseDeg: -45, ...CH }), rec = recorder(HULLS[key]);
    let phase = 0, tPh = 0; const ev = {}, X0 = b.X, Y0 = b.Y; let minU = 0, n = 0;
    const notes = ['close-hauled', 'luff, main eased, jib let fly, coasting', 'sternway: helm reversed, jib aback', 'jib across, sheets in', 'sailing'];
    run(b, 150, (bb, t) => {
      const h = hdg(bb);
      if (phase === 0 && t >= 2) { phase = 1; tPh = t; }
      else if (phase === 1 && bb.u < -0.15) { phase = 2; ev.stoppedAfterS = r2(t - tPh, 1); ev.coastM = r2(Math.hypot(bb.X - X0, bb.Y - Y0), 1); tPh = t; }
      else if (phase === 2 && h < -40) { phase = 3; ev.bowOffAfterS = r2(t - tPh, 1); ev.sternwayKn = r2(-minU / KN); tPh = t; }
      else if (phase === 3 && bb.u > 4 * KN) { phase = 4; ev.to4knAfterS = r2(t - tPh, 1); }
      minU = Math.min(minU, bb.u);
      if (phase === 0) return { tillerDeg: SM.helmTo(bb, -45 * RAD), mainSheet: CH.main, jibSheet: CH.jib, crew: 1 };
      if (phase === 1) return { tillerDeg: bb.u > 0.3 ? SM.helmTo(bb, 0) : 0, mainSheet: 60, jibFly: true, crew: 0 };
      if (phase === 2) return { tillerDeg: 30, mainSheet: 60, jibSheet: 25, jibSide: -1, crew: 0 }; // helm that would turn her to starboard going ahead; jib held out to starboard
      return { tillerDeg: SM.helmTo(bb, -50 * RAD), mainSheet: CH.main, jibSheet: CH.jib, jibSide: 1, crew: 1 };
    }, () => ({ wind: W12 * KN, windDir: 0 }), (bb) => { if (n++ % 12 === 0) { rec.take(bb, { wind: W12 * KN, note: notes[phase] }); rec.take(bb, {}); } });
    rec.frames.forEach((f, i) => { if (!f.note) rec.frames[i] = null; }); const fr = rec.frames.filter(Boolean), tr = rec.track.filter((_, i) => rec.frames[i]);
    numbers.stopStart.push({ boat: key, ...ev, endedInPhase: notes[phase], finalSpeedKn: r2(b.speed() / KN), finalHeadingDeg: r2(hdg(b), 0) });
    cells.push({ boat: key, title: HULLS[key].name, frames: fr, track: tr });
  }
  writeScenario('g4-stop-start', { title: 'Stop and start, 12 knots: luff and coast, sternway, back the jib, sheet in', cols: 2, rows: 1, cells, scale: 7, forceScale: 0.022, font: 18, stack: true, insetZoom: 1.3, speedup: 6, W: 900, H: 700 });
}
fs.writeFileSync(new URL('./out/numbers.json', import.meta.url), JSON.stringify(numbers, null, 1));
for (const k of Object.keys(numbers)) { console.log('== ' + k); for (const r of numbers[k]) console.log(JSON.stringify(r)); }
