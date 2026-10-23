// Hasselmann et al. 1973 is the JONSWAP report (Ergaenzungsheft zur Deutschen Hydrographischen Zeitschrift, Reihe A
// (8), Nr. 12). The report itself was not read for this table: its fetch laws and mean shape parameters are taken as
// Frechot 2006 (GRAPP, "Realistic simulation of ocean surface using wave spectra", section 3.2) restates them, and the
// Pierson and Moskowitz 1964 peak likewise. Each src says so.
import type { CitedValue } from '@luovi/core'

/** JONSWAP frequency spectrum constants. x~ = g F / U10^2 is the dimensionless fetch, F in m, U10 in m/s. */
export interface JonswapTable {
  /** alpha = alphaCoefficient * x~^alphaExponent, the Phillips constant of the fetch-limited sea. */
  readonly alphaCoefficient: CitedValue
  readonly alphaExponent: CitedValue
  /**
   * f_p U10 / g = peakCoefficient * x~^peakExponent, with f_p in Hz (ordinary frequency, as the report states it), so
   * omega_p = 2 pi peakCoefficient (g / U10) x~^peakExponent.
   */
  readonly peakCoefficient: CitedValue
  readonly peakExponent: CitedValue
  /** Peak enhancement factor gamma when the scenario gives none, and the range a scenario may set. */
  readonly gammaDefault: CitedValue
  readonly gammaMin: CitedValue
  readonly gammaMax: CitedValue
  /** Peak width sigma for omega <= omega_p (sigmaA) and omega > omega_p (sigmaB). */
  readonly sigmaA: CitedValue
  readonly sigmaB: CitedValue
}

const jonswapReport =
  'Hasselmann et al. 1973, Erg. Dtsch. Hydrogr. Z. Reihe A 8(12), section 2.4, as restated by Frechot 2006, GRAPP, section 3.2 (report not read)'

export const jonswap: JonswapTable = {
  alphaCoefficient: { value: 0.076, src: `${jonswapReport}: fetch law alpha = 0.076 x~^-0.22` },
  alphaExponent: { value: -0.22, src: `${jonswapReport}: fetch law alpha = 0.076 x~^-0.22` },
  peakCoefficient: { value: 3.5, src: `${jonswapReport}: peak law f_p U10 / g = 3.5 x~^-0.33` },
  peakExponent: { value: -0.33, src: `${jonswapReport}: peak law f_p U10 / g = 3.5 x~^-0.33` },
  gammaDefault: { value: 3.3, src: `${jonswapReport}: mean peak enhancement gamma = 3.3` },
  gammaMin: { value: 1, src: 'Frechot 2006, GRAPP, section 3.2: gamma "can vary between 1 and 7"' },
  gammaMax: { value: 7, src: 'Frechot 2006, GRAPP, section 3.2: gamma "can vary between 1 and 7"' },
  sigmaA: { value: 0.07, src: `${jonswapReport}: mean peak width sigma_a = 0.07 for omega <= omega_p` },
  sigmaB: { value: 0.09, src: `${jonswapReport}: mean peak width sigma_b = 0.09 for omega > omega_p` },
}

/** The fully developed limit the fetch-limited JONSWAP sea may not pass. */
export interface PiersonMoskowitzTable {
  /**
   * Lower bound on the dimensionless peak omega_p U10 / g. sim-ocean applies it by capping x~ at the fetch where the peak
   * law reaches this value, so alpha and omega_p freeze together at the fully developed sea (coordinator answer 5).
   */
  readonly peakCap: CitedValue
}

export const piersonMoskowitz: PiersonMoskowitzTable = {
  peakCap: {
    value: 0.855,
    src: 'Pierson and Moskowitz 1964, J. Geophys. Res. 69(24), 5181-5190: spectral peak omega_p = 0.877 g / U19.5, i.e. 0.855 g / U10 with U19.5 = 1.026 U10, as restated by Frechot 2006, GRAPP, section 3.2',
  },
}
