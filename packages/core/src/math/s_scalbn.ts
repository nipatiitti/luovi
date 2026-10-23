/* @(#)s_scalbn.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 s_scalbn.c.

import { copysign } from './s_copysign.ts'
import { highWord, lowWord, withHighWord } from './words.ts'

const two54 = 18014398509481984 // 0x43500000, 0x00000000
const twom54 = 5.5511151231257827e-17 // 0x3C900000, 0x00000000
const huge = 1.0e300
const tiny = 1.0e-300

/** x * 2^n computed exactly by exponent manipulation; n is an int32. */
export const scalbn = (xIn: number, n: number): number => {
  let x = xIn
  let hx = highWord(x)
  const lx = lowWord(x)
  let k = (hx & 0x7ff00000) >> 20
  if (k === 0) {
    // 0 or subnormal x
    if ((lx | (hx & 0x7fffffff)) === 0) return x
    x *= two54
    hx = highWord(x)
    k = ((hx & 0x7ff00000) >> 20) - 54
    if (n < -50000) return tiny * x
  }
  if (k === 0x7ff) return x + x // NaN or Inf
  // C's int addition wraps on overflow, which the n > 50000 test below relies on.
  k = (k + n) | 0
  if (k > 0x7fe) return huge * copysign(huge, x)
  if (k > 0) return withHighWord(x, (hx & 0x800fffff) | (k << 20))
  if (k <= -54) {
    // n > 50000 means n + k overflowed int
    if (n > 50000) return huge * copysign(huge, x)
    return tiny * copysign(tiny, x)
  }
  k += 54 // subnormal result
  x = withHighWord(x, (hx & 0x800fffff) | (k << 20))
  return x * twom54
}
