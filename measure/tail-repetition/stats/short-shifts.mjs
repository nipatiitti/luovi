// Slope self-correlation of band (N = 128) plus tail at the short tiles' own multiples, by direct sums over every bin,
// storm sea, seed 1: shifts inside the 0.11 Lp natural correlation length that the search excludes.
import { W, build, LAYOUTS, layoutOf, generateRotated } from './lib.mjs'
const sea = build('storm', 128, 3, 1), Lp = 2 * Math.PI / sea.peakWavenumber
for (const ln of ['L0', 'L1', 'L2']) {
  const lay = layoutOf(sea, LAYOUTS[ln])
  const cas = generateRotated(sea, lay, W.tailStream(1))
  const bins = []
  for (const c of cas) { const n = c.resolution, half = n / 2, dk = 2 * Math.PI / c.tile, ca = Math.cos(c.angle), sa = Math.sin(c.angle)
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) { const i = iy * n + ix, j = ((n - iy) % n) * n + (n - ix) % n
      const hr = c.re[i] + c.re[j], hi = c.im[i] - c.im[j], P = hr * hr + hi * hi; if (P === 0) continue
      const lx = (ix - half) * dk, ly = (iy - half) * dk; bins.push([ca * lx - sa * ly, sa * lx + ca * ly, P * (lx * lx + ly * ly)]) } }
  const { kx, ky, k, amplitude, count } = sea.components
  for (let i = 0; i < count; i++) bins.push([kx[i], ky[i], 0.5 * amplitude[i] ** 2 * k[i] ** 2])
  const V = bins.reduce((p, b) => p + b[2], 0)
  const rho = (x, y) => bins.reduce((p, b) => p + b[2] * Math.cos(b[0] * x + b[1] * y), 0) / V
  const t1 = lay.tiles[1], t2 = lay.tiles[2]
  const pts = { 't2 (x)': [t2, 0], '2 t2 (x)': [2 * t2, 0], 't2 (y)': [0, t2], 't1 (x)': [t1, 0], 't1 (y)': [0, t1], '0.5 m (x)': [0.5, 0], '1 m (x)': [1, 0] }
  console.log(ln, Object.entries(pts).map(([n, [x, y]]) => `${n} ${Math.hypot(x, y).toFixed(2)} m = ${(Math.hypot(x, y) / Lp).toFixed(3)} Lp: ${rho(x, y).toFixed(3)}`).join(' | '))
}
