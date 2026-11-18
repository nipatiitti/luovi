import type { SeaDescription } from '@luovi/core'
import { atanh, cosh, exp, max, min, pow, powInt, PI, remainder, sqrt, tanh, TWO_PI } from '@luovi/core/math'
import { donelanBanner, equilibriumRange, jonswap, tma } from '@luovi/data'
import { dispersionFrequency, groupVelocity } from './dispersion.ts'

// The spectrum under the convention stated on SeaDescription in core: F(k, theta) = S(omega) Phi(omega, d)
// D(omega, theta) (d omega / d k) / k. The build integrates and inverts these same functions, so the band and every
// benchmark that integrates waveSpectrum read one formula.

/** What evaluating F reads of a sea description, so the build can evaluate the spectrum before the description exists. */
export type SpectrumSource = Pick<SeaDescription, 'spectrum' | 'depth' | 'gravity' | 'peakWavenumber'>

// 5/4 is algebra, not a fit: it is the value that puts the maximum of omega^-5 exp(-c (omega_p / omega)^4) at omega_p.
const PEAK_SHAPE = 1.25

const sigmaA = jonswap.sigmaA.value
const sigmaB = jonswap.sigmaB.value
const tmaCoefficient = tma.coefficient.value
const tmaShallow = tma.shallowLimit.value
const tmaDeep = tma.deepLimit.value
const dbCoefficient = donelanBanner.coefficient.value
const dbPivot = donelanBanner.pivot.value
const dbExponent = donelanBanner.exponent.value
const dbLower = donelanBanner.lowerLimit.value
const dbUpper = donelanBanner.upperLimit.value
const dbFloor = donelanBanner.betaFloor.value
const bannerThreshold = donelanBanner.bannerThreshold.value
const bannerOffset = donelanBanner.bannerOffset.value
const bannerScale = donelanBanner.bannerScale.value
const bannerRate = donelanBanner.bannerRate.value
const rangeCoefficient = equilibriumRange.coefficient.value
const rangeExponent = equilibriumRange.exponent.value
const rangeLower = equilibriumRange.lowerLimit.value
const rangeUpper = equilibriumRange.upperLimit.value

/** The TMA depth factor Phi(omega, d) in its piecewise form (data's tma table). */
const depthFactor = (omega: number, depth: number, gravity: number): number => {
  const omegaH = omega * sqrt(depth / gravity)
  if (omegaH <= tmaShallow) return tmaCoefficient * omegaH * omegaH
  if (omegaH < tmaDeep) {
    const gap = tmaDeep - omegaH
    return 1 - tmaCoefficient * gap * gap
  }
  return 1
}

/**
 * The measured equilibrium range above the peak (data's equilibriumRange table), m^2 s, before the depth factor: zero
 * below the law's first frequency. Beyond its last frequency the level it reached falls as omega^-5, JONSWAP's own
 * saturation slope, since the law is not measured there.
 */
const equilibriumDensity = (model: SpectrumSource, omega: number): number => {
  const { peakFrequency, windSpeed } = model.spectrum
  const ratio = omega / peakFrequency
  if (ratio < rangeLower) return 0
  // U / c_p with the generating wind, which blows along the mean direction, and the finite-depth peak phase speed.
  const forcing = (windSpeed * model.peakWavenumber) / peakFrequency
  const g = model.gravity
  const held = min(ratio, rangeUpper)
  const level =
    (rangeCoefficient *
      pow(forcing, rangeExponent) *
      g *
      g *
      powInt(held * peakFrequency, -4) *
      exp(-powInt(held, -4))) /
    peakFrequency
  return level * powInt(held / ratio, 5)
}

/**
 * S(omega) Phi(omega, d), m^2 s; m0 = its integral over omega. JONSWAP at the peak, and above it whichever of JONSWAP
 * and the measured equilibrium range is higher: JONSWAP's omega^-5 falls below the measured omega^-4 rear face from
 * about 1.5 omega_p in a growing sea, which leaves the metre-scale waves too little energy.
 */
export const frequencyDensity = (model: SpectrumSource, omega: number): number => {
  if (omega <= 0) return 0
  const { alpha, peakFrequency, gamma } = model.spectrum
  // Testing the exponential first keeps omega^-5 from overflowing at tiny omega, where the product is zero anyway.
  const shape = exp(-PEAK_SHAPE * powInt(peakFrequency / omega, 4))
  if (shape === 0) return 0
  const sigma = omega <= peakFrequency ? sigmaA : sigmaB
  const offset = (omega - peakFrequency) / (sigma * peakFrequency)
  const enhancement = pow(gamma, exp(-0.5 * offset * offset))
  const g = model.gravity
  const peaked = alpha * g * g * powInt(omega, -5) * shape * enhancement
  return max(peaked, equilibriumDensity(model, omega)) * depthFactor(omega, model.depth, g)
}

/**
 * The Donelan-Banner width beta at frequency omega and wavenumber k. Banner's branch reads k / k_p, Donelan's
 * omega / omega_p (ADR 0005 amendment); between and beyond them the published floor.
 */
export const spreadingWidth = (model: SpectrumSource, omega: number, k: number): number => {
  const kRatio = k / model.peakWavenumber
  if (kRatio > bannerThreshold) return pow(10, bannerOffset + bannerScale * pow(kRatio, bannerRate))
  const ratio = omega / model.spectrum.peakFrequency
  if (ratio > dbLower && ratio < dbUpper) {
    return dbCoefficient * pow(ratio / dbPivot, ratio < dbPivot ? dbExponent : -dbExponent)
  }
  return dbFloor
}

/** D = beta / (2 tanh(beta pi)) sech^2(beta delta), delta in [-pi, pi]; the normaliser is the exact integral over it. */
const spreading = (beta: number, delta: number): number => {
  const sech = 1 / cosh(beta * delta)
  return (beta / (2 * tanh(beta * PI))) * sech * sech
}

/**
 * The quantile of D: the direction offset in [-pi, pi] below which a fraction u of the variance lies, from the
 * closed-form inverse of the sech^2 cumulative.
 */
export const spreadingQuantile = (beta: number, u: number): number => atanh((2 * u - 1) * tanh(beta * PI)) / beta

/** The spectrum a sea description encodes, for benchmarks and the renderer's foam statistics. */
export interface WaveSpectrum {
  /** Omnidirectional wavenumber density S(omega) Phi(omega, d) d omega / d k at |k| = k, m^3; m0 = integral over k. */
  omnidirectional(k: number): number
  /** Directional density F(k, theta), m^4, theta the absolute direction of the wave vector; m0 = integral of F k dk dtheta. */
  directional(k: number, theta: number): number
  /** omega(k) by the finite-depth dispersion relation, rad/s. */
  frequency(k: number): number
}

export const waveSpectrum = (sea: SpectrumSource): WaveSpectrum => {
  const { depth, gravity } = sea
  // One expression behind both methods, so the directional density can never drift from the omnidirectional one.
  const density = (k: number, omega: number): number => frequencyDensity(sea, omega) * groupVelocity(k, depth, gravity)
  return {
    omnidirectional: (k) => (k <= 0 ? 0 : density(k, dispersionFrequency(k, depth, gravity))),
    directional: (k, theta) => {
      if (k <= 0) return 0
      const omega = dispersionFrequency(k, depth, gravity)
      const delta = remainder(theta - sea.spectrum.meanDirection, TWO_PI)
      return (density(k, omega) / k) * spreading(spreadingWidth(sea, omega, k), delta)
    },
    frequency: (k) => dispersionFrequency(k, depth, gravity),
  }
}
