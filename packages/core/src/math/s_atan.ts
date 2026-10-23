/* @(#)s_atan.c 1.3 95/01/18 */
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

// Transliterated from FDLIBM 5.3 s_atan.c. The algorithm notes are in the C file.

import { abs } from './exact.ts'
import { highWord, lowWord } from './words.ts'

// atan(0.5), atan(1), atan(1.5) and atan(inf), each split into a high and a low part.
const atanhi = Float64Array.of(
  0.46364760900080609, // 0x3FDDAC67, 0x0561BB4F
  0.78539816339744828, // 0x3FE921FB, 0x54442D18
  0.98279372324732905, // 0x3FEF730B, 0xD281F69B
  1.5707963267948966, // 0x3FF921FB, 0x54442D18
)
const atanlo = Float64Array.of(
  2.2698777452961687e-17, // 0x3C7A2B7F, 0x222F65E2
  3.061616997868383e-17, // 0x3C81A626, 0x33145C07
  1.3903311031230998e-17, // 0x3C700788, 0x7AF0CBBD
  6.123233995736766e-17, // 0x3C91A626, 0x33145C07
)

const aT0 = 0.33333333333332932 // 0x3FD55555, 0x5555550D
const aT1 = -0.19999999999876483 // 0xBFC99999, 0x9998EBC4
const aT2 = 0.14285714272503466 // 0x3FC24924, 0x920083FF
const aT3 = -0.11111110405462356 // 0xBFBC71C6, 0xFE231671
const aT4 = 0.090908871334365066 // 0x3FB745CD, 0xC54C206E
const aT5 = -0.0769187620504483 // 0xBFB3B0F2, 0xAF749A6D
const aT6 = 0.066610731373875312 // 0x3FB10D66, 0xA0D03D51
const aT7 = -0.058335701337905735 // 0xBFADDE2D, 0x52DEFD9A
const aT8 = 0.049768779946159324 // 0x3FA97B4B, 0x24760DEB
const aT9 = -0.036531572744216916 // 0xBFA2B444, 0x2C6A6C2F
const aT10 = 0.016285820115365782 // 0x3F90AD3A, 0xE322DA11

const one = 1.0
const huge = 1.0e300

/** atan(x) in [-pi/2, pi/2]. */
export const atan = (xIn: number): number => {
  let x = xIn
  let id: number
  const hx = highWord(x)
  const ix = hx & 0x7fffffff
  if (ix >= 0x44100000) {
    // |x| >= 2^66
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lowWord(x) !== 0)) return x + x // NaN
    if (hx > 0) return (atanhi[3] ?? 0) + (atanlo[3] ?? 0)
    return -(atanhi[3] ?? 0) - (atanlo[3] ?? 0)
  }
  if (ix < 0x3fdc0000) {
    // |x| < 0.4375
    if (ix < 0x3e200000) {
      // |x| < 2^-29; the test is always true and exists to raise inexact.
      if (huge + x > one) return x
    }
    id = -1
  } else {
    x = abs(x)
    if (ix < 0x3ff30000) {
      // |x| < 1.1875
      if (ix < 0x3fe60000) {
        // 7/16 <= |x| < 11/16
        id = 0
        x = (2.0 * x - one) / (2.0 + x)
      } else {
        // 11/16 <= |x| < 19/16
        id = 1
        x = (x - one) / (x + one)
      }
    } else if (ix < 0x40038000) {
      // |x| < 2.4375
      id = 2
      x = (x - 1.5) / (one + 1.5 * x)
    } else {
      // 2.4375 <= |x| < 2^66
      id = 3
      x = -1.0 / x
    }
  }
  // end of argument reduction
  let z = x * x
  const w = z * z
  // the sum of aT[i] z^(i+1) from i = 0 to 10, split into its odd and even halves
  const s1 = z * (aT0 + w * (aT2 + w * (aT4 + w * (aT6 + w * (aT8 + w * aT10)))))
  const s2 = w * (aT1 + w * (aT3 + w * (aT5 + w * (aT7 + w * aT9))))
  if (id < 0) return x - x * (s1 + s2)
  z = (atanhi[id] ?? 0) - (x * (s1 + s2) - (atanlo[id] ?? 0) - x)
  return hx < 0 ? -z : z
}
