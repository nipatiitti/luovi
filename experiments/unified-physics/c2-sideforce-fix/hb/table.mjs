import fs from 'fs';
const L = (t) => JSON.parse(fs.readFileSync(new URL(`../out/numbers-${t}.json`, import.meta.url)));
const V = { base: L('base'), r1: L('r1only'), r2: L('r2only'), m: L('combined') }, tags = ['base', 'r1', 'r2', 'm'];
const row = (label, sec, key, f) => console.log(label.padEnd(44), tags.map((t) => { try { return String(f(V[t][sec][key])).padStart(22); } catch (e) { return '?'.padStart(22); } }).join(''));
console.log(''.padEnd(44) + tags.map((t) => t.padStart(22)).join(''));
for (const k of ['hboat', 'ifboat']) for (const kn of [5, 1]) { const g = (a, f) => tags.map(() => 0) && 0;
  for (const [nm, f] of [['peak rate 30/45/60', (o) => o.peakRate], ['hdg after 8 s', (o) => o.hdg8], ['speed lost 4 s %', (o) => o.lost4pct], ['peak load N', (o) => o.peakLoadN], ['min grip', (o) => o.minAttach]])
    console.log(`${k} ${kn}kn ${nm}`.padEnd(44), tags.map((t) => [30, 45, 60].map((a) => f(V[t].hardOver[`${k} ${kn}kn ${a}`])).join('/').padStart(22)).join('')); }
for (const k of ['hboat', 'ifboat']) for (const h of [20, 35]) row(`tack ${k} ${h}: new course s / lost% / m`, 'tack', `${k} ${h}`, (o) => `${o.newCourseS} / ${o.speedLostPct} / ${o.lostToWindwardM}`);
for (const h of [20, 35]) console.log(`Folkboat/H-boat tack time ${h}`.padEnd(44), tags.map((t) => (V[t].tack[`ifboat ${h}`].newCourseS / V[t].tack[`hboat ${h}`].newCourseS).toFixed(2).padStart(22)).join(''));
for (const k of ['hboat', 'ifboat']) for (const m of ['centred', 'let go']) row(`hands off 15 s ${k} ${m}`, 'handsOff', `${k} ${m}`, (o) => `${o.offAfter15s} (rud ${o.steadyRudder})`);
for (const k of ['hboat', 'ifboat']) for (const c of ['close-hauled', 'beam reach']) for (const w of [8, 12, 16, 20, 24]) row(`${k} ${c} ${w}: helm / heel / kn / air`, 'steady', `${k} ${c} ${w}`, (o) => `${o.weatherHelm} / ${o.heel} / ${o.kn} / ${o.air}`);
for (const k of ['hboat', 'ifboat']) { for (const w of [22, 28, 32]) for (const m of ['held', 'eased']) row(`puff ${k} ${w} ${m}: helm/off/heel/grip/air`, 'puff', `${k} ${w} ${m}`, (o) => `${o.peakHelm}/${o.peakOff}/${o.peakHeel}/${o.minGrip}/${o.peakAir}`);
  for (const w of [20, 24]) row(`bear away ${k} ${w} pinned: end off/grip/air`, 'bearAway', `${k} ${w} pinned`, (o) => `${o.endOff}(pk ${o.peakOff})/${o.minGrip}/${o.peakAir}`); }
