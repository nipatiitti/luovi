// wavedrag.mjs: which wave-drag curve each hull runs with. The model reads one curve per hull, wave-making drag as a
// fraction of canoe-body weight against Froude number, with a label: hull.waveDrag = { source, curve: [[Fn, fraction], ...] }.
// gen_hulls.mjs fills it with the Delft regression. When data/wave-slice.json exists (the slice wave method's curves, one
// [[Fn, fraction], ...] table per boat key, bare or as { source, rr }) those curves replace it for the boats the file lists. WAVE=delft in the
// environment keeps the Delft curves, for comparing against the earlier experiments.
import fs from 'fs';
const FILE = new URL('./data/wave-slice.json', import.meta.url);
export function applyWaveDrag(hulls, prefer = process.env.WAVE || 'slice') {
  if (prefer === 'delft' || !fs.existsSync(FILE)) return hulls;
  const slice = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  for (const key of Object.keys(hulls)) {
    const entry = slice[key], curve = Array.isArray(entry) ? entry : entry && (entry.curve || entry.rr); // a bare table, or { source, rr }
    if (!Array.isArray(curve) || curve.length < 2) continue; // a boat the file does not list keeps its fallback
    hulls[key].waveDrag = { source: (entry && entry.source) || slice.source || 'slice wave method (data/wave-slice.json)', curve };
  }
  return hulls;
}
