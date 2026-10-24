// Why about 0.6: cascade 2's slope self-correlation lobe around its own lattice points (direct sums, storm, seed 1,
// L4b), the count of cascade 1 lattice points in the search window, and the floor a random-alignment model predicts.
import { W, build, LAYOUTS, layoutOf, generateRotated } from './lib.mjs'
const sea = build('storm', 128, 3, 1), Lp = 2 * Math.PI / sea.peakWavenumber
const lay = layoutOf(sea, LAYOUTS.L4b)
const cas = generateRotated(sea, lay, W.tailStream(1))
const binsOf = (c) => { const n = c.resolution, half = n / 2, dk = 2 * Math.PI / c.tile, out = []
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) { const i = iy * n + ix, j = ((n - iy) % n) * n + (n - ix) % n
    const hr = c.re[i] + c.re[j], hi = c.im[i] - c.im[j], P = hr * hr + hi * hi; if (P === 0) continue
    const lx = (ix - half) * dk, ly = (iy - half) * dk; out.push([lx, ly, P * (lx * lx + ly * ly)]) } return out }
const rhoOf = (bins) => { const V = bins.reduce((p, b) => p + b[2], 0); return (x, y) => bins.reduce((p, b) => p + b[2] * Math.cos(b[0] * x + b[1] * y), 0) / V }
// lobe of cascade 2 in its own lattice frame, radially averaged over 8 directions
const r2 = rhoOf(binsOf(cas[2])), t2 = lay.tiles[2]
const lobe = []
for (const f of [0.0025, 0.005, 0.0075, 0.01, 0.015, 0.02, 0.03, 0.05]) { let s = 0; for (let a = 0; a < 8; a++) s += r2(f * t2 * Math.cos(a * Math.PI / 8), f * t2 * Math.sin(a * Math.PI / 8)); lobe.push([f, s / 8]) }
console.log('cascade 2 slope lobe (offset as fraction of t2 -> mean rho2):', lobe.map(([f, v]) => `${f}: ${v.toFixed(3)}`).join(', '))
const r1 = rhoOf(binsOf(cas[1])), t1 = lay.tiles[1]
const lobe1 = [0.0025, 0.005, 0.01, 0.02].map((f) => { let s = 0; for (let a = 0; a < 8; a++) s += r1(f * t1 * Math.cos(a * Math.PI / 8), f * t1 * Math.sin(a * Math.PI / 8)); return `${f}: ${(s / 8).toFixed(3)}` })
console.log('cascade 1 slope lobe:', lobe1.join(', '))
// window |x| <= 10 Lp, 0 <= y <= 10 Lp holds about 200 Lp^2 / t1^2 cascade 1 lattice points; offsets of those points
// from cascade 2's lattice are close to uniform over a t2 cell when the two lattices are incommensurate, so the nearest of
// N1 offsets lies about t2 / sqrt(pi N1) from a lattice point (expected minimum of N1 uniform points in a unit cell)
const N1 = 200 * Lp * Lp / (t1 * t1)
console.log(`t1 ${t1.toFixed(2)} m, t2 ${t2.toFixed(3)} m, cascade 1 lattice points in window ${N1.toFixed(0)}, expected best offset ${(1 / Math.sqrt(Math.PI * N1)).toFixed(4)} t2`)
