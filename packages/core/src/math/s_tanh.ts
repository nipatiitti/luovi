/* @(#)s_tanh.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 s_tanh.c. The algorithm notes are in the C file.

import { abs } from './exact.ts'
import { expm1 } from './s_expm1.ts'
import { highWord } from './words.ts'

const one = 1.0
const two = 2.0
const tiny = 1.0e-300

/** The hyperbolic tangent, in [-1, 1]. */
export const tanh = (x: number): number => {
  // High word of |x|.
  const jx = highWord(x)
  const ix = jx & 0x7fffffff

  // x is INF or NaN
  if (ix >= 0x7ff00000) {
    if (jx >= 0) return one / x + one // tanh(+-inf)=+-1
    return one / x - one // tanh(NaN) = NaN
  }

  let z: number
  if (ix < 0x40360000) {
    // |x|<22
    if (ix < 0x3c800000) return x * (one + x) // |x|<2**-55: tanh(small) = small
    if (ix >= 0x3ff00000) {
      // |x|>=1
      const t = expm1(two * abs(x))
      z = one - two / (t + two)
    } else {
      const t = expm1(-two * abs(x))
      z = -t / (t + two)
    }
  } else {
    // |x| > 22, return +-1
    z = one - tiny // raised inexact flag
  }
  return jx >= 0 ? z : -z
}
