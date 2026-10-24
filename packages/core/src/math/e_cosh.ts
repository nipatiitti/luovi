/* @(#)e_cosh.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_cosh.c (__ieee754_cosh). The algorithm notes are in the C
// file.

import { exp } from './e_exp.ts'
import { abs } from './exact.ts'
import { expm1 } from './s_expm1.ts'
import { highWord, lowWord } from './words.ts'

const one = 1.0
const half = 0.5
const huge = 1.0e300

/** The hyperbolic cosine; overflows to +Infinity past about 710.48. */
export const cosh = (x: number): number => {
  // High word of |x|.
  const ix = highWord(x) & 0x7fffffff

  // x is INF or NaN
  if (ix >= 0x7ff00000) return x * x

  // |x| in [0,0.5*ln2], return 1+expm1(|x|)^2/(2*exp(|x|))
  if (ix < 0x3fd62e43) {
    const t = expm1(abs(x))
    const w = one + t
    if (ix < 0x3c800000) return w // cosh(tiny) = 1
    return one + (t * t) / (w + w)
  }

  // |x| in [0.5*ln2,22], return (exp(|x|)+1/exp(|x|)/2
  if (ix < 0x40360000) {
    const t = exp(abs(x))
    return half * t + half / t
  }

  // |x| in [22, log(maxdouble)] return half*exp(|x|)
  if (ix < 0x40862e42) return half * exp(abs(x))

  // |x| in [log(maxdouble), overflowthresold]; the C compares the low word unsigned
  const lx = lowWord(x) >>> 0
  if (ix < 0x408633ce || (ix === 0x408633ce && lx <= 0x8fb9f87d)) {
    const w = exp(half * abs(x))
    const t = half * w
    return t * w
  }

  // |x| > overflowthresold, cosh(x) overflow
  return huge * huge
}
