import type { BoundWaves, EffectiveSeaBlock, WaveComponents } from '@luovi/core'
import { abs, hypot, sqrt, tanh } from '@luovi/core/math'

// PROTOTYPE (band size, #43): throwaway, on the prototype/band-size branch only, never merged. The band's second-order
// bound waves as the Baltic wave shape research (#43, research/baltic-wave-shape) derives them: a vertical correction at
// each point's Lagrangian label, the horizontal map unchanged, so the query's inversion stays as it is.

/**
 * A difference-frequency denominator this small is a resonant pair (two components with the same omega and |k| in
 * different directions), whose D- the research's code sets to zero as it does on the diagonal.
 */
const RESONANT = 1e-12

/**
 * Sharma and Dean 1979's sum and difference kernels K+ and K- for every ordered pair, as Forristall 2000 eq. 12 to 19
 * print them at finite depth, symmetrised; D- is zero on the diagonal. Row-major N x N, m^-1.
 */
const pairKernels = (
  c: WaveComponents,
  depth: number,
  gravity: number,
): { readonly plus: Float64Array; readonly minus: Float64Array } => {
  const n = c.count
  const plus = new Float64Array(n * n)
  const minus = new Float64Array(n * n)
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const oi = c.omega[i] ?? 0
      const oj = c.omega[j] ?? 0
      const ri = (oi * oi) / gravity
      const rj = (oj * oj) / gravity
      const kxi = c.kx[i] ?? 0
      const kyi = c.ky[i] ?? 0
      const kxj = c.kx[j] ?? 0
      const kyj = c.ky[j] ?? 0
      const ki = c.k[i] ?? 0
      const kj = c.k[j] ?? 0
      const dot = kxi * kxj + kyi * kyj
      const kSum = hypot(kxi + kxj, kyi + kyj)
      const kDifference = hypot(kxi - kxj, kyi - kyj)
      const si = sqrt(ri)
      const sj = sqrt(rj)
      const sumRoot = si + sj
      const differenceRoot = si - sj
      const plusDenominator = sumRoot * sumRoot - kSum * tanh(kSum * depth)
      const dPlus =
        (2 * sumRoot * sumRoot * (dot - ri * rj)) / plusDenominator +
        (sumRoot * (si * (kj * kj - rj * rj) + sj * (ki * ki - ri * ri))) / plusDenominator
      const minusDenominator = differenceRoot * differenceRoot - kDifference * tanh(kDifference * depth)
      const dMinus =
        i !== j && abs(minusDenominator) > RESONANT
          ? (differenceRoot * (sj * (ki * ki - ri * ri) - si * (kj * kj - rj * rj))) / minusDenominator +
            (2 * differenceRoot * differenceRoot * (dot + ri * rj)) / minusDenominator
          : 0
      const root = sqrt(ri * rj)
      plus[i * n + j] = (dPlus - (dot - ri * rj)) / root + ri + rj
      minus[i * n + j] = (dMinus - (dot + ri * rj)) / root + ri + rj
    }
  }
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      for (const kernel of [plus, minus]) {
        const mean = 0.5 * ((kernel[i * n + j] ?? 0) + (kernel[j * n + i] ?? 0))
        kernel[i * n + j] = mean
        kernel[j * n + i] = mean
      }
    }
  }
  return { plus, minus }
}

/**
 * The expected E[eta^2 eta2] of a kernel pair for equal amplitudes, up to the common factor: the diagonal's K+ once and
 * every off-diagonal pair's K+ + K- twice (the research's skewWeight).
 */
const skewWeight = (
  plus: (i: number, j: number) => number,
  minus: (i: number, j: number) => number,
  n: number,
): number => {
  let sum = 0
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) sum += i === j ? plus(i, i) : 2 * (plus(i, j) + minus(i, j))
  }
  return sum
}

/**
 * The factorised form's kernels, 1/2 (eta eta_k - H . H_k) = 1/4 sum A A [K-f cos(ti - tj) + K+f cos(ti + tj)] with
 * K+-f = (k_i + k_j) / 2 (1 +- k_hat_i . k_hat_j).
 */
const factorisedKernel =
  (c: WaveComponents, sign: number) =>
  (i: number, j: number): number => {
    const ki = c.k[i] ?? 1
    const kj = c.k[j] ?? 1
    const cosine = ((c.kx[i] ?? 0) * (c.kx[j] ?? 0) + (c.ky[i] ?? 0) * (c.ky[j] ?? 0)) / (ki * kj)
    return 0.5 * (ki + kj) * (1 + sign * cosine)
  }

/** The bound-wave tables of a built band, or null when the block asks for none. */
export const boundWaves = (
  block: EffectiveSeaBlock,
  components: WaveComponents,
  depth: number,
  gravity: number,
): BoundWaves | null => {
  if (block.boundWaves === 'none') return null
  const n = components.count
  const { plus, minus } = pairKernels(components, depth, gravity)
  if (block.boundWaves === 'pairs') {
    const cosine = new Float64Array(n * n)
    const sine = new Float64Array(n * n)
    for (let q = 0; q < n * n; q += 1) {
      cosine[q] = 0.25 * ((plus[q] ?? 0) + (minus[q] ?? 0))
      sine[q] = 0.25 * ((minus[q] ?? 0) - (plus[q] ?? 0))
    }
    return { form: 'pairs', cosine, sine, calibration: 1 }
  }
  const exact = skewWeight(
    (i, j) => plus[i * n + j] ?? 0,
    (i, j) => minus[i * n + j] ?? 0,
    n,
  )
  const factorised = skewWeight(factorisedKernel(components, 1), factorisedKernel(components, -1), n)
  return { form: 'factorised', cosine: new Float64Array(0), sine: new Float64Array(0), calibration: exact / factorised }
}
