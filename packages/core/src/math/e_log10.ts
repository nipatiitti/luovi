/* @(#)e_log10.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_log10.c (__ieee754_log10). The algorithm notes are in the C
// file.

import { log } from './e_log.ts'
import { highWord, lowWord, withHighWord } from './words.ts'

const two54 = 18014398509481984 // 0x43500000, 0x00000000
const ivln10 = 0.43429448190325182 // 0x3FDBCB7B, 0x1526E50E
const log10_2hi = 0.30102999566361177 // 0x3FD34413, 0x509F6000
const log10_2lo = 3.6942390771589308e-13 // 0x3D59FEF3, 0x11F12B36
const zero = 0.0

/** The base-10 logarithm; -Infinity at +-0, NaN below zero. */
export const log10 = (xIn: number): number => {
  let x = xIn
  let hx = highWord(x)
  const lx = lowWord(x)

  let k = 0
  if (hx < 0x00100000) {
    // x < 2**-1022
    if (((hx & 0x7fffffff) | lx) === 0) return -two54 / zero // log(+-0) = -inf
    if (hx < 0) return (x - x) / zero // log(-#) = NaN
    k -= 54 // subnormal number, scale up x
    x *= two54
    hx = highWord(x)
  }
  if (hx >= 0x7ff00000) return x + x
  k += (hx >> 20) - 1023
  const i = (k & 0x80000000) >>> 31
  hx = (hx & 0x000fffff) | ((0x3ff - i) << 20)
  const y = k + i
  x = withHighWord(x, hx)
  const z = y * log10_2lo + ivln10 * log(x)
  return z + y * log10_2hi
}
