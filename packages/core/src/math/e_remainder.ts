/* @(#)e_remainder.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_remainder.c (__ieee754_remainder). The algorithm notes are in
// the C file.

import { abs } from './exact.ts'
import { fmod } from './e_fmod.ts'
import { highWord, lowWord, withHighWord } from './words.ts'

const zero = 0.0

/**
 * IEEE remainder: x - n*p with n the integer nearest x / p, ties to even, computed exactly; the
 * result lies in [-|p|/2, |p|/2]. Not JavaScript's %, which truncates the quotient.
 */
export const remainder = (xIn: number, pIn: number): number => {
  let x = xIn
  let p = pIn
  let hx = highWord(x) // high word of x
  const lx = lowWord(x) // low word of x
  let hp = highWord(p) // high word of p
  const lp = lowWord(p) // low word of p
  const sx = hx & 0x80000000
  hp &= 0x7fffffff
  hx &= 0x7fffffff

  // purge off exception values
  if ((hp | lp) === 0) return (x * p) / (x * p) // p = 0
  if (hx >= 0x7ff00000 || (hp >= 0x7ff00000 && ((hp - 0x7ff00000) | lp) !== 0)) {
    return (x * p) / (x * p) // x not finite, or p is NaN
  }

  if (hp <= 0x7fdfffff) x = fmod(x, p + p) // now x < 2p
  if (((hx - hp) | (lx - lp)) === 0) return zero * x
  x = abs(x)
  p = abs(p)
  if (hp < 0x00200000) {
    if (x + x > p) {
      x -= p
      if (x + x >= p) x -= p
    }
  } else {
    const p_half = 0.5 * p
    if (x > p_half) {
      x -= p
      if (x >= p_half) x -= p
    }
  }
  return withHighWord(x, highWord(x) ^ sx)
}
