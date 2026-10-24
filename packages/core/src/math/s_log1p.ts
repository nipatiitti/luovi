/* @(#)s_log1p.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 s_log1p.c. The algorithm notes are in the C file.

import { highWord, withHighWord } from './words.ts'

const ln2_hi = 0.69314718036912382 // 0x3fe62e42, 0xfee00000
const ln2_lo = 1.9082149292705877e-10 // 0x3dea39ef, 0x35793c76
const two54 = 18014398509481984 // 0x43500000, 0x00000000
const Lp1 = 0.66666666666667351 // 0x3FE55555, 0x55555593
const Lp2 = 0.39999999999409419 // 0x3FD99999, 0x9997FA04
const Lp3 = 0.28571428743662391 // 0x3FD24924, 0x94229359
const Lp4 = 0.22222198432149784 // 0x3FCC71C5, 0x1D8E78AF
const Lp5 = 0.1818357216161805 // 0x3FC74664, 0x96CB03DE
const Lp6 = 0.15313837699209373 // 0x3FC39A09, 0xD078C69F
const Lp7 = 0.14798198605116586 // 0x3FC2F112, 0xDF3E5244
// The C writes 0.66666666666666666, which names this double.
const twoThirds = 0.66666666666666663 // 0x3FE55555, 0x55555555
const zero = 0.0

/** log(1 + x), accurate near zero where log(1 + x) loses x; -Infinity at -1, NaN below. */
export const log1p = (x: number): number => {
  const hx = highWord(x)
  const ax = hx & 0x7fffffff

  let k = 1
  let f = 0
  let hu = 0
  let c = 0
  if (hx < 0x3fda827a) {
    // x < 0.41422
    if (ax >= 0x3ff00000) {
      // x <= -1.0
      if (x === -1.0) return -two54 / zero // log1p(-1) = -inf
      return (x - x) / (x - x) // log1p(x < -1) = NaN
    }
    if (ax < 0x3e200000) {
      // |x| < 2**-29; two54 + x > zero is always true and exists to raise inexact
      if (two54 + x > zero && ax < 0x3c900000) return x // |x| < 2**-54
      return x - x * x * 0.5
    }
    if (hx > 0 || hx <= (0xbfd2bec3 | 0)) {
      // -0.2929 < x < 0.41422
      k = 0
      f = x
      hu = 1
    }
  }
  if (hx >= 0x7ff00000) return x + x
  if (k !== 0) {
    let u: number
    if (hx < 0x43400000) {
      u = 1.0 + x
      hu = highWord(u)
      k = (hu >> 20) - 1023
      c = k > 0 ? 1.0 - (u - x) : x - (u - 1.0) // correction term
      c /= u
    } else {
      u = x
      hu = highWord(u)
      k = (hu >> 20) - 1023
      c = 0
    }
    hu &= 0x000fffff
    if (hu < 0x6a09e) {
      u = withHighWord(u, hu | 0x3ff00000) // normalize u
    } else {
      k += 1
      u = withHighWord(u, hu | 0x3fe00000) // normalize u/2
      hu = (0x00100000 - hu) >> 2
    }
    f = u - 1.0
  }
  const hfsq = 0.5 * f * f
  if (hu === 0) {
    // |f| < 2**-20
    if (f === zero) {
      if (k === 0) return zero
      c += k * ln2_lo
      return k * ln2_hi + c
    }
    const R = hfsq * (1.0 - twoThirds * f)
    if (k === 0) return f - R
    return k * ln2_hi - (R - (k * ln2_lo + c) - f)
  }
  const s = f / (2.0 + f)
  const z = s * s
  const R = z * (Lp1 + z * (Lp2 + z * (Lp3 + z * (Lp4 + z * (Lp5 + z * (Lp6 + z * Lp7))))))
  if (k === 0) return f - (hfsq - s * (hfsq + R))
  return k * ln2_hi - (hfsq - (s * (hfsq + R) + (k * ln2_lo + c)) - f)
}
