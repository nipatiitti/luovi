/* @(#)e_sinh.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_sinh.c (__ieee754_sinh). The algorithm notes are in the C
// file.

import { exp } from './e_exp.ts'
import { abs } from './exact.ts'
import { expm1 } from './s_expm1.ts'
import { highWord, lowWord } from './words.ts'

const one = 1.0
const shuge = 1.0e307

/** The hyperbolic sine; overflows to +-Infinity past about 710.48. */
export const sinh = (x: number): number => {
  // High word of |x|.
  const jx = highWord(x)
  const ix = jx & 0x7fffffff

  // x is INF or NaN
  if (ix >= 0x7ff00000) return x + x

  const h = jx < 0 ? -0.5 : 0.5
  // |x| in [0,22], return sign(x)*0.5*(E+E/(E+1)))
  if (ix < 0x40360000) {
    // |x|<22
    if (ix < 0x3e300000) {
      // |x|<2**-28; the test is always true and exists to raise inexact
      if (shuge + x > one) return x // sinh(tiny) = tiny with inexact
    }
    const t = expm1(abs(x))
    if (ix < 0x3ff00000) return h * (2.0 * t - (t * t) / (t + one))
    return h * (t + t / (t + one))
  }

  // |x| in [22, log(maxdouble)] return 0.5*exp(|x|)
  if (ix < 0x40862e42) return h * exp(abs(x))

  // |x| in [log(maxdouble), overflowthresold]; the C compares the low word unsigned
  const lx = lowWord(x) >>> 0
  if (ix < 0x408633ce || (ix === 0x408633ce && lx <= 0x8fb9f87d)) {
    const w = exp(0.5 * abs(x))
    const t = h * w
    return t * w
  }

  // |x| > overflowthresold, sinh(x) overflow
  return x * shuge
}
