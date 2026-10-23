// The tail's realised variance against the spectrum it encodes (spec #26, Testing Decisions): on each reference sea with
// the default cascade layout, each cascade's h0 variance by Parseval against the integral of waveSpectrum over that
// cascade's annulus, and band plus tail against the full m0. As in ocean.band-hs, the spectrum is the target and not an
// internal (public-surfaces 5.3), so a wrong spectrum formula passes here too and is checked by review of the citations.

import { abs, ceil, exp, log, PI, TWO_PI } from '@luovi/core/math'
import {
  type CascadeLayout,
  defaultCascadeLayout,
  generateTail,
  type SeaDescription,
  type TailCascade,
  tailStream,
  waveSpectrum,
} from '@luovi/sim-world'
import type { Benchmark, Gate, Harness, Measurement } from '../harness/types.ts'
import { bandIntegral } from './ocean.band-hs.ts'
import light from './reference-seas/light.json' with { type: 'json' }
import moderate from './reference-seas/moderate.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }

const seas = { light, moderate, storm } as const

// The default rule gives every reference sea three cascades, so the gates can be listed statically.
const CASCADES = 3

// One stream's variance scatters with the few hundred bins that carry most of a cascade's energy: the spectrum falls as
// k^-4 per bin from the inner ring, which leaves about 150 effective bins in cascade 0 and a relative scatter of about
// 1 / sqrt(150) = 8%, more than the 5% gate. The mean over 32 forks of the ocean.tail stream brings it to about 1.4%,
// three standard deviations inside the gate, at about 55 ms per generation in Node.
const STREAMS = 32

// The polar trapezoid above the cut runs in ln k, where the tail's power law is smooth; 128 intervals per e-fold and
// 128 directions resolve the Banner spreading (beta down to about 0.4), and the halving check below proves it. Below the
// cut the band's own integral from ocean.band-hs is reused with its steps.
const INTERVALS_PER_E_FOLD = 128
const THETA_INTERVALS = 128
const BAND_K_INTERVALS = 2048
const BAND_THETA_INTERVALS = 256
const CONVERGENCE_LIMIT = 0.001

// The full m0's upper limit in multiples of k_s: past it the tail's k^-3 omnidirectional density leaves a fraction about
// (k_s / k)^2 = 1e-12 of the tail's variance, far below anything the gate sees.
const FULL_EXTENT = 1e6

/** The integral of F d^2k over inner < |k| < outer: a trapezoid in ln k (F k^2 d ln k) times the periodic one in theta. */
const annulusIntegral = (
  sea: SeaDescription,
  inner: number,
  outer: number,
  perEFold: number,
  thetas: number,
): number => {
  const spectrum = waveSpectrum(sea)
  const span = log(outer / inner)
  const intervals = ceil(span * perEFold)
  const ds = span / intervals
  const dTheta = TWO_PI / thetas
  let sum = 0
  for (let i = 0; i <= intervals; i += 1) {
    const k = inner * exp(i * ds)
    let ring = 0
    for (let j = 0; j < thetas; j += 1) ring += spectrum.directional(k, -PI + j * dTheta)
    sum += (i === 0 || i === intervals ? 0.5 : 1) * ring * k * k
  }
  return sum * ds * dTheta
}

/** The annulus integral and its relative change when both steps are doubled; throws when that change is not small. */
const convergedAnnulus = (name: string, sea: SeaDescription, inner: number, outer: number): number => {
  const fine = annulusIntegral(sea, inner, outer, INTERVALS_PER_E_FOLD, THETA_INTERVALS)
  const coarse = annulusIntegral(sea, inner, outer, INTERVALS_PER_E_FOLD / 2, THETA_INTERVALS / 2)
  const change = abs(fine - coarse) / fine
  if (!(change < CONVERGENCE_LIMIT)) {
    throw new Error(`${name}: the integral over ${String(inner)} to ${String(outer)} rad/m moved by ${String(change)}`)
  }
  return fine
}

/**
 * The cascade's realised surface variance by Parseval: h(k) = h0(k) + conj(h0(-k)) holds each bin's h0 twice, so the
 * height variance is 2 sum |h0|^2, whose expectation is sum F dk^2 under the convention on SeaDescription.
 */
const realisedVariance = (cascade: TailCascade): number => {
  const { re, im } = cascade
  let sum = 0
  for (let i = 0; i < re.length; i += 1) {
    const a = re[i] ?? 0
    const b = im[i] ?? 0
    sum += a * a + b * b
  }
  return 2 * sum
}

const sameBits = (a: readonly TailCascade[], b: readonly TailCascade[]): boolean =>
  a.length === b.length &&
  a.every((cascade, c) => {
    const other = b[c]
    if (other?.re.length !== cascade.re.length) return false
    for (let i = 0; i < cascade.re.length; i += 1) {
      if (!Object.is(cascade.re[i], other.re[i]) || !Object.is(cascade.im[i], other.im[i])) return false
    }
    return true
  })

const tileLog = (layout: CascadeLayout): string => `${layout.tiles.map((tile) => tile.toPrecision(3)).join(' / ')} m`

const measureSea = (harness: Harness, name: string, scenario: unknown): Measurement => {
  harness.load(scenario)
  const sea = harness.sea
  if (sea === null) throw new Error(`${name}: the reference sea loaded as flat water`)
  const layout = defaultCascadeLayout(sea)
  if (layout?.count !== CASCADES) {
    throw new Error(
      `${name}: the default layout has ${String(layout?.count ?? 0)} cascades, the gates expect ${String(CASCADES)}`,
    )
  }

  const stream = tailStream(sea.seed)
  const realised = new Float64Array(layout.count)
  for (let s = 0; s < STREAMS; s += 1) {
    const tail = generateTail(sea, layout, stream.fork(`stream.${String(s)}`))
    tail.forEach((cascade, c) => {
      realised[c] = (realised[c] ?? 0) + realisedVariance(cascade) / STREAMS
    })
  }
  const repeatable = sameBits(generateTail(sea, layout, stream), generateTail(sea, layout, stream))

  const { amplitude, count } = sea.components
  let bandRealised = 0
  for (let i = 0; i < count; i += 1) bandRealised += 0.5 * (amplitude[i] ?? 0) * (amplitude[i] ?? 0)
  const band = bandIntegral(sea, BAND_K_INTERVALS, BAND_THETA_INTERVALS)
  const full = band + convergedAnnulus(name, sea, sea.cutWavenumber, FULL_EXTENT * sea.cutWavenumber)

  const values: Record<string, number> = { [`${name}.repeatable`]: repeatable ? 1 : 0 }
  const logs: Record<string, number | string> = {
    [`${name}.tiles`]: tileLog(layout),
    [`${name}.cutWavelength`]: TWO_PI / sea.cutWavenumber,
    [`${name}.m0Full`]: full,
    [`${name}.m0Band`]: band,
    [`${name}.bandRealised`]: bandRealised,
  }
  let tailRealised = 0
  for (let c = 0; c < layout.count; c += 1) {
    const target = convergedAnnulus(name, sea, layout.kInner[c] ?? 0, layout.kOuter[c] ?? 0)
    const measured = realised[c] ?? 0
    tailRealised += measured
    values[`${name}.cascade${String(c)}`] = measured / target
    logs[`${name}.cascade${String(c)}.tile`] = layout.tiles[c] ?? 0
    logs[`${name}.cascade${String(c)}.kInner`] = layout.kInner[c] ?? 0
    logs[`${name}.cascade${String(c)}.kOuter`] = layout.kOuter[c] ?? 0
    logs[`${name}.cascade${String(c)}.m0Annulus`] = target
    logs[`${name}.cascade${String(c)}.m0Realised`] = measured
  }
  values[`${name}.total`] = (bandRealised + tailRealised) / full
  logs[`${name}.tailRealised`] = tailRealised
  return { values, logs }
}

const measure = (harness: Harness): Measurement => {
  const measurement: Measurement = { values: {}, logs: { streams: STREAMS } }
  for (const [name, scenario] of Object.entries(seas)) {
    const sea = measureSea(harness, name, scenario)
    Object.assign(measurement.values, sea.values)
    Object.assign(measurement.logs, sea.logs)
  }
  return measurement
}

const varianceGate = (id: string): Gate => ({ id, unit: '1', kind: 'relative', target: 1, tolerance: 0.05 })

const seaGates = (name: keyof typeof seas): Gate[] => [
  ...Array.from({ length: CASCADES }, (_, c) => varianceGate(`${name}.cascade${String(c)}`)),
  varianceGate(`${name}.total`),
  // Two generations from the same stream are bit-identical.
  { id: `${name}.repeatable`, unit: '1', kind: 'exact', target: 1 },
]

export const benchmark: Benchmark = {
  id: 'ocean.tail-variance',
  step: 1,
  tier: 'quick',
  // Each sea is loaded in turn by measure.
  scenario: null,
  gates: [...seaGates('light'), ...seaGates('moderate'), ...seaGates('storm')],
  // eslint-disable-next-line @typescript-eslint/require-await -- measure is async for modules that read files; this one only computes
  measure: async (harness) => measure(harness),
}
