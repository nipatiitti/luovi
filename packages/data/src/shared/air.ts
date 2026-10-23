// The standard atmosphere's sea-level state (15 C, 101325 Pa) rather than the water table's 20 C: it is the common
// reference state for rated aerodynamic loads, and a scenario that wants another state sets air.density itself.
import type { CitedValue } from '@luovi/core'

export interface AirTable {
  /** kg/m^3 */
  readonly density: CitedValue
}

export const standardAir: AirTable = {
  density: { value: 1.225, src: 'ISO 2533:1975, Standard Atmosphere, sea-level density at 15 C and 101325 Pa' },
}
