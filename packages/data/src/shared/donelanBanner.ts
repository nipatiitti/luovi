// D = beta / (2 tanh(beta pi)) sech^2(beta theta). Donelan's coefficients are read from the January 1983 manuscript
// that became Donelan, Hamilton and Hui 1985 (eq. 11.12, p. 83, page image checked by the #24 research); the published
// 1985 paper was not read. Banner 1990 is read from the J. Phys. Oceanogr. scan (eq. 2.9b, p. 971). ADR 0005's amendment
// adds the 1.24 floor and puts Banner's branch on k / k_p, since under TMA k / k_p is not (omega / omega_p)^2.
import type { CitedValue } from '@luovi/core'

/**
 * Branch rule: Banner when k / k_p > bannerThreshold; otherwise Donelan on lowerLimit < omega / omega_p < upperLimit,
 * beta = coefficient (omega / (pivot omega_p))^(+exponent) below the pivot and ^(-exponent) from it; otherwise betaFloor.
 * Banner: beta = 10^(bannerOffset + bannerScale exp(bannerRate ln(k / k_p))).
 */
export interface DonelanBannerTable {
  readonly coefficient: CitedValue
  readonly pivot: CitedValue
  readonly exponent: CitedValue
  readonly lowerLimit: CitedValue
  readonly upperLimit: CitedValue
  readonly betaFloor: CitedValue
  readonly bannerThreshold: CitedValue
  readonly bannerOffset: CitedValue
  readonly bannerScale: CitedValue
  readonly bannerRate: CitedValue
}

const donelan =
  'Donelan, Hamilton and Hui 1985, Phil. Trans. R. Soc. A 315, 509-562, doi:10.1098/rsta.1985.0054 (eq. 11.12 of the 1983 submitted manuscript, p. 83)'
const banner = 'Banner 1990, J. Phys. Oceanogr. 20, 966-984, eq. 2.9b'

export const donelanBanner: DonelanBannerTable = {
  coefficient: { value: 2.44, src: `${donelan}: beta = 2.44 (omega / 0.95 omega_p)^(+-1.3)` },
  pivot: { value: 0.95, src: `${donelan}: beta = 2.44 (omega / 0.95 omega_p)^(+-1.3), + below 0.95 omega_p` },
  exponent: { value: 1.3, src: `${donelan}: beta = 2.44 (omega / 0.95 omega_p)^(+-1.3)` },
  lowerLimit: { value: 0.56, src: `${donelan}: the law holds for 0.56 < omega / omega_p < 1.6` },
  upperLimit: { value: 1.6, src: `${donelan}: the law holds for 0.56 < omega / omega_p < 1.6` },
  betaFloor: { value: 1.24, src: `${donelan}: beta = 1.24 otherwise` },
  bannerThreshold: { value: 2.56, src: `${banner}: upper branch for k / k_p > 2.56` },
  bannerOffset: { value: -0.4, src: `${banner}: b = 10^(-0.4 + 0.8393 exp(-0.567 ln(k / k_p)))` },
  bannerScale: { value: 0.8393, src: `${banner}: b = 10^(-0.4 + 0.8393 exp(-0.567 ln(k / k_p)))` },
  bannerRate: { value: -0.567, src: `${banner}: b = 10^(-0.4 + 0.8393 exp(-0.567 ln(k / k_p)))` },
}
