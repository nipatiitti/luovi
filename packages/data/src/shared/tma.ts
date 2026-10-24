// The TMA depth factor (Bouws, Guenther, Rosenthal and Vincent 1985) is Kitaigorodskii, Krasitskii and Zaslavskii 1975's
// finite-depth factor. The exact factor needs the dispersion relation inverted per frequency; the piecewise form of
// Thompson and Vincent 1983 is what both reference implementations use (#4 resolution), so the contract uses it too.
import type { CitedValue } from '@luovi/core'

/**
 * With omega_h = omega sqrt(d / g): Phi = coefficient omega_h^2 for omega_h <= shallowLimit,
 * 1 - coefficient (deepLimit - omega_h)^2 for shallowLimit < omega_h < deepLimit, and 1 from deepLimit on.
 */
export interface TmaTable {
  readonly coefficient: CitedValue
  readonly shallowLimit: CitedValue
  readonly deepLimit: CitedValue
}

const tmaSource =
  'Thompson and Vincent 1983, Coastal Structures 83, ASCE, piecewise approximation to the Kitaigorodskii et al. 1975 (J. Phys. Oceanogr. 5, 410-420) depth factor of the TMA spectrum, Bouws et al. 1985, J. Geophys. Res. 90(C1), 975-986'

export const tma: TmaTable = {
  coefficient: {
    value: 0.5,
    src: `${tmaSource}: Phi = 0.5 omega_h^2 below omega_h = 1, 1 - 0.5 (2 - omega_h)^2 below 2`,
  },
  shallowLimit: { value: 1, src: `${tmaSource}: the shallow branch ends at omega_h = 1` },
  deepLimit: { value: 2, src: `${tmaSource}: Phi = 1 from omega_h = 2` },
}
