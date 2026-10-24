/* @(#)e_asin.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_asin.c (__ieee754_asin). The algorithm notes are in the C
// file.

import { abs, sqrt } from './exact.ts'
import { highWord, lowWord, withLowWord } from './words.ts'

const one = 1 // 0x3FF00000, 0x00000000
const huge = 1.0e300
const pio2_hi = 1.5707963267948966 // 0x3FF921FB, 0x54442D18
const pio2_lo = 6.123233995736766e-17 // 0x3C91A626, 0x33145C07
const pio4_hi = 0.78539816339744828 // 0x3FE921FB, 0x54442D18
// coefficients for R(x^2)
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

/** asin(x) in [-pi/2, pi/2]; NaN outside [-1, 1]. */
export const asin = (x: number): number => {
  const hx = highWord(x)
  const ix = hx & 0x7fffffff
  if (ix >= 0x3ff00000) {
    // |x| >= 1
    if (((ix - 0x3ff00000) | lowWord(x)) === 0) {
      // asin(1) = +-pi/2 with inexact
      return x * pio2_hi + x * pio2_lo
    }
    return (x - x) / (x - x) // asin(|x| > 1) is NaN
  } else if (ix < 0x3fe00000) {
    // |x| < 0.5
    if (ix < 0x3e400000) {
      // |x| < 2**-27. The test is always true and exists to raise inexact; in the C, the else
      // that follows binds only t = x*x, so the polynomial below runs for no input this small.
      if (huge + x > one) return x
    }
    const t = x * x
    const p = t * (pS0 + t * (pS1 + t * (pS2 + t * (pS3 + t * (pS4 + t * pS5)))))
    const q = one + t * (qS1 + t * (qS2 + t * (qS3 + t * qS4)))
    const w = p / q
    return x + x * w
  }
  // 1 > |x| >= 0.5
  let w = one - abs(x)
  let t = w * 0.5
  let p = t * (pS0 + t * (pS1 + t * (pS2 + t * (pS3 + t * (pS4 + t * pS5)))))
  let q = one + t * (qS1 + t * (qS2 + t * (qS3 + t * qS4)))
  const s = sqrt(t)
  if (ix >= 0x3fef3333) {
    // |x| > 0.975
    w = p / q
    t = pio2_hi - (2.0 * (s + s * w) - pio2_lo)
  } else {
    w = withLowWord(s, 0)
    const c = (t - w * w) / (s + w)
    const r = p / q
    p = 2.0 * s * r - (pio2_lo - 2.0 * c)
    q = pio4_hi - 2.0 * w
    t = pio4_hi - (p - q)
  }
  return hx > 0 ? t : -t
}
