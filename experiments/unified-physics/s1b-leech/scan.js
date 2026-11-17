// node scan.js '{"Scrit":0.1,...}' cambers angles
const { fixedRun } = require('./sim.js');
const opt = JSON.parse(process.argv[2] || '{}');
const cambers = JSON.parse(process.argv[3] || '[0,0.1,0.2]'), angles = JSON.parse(process.argv[4] || '[4,8,12,16,20,30,45,60,90]');
const Ns = JSON.parse(process.argv[5] || '[6,12,24]');
for (const camber of cambers) { for (const N of Ns) { let s = `cam ${camber} N${String(N).padStart(2)}: `;
  for (const a of angles) { const r = fixedRun({ N, camber, alpha: a, opt, transits: a >= 30 ? 80 : 40 }); s += `${a}: ${r.cl.toFixed(2)}/${r.cd.toFixed(2)}/${r.noise.toFixed(2)}${opt.sep?'/f'+r.f.toFixed(2):''} | `; }
  console.log(s); } }
