/* @(#)e_log.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_log.c (__ieee754_log). The algorithm notes are in the C file.

import { highWord, lowWord, withHighWord } from './words.ts'

const ln2_hi = 0.69314718036912382 // 0x3fe62e42, 0xfee00000
const ln2_lo = 1.9082149292705877e-10 // 0x3dea39ef, 0x35793c76
const two54 = 18014398509481984 // 0x43500000, 0x00000000
const Lg1 = 0.66666666666667351 // 0x3FE55555, 0x55555593
const Lg2 = 0.39999999999409419 // 0x3FD99999, 0x9997FA04
const Lg3 = 0.28571428743662391 // 0x3FD24924, 0x94229359
const Lg4 = 0.22222198432149784 // 0x3FCC71C5, 0x1D8E78AF
const Lg5 = 0.1818357216161805 // 0x3FC74664, 0x96CB03DE
const Lg6 = 0.15313837699209373 // 0x3FC39A09, 0xD078C69F
const Lg7 = 0.14798198605116586 // 0x3FC2F112, 0xDF3E5244
// The C writes 0.33333333333333333, which names this double.
const third = 0.33333333333333331 // 0x3FD55555, 0x55555555
const zero = 0.0

/** The natural logarithm; -Infinity at +-0, NaN below zero. */
export const log = (xIn: number): number => {
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
  hx &= 0x000fffff
  let i = (hx + 0x95f64) & 0x100000
  x = withHighWord(x, hx | (i ^ 0x3ff00000)) // normalize x or x/2
  k += i >> 20
  const f = x - 1.0
  if ((0x000fffff & (2 + hx)) < 3) {
    // |f| < 2**-20
    if (f === zero) {
      if (k === 0) return zero
      const dk = k
      return dk * ln2_hi + dk * ln2_lo
    }
    const R = f * f * (0.5 - third * f)
    if (k === 0) return f - R
    const dk = k
    return dk * ln2_hi - (R - dk * ln2_lo - f)
  }
  const s = f / (2.0 + f)
  const dk = k
  const z = s * s
  i = hx - 0x6147a
  const w = z * z
  const j = 0x6b851 - hx
  const t1 = w * (Lg2 + w * (Lg4 + w * Lg6))
  const t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)))
  i |= j
  const R = t2 + t1
  if (i > 0) {
    const hfsq = 0.5 * f * f
    if (k === 0) return f - (hfsq - s * (hfsq + R))
    return dk * ln2_hi - (hfsq - (s * (hfsq + R) + dk * ln2_lo) - f)
  }
  if (k === 0) return f - s * (f - R)
  return dk * ln2_hi - (s * (f - R) - dk * ln2_lo - f)
}
