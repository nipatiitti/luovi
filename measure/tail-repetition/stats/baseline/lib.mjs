// Shared loader: the four seas through sim-world's loadWorld (schema, data defaults, gamma), then sim-ocean's own
// buildSea for any strips x sectors (the schema caps N at 48; buildSea itself takes any layout).
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
  A: scen(8, 15000, 22, { gamma: 1 }),
  B: scen(12, 80000, 60, { gamma: 3.3 }),
  C: scen(27, 194000, 120),
  D: JSON.parse((await import('node:fs')).readFileSync(`${root}/packages/tool-validate/src/benchmarks/reference-seas/moderate.json`, 'utf8')),
}
export const LAYOUT = { 32: [8, 4], 48: [12, 4], 64: [16, 4], 128: [32, 4], 256: [64, 4] }
export const LAYOUT_ALT = { 32: [4, 8], 48: [8, 6], 64: [8, 8], 128: [16, 8], 256: [16, 16] }
const worlds = {}
export const world = (name) => (worlds[name] ??= W.loadWorld(SEAS[name]))
export const gravity = 9.80665
export const build = (name, N, cutRatio, seed, layout = LAYOUT) => {
  const w = world(name)
  const env = w.effectiveScenario.environment
  const [strips, sectors] = layout[N]
  const block = { ...env.sea, strips, sectors, cutRatio }
  return { sea: O.buildSea(block, env.depth, gravity, seed), env }
}
export const integLog = (f, a, b, n = 20000) => { let s = 0, la = Math.log(a), h = (Math.log(b) - la) / n, p = f(a) * a; for (let i = 1; i <= n; i++) { const k = Math.exp(la + i * h), v = f(k) * k; s += 0.5 * h * (p + v); p = v } return s }
// Tail variance and slope variance from k_s to the default layout's floor (last kOuter), and the spectrum's band slope.
export const spectralBudget = (sea) => {
  const spec = W.waveSpectrum(sea)
  const lay = W.defaultCascadeLayout(sea)
  const kFloor = lay.kOuter[lay.count - 1]
  return {
    kFloor, layout: lay,
    tailVar: integLog((k) => spec.omnidirectional(k), sea.cutWavenumber, kFloor),
    tailSlope: integLog((k) => spec.omnidirectional(k) * k * k, sea.cutWavenumber, kFloor),
    bandSlopeSpec: integLog((k) => spec.omnidirectional(k) * k * k, sea.peakWavenumber * 0.05, sea.cutWavenumber),
    tailVarTo: (k1) => integLog((k) => spec.omnidirectional(k), sea.cutWavenumber, k1),
    tailSlopeTo: (k1) => integLog((k) => spec.omnidirectional(k) * k * k, sea.cutWavenumber, k1),
    spec,
  }
}
