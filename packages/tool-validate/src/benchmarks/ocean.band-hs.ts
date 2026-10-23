// The band's realised significant height against the spectrum it encodes (spec #26, Testing Decisions): the water query
// sampled over space and time on each reference sea, compared with 4 sqrt(m0_band) integrated here from waveSpectrum,
// which is the target rather than an internal (public-surfaces 5.3). The blind spot is stated there: a wrong spectrum
// formula passes this gate, so the formula is checked by review against the data citations.

import { abs, PI, sqrt, TWO_PI } from '@luovi/core/math'
import { type SeaDescription, waveSpectrum } from '@luovi/sim-world'
import type { Benchmark, Gate, Harness, Measurement } from '../harness/types.ts'
import light from './reference-seas/light.json' with { type: 'json' }
import moderate from './reference-seas/moderate.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }

const seas = { light, moderate, storm } as const

// The spec's sample: 64 by 64 cell centres over a 2 km square at the mean level, for one minute of ticks.
const GRID_SIDE = 64
const GRID_SPAN = 2000
const TICKS = 3600

// The polar trapezoid for m0_band: the k step resolves the JONSWAP peak (width about 0.14 k_p for sigma 0.07, since
// omega goes as sqrt k) with a hundred points at a cut ratio of 3, and the spreading is smooth and periodic in theta,
// where the trapezoid converges geometrically. The benchmark checks the claim by halving both steps.
const K_INTERVALS = 2048
const THETA_INTERVALS = 256
const CONVERGENCE_LIMIT = 0.001

// The surface-only cost the #4 spectrum research measured: 200 points, N = 32, three passes, Node 26 on an M1 Pro.
const RESEARCH_MICROSECONDS = 147
const RESEARCH_POINTS = 200

/** m0 below k_s: the trapezoid in k over [0, k_s] times the periodic trapezoid in theta over the full circle. */
export const bandIntegral = (sea: SeaDescription, kIntervals: number, thetaIntervals: number): number => {
  const spectrum = waveSpectrum(sea)
  const dk = sea.cutWavenumber / kIntervals
  const dTheta = TWO_PI / thetaIntervals
  let sum = 0
  for (let i = 1; i <= kIntervals; i += 1) {
    const k = i * dk
    let ring = 0
    for (let j = 0; j < thetaIntervals; j += 1) ring += spectrum.directional(k, -PI + j * dTheta)
    // F k dk dtheta; k = 0 contributes nothing and the cut itself is the trapezoid's half-weight end.
    sum += (i === kIntervals ? 0.5 : 1) * ring * k
  }
  return sum * dk * dTheta
}

const gridPoints = (): Float64Array => {
  const points = new Float64Array(GRID_SIDE * GRID_SIDE * 3)
  const cell = GRID_SPAN / GRID_SIDE
  for (let iy = 0; iy < GRID_SIDE; iy += 1) {
    for (let ix = 0; ix < GRID_SIDE; ix += 1) {
      const p = 3 * (iy * GRID_SIDE + ix)
      points[p] = -GRID_SPAN / 2 + (ix + 0.5) * cell
      points[p + 1] = -GRID_SPAN / 2 + (iy + 0.5) * cell
      points[p + 2] = 0
    }
  }
  return points
}

const measureSea = (harness: Harness, name: string, scenario: unknown, points: Float64Array): Measurement => {
  harness.load(scenario)
  const sea = harness.sea
  if (sea === null) throw new Error(`${name}: the reference sea loaded as flat water`)

  const fine = bandIntegral(sea, K_INTERVALS, THETA_INTERVALS)
  const coarse = bandIntegral(sea, K_INTERVALS / 2, THETA_INTERVALS / 2)
  const convergence = abs(fine - coarse) / fine
  if (!(convergence < CONVERGENCE_LIMIT)) {
    throw new Error(`${name}: m0_band moved by ${String(convergence)} when its steps were halved, so it is no target`)
  }

  const count = points.length / 3
  const out = new Float64Array(count * 4)
  // Summed per tick, then across ticks, so no partial sum mixes magnitudes far apart.
  let sum = 0
  let sumSquares = 0
  for (let t = 0; t < TICKS; t += 1) {
    harness.step(1)
    harness.environment.water(harness.tick, points, out)
    let tickSum = 0
    let tickSquares = 0
    for (let p = 0; p < count; p += 1) {
      const eta = out[4 * p] ?? 0
      tickSum += eta
      tickSquares += eta * eta
    }
    sum += tickSum
    sumSquares += tickSquares
  }
  const samples = count * TICKS
  const mean = sum / samples
  // About the sample mean: the choppy surface at fixed world points sits below the mean level by about lambda sum k A^2 / 2.
  const variance = sumSquares / samples - mean * mean

  const { ticks, stepMs, waterCalls, waterMs } = harness.timing
  const microsecondsPerCall = (1000 * waterMs) / waterCalls
  return {
    values: { [`${name}.hs`]: sqrt(variance / fine) },
    logs: {
      [`${name}.hsRealised`]: 4 * sqrt(variance),
      [`${name}.hsSpectrum`]: 4 * sqrt(fine),
      [`${name}.m0Band`]: fine,
      [`${name}.m0BandHalvedChange`]: convergence,
      [`${name}.seaBandVariance`]: sea.bandVariance,
      [`${name}.meanHeight`]: mean,
      [`${name}.seed`]: sea.seed,
      [`${name}.cutRatio`]: sea.block.cutRatio,
      [`${name}.cutWavenumber`]: sea.cutWavenumber,
      [`${name}.cutWavelength`]: TWO_PI / sea.cutWavenumber,
      [`${name}.peakWavenumber`]: sea.peakWavenumber,
      [`${name}.components`]: sea.components.count,
      [`${name}.choppiness`]: sea.choppiness,
      [`${name}.choppinessAuthored`]: sea.block.choppiness,
      [`${name}.contraction`]: sea.contraction,
      [`${name}.msPerTick`]: (stepMs + waterMs) / ticks,
      [`${name}.microsecondsPerWaterCall`]: microsecondsPerCall,
      [`${name}.microsecondsPer200Points`]: (microsecondsPerCall * RESEARCH_POINTS) / count,
    },
  }
}

const measure = (harness: Harness): Measurement => {
  const points = gridPoints()
  const measurement: Measurement = {
    values: {},
    logs: { researchMicrosecondsPer200Points: RESEARCH_MICROSECONDS, gridPoints: points.length / 3, ticks: TICKS },
  }
  for (const [name, scenario] of Object.entries(seas)) {
    const sea = measureSea(harness, name, scenario, points)
    Object.assign(measurement.values, sea.values)
    Object.assign(measurement.logs, sea.logs)
  }
  return measurement
}

const hsGate = (name: keyof typeof seas): Gate => ({
  id: `${name}.hs`,
  unit: '1',
  kind: 'relative',
  target: 1,
  tolerance: 0.05,
})

export const benchmark: Benchmark = {
  id: 'ocean.band-hs',
  step: 1,
  tier: 'quick',
  // Each sea is loaded in turn by measure.
  scenario: null,
  gates: [hsGate('light'), hsGate('moderate'), hsGate('storm')],
  // eslint-disable-next-line @typescript-eslint/require-await -- measure is async for modules that read files; this one only computes
  measure: async (harness) => measure(harness),
}
