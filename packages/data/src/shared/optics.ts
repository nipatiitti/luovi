// Optical properties of Baltic water at the reference state of water.ts (7 psu, 20 C), for the sea's shading. The
// absorption is given at the atmosphere table's three wavelengths so the water body and the sky light share channels.
// The Quan and Fry 1995 index was evaluated from their empirical equation (Appl. Opt. 34(18), 3477-3480, eq. 1 and
// its ten coefficients) at S 7, T 20 C, lambda 550 nm; the paper's survey value of 1.333 for fresh water is 0.003 low
// for this state. Pope and Fry 1997 values are read from their table as tabulated by the Oregon Medical Laser Center
// (omlc.org/spectra/water/data/pope97.txt, cm^-1 there).
import type { CitedValue } from '@luovi/core'
import { brunetonAtmosphere, type Rgb } from './atmosphere.ts'

export interface WaterOpticsTable {
  /** Real refractive index of the water relative to air, dimensionless, at 550 nm. */
  readonly refractiveIndex: CitedValue
  /** nm, the wavelength of each RGB channel: the atmosphere table's, red, green, blue. */
  readonly wavelengths: CitedValue<Rgb>
  /** m^-1, absorption by pure water at `wavelengths`. */
  readonly pureWaterAbsorption: CitedValue<Rgb>
  /** nm, where the CDOM absorption below is stated. */
  readonly cdomReferenceWavelength: CitedValue
  /** m^-1, CDOM absorption at the reference wavelength: a_cdom(lambda) = a_ref exp(-S (lambda - lambda_ref)). */
  readonly cdomAbsorption: CitedValue
  /** nm^-1, the exponential spectral slope S of the CDOM absorption. */
  readonly cdomSlope: CitedValue
  /** m^-1, backscattering by water and particles, wavelength independent. */
  readonly backscattering: CitedValue
}

const simis2017 =
  'Simis, Ylostalo, Kallio, Spilling and Kutser 2017, PLoS ONE 12(4), e0173357, doi:10.1371/journal.pone.0173357'
const popeFry1997 = 'Pope and Fry 1997, Appl. Opt. 36(33), 8710-8723, pure water absorption table'

export const balticOptics: WaterOpticsTable = {
  refractiveIndex: {
    value: 1.3356,
    src: 'Quan and Fry 1995, Appl. Opt. 34(18), 3477-3480, empirical equation for the index of seawater evaluated at S 7, T 20 C, 550 nm (1.33563)',
  },
  wavelengths: brunetonAtmosphere.wavelengths,
  pureWaterAbsorption: {
    value: [0.465, 0.0565, 0.00635],
    src: `${popeFry1997}: 4.65e-3, 5.65e-4 and 6.35e-5 cm^-1 at 680, 550 and 440 nm`,
  },
  cdomReferenceWavelength: {
    value: 412,
    src: `${simis2017}: the mean aCDOM spectrum fitted with lambda0 = 412 nm over 400 to 700 nm`,
  },
  cdomAbsorption: {
    value: 0.53,
    src: `${simis2017}: aCDOM(412) is bimodal, the 0.53 m^-1 mode for the central and southern sea areas (the 7 psu reference state) and 0.85 m^-1 for the Gulf of Bothnia and eastern Gulf of Finland; the paper text states no whole-set mean`,
  },
  cdomSlope: {
    value: 0.0177,
    src: `${simis2017}: S(400-700) = 0.0177 nm^-1 for the mean aCDOM spectrum (mean of all samples 0.0177, median 0.0182); the fit's intercept k = 0.030 m^-1 is residual noise or scattering, not CDOM, and is not carried`,
  },
  backscattering: {
    value: 0.01,
    src: `Estimate: the order of Baltic particulate backscattering, which ${simis2017} report as similar in spring and summer without a value read here; pure water's own (Morel 1974) is about a tenth of it at 550 nm`,
  },
}
