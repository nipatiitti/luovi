/* @(#)e_atanh.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_atanh.c (__ieee754_atanh). The algorithm notes are in the C
// file.

import { log1p } from './s_log1p.ts'
import { highWord, lowWord, withHighWord } from './words.ts'

const one = 1.0
const huge = 1e300
const zero = 0.0

/** The inverse hyperbolic tangent; +-Infinity at +-1, NaN outside [-1, 1]. */
export const atanh = (xIn: number): number => {
  let x = xIn
  const hx = highWord(x)
  const lx = lowWord(x)
  const ix = hx & 0x7fffffff
  // (lx | -lx) >>> 31 is 1 when the low word is non-zero: the unsigned shift of the C.
  if ((ix | ((lx | -lx) >>> 31)) > 0x3ff00000) return (x - x) / (x - x) // |x|>1
  if (ix === 0x3ff00000) return x / zero
  if (ix < 0x3e300000 && huge + x > zero) return x // x<2**-28
  x = withHighWord(x, ix) // x <- |x|
  let t: number
  if (ix < 0x3fe00000) {
    // x < 0.5
    t = x + x
    t = 0.5 * log1p(t + (t * x) / (one - x))
  } else {
    t = 0.5 * log1p((x + x) / (one - x))
  }
  return hx >= 0 ? t : -t
}
