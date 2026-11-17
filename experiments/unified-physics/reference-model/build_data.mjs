// build_data.mjs: runs the three generators in order (about 25 s): class_hboat.mjs (H-boat from the class offsets),
// gen_hulls.mjs (section stacks of both boats), gen_sails.mjs (the stand-in sail table). Everything lands in out/.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
for (const f of ['class_hboat.mjs', 'gen_hulls.mjs', 'gen_sails.mjs']) execFileSync(process.execPath, [fileURLToPath(new URL(`./${f}`, import.meta.url))], { stdio: 'inherit' });
