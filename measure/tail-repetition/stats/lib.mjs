// Shared loader for the issue #44 layout statistics. Seas through sim-world's loadWorld (schema, data defaults), the band
// from sim-ocean's buildSea at any strips x sectors, the layout from sim-world's defaultCascadeLayout with a custom
// CascadeRule, the tail from sim-world's generateTail (rotation 0) or a replica of it that evaluates the spectrum at the
// rotated wave vectors (golden-angle layouts). Reads the built dist of main at af7bab7.
const root = '/Users/niilojaakkola/projects/luovi'
export const W = await import(`${root}/packages/sim-world/dist/index.js`)
export const O = await import(`${root}/packages/sim-ocean/dist/index.js`)
export const M = await import(`${root}/packages/core/dist/math/index.js`)
const scen = (u, fetch, depth, extra = {}) => ({
  version: 1, seed: 1,
  environment: { wind: { vector10m: [u, 0] }, depth, sea: { generatingWind: [u, 0], fetch, ...extra } },
  ships: [],
})
export const SEAS = {
  storm: scen(27, 194000, 120),
  gulf: scen(12, 80000, 60, { gamma: 3.3 }),
  archipelago: scen(8, 15000, 22, { gamma: 1 }),
  moderateOld: JSON.parse((await import('node:fs')).readFileSync(`${root}/packages/tool-validate/src/benchmarks/reference-seas/moderate.json`, 'utf8')),
}
export const BAND = { 32: [8, 4], 128: [32, 4], 256: [64, 4] }
const worlds = {}
export const world = (name) => (worlds[name] ??= W.loadWorld(SEAS[name]))
export const gravity = 9.80665
export const build = (name, N, cutRatio, seed) => {
  const env = world(name).effectiveScenario.environment
  const [strips, sectors] = BAND[N]
  return O.buildSea({ ...env.sea, strips, sectors, cutRatio }, env.depth, gravity, seed)
}

const GOLDEN = (137.50776405003785 * Math.PI) / 180
export const LAYOUTS = {
  L0: { ratio: 10, periodsPerTile: 6, rotate: false },
  L1: { ratio: 8 + (1 + Math.sqrt(5)) / 2, periodsPerTile: 6, rotate: false },
  L2: { ratio: 10, periodsPerTile: 6, rotate: true },
  L3: { ratio: 10, periodsPerTile: 12, rotate: false },
  L4: { ratio: 8 + (1 + Math.sqrt(5)) / 2, periodsPerTile: 6, rotate: true },
  // follow-up: angles spread evenly over the square lattice's 90 degree period
  L2b: { ratio: 10, periodsPerTile: 6, rotate: true, anglesDeg: [0, 30, 60] },
  L4b: { ratio: 8 + (1 + Math.sqrt(5)) / 2, periodsPerTile: 6, rotate: true, anglesDeg: [0, 30, 60] },
  // follow-up probe: t1/t2 a second irrational unrelated to t0/t1 (10 - 1/sqrt 2 is not a rational function of phi),
  // angles 0/30/60; only where the rule is off its fallback path (storm, old moderate)
  // follow-up probe: other angle sets at ratio 8 + phi, to see whether any rotation choice moves the floor
  R1: { ratio: 8 + (1 + Math.sqrt(5)) / 2, periodsPerTile: 6, rotate: true, anglesDeg: [0, 17, 71] },
  R2: { ratio: 8 + (1 + Math.sqrt(5)) / 2, periodsPerTile: 6, rotate: true, anglesDeg: [0, 41, 13] },
  R3: { ratio: 8 + (1 + Math.sqrt(5)) / 2, periodsPerTile: 6, rotate: true, anglesDeg: [0, 45, 22.5] },
  R4: { ratio: 10, periodsPerTile: 6, rotate: true, anglesDeg: [0, 26.565, 63.435] },
  L5: { ratio: 8 + (1 + Math.sqrt(5)) / 2, ratios: [8 + (1 + Math.sqrt(5)) / 2, 10 - Math.SQRT1_2], periodsPerTile: 6, rotate: true, anglesDeg: [0, 30, 60] },
}
export const ruleOf = (L) => ({ ...W.DEFAULT_CASCADE_RULE, ratio: L.ratio, periodsPerTile: L.periodsPerTile })
export const layoutOf = (sea, L) => {
  let layout = W.defaultCascadeLayout(sea, ruleOf(L))
  if (L.ratios) {
    // explicit per-step ratios: tiles t0, t0 / r1, t0 / (r1 r2), each cascade's inner bound periodsPerTile periods on
    // its tile, the last out to its Nyquist circle, as defaultCascadeLayout lays out its geometric tiles
    const tiles = [layout.tiles[0]]
    for (const r of L.ratios) tiles.push(tiles[tiles.length - 1] / r)
    if (tiles[tiles.length - 1] < W.DEFAULT_CASCADE_RULE.floorTile) throw new Error('explicit ratios fall below the floor')
    const kInner = tiles.map((t, c) => (c === 0 ? sea.cutWavenumber : (L.periodsPerTile * 2 * Math.PI) / t))
    const kOuter = kInner.map((_, c) => kInner[c + 1] ?? (Math.PI * layout.resolution) / tiles[tiles.length - 1])
    layout = { ...layout, count: tiles.length, tiles, kInner, kOuter, choppiness: tiles.map(() => sea.block.choppiness) }
  }
  const angles = layout.tiles.map((_, c) => (!L.rotate ? 0 : L.anglesDeg ? (L.anglesDeg[c] * Math.PI) / 180 : c * GOLDEN))
  return { ...layout, angles }
}

// The generator's ring snap, copied so the replica keeps generateTail's annulus membership bit for bit.
const ringSquared = (radius) => {
  const squared = radius * radius
  const ring = M.round(squared)
  return M.abs(squared - ring) <= 1e-9 * ring ? ring : squared
}
/**
 * generateTail with cascade c's lattice rotated by angles[c]: the bin at lattice vector k stands for the wave vector
 * R(angle) k, so its amplitude reads F at the rotated direction. Same stream forks and draw order as generateTail, so at
 * angle 0 it is generateTail.
 */
export const generateRotated = (sea, layout, rng) => {
  const spectrum = W.waveSpectrum(sea)
  const n = layout.resolution, half = n / 2
  const normals = new Float64Array(2)
  return layout.tiles.map((tile, c) => {
    const dk = M.TWO_PI / tile, scale = 0.5 * dk
    const innerSquared = ringSquared(layout.kInner[c] / dk), outerSquared = ringSquared(layout.kOuter[c] / dk)
    const angle = layout.angles[c]
    const re = new Float64Array(n * n), im = new Float64Array(n * n)
    const stream = rng.fork(`cascade.${c}`)
    for (let iy = 0; iy < n; iy++) {
      const ky = (iy - half) * dk
      for (let ix = 0; ix < n; ix++) {
        stream.gaussianPair(normals, 0)
        const r2 = (ix - half) * (ix - half) + (iy - half) * (iy - half)
        if (r2 <= innerSquared || r2 > outerSquared) continue
        const kx = (ix - half) * dk
        const amp = scale * M.sqrt(spectrum.directional(dk * M.sqrt(r2), M.atan2(ky, kx) + angle))
        re[iy * n + ix] = amp * normals[0]
        im[iy * n + ix] = amp * normals[1]
      }
    }
    return { tile, resolution: n, re, im, angle }
  })
}

export const integLog = (f, a, b, n = 20000) => { let s = 0; const la = Math.log(a), h = (Math.log(b) - la) / n; let p = f(a) * a; for (let i = 1; i <= n; i++) { const k = Math.exp(la + i * h), v = f(k) * k; s += 0.5 * h * (p + v); p = v } return s }

// radix-2 complex FFT in place (forward sign; the correlation spectra are real and even, so the sign does not matter)
export const fft = (re, im, n, off = 0, stride = 1) => {
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const a = off + i * stride, b = off + j * stride; let t = re[a]; re[a] = re[b]; re[b] = t; t = im[a]; im[a] = im[b]; im[b] = t } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0
      for (let j = 0; j < h; j++) { const a = off + (i + j) * stride, b = off + (i + j + h) * stride
        const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t } } }
}
export const fft2 = (re, im, n) => { for (let y = 0; y < n; y++) fft(re, im, n, y * n, 1); for (let x = 0; x < n; x++) fft(re, im, n, x, n) }
