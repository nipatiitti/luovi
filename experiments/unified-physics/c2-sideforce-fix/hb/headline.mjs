// headline.mjs: the v3 headline table for the H-boat, C2 off against on, from ../out/numbers-c2off.json and numbers-c2on.json
// (scen_m1.mjs); and checks that C2 off gives v3's stored numbers back exactly (data/v3-numbers-real.json, a copy of sailing-test-v3's).
import fs from 'fs';
const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url))), off = rd('../out/numbers-c2off.json'), on = rd('../out/numbers-c2on.json'), v3 = rd('./data/v3-numbers-real.json');
const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.flags; return JSON.stringify(c); };
console.log('C2 off reproduces v3 numbers-real.json exactly:', strip(off) === strip(v3));
const W = [8, 12, 16, 20, 24], row = (name, f) => console.log(name.padEnd(46), '|', f(off).padEnd(34), '|', f(on));
const st = (k) => (N) => W.map((w) => N.steady[`hboat close-hauled ${w}`][k]).join(' / ');
row('close-hauled 8..24 kn (4.1..12.3 m/s): speed kn', st('kn')); row('  leeway deg', st('leeway')); row('  heel deg', st('heel')); row('  helm deg (+ weather)', st('weatherHelm'));
row('tack 20 / 35 deg helm: s to new course', (N) => [20, 35].map((h) => N.tack[`hboat ${h}`].newCourseS).join(' / '));
row('  speed lost %', (N) => [20, 35].map((h) => N.tack[`hboat ${h}`].speedLostPct).join(' / '));
row('hands off 15 s, centred', (N) => { const q = N.handsOff['hboat centred']; return `${q.sense} ${Math.abs(q.offAfter15s)} (rudder was ${q.steadyRudder})`; });
row('  let go', (N) => { const q = N.handsOff['hboat let go']; return `${q.sense} ${Math.abs(q.offAfter15s)}, rudder ends ${q.rudderEnds}`; });
for (const kn of [5, 1]) { row(`hard over ${kn} kn, 30/45/60: peak turn deg/s`, (N) => [30, 45, 60].map((a) => N.hardOver[`hboat ${kn}kn ${a}`].peakRate).join(' / ')); row('  heading after 8 s', (N) => [30, 45, 60].map((a) => N.hardOver[`hboat ${kn}kn ${a}`].hdg8).join(' / ')); }
row('reach puff 22/28/32 held: peak helm', (N) => [22, 28, 32].map((w) => N.puff[`hboat ${w} held`].peakHelm).join(' / '));
row('  off course deg', (N) => [22, 28, 32].map((w) => N.puff[`hboat ${w} held`].peakOff).join(' / '));
row('  eased: off course deg', (N) => [22, 28, 32].map((w) => N.puff[`hboat ${w} eased`].peakOff).join(' / '));
row('bear away pinned 20 / 24: ends off new course', (N) => [20, 24].map((w) => N.bearAway[`hboat ${w} pinned`].endOff).join(' / '));
row('beam reach 8..24: helm deg', (N) => W.map((w) => N.steady[`hboat beam reach ${w}`].weatherHelm).join(' / '));
row('  leeway deg', (N) => W.map((w) => N.steady[`hboat beam reach ${w}`].leeway).join(' / '));
row('Folkboat close-hauled: leeway', (N) => W.map((w) => N.steady[`ifboat close-hauled ${w}`].leeway).join(' / '));
row('  helm', (N) => W.map((w) => N.steady[`ifboat close-hauled ${w}`].weatherHelm).join(' / '));
