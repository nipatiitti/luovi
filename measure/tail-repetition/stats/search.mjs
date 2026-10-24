// Issue #44: worst near-repeat of band plus tail under each candidate cascade layout.
// usage: node search.mjs <sea> <layout> <seeds comma> <band sizes comma> [U]
//
// The realised spatial self-correlation of the drawn surface (t = 0, as the wave shape session measured it) is
//   rho(s) = (Vb rho_b(s) + sum_c V_c rho_c(R(-angle_c) s)) / (Vb + sum_c V_c),
// band and cascades sharing no wave so their cross terms vanish over space. rho_c is periodic on cascade c's tile and is
// sampled exactly (zero-padded inverse FFT of the realised power |h(k)|^2, U times finer than the lattice). The band is
// summed directly. Height weighs each wave by 1, slope (the gradient vector, trace of its covariance) by k^2.
//
// The maximum over the shift window |x| <= 10 Lp, 0 <= y <= 10 Lp (rho is even, so the half plane is the whole), outside
// an exclusion radius, is found by branch and bound: a box's bound is the band's centre value plus a Lipschitz margin plus,
// per cascade, the max-pooled rho_c over the box's footprint on that cascade's periodic grid. Boxes are refined best
// first until no box's bound exceeds the best value found by more than TOL, or the box is below half a sample of the
// finest cascade. The result is the maximum over the sampled rho_c to within TOL.
import { W, build, LAYOUTS, layoutOf, generateRotated, fft2, integLog } from './lib.mjs'

const [seaName, layoutName, seedArg, nArg, uArg] = process.argv.slice(2)
const seeds = seedArg.split(',').map(Number)
const Ns = nArg.split(',').map(Number)
const U = Number(uArg ?? 8)
const CUT = 3
const WINDOW_LP = 10
const TOL = 0.002
const NAT_LEVEL = 0.1

/** One cascade's realised height and slope correlation on a G x G grid over its tile, normalised, plus max pyramids. */
const cascadeGrids = (casc) => {
  const n = casc.resolution, half = n / 2, G = n * U, dk = 2 * Math.PI / casc.tile
  const re = new Float64Array(G * G), im = new Float64Array(G * G)
  let Vh = 0, Vs = 0
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const i = iy * n + ix, j = ((n - iy) % n) * n + (n - ix) % n
    // h(k) at t = 0 is h0(k) + conj(h0(-k)), as the GPU evolution forms it
    const hr = casc.re[i] + casc.re[j], hi = casc.im[i] - casc.im[j]
    const P = hr * hr + hi * hi
    if (P === 0) continue
    const mx = ix - half, my = iy - half, k2 = (mx * mx + my * my) * dk * dk
    Vh += P; Vs += P * k2
    // a Nyquist bin has no +N/2 partner on the padded grid: split it over both so the transform stays real and even
    const xs = mx === -half ? [-half, half] : [mx], ys = my === -half ? [-half, half] : [my]
    const w = 1 / (xs.length * ys.length)
    for (const x of xs) for (const y of ys) { const p = ((y + G) % G) * G + ((x + G) % G); re[p] += w * P; im[p] += w * P * k2 }
  }
  fft2(re, im, G)
  const rh = new Float32Array(G * G), rs = new Float32Array(G * G)
  for (let p = 0; p < G * G; p++) { rh[p] = re[p] / Vh; rs[p] = im[p] / Vs }
  return { tile: casc.tile, angle: casc.angle ?? 0, G, Vh, Vs, h: pyramid(rh, G), s: pyramid(rs, G) }
}

const pyramid = (grid, G) => {
  const levels = [grid]
  for (let size = G; size > 1; size >>= 1) {
    const src = levels[levels.length - 1], m = size >> 1, dst = new Float32Array(m * m)
    for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
      const a = src[2 * y * size + 2 * x], b = src[2 * y * size + 2 * x + 1], c = src[(2 * y + 1) * size + 2 * x], d = src[(2 * y + 1) * size + 2 * x + 1]
      dst[y * m + x] = Math.max(a, b, c, d)
    }
    levels.push(dst)
  }
  return levels
}

const mod = (a, n) => ((a % n) + n) % n

/** Bilinear rho_c at shift (x, y) in metres. */
const sampleC = (cg, levels, x, y) => {
  const c = Math.cos(cg.angle), s = Math.sin(cg.angle), G = cg.G
  const u = mod((c * x + s * y) / cg.tile * G, G), v = mod((-s * x + c * y) / cg.tile * G, G)
  const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0, i1 = (i0 + 1) % G, j1 = (j0 + 1) % G, g = levels[0]
  return (1 - fv) * ((1 - fu) * g[j0 * G + i0] + fu * g[j0 * G + i1]) + fv * ((1 - fu) * g[j1 * G + i0] + fu * g[j1 * G + i1])
}

/** Max of the sampled rho_c over the footprint of the box centred (x, y) with half-side h. */
const poolC = (cg, levels, x, y, h) => {
  const c = Math.cos(cg.angle), s = Math.sin(cg.angle), G = cg.G, scale = G / cg.tile
  const hp = h * (Math.abs(c) + Math.abs(s))
  const xr = c * x + s * y, yr = -s * x + c * y
  const i0 = Math.floor((xr - hp) * scale), i1 = Math.ceil((xr + hp) * scale)
  const j0 = Math.floor((yr - hp) * scale), j1 = Math.ceil((yr + hp) * scale)
  const width = Math.max(i1 - i0, j1 - j0) + 1
  if (width >= G) return 1
  let l = 0; while ((1 << l) < width) l++
  const B = 1 << l, m = G >> l, lev = levels[l]
  let best = -Infinity
  for (let bj = Math.floor(j0 / B); bj <= Math.floor(j1 / B); bj++) for (let bi = Math.floor(i0 / B); bi <= Math.floor(i1 / B); bi++) {
    const v = lev[mod(bj, m) * m + mod(bi, m)]; if (v > best) best = v
  }
  return best
}

/** The band's realised correlation and its Lipschitz constant, per field. */
const bandOf = (sea) => {
  const { kx, ky, k, amplitude, count } = sea.components
  const a = Float64Array.from({ length: count }, (_, i) => 0.5 * amplitude[i] ** 2)
  const ws = { h: (i) => a[i], s: (i) => a[i] * k[i] ** 2 }
  const out = {}
  for (const f of ['h', 's']) {
    const w = Float64Array.from({ length: count }, (_, i) => ws[f](i))
    const V = w.reduce((p, q) => p + q, 0)
    let L = 0; for (let i = 0; i < count; i++) L += w[i] * k[i]
    out[f] = { V, L: L / V, rho: (x, y) => { let r = 0; for (let i = 0; i < count; i++) r += w[i] * Math.cos(kx[i] * x + ky[i] * y); return r / V } }
  }
  return out
}

// binary max-heap of boxes on parallel arrays
const heap = () => {
  let cap = 1 << 16, n = 0, ub = new Float64Array(cap), bx = new Float64Array(cap), by = new Float64Array(cap), bh = new Float64Array(cap)
  const swap = (i, j) => { for (const a of [ub, bx, by, bh]) { const t = a[i]; a[i] = a[j]; a[j] = t } }
  return {
    get size() { return n },
    top: () => ub[0],
    push: (u, x, y, h) => {
      if (n === cap) { cap *= 2; for (const name of ['ub', 'bx', 'by', 'bh']) { const old = { ub, bx, by, bh }[name], nu = new Float64Array(cap); nu.set(old); if (name === 'ub') ub = nu; else if (name === 'bx') bx = nu; else if (name === 'by') by = nu; else bh = nu } }
      ub[n] = u; bx[n] = x; by[n] = y; bh[n] = h
      let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (ub[p] >= ub[i]) break; swap(i, p); i = p }
    },
    pop: () => {
      const r = [ub[0], bx[0], by[0], bh[0]]; n--
      if (n > 0) { ub[0] = ub[n]; bx[0] = bx[n]; by[0] = by[n]; bh[0] = bh[n]
        let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < n && ub[l] > ub[m]) m = l; if (rr < n && ub[rr] > ub[m]) m = rr; if (m === i) break; swap(i, m); i = m } }
      return r
    },
  }
}

const search = (cgs, band, f, Wm, exclusion, outer = Infinity) => {
  const Vtot = band.V + cgs.reduce((p, c) => p + c[`V${f}`], 0)
  const wb = band.V / Vtot, wc = cgs.map((c) => c[`V${f}`] / Vtot)
  const value = (x, y) => wb * band.rho(x, y) + cgs.reduce((p, c, i) => p + wc[i] * sampleC(c, c[f], x, y), 0)
  const bound = (x, y, h, rb) => wb * Math.min(1, rb + band.L * h * Math.SQRT2) + cgs.reduce((p, c, i) => p + wc[i] * poolC(c, c[f], x, y, h), 0)
  const hmin = 0.5 * Math.min(...cgs.map((c) => c.tile / c.G))
  let best = -Infinity, bestAt = [0, 0], boxes = 0
  const q = heap()
  const consider = (x, y, h) => {
    boxes++
    const far = Math.hypot(Math.abs(x) + h, Math.abs(y) + h)
    if (far < exclusion) return
    // nearest point of the box to the origin
    const near = Math.hypot(Math.max(0, Math.abs(x) - h), Math.max(0, Math.abs(y) - h))
    if (near > outer) return
    const rb = band.rho(x, y)
    if (Math.hypot(x, y) >= exclusion && Math.hypot(x, y) <= outer && Math.abs(x) <= Wm && y >= 0 && y <= Wm) {
      const v = wb * rb + cgs.reduce((p, c, i) => p + wc[i] * sampleC(c, c[f], x, y), 0)
      if (v > best) { best = v; bestAt = [x, y] }
    }
    if (h < hmin) return
    const u = bound(x, y, h, rb)
    if (u > best + TOL) q.push(u, x, y, h)
  }
  const nb = 16, side = Wm / nb
  for (let j = 0; j < nb; j++) for (let i = -nb; i < nb; i++) consider((i + 0.5) * side, (j + 0.5) * side, side / 2)
  while (q.size > 0 && q.top() > best + TOL) {
    const [, x, y, h] = q.pop(), g = h / 2
    consider(x - g, y - g, g); consider(x + g, y - g, g); consider(x - g, y + g, g); consider(x + g, y + g, g)
  }
  return { best, at: bestAt, boxes, value, wb }
}

/** Natural (ensemble, aperiodic) correlation of the spectrum: E|h(k)|^2 on a 32 Lp lattice to 32 kp, unnormalised. */
const naturalGrid = (sea, Lp) => {
  const n = 2048, T = 32 * Lp, dk = 2 * Math.PI / T, spec = W.waveSpectrum(sea)
  const re = new Float64Array(n * n), im = new Float64Array(n * n)
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const mx = ix < n / 2 ? ix : ix - n, my = iy < n / 2 ? iy : iy - n
    if (mx === 0 && my === 0) continue
    const kx = mx * dk, ky = my * dk, k = Math.hypot(kx, ky)
    const F = 0.5 * (spec.directional(k, Math.atan2(ky, kx)) + spec.directional(k, Math.atan2(-ky, -kx))) * dk * dk
    re[iy * n + ix] = F; im[iy * n + ix] = F * k * k
  }
  fft2(re, im, n)
  return { n, T, re, im }
}
const naturalAt = (nat, f, x, y, V) => { const { n, T } = nat, i = mod(Math.round(x / T * n), n), j = mod(Math.round(y / T * n), n); return (f === 'h' ? nat.re : nat.im)[j * n + i] / V }
/** Smallest radius beyond which |natural rho| stays below NAT_LEVEL inside the window. */
const naturalLength = (nat, f, V, Rmax) => {
  const { n, T } = nat, bins = 400, worst = new Float64Array(bins + 1)
  const arr = f === 'h' ? nat.re : nat.im
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i < n / 2 ? i : i - n) * T / n, y = (j < n / 2 ? j : j - n) * T / n, r = Math.hypot(x, y)
    if (r > Rmax) continue
    const b = Math.floor(r / Rmax * bins); worst[b] = Math.max(worst[b], Math.abs(arr[j * n + i] / V))
  }
  let b = bins; while (b > 0 && worst[b - 1] < NAT_LEVEL) b--
  return b / bins * Rmax
}

const out = []
const base0 = build(seaName, 128, CUT, seeds[0])
const Lp = 2 * Math.PI / base0.peakWavenumber
const L = LAYOUTS[layoutName]
const layout = layoutOf(base0, L)
const spec = W.waveSpectrum(base0)
const kFloorMax = layout.kOuter[layout.count - 1]
// expected band + tail variance to the layout's last Nyquist circle, for the natural correlation's normalisation
const Vexp = { h: integLog((k) => spec.omnidirectional(k), base0.peakWavenumber * 0.02, kFloorMax), s: integLog((k) => spec.omnidirectional(k) * k * k, base0.peakWavenumber * 0.02, kFloorMax) }
const nat = naturalGrid(base0, Lp)
const ell = { h: naturalLength(nat, 'h', Vexp.h, WINDOW_LP * Lp * Math.SQRT2), s: naturalLength(nat, 's', Vexp.s, WINDOW_LP * Lp * Math.SQRT2) }
console.log(JSON.stringify({ sea: seaName, layout: layoutName, ratio: L.ratio, periodsPerTile: L.periodsPerTile, rotate: L.rotate, Lp, cutWavelength: 2 * Math.PI / base0.cutWavenumber, count: layout.count, tiles: layout.tiles, tilesLp: layout.tiles.map((t) => t / Lp), anglesDeg: layout.angles.map((a) => a * 180 / Math.PI), kInnerBins: layout.kInner.map((k, c) => k * layout.tiles[c] / (2 * Math.PI)), kOuterBins: layout.kOuter.map((k, c) => k * layout.tiles[c] / (2 * Math.PI)), shortestWave: 2 * Math.PI / kFloorMax, ellH_Lp: ell.h / Lp, ellS_Lp: ell.s / Lp }))
const Wm = WINDOW_LP * Lp
for (const seed of seeds) {
  const sea = build(seaName, 128, CUT, seed)
  const lay = layoutOf(sea, L)
  const t = Date.now()
  const cgs = generateRotated(sea, lay, W.tailStream(seed)).map(cascadeGrids)
  const tGrid = Date.now() - t
  {
    const band = bandOf(build(seaName, 128, CUT, seed))
    for (const f of ['h', 's']) { const V = band[f].V + cgs.reduce((p, c) => p + c[`V${f}`], 0); console.log(JSON.stringify({ seed, kind: 'weights', field: f, band128: band[f].V / V, cascades: cgs.map((c) => c[`V${f}`] / V) })) }
  }
  if (process.env.PROFILE) {
    const band = bandOf(build(seaName, 128, CUT, seed))
    const edges = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 14.2]
    for (let b = 0; b + 1 < edges.length; b++) {
      const r = search(cgs, band.s, 's', Wm, Math.max(edges[b] * Lp, ell.s), edges[b + 1] * Lp)
      console.log(JSON.stringify({ seed, kind: 'profile', N: 128, field: 's', fromLp: edges[b], toLp: edges[b + 1], max: r.best, atLp: r.at.map((v) => v / Lp), atM: r.at }))
    }
    continue
  }
  for (const N of Ns) {
    const bandSea = build(seaName, N, CUT, seed), band = bandOf(bandSea)
    for (const f of ['h', 's']) {
      for (const [tag, ex] of [['ell', ell[f]], ['3Lp', Math.max(ell[f], 3 * Lp)]]) {
        const t1 = Date.now()
        const r = search(cgs, band[f], f, Wm, ex)
        // cascade 0's tile multiples inside the window, on its own (possibly rotated, angle 0 here) lattice
        let tileMax = -Infinity, tileAt = null
        const t0 = lay.tiles[0], m = Math.floor(Math.SQRT2 * Wm / t0)
        for (let b = 0; b <= m; b++) for (let a = -m; a <= m; a++) {
          if (b === 0 && a <= 0) continue
          const x = a * t0, y = b * t0
          if (Math.abs(x) > Wm || y > Wm || Math.hypot(x, y) < ex) continue
          const v = r.value(x, y); if (v > tileMax) { tileMax = v; tileAt = [a, b] }
        }
        const row = { seed, N, field: f, exclusion: tag, exclusionLp: ex / Lp, max: r.best, atM: r.at, atLp: r.at.map((v) => v / Lp), distLp: Math.hypot(...r.at) / Lp, naturalAtMax: naturalAt(nat, f, r.at[0], r.at[1], Vexp[f]), tileMultipleMax: tileMax, tileMultipleAt: tileAt, bandShare: r.wb, boxes: r.boxes, ms: Date.now() - t1, gridMs: tGrid }
        console.log(JSON.stringify(row))
      }
    }
  }
}
