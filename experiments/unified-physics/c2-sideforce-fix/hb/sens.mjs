// sens.mjs: how much of the helm change hangs on two choices made in class_hboat.mjs. Rewrites nothing that is kept.
import fs from 'fs'; import { execFileSync } from 'child_process'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname), f = path.join(here, '../out/hboat_class.json'), keep = fs.readFileSync(f, 'utf8'), base = JSON.parse(keep);
const xF = base.check.waterline.xFwd, out = {};
const variants = { 'mast at the real heel (rake lost)': (d) => { d.rig.mastX = +(xF - base.check.rig.mastHeelBody).toFixed(3); }, 'keel lower edge rounded at its half thickness': (d) => { delete d.blades[0].edgeRadius; }, 'ellipses of the real centreline depth': (d) => { d.canoe.stations.forEach((s, i) => { s[2] = base.check.realStations[i]; }); } };
try { for (const [nm, fn] of Object.entries(variants)) { const v = JSON.parse(keep); fn(v.def); fs.writeFileSync(f, JSON.stringify(v));
  fs.rmSync(path.join(here, '../out/sens'), { recursive: true, force: true }); fs.mkdirSync(path.join(here, '../out/sens'));
  for (const g of ['gen_hulls.mjs', 'gen_sails.mjs']) { const s = fs.readFileSync(path.join(here, g), 'utf8').replaceAll('../out/', '../out/sens/'); fs.writeFileSync(path.join(here, '_tmp_' + g), s); execFileSync('node', [path.join(here, '_tmp_' + g)], { stdio: 'ignore' }); fs.rmSync(path.join(here, '_tmp_' + g)); }
  out[nm] = execFileSync('node', [path.join(here, 'sens_run.mjs')], { env: { ...process.env, SET: 'out/sens' } }).toString().trim(); console.log(nm, '\n', out[nm]); } }
finally { fs.writeFileSync(f, keep); fs.rmSync(path.join(here, '../out/sens'), { recursive: true, force: true }); }
