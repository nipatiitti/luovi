import type { SeaDescription } from '@luovi/core'
import { exp, log, max, min, pow, sqrt, TWO_PI } from '@luovi/core/math'
import { whitecapCoverage } from '@luovi/data'
import { type SpectrumSource, waveSpectrum } from './spectrum.ts'
import { type CascadeLayout, defaultCascadeLayout } from './tail.ts'

// The breaking threshold (#23 resolution, ADR 0011): not tuned but solved, so that the far field's filtered coverage
// averages to the cited whitecap coverage at the sea's generating wind. The far field filters the Jacobian linearised as
// J = 1 + div D (Dupuy and Bruneton 2012), since only quantities linear in the surface survive a mipmap; D's divergence is
// Gaussian with mean zero, so the coverage is the Gaussian's lower tail below the threshold. The determinant's quadratic
// part, dDx/dx dDy/dy - (dDx/dy)^2, has zero mean for any Gaussian sea, so the linear J keeps the true mean.

/** What the solve reads: every field of the description the build has formed before the threshold. */
export type BreakingSource = SpectrumSource &
  Pick<SeaDescription, 'cutWavenumber' | 'block' | 'choppiness' | 'components'>

// Trapezoid intervals in ln k across one cascade's annulus. k^3 F(k) is flat on the spectrum's k^-3 tail and the default
// annuli span at most a factor of about 15 in k, so the step stays under 0.011 in ln k and the trapezoid's relative error
// under 1e-5, far below what moves the threshold.
const LOG_INTERVALS = 256

// Simpson intervals for the standard normal's mass between z and 0. For |z| up to 4.5, beyond the law's smallest
// coverage, the step is under 0.009 and Simpson's error bound (|z| h^4 max|phi''''| / 180) under 1e-10, a millionth of the
// smallest target.
const NORMAL_INTERVALS = 512

/** The cited coverage law's fraction of surface at U10, the wind held to the law's fitted range rather than extrapolated. */
const coverageAt = (windSpeed: number): number => {
  const wind = min(max(windSpeed, whitecapCoverage.lowerLimit.value), whitecapCoverage.upperLimit.value)
  // The law states percent.
  const percent =
    whitecapCoverage.coefficient.value * pow(wind - whitecapCoverage.offset.value, whitecapCoverage.exponent.value)
  return percent / 100
}

/**
 * PROTOTYPE (foam rework, #41): the breaking cutoff's spectral weight, a smoothstep in ln L from L_c / sqrt 2 up to
 * L_c sqrt 2, so it is a half at the cutoff and spans one factor of 2 in wavelength. The shape is unsourced (#42 found
 * none); render-ocean's tail applies the same weight to the Jacobian channels. A cutoff of 0 weighs every wave 1.
 */
export const breakingWeight = (k: number, cutoff: number): number => {
  if (cutoff <= 0) return 1
  const t = min(max((log((TWO_PI / k) / cutoff) + 0.5 * log(2)) / log(2), 0), 1)
  return t * t * (3 - 2 * t)
}

/** The divergence's variance from one cascade: lambda^2 times the integral of k^2 F over its annulus, taken in ln k. */
const cascadeVariance = (sea: SpectrumSource, layout: CascadeLayout, c: number, cutoff = 0): number => {
  const spectrum = waveSpectrum(sea)
  const inner = layout.kInner[c] ?? 0
  const outer = layout.kOuter[c] ?? 0
  const lambda = layout.choppiness[c] ?? 0
  const lower = log(inner)
  const step = (log(outer) - lower) / LOG_INTERVALS
  let sum = 0
  for (let j = 0; j <= LOG_INTERVALS; j += 1) {
    const k = exp(lower + j * step)
    // k^2 F(k) dk = k^3 F(k) d(ln k).
    const w = breakingWeight(k, cutoff)
    sum += (j === 0 || j === LOG_INTERVALS ? 0.5 : 1) * w * w * k * k * k * spectrum.omnidirectional(k)
  }
  return lambda * lambda * sum * step
}

/**
 * The variance of div D over the whole sea: each band component's -lambda A k cos(theta) adds (lambda A k)^2 / 2 at the
 * band's clamped lambda, and each cascade lambda_c^2 times the integral of k^2 F over its annulus. Band and cascades share
 * no wave, and distinct waves are uncorrelated, so the variances add.
 */
const jacobianVariance = (sea: BreakingSource, cutoff = 0): number => {
  const { k, amplitude, count } = sea.components
  let band = 0
  for (let i = 0; i < count; i += 1) {
    const slope = (amplitude[i] ?? 0) * (k[i] ?? 0) * breakingWeight(k[i] ?? 1, cutoff)
    band += 0.5 * slope * slope
  }
  // The default rule's layout at the scenario's unclamped lambda, as the renderer evolves it unless the host overrides it.
  const layout = defaultCascadeLayout(sea)
  let tail = 0
  if (layout !== undefined) for (let c = 0; c < layout.count; c += 1) tail += cascadeVariance(sea, layout, c, cutoff)
  return sea.choppiness * sea.choppiness * band + tail
}

/** The standard normal density. */
const density = (z: number): number => exp(-0.5 * z * z) / sqrt(TWO_PI)

/** The standard normal's cumulative at z <= 0: one half less its mass on [z, 0], by Simpson's rule. */
const lowerTail = (z: number): number => {
  const h = -z / NORMAL_INTERVALS
  let sum = density(z) + density(0)
  for (let j = 1; j < NORMAL_INTERVALS; j += 1) sum += (j % 2 === 1 ? 4 : 2) * density(z + j * h)
  return 0.5 - (sum * h) / 3
}

/**
 * The z <= 0 with Phi(z) = coverage, for 0 < coverage < 1/2. Newton's method from z = 0: Phi is increasing and convex
 * below zero, so every step lands to the right of the root and the iterates fall monotonically onto it. The loop ends
 * when an iterate no longer falls, which rounding guarantees.
 */
const normalQuantile = (coverage: number): number => {
  let z = 0
  for (;;) {
    const next = z - (lowerTail(z) - coverage) / density(z)
    if (!(next < z)) return z
    z = next
  }
}

/**
 * The target coverage at the sea's generating wind and the threshold whose Gaussian tail below it is that coverage.
 * Throws RangeError when the coverage law leaves the open interval (0, 1/2), where the quantile is not below the mean.
 */
export const breakingThreshold = (
  sea: BreakingSource,
): { readonly targetCoverage: number; readonly breakingThreshold: number } => {
  const targetCoverage = coverageAt(sea.spectrum.windSpeed)
  if (!(targetCoverage > 0 && targetCoverage < 0.5)) {
    throw new RangeError(`The whitecap coverage law gave ${String(targetCoverage)}, outside (0, 1/2)`)
  }
  return { targetCoverage, breakingThreshold: 1 + sqrt(jacobianVariance(sea)) * normalQuantile(targetCoverage) }
}

/**
 * PROTOTYPE (foam rework, #41): the threshold under Foam rework design (#40): Brumer's total W at the generating wind,
 * unclamped below the fitted range down to the law's offset and held at its top, the variance weighted by the breaking
 * cutoff. At or below the offset there is no foam: null.
 */
export const reworkedBreakingThreshold = (
  sea: BreakingSource,
  cutoff: number,
): { readonly targetCoverage: number; readonly breakingThreshold: number } | null => {
  const wind = min(sea.spectrum.windSpeed, whitecapCoverage.upperLimit.value)
  if (!(wind > whitecapCoverage.offset.value)) return null
  const targetCoverage =
    (whitecapCoverage.coefficient.value * pow(wind - whitecapCoverage.offset.value, whitecapCoverage.exponent.value)) /
    100
  return {
    targetCoverage,
    breakingThreshold: 1 + sqrt(jacobianVariance(sea, cutoff)) * normalQuantile(targetCoverage),
  }
}
