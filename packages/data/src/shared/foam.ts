// Whitecap foam: how bright it is, how fast it fades and how much of the sea it covers. Dierssen 2019's values were
// read from its full text (Front. Earth Sci. 7:14, section on field spectra, Figure 2A). The Callaghan et al. 2012 decay
// time is read from the paper's abstract only: the full text could not be reached, so the 3 s is an estimate inside the
// effective range the abstract states. Brumer et al. 2017's law is their fit to the combined SO GasEx and HiWinGS data
// against the 10 m neutral wind; the sea's generating wind stands in for it, which ignores atmospheric stability.
import type { CitedValue } from '@luovi/core'

/** Visible-band Lambertian reflectances of foam, dimensionless. */
export interface FoamReflectanceTable {
  /** A freshly broken whitecap, many layers of foam. */
  readonly fresh: CitedValue
  /** The thin foam a whitecap leaves as it decays. */
  readonly thin: CitedValue
  /** Averaged over a whitecap's lifetime, for coverage that is filtered rather than tracked. */
  readonly lifetime: CitedValue
}

const dierssen2019 =
  'Dierssen 2019, Front. Earth Sci. 7:14, doi:10.3389/feart.2019.00014, field spectra of whitecaps, Figure 2A'

export const foamReflectance: FoamReflectanceTable = {
  fresh: { value: 0.5, src: `${dierssen2019}: reflectance about 0.50 for Stage A whitecaps with many layers of foam` },
  thin: {
    value: 0.18,
    src: `${dierssen2019}: thin foam produced by whitecaps had about 18% reflectance in the visible wavelengths`,
  },
  lifetime: {
    value: 0.22,
    src: `${dierssen2019}, reporting Koepke 1984 (Appl. Opt. 23(11), 1816-1824): reflectance from 20 to 55% at breaking to 3 to 10% after 10 s, a time-averaged effective reflectance of whitecaps of 22%`,
  },
}

/** s, the e-folding time of a whitecap's foam area. */
export const foamDecayTime: CitedValue = {
  value: 3,
  src: 'Estimate: Callaghan, Deane, Stokes and Ward 2012, J. Geophys. Res. 117, C09015, doi:10.1029/2012JC008147, abstract only: the effective (area-weighted mean) whitecap foam decay time varied between observation periods from 1.4 to 4.8 s; 3 s lies inside that range, the full text was not reached to confirm a whole-set value',
}

/** W = coefficient (U10 - offset)^exponent percent of the sea surface, U10 in m/s, fitted for lowerLimit <= U10 <= upperLimit. */
export interface WhitecapCoverageTable {
  /** Percent. */
  readonly coefficient: CitedValue
  /** m/s. */
  readonly offset: CitedValue
  readonly exponent: CitedValue
  /** m/s, the lowest wind of the fitted data. */
  readonly lowerLimit: CitedValue
  /** m/s, the highest wind of the fitted data. */
  readonly upperLimit: CitedValue
}

const brumer2017 =
  'Brumer, Zappa, Brooks, Tamura, Brown, Blomquist, Fairall and Cifuentes-Lorenzen 2017, J. Phys. Oceanogr. 47(9), 2211-2235, doi:10.1175/JPO-D-17-0005.1, combined SO GasEx and HiWinGS fit W = 7.38e-2 (U10N - 4.23)^1.42 percent'

export const whitecapCoverage: WhitecapCoverageTable = {
  coefficient: { value: 0.0738, src: brumer2017 },
  offset: { value: 4.23, src: brumer2017 },
  exponent: { value: 1.42, src: brumer2017 },
  lowerLimit: { value: 4.56, src: `${brumer2017}, valid for U10N from 4.56 to 25.1 m/s` },
  upperLimit: { value: 25.1, src: `${brumer2017}, valid for U10N from 4.56 to 25.1 m/s` },
}
