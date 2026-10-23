/* @(#)e_acos.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_acos.c (__ieee754_acos). The algorithm notes are in the C
// file.

import { sqrt } from './exact.ts'
import { highWord, lowWord, withLowWord } from './words.ts'

const one = 1 // 0x3FF00000, 0x00000000
const pi = 3.1415926535897931 // 0x400921FB, 0x54442D18
const pio2_hi = 1.5707963267948966 // 0x3FF921FB, 0x54442D18
const pio2_lo = 6.123233995736766e-17 // 0x3C91A626, 0x33145C07
const pS0 = 0.16666666666666666 // 0x3FC55555, 0x55555555
const pS1 = -0.32556581862240092 // 0xBFD4D612, 0x03EB6F7D
const pS2 = 0.20121253213486293 // 0x3FC9C155, 0x0E884455
const pS3 = -0.040055534500679411 // 0xBFA48228, 0xB5688F3B
const pS4 = 0.00079153499428981453 // 0x3F49EFE0, 0x7501B288
const pS5 = 0.000034793310759602117 // 0x3F023DE1, 0x0DFDF709
const qS1 = -2.4033949117344142 // 0xC0033A27, 0x1C8A2D4B
const qS2 = 2.0209457602335057 // 0x40002AE5, 0x9C598AC8
const qS3 = -0.68828397160545329 // 0xBFE6066C, 0x1B8D0159
const qS4 = 0.077038150555901935 // 0x3FB3B8C5, 0xB12E9282

/** acos(x) in [0, pi]; NaN outside [-1, 1]. */
export const acos = (x: number): number => {
  const hx = highWord(x)
  const ix = hx & 0x7fffffff
  if (ix >= 0x3ff00000) {
    // |x| >= 1
    if (((ix - 0x3ff00000) | lowWord(x)) === 0) {
      // |x| == 1
      if (hx > 0) return 0.0 // acos(1) = 0
      return pi + 2.0 * pio2_lo // acos(-1) = pi
    }
    return (x - x) / (x - x) // acos(|x| > 1) is NaN
  }
  if (ix < 0x3fe00000) {
    // |x| < 0.5
    if (ix <= 0x3c600000) return pio2_hi + pio2_lo // |x| < 2**-57
    const z = x * x
    const p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))))
    const q = one + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)))
    const r = p / q
    return pio2_hi - (x - (pio2_lo - x * r))
  } else if (hx < 0) {
    // x < -0.5
    const z = (one + x) * 0.5
    const p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))))
    const q = one + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)))
    const s = sqrt(z)
    const r = p / q
    const w = r * s - pio2_lo
    return pi - 2.0 * (s + w)
  }
  // x > 0.5
  const z = (one - x) * 0.5
  const s = sqrt(z)
  const df = withLowWord(s, 0)
  const c = (z - df * df) / (s + df)
  const p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))))
  const q = one + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)))
  const r = p / q
  const w = r * s + c
  return 2.0 * (df + w)
}
