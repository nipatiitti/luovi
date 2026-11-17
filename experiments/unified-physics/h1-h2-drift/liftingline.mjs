// liftingline.mjs
// Prandtl lifting line for a rectangular plate cut into spanwise strips (Glauert collocation).
// Used only in the plate experiment, as the "high aspect ratio" branch that the proposal's
// strip-direction rule would hand a tall fin to. Returns lift slope per radian on plate area.
export function liftingLineSlope(AR, nTerms = 40) {
  const mu = Math.PI / (2 * AR); // a0 c / (4 b) with a0 = 2 pi
  const n = nTerms;
  const M = [], rhs = [];
  for (let k = 1; k <= n; k++) {
    const th = (k * Math.PI) / (2 * n); // half span, odd terms only
    const row = [];
    for (let j = 0; j < n; j++) {
      const m = 2 * j + 1;
      row.push(Math.sin(m * th) * (m * mu + Math.sin(th)));
    }
    M.push(row); rhs.push(mu * Math.sin(th));
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; [rhs[c], rhs[p]] = [rhs[p], rhs[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
      rhs[r] -= f * rhs[c];
    }
  }
  const a = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = rhs[r];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * a[k];
    a[r] = s / M[r][r];
  }
  return Math.PI * AR * a[0];
}
export const helmbold = (AR) => (2 * Math.PI * AR) / (2 + Math.sqrt(4 + AR * AR));
export const jones = (AR) => (Math.PI * AR) / 2;
