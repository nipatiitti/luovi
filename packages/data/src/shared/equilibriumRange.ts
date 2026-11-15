// The equilibrium range, the rear face of a wind sea's frequency spectrum above its peak. Read from the January 1983
// manuscript that became Donelan, Hamilton and Hui 1985 (section 8.1 and the conclusions; the published paper was not
// read): Lake Ontario wave staffs at fetches of 1.1 to 300 km. The manuscript notes that Kahma 1981's accelerometer buoy
// spectra from the Gulf of Bothnia have the same omega^-4 rear face and a level "not inconsistent" with this one over
// the range of his data; Kahma's paper itself was not reached.
import type { CitedValue } from '@luovi/core'

/**
 * S(omega) = alpha g^2 omega^-4 omega_p^-1 exp(-(omega_p / omega)^4) for lowerLimit < omega / omega_p < upperLimit, with
 * alpha = coefficient (U_c / c_p)^exponent, U_c the 10 m wind along the peak waves and c_p their phase speed.
 */
export interface EquilibriumRangeTable {
  readonly coefficient: CitedValue
  readonly exponent: CitedValue
  readonly lowerLimit: CitedValue
  readonly upperLimit: CitedValue
}

const donelan =
  'Donelan, Hamilton and Hui 1985, Phil. Trans. R. Soc. A 315, 509-562, doi:10.1098/rsta.1985.0054 (1983 submitted manuscript'

export const equilibriumRange: EquilibriumRangeTable = {
  coefficient: { value: 0.006, src: `${donelan}, eq. 8.2 and 12.4): alpha = 0.006 (U_c / c_p)^0.55` },
  exponent: { value: 0.55, src: `${donelan}, eq. 8.2 and 12.4): alpha = 0.006 (U_c / c_p)^0.55` },
  lowerLimit: {
    value: 1.5,
    src: `${donelan}, conclusions): the rear face is well described by omega^-4 omega_p^-1 for 1.5 < omega / omega_p < 3.5`,
  },
  upperLimit: {
    value: 3.5,
    src: `${donelan}, conclusions): the rear face is well described by omega^-4 omega_p^-1 for 1.5 < omega / omega_p < 3.5`,
  },
}
