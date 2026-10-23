// Cox and Munk 1954 (J. Opt. Soc. Am. 44(11), 838-850), the clean-surface total slope fit from sun glitter photographs;
// the upwind and crosswind fits and the slick surface fits are not carried. Their wind was measured 41 ft (12.5 m)
// above the sea, not at 10 m, so a caller with U10 converts through the log profile first.
import type { CoxMunkTable } from '@luovi/core'

const coxMunk1954 = 'Cox and Munk 1954, J. Opt. Soc. Am. 44(11), 838-850, clean surface'

export const coxMunk: CoxMunkTable = {
  intercept: { value: 0.003, src: `${coxMunk1954}: total mean square slope 0.003 + 5.12e-3 U` },
  slope: { value: 0.00512, src: `${coxMunk1954}: total mean square slope 0.003 + 5.12e-3 U, s/m` },
  windHeight: { value: 12.5, src: `${coxMunk1954}: anemometer 41 ft (12.5 m) above the sea` },
}
