/* @(#)e_hypot.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_hypot.c (__ieee754_hypot). The algorithm notes are in the C
// file.

import { sqrt } from './exact.ts'
import { fromWords, highWord, lowWord, withHighWord } from './words.ts'

/**
 * sqrt(x*x + y*y) without undue overflow or underflow, two arguments only. A 3D norm is
 * sqrt(x*x + y*y + z*z), which is correctly rounded and deterministic at sailing magnitudes.
 */
export const hypot = (x: number, y: number): number => {
  let ha = highWord(x) & 0x7fffffff // high word of x
  let hb = highWord(y) & 0x7fffffff // high word of y
  let a: number
  let b: number
  if (hb > ha) {
    a = y
    b = x
    const j = ha
    ha = hb
    hb = j
  } else {
    a = x
    b = y
  }
  a = withHighWord(a, ha) // a <- |a|
  b = withHighWord(b, hb) // b <- |b|
  if (ha - hb > 0x3c00000) return a + b // x/y > 2**60
  let k = 0
  if (ha > 0x5f300000) {
    // a>2**500
    if (ha >= 0x7ff00000) {
      // Inf or NaN
      let w = a + b // for sNaN
      if (((ha & 0xfffff) | lowWord(a)) === 0) w = a
      if (((hb ^ 0x7ff00000) | lowWord(b)) === 0) w = b
      return w
    }
    // scale a and b by 2**-600
    ha -= 0x25800000
    hb -= 0x25800000
    k += 600
    a = withHighWord(a, ha)
    b = withHighWord(b, hb)
  }
  if (hb < 0x20b00000) {
    // b < 2**-500
    if (hb <= 0x000fffff) {
      // subnormal b or 0
      if ((hb | lowWord(b)) === 0) return a
      const t1 = fromWords(0x7fd00000, 0) // t1=2^1022
      b *= t1
      a *= t1
      k -= 1022
    } else {
      // scale a and b by 2^600
      ha += 0x25800000 // a *= 2^600
      hb += 0x25800000 // b *= 2^600
      k -= 600
      a = withHighWord(a, ha)
      b = withHighWord(b, hb)
    }
  }
  // medium size a and b
  let w = a - b
  if (w > b) {
    const t1 = fromWords(ha, 0)
    const t2 = a - t1
    w = sqrt(t1 * t1 - (b * -b - t2 * (a + t1)))
  } else {
    a = a + a
    const y1 = fromWords(hb, 0)
    const y2 = b - y1
    const t1 = fromWords(ha + 0x00100000, 0)
    const t2 = a - t1
    w = sqrt(t1 * y1 - (w * -w - (t1 * y2 + t2 * b)))
  }
  if (k !== 0) return fromWords(0x3ff00000 + (k << 20), 0) * w
  return w
}
