import type { EffectiveSeaBlock } from './scenario.ts'

/**
 * The sea description: the contract between sim-world and every renderer for one built sea. Plain data with no functions
 * or classes so it crosses postMessage by structured clone; never realised arrays (the tail's h0 is generated from it).
 *
 * Spectrum convention, stated once, here (ADR 0005). With omega(k) from omega^2 = g k tanh(k d),
 *
 *   F(k, theta) = S(omega) Phi(omega, d) D(omega, theta) (d omega / d k) / k
 *
 * is the directional variance density per unit d^2k, where S is the JONSWAP frequency spectrum, Phi the TMA depth factor
 * and D the Donelan-Banner spreading normalised exactly on [-pi, pi], so m0 = integral of F d^2k.
 *
 * Band component i has the fixed amplitude A_i = sqrt(2 m0_band / N), with m0_band the integral of F below k_s, travels
 * along +k_i with phase k_i . x - omega_i t + phi_i, and displaces horizontally by +i lambda k_hat (lambda >= 0).
 *
 * Tail: h0(k) = 1/2 (xi_r + i xi_i) sqrt(F(k) dkx dky) with unit normals xi, so E|h0|^2 = F dkx dky / 2. Never the
 * reference shaders' sqrt(2 F dk^2), which carries 8 times the energy. The tail is zero below k_s, which band and tail
 * share exactly.
 */
export interface SeaDescription {
  /** The scenario seed; the ocean.band and ocean.tail forks derive from it. */
  readonly seed: number
  /** The effective sea block, gamma filled in. */
  readonly block: EffectiveSeaBlock
  /** m. */
  readonly depth: number
  /** m/s^2, the cited value the build used. */
  readonly gravity: number
  readonly spectrum: SpectrumParameters
  /** k_p, rad/m, from omega_p by the finite-depth dispersion relation. */
  readonly peakWavenumber: number
  /** k_s = cutRatio * k_p, rad/m. */
  readonly cutWavenumber: number
  /** Effective lambda after the clamp. */
  readonly choppiness: number
  /** K = lambda_eff * sum k_i A_i, at most 0.8 (ADR 0005). */
  readonly contraction: number
  /** m0_band, m^2, the value the amplitudes were set from. */
  readonly bandVariance: number
  /**
   * The whitecap coverage the foam aims at, a fraction of the surface: the cited coverage law at the generating wind's
   * speed, held to the law's fitted wind range.
   */
  readonly targetCoverage: number
  /**
   * The breaking threshold: the value of the surface Jacobian below which a point counts as breaking. With the
   * Jacobian linearised to J = 1 + div D, whose mean is 1 and whose variance sums the band's components and the tail's
   * spectrum under the default cascade layout and lambda, the fraction of a Gaussian J below it is targetCoverage.
   */
  readonly breakingThreshold: number
  readonly components: WaveComponents
}

/** What the tail generator and the renderer need to evaluate F without rebuilding the sea. */
export interface SpectrumParameters {
  /** U10 = |generatingWind|, m/s. */
  readonly windSpeed: number
  /** Direction the waves travel toward, rad from east, counter-clockwise. */
  readonly meanDirection: number
  /** m, as authored. */
  readonly fetch: number
  /** Phillips constant after the fetch law and the Pierson-Moskowitz cap. */
  readonly alpha: number
  /** omega_p, rad/s, after the Pierson-Moskowitz cap. */
  readonly peakFrequency: number
  readonly peakCapped: boolean
  readonly gamma: number
}

/** Parallel arrays, component i at index i, in build order (strip-major, then sector): what the renderer uploads. */
export interface WaveComponents {
  readonly count: number
  /** rad/m. */
  readonly kx: Float64Array
  /** rad/m. */
  readonly ky: Float64Array
  /** |k_i|, rad/m. */
  readonly k: Float64Array
  /** rad/s. */
  readonly omega: Float64Array
  /** m. */
  readonly amplitude: Float64Array
  /** phi_i, rad, in [0, 2 pi). */
  readonly phase: Float64Array
}
