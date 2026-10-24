// A fixed open-sea class value rather than a Charnock law: the scenario's wind is a uniform log profile and a
// wave-age dependent z0 would couple it to the sea build. Wieringa 1992 (J. Wind Eng. Ind. Aerodyn. 41-44, 357-368) is
// the classification; the value was read from the WMO register entry that tabulates it, not from the paper.
import type { CitedValue } from '@luovi/core'

/** Aerodynamic roughness length z0 of open sea, m; the default when a scenario's wind carries none. */
export const openSeaRoughnessLength: CitedValue = {
  value: 0.0002,
  src: 'Wieringa 1992, J. Wind Eng. Ind. Aerodyn. 41-44, 357-368, Davenport-Wieringa roughness class 1 "sea", z0 = 0.0002 m, as tabulated by the WMO WIGOS register codes.wmo.int/wmdr/SurfaceRoughnessDavenport/sea',
}
