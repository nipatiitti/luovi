// One reference state for Baltic brackish water, shared with the later optics tables (7 psu, 20 C). Density is the
// UNESCO EOS-80 one-atmosphere equation (Millero and Poisson 1981), evaluated here and checked against its published
// check values (1023.343 kg/m^3 at S 35, 25 C); the 0.005 K IPTS-68 to ITS-90 offset is below the stated precision.
// Viscosity is the Sharqawy, Lienhard and Zubair 2010 seawater correlation, valid for S 0 to 150 g/kg, 0 to 180 C.
import type { CitedValue } from '@luovi/core'

export interface WaterTable {
  /** Practical salinity of the reference state, dimensionless (psu). */
  readonly salinity: CitedValue
  /** Temperature of the reference state, K. */
  readonly temperature: CitedValue
  /** kg/m^3 at the reference state and atmospheric pressure. */
  readonly density: CitedValue
  /** m^2/s at the reference state. */
  readonly kinematicViscosity: CitedValue
}

export const balticWater: WaterTable = {
  salinity: {
    value: 7,
    src: 'Estimate: central Baltic surface practical salinity of about 7, the reference state shared with the optics inputs (spec #26)',
  },
  temperature: {
    value: 293.15,
    src: 'Estimate: 20 C summer surface temperature, the reference state shared with the optics inputs (spec #26)',
  },
  density: {
    value: 1003.52,
    src: 'UNESCO 1981, Tech. Pap. Mar. Sci. 36, EOS-80 one-atmosphere equation of Millero and Poisson 1981, Deep-Sea Res. 28A, 625-629, at S 7, 20 C',
  },
  kinematicViscosity: {
    value: 1.0119e-6,
    src: 'Sharqawy, Lienhard and Zubair 2010, Desalination and Water Treatment 16, 354-380, seawater viscosity correlation mu_sw = mu_w (1 + A S + B S^2), 1.0154e-3 Pa s at S 7 g/kg, 20 C, divided by the EOS-80 density above',
  },
}
