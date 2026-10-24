// Item 1: variance and slope shares, band self-correlation max at shifts 3..15 Lp, and band + realised Gaussian tail.
// usage: node corr.mjs <sea> <cut>
import { W, build, spectralBudget, LAYOUT, LAYOUT_ALT } from './lib.mjs'
const [name, cutArg] = process.argv.slice(2); const cut = Number(cutArg)
const seeds = [1, 2, 3, 4, 5]
const Ns = [32, 48, 64, 128, 256]
// radix-2 complex FFT in place
const fft = (re, im, n) => {
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]];[im[i], im[j]] = [im[j], im[i]] } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a)
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t } } }
}
const fft2 = (re, im, n) => { const r = new Float64Array(n), i2 = new Float64Array(n)
  for (let y = 0; y < n; y++) { for (let x = 0; x < n; x++) { r[x] = re[y * n + x]; i2[x] = im[y * n + x] } fft(r, i2, n); for (let x = 0; x < n; x++) { re[y * n + x] = r[x]; im[y * n + x] = i2[x] } }
  for (let x = 0; x < n; x++) { for (let y = 0; y < n; y++) { r[y] = re[y * n + x]; i2[y] = im[y * n + x] } fft(r, i2, n); for (let y = 0; y < n; y++) { re[y * n + x] = r[y]; im[y * n + x] = i2[y] } } }
// |h(k)|^2 of the real field at t = 0: h = h0(k) + conj(h0(-k)); returns power with k index shifted so j=0 is k=0
const tailPower = (casc) => { const n = casc.resolution, h = n / 2, P = new Float64Array(n * n)
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) { const i = iy * n + ix, jx = (n - ix) % n, jy = (n - iy) % n, j = jy * n + jx
    const re = casc.re[i] + casc.re[j], im = casc.im[i] - casc.im[j]; P[((iy + h) % n) * n + ((ix + h) % n)] = re * re + im * im }
  return P }
const res = 1024
const out = { name, cut, rows: [] }
const acc = {}
for (const seed of seeds) {
  const base = build(name, 32, cut, seed).sea
  const b = spectralBudget(base)
  const Lp = 2 * Math.PI / base.peakWavenumber
  const T = 32 * Lp, dk = 2 * Math.PI / T
  const kOut = Math.PI * res / T
  const casc = W.generateTail(base, { count: 1, resolution: res, tiles: [T], kInner: [base.cutWavenumber], kOuter: [kOut], choppiness: [1] }, W.tailStream(seed))[0]
  const P = tailPower(casc)
  // slope power P k^2
  const Ps = new Float64Array(res * res); let vT = 0, sT = 0
  for (let jy = 0; jy < res; jy++) for (let jx = 0; jx < res; jx++) { const kx = (jx < res / 2 ? jx : jx - res) * dk, ky = (jy < res / 2 ? jy : jy - res) * dk, i = jy * res + jx; Ps[i] = P[i] * (kx * kx + ky * ky); vT += P[i]; sT += Ps[i] }
  const Rh = { re: P.slice(), im: new Float64Array(res * res) }; fft2(Rh.re, Rh.im, res)
  const Rs = { re: Ps.slice(), im: new Float64Array(res * res) }; fft2(Rs.re, Rs.im, res)
  const vRest = b.tailVar - b.tailVarTo(kOut), sRest = b.tailSlope - b.tailSlopeTo(kOut)
  // shift grid: every 2nd lattice cell (spacing Lp/16), upper half-plane, 3..15 Lp
  const pts = []
  for (let my = 0; my <= 15 * 32; my += 2) for (let mx = -15 * 32; mx <= 15 * 32; mx += 2) { if (my === 0 && mx < 0) continue; const r = Math.hypot(mx, my) / 32; if (r < 3 || r > 15) continue; pts.push([mx * T / res, my * T / res, ((my + res) % res) * res + ((mx + res) % res)]) }
  // periodic default cascades: shifts at multiples of cascade 0's tile
  const lay = b.layout, t0 = lay.tiles[0]
  const cas = W.generateTail(base, lay, W.tailStream(seed)).map((c) => ({ c, P: tailPower(c) }))
  let vD = 0, sD = 0
  const per = []
  for (let a = -20; a <= 20; a++) for (let c = 0; c <= 20; c++) { if (c === 0 && a < 0) continue; const r = Math.hypot(a, c) * t0 / Lp; if (r >= 3 && r <= 15) per.push([a * t0, c * t0]) }
  const perR = per.map(() => [0, 0])
  for (const { c, P: Pc } of cas) { const n = c.resolution, d = 2 * Math.PI / c.tile
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) { const p = Pc[iy * n + ix]; if (p === 0) continue; const kx = (ix < n / 2 ? ix : ix - n) * d, ky = (iy < n / 2 ? iy : iy - n) * d, k2 = kx * kx + ky * ky; vD += p; sD += p * k2
      for (let q = 0; q < per.length; q++) { const co = Math.cos(kx * per[q][0] + ky * per[q][1]); perR[q][0] += p * co; perR[q][1] += p * k2 * co } } }
  const vDrest = b.tailVar - vD, sDrest = b.tailSlope - sD
  for (const [layoutName, layout] of [['main', LAYOUT], ['alt', LAYOUT_ALT]]) for (const N of Ns) {
    const sea = build(name, N, cut, seed, layout).sea, c = sea.components, A = c.amplitude[0]
    const vb = 0.5 * A * A * N; let sb = 0; for (let i = 0; i < N; i++) sb += 0.5 * A * A * c.k[i] ** 2
    let mh = 0, ms = 0, mht = 0, mst16 = 0, mstF = 0
    for (const [x, y, idx] of pts) { let h = 0, s = 0
      for (let i = 0; i < N; i++) { const co = Math.cos(c.kx[i] * x + c.ky[i] * y); h += co; s += c.k[i] * c.k[i] * co }
      const bh = 0.5 * A * A * h, bs = 0.5 * A * A * s
      mh = Math.max(mh, Math.abs(bh / vb)); ms = Math.max(ms, Math.abs(bs / sb))
      const th = Rh.re[idx], ts = Rs.re[idx]
      mht = Math.max(mht, Math.abs((bh + th) / (vb + vT + vRest)))
      mst16 = Math.max(mst16, Math.abs((bs + ts) / (sb + sT)))
      mstF = Math.max(mstF, Math.abs((bs + ts) / (sb + sT + sRest))) }
    let mpH = 0, mpS = 0
    for (let q = 0; q < per.length; q++) { const [x, y] = per[q]; let h = 0, s = 0; for (let i = 0; i < N; i++) { const co = Math.cos(c.kx[i] * x + c.ky[i] * y); h += co; s += c.k[i] * c.k[i] * co }
      mpH = Math.max(mpH, Math.abs((0.5 * A * A * h + perR[q][0]) / (vb + vD + vDrest))); mpS = Math.max(mpS, Math.abs((0.5 * A * A * s + perR[q][1]) / (sb + sD + sDrest))) }
    const key = `${layoutName} ${N}`
    const r = { varShare: vb / (vb + b.tailVar), slopeShare: sb / (sb + b.tailSlope), slopeShareSpec: b.bandSlopeSpec / (b.bandSlopeSpec + b.tailSlope), mh, ms, mht, mst16, mstF, mpH, mpS, nPer: per.length }
    acc[key] ??= []; acc[key].push(r)
  }
}
for (const [key, rs] of Object.entries(acc)) { const m = {}; for (const k of Object.keys(rs[0])) { const v = rs.map((r) => r[k]); m[k] = `${(v.reduce((a, b) => a + b) / v.length).toFixed(3)}${['mh', 'ms', 'mht', 'mstF'].includes(k) ? `[${Math.min(...v).toFixed(2)}-${Math.max(...v).toFixed(2)}]` : ''}` } console.log(name, cut, key, JSON.stringify(m)) }
