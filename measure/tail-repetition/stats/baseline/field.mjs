// 3 k_m sigma (Tayfun narrowband skewness; FE16 eq. 11) for the full spectrum to the floor and for the band alone.
import { build, spectralBudget, integLog } from './lib.mjs'
const g = 9.80665
const disp = (w, d) => { let k = w * w / g; for (let i = 0; i < 60; i++) { const t = Math.tanh(k * d); k -= (g * k * t - w * w) / (g * t + g * k * d * (1 - t * t)) } return k }
for (const name of ['A', 'B', 'C', 'D']) { const { sea } = build(name, 32, 3, 1), b = spectralBudget(sea), s = b.spec, d = sea.depth
  const lo = sea.peakWavenumber * 0.05
  const f = (k1) => { const m0 = integLog((k) => s.omnidirectional(k), lo, k1), m1 = integLog((k) => s.omnidirectional(k) * s.frequency(k), lo, k1); const km = disp(m1 / m0, d); return { m0, m1, km, skew: 3 * km * Math.sqrt(m0) } }
  const full = f(b.kFloor), band = f(sea.cutWavenumber)
  console.log(name, 'full 3kσ', full.skew.toFixed(3), 'band 3kσ', band.skew.toFixed(3), 'Tm01', (2 * Math.PI * full.m0 / full.m1).toFixed(2)) }
