import type { EffectiveSeaBlock, SeaDescription, SpectrumParameters } from '@luovi/core'
import { createRng } from '@luovi/core'
import { atan2, hypot, log, pow, sincos, sqrt, TWO_PI } from '@luovi/core/math'
import { jonswap, piersonMoskowitz } from '@luovi/data'
import { boundWaves } from './bound.ts'
import { breakingThreshold } from './breaking.ts'
import { dispersionFrequency, dispersionWavenumber } from './dispersion.ts'
import { frequencyDensity, type SpectrumSource, spreadingQuantile, spreadingWidth } from './spectrum.ts'

// The sea-state build (ADR 0005, #4 resolution section 2, #8): N = strips x sectors components of equal variance below
// the cut, each placed at seeded quantiles inside its cell, with the fixed amplitude sqrt(2 m0_band / N).

/**
 * The bound on K = lambda sum k_i A_i, an algorithm choice of ADR 0005 rather than a measured value: K < 1 makes the
 * displacement map a contraction, so the band never folds and the query's two fixed-point iterations converge; 0.8 leaves
 * the iteration's error shrinking by at least that factor per step.
 */
const CONTRACTION_BOUND = 0.8

// Trapezoid intervals over [0, omega_s] for m0_band and the strip quantiles. Even a cut ratio of 20 leaves the step under
// a sixtieth of the narrowest JONSWAP peak width, so the integral's discretisation error stays orders below the 5% Hs gate.
const INTEGRAL_INTERVALS = 4096

const alphaCoefficient = jonswap.alphaCoefficient.value
const alphaExponent = jonswap.alphaExponent.value
const peakCoefficient = jonswap.peakCoefficient.value
const peakExponent = jonswap.peakExponent.value
const peakCap = piersonMoskowitz.peakCap.value

/**
 * The fetch-law spectrum with the Pierson-Moskowitz cap applied to the dimensionless fetch, so alpha and omega_p freeze
 * together at the fully developed sea (coordinator answer 5) instead of an uncapped alpha meeting a capped peak.
 */
const spectrumParameters = (block: EffectiveSeaBlock, gravity: number): SpectrumParameters => {
  const [east, north] = block.generatingWind
  const windSpeed = hypot(east, north)
  const dimensionlessFetch = (gravity * block.fetch) / (windSpeed * windSpeed)
  // The fetch at which the peak law reaches omega_p U10 / g = peakCap; the law decreases with fetch, so beyond it the
  // sea is fully developed.
  const developedFetch = pow(peakCap / (TWO_PI * peakCoefficient), 1 / peakExponent)
  const peakCapped = dimensionlessFetch > developedFetch
  const effectiveFetch = peakCapped ? developedFetch : dimensionlessFetch
  return {
    windSpeed,
    meanDirection: atan2(north, east),
    fetch: block.fetch,
    alpha: alphaCoefficient * pow(effectiveFetch, alphaExponent),
    peakFrequency: TWO_PI * peakCoefficient * (gravity / windSpeed) * pow(effectiveFetch, peakExponent),
    peakCapped,
    gamma: block.gamma,
  }
}

/** cumulative[j] = trapezoid integral of S Phi from 0 to j step. */
const cumulativeVariance = (model: SpectrumSource, step: number): Float64Array => {
  const cumulative = new Float64Array(INTEGRAL_INTERVALS + 1)
  let previous = 0
  for (let j = 1; j <= INTEGRAL_INTERVALS; j += 1) {
    const current = frequencyDensity(model, j * step)
    cumulative[j] = (cumulative[j - 1] ?? 0) + 0.5 * step * (previous + current)
    previous = current
  }
  return cumulative
}

/**
 * The omega below which `target` of the variance lies, for 0 < target <= cumulative's last entry: bisection keeps
 * cumulative[low] < target <= cumulative[high], so the interpolation's denominator is never zero.
 */
const frequencyQuantile = (cumulative: Float64Array, step: number, target: number): number => {
  let low = 0
  let high = INTEGRAL_INTERVALS
  while (high - low > 1) {
    const middle = (low + high) >>> 1
    if ((cumulative[middle] ?? 0) < target) low = middle
    else high = middle
  }
  const below = cumulative[low] ?? 0
  const above = cumulative[high] ?? 0
  return step * (low + (target - below) / (above - below))
}

/**
 * Builds the band of one sea. block: the sea block with every default and gamma applied; depth m; gravity m/s^2, the
 * cited value; seed the scenario's u32 seed, whose ocean.band fork places the components. The breaking threshold is
 * solved last, from the band just built and the tail's spectrum (breaking.ts). Throws RangeError on a sea it cannot build.
 */
export const buildSea = (block: EffectiveSeaBlock, depth: number, gravity: number, seed: number): SeaDescription => {
  if (!(depth > 0 && depth < Infinity))
    throw new RangeError(`Sea depth must be positive and finite, got ${String(depth)}`)
  if (!(gravity > 0 && gravity < Infinity))
    throw new RangeError(`Gravity must be positive and finite, got ${String(gravity)}`)
  const spectrum = spectrumParameters(block, gravity)
  const peakWavenumber = dispersionWavenumber(spectrum.peakFrequency, depth, gravity)
  const cutWavenumber = block.cutRatio * peakWavenumber
  const model: SpectrumSource = { spectrum, depth, gravity, peakWavenumber }

  const step = dispersionFrequency(cutWavenumber, depth, gravity) / INTEGRAL_INTERVALS
  const cumulative = cumulativeVariance(model, step)
  const bandVariance = cumulative[INTEGRAL_INTERVALS] ?? 0
  if (!(bandVariance > 0 && bandVariance < Infinity)) {
    throw new RangeError(`The sea's band variance is not a positive finite number, got ${String(bandVariance)} m^2`)
  }

  const { strips, sectors } = block
  const count = strips * sectors
  const fixedAmplitude = sqrt((2 * bandVariance) / count)
  const amplitude = new Float64Array(count)
  const kx = new Float64Array(count)
  const ky = new Float64Array(count)
  const k = new Float64Array(count)
  const omega = new Float64Array(count)
  const phase = new Float64Array(count)
  const direction = new Float64Array(2)
  const band = createRng(seed).fork('ocean.band')
  let slopeSum = 0
  for (let strip = 0; strip < strips; strip += 1) {
    for (let sector = 0; sector < sectors; sector += 1) {
      const i = strip * sectors + sector
      // A stream per cell, keyed by its index rather than by draw order (#4 resolution), so a cell's draws do not
      // depend on how many cells came before it.
      const cell = band.fork(`cell.${String(i)}`)
      // 1 - u lies in (0, 1], keeping the quantile target positive as frequencyQuantile requires.
      const frequencyDraw = 1 - cell.nextF64()
      const directionDraw = cell.nextF64()
      const omegaI = frequencyQuantile(cumulative, step, (bandVariance * (strip + frequencyDraw)) / strips)
      const kI = dispersionWavenumber(omegaI, depth, gravity)
      const beta = spreadingWidth(model, omegaI, kI)
      sincos(spectrum.meanDirection + spreadingQuantile(beta, (sector + directionDraw) / sectors), direction, 0)
      kx[i] = kI * (direction[1] ?? 0)
      ky[i] = kI * (direction[0] ?? 0)
      k[i] = kI
      omega[i] = omegaI
      phase[i] = TWO_PI * cell.nextF64()
      // PROTOTYPE (band size, #43): a Rayleigh factor with E[r^2] = 1 is sqrt(-ln u) for u uniform on (0, 1]; the draw
      // comes after the cell's existing three, so the fixed layout's frequencies, directions and phases are unchanged.
      const aI = block.amplitudes === 'rayleigh' ? fixedAmplitude * sqrt(-log(1 - cell.nextF64())) : fixedAmplitude
      amplitude[i] = aI
      slopeSum += kI * aI
    }
  }

  let choppiness = block.choppiness * slopeSum > CONTRACTION_BOUND ? CONTRACTION_BOUND / slopeSum : block.choppiness
  // bound / s * s can round one ulp above the bound; step lambda down until the recorded K honours it exactly.
  while (choppiness * slopeSum > CONTRACTION_BOUND) choppiness *= 1 - Number.EPSILON

  const components = { count, kx, ky, k, omega, amplitude, phase }
  const built = {
    seed,
    block,
    depth,
    gravity,
    spectrum,
    peakWavenumber,
    cutWavenumber,
    choppiness,
    contraction: choppiness * slopeSum,
    bandVariance,
    components,
    boundWaves: boundWaves(block, components, depth, gravity),
  }
  return { ...built, ...breakingThreshold(built) }
}
