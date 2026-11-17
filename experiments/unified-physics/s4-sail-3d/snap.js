// frame snapshot helpers
const r2 = x => Math.round(x * 100) / 100;
function geom(W) { return { corners: Array.from(W.corners, r2), psail: Array.from(W.psail), Np: W.Np }; }
function frame(W, extra) {
  const wk = W.edges.map(E => ({ k: E.kind, s: E.sail, m: E.m, nr: E.nr, W: Array.from(E.W.subarray(0, 3 * E.nr * (E.m + 1)), r2), on: E.kind !== 'luff' || E.shed.some(x => x) || undefined, G: E.kind === 'luff' ? Array.from(E.G.subarray(0, (E.nr - 1) * E.m), x => Math.abs(x) > 1e-6 ? 1 : 0) : undefined }));
  return Object.assign({ dp: Array.from(W.dp, r2), F: W.Fs.map(f => f.map(r2)), M: W.Ms.map(f => f.map(r2)), S: W.Sval.map(a => Array.from(a, r2)), wk }, extra || {});
}
module.exports = { geom, frame };
