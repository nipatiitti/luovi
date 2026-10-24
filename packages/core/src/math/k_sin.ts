/* @(#)k_sin.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 k_sin.c (__kernel_sin). The algorithm notes are in the C file.

import { highWord } from './words.ts'

const half = 0.5 // 0x3FE00000, 0x00000000
const S1 = -0.16666666666666632 // 0xBFC55555, 0x55555549
const S2 = 0.0083333333333224895 // 0x3F811111, 0x1110F8A6
const S3 = -0.00019841269829857949 // 0xBF2A01A0, 0x19C161D5
const S4 = 0.0000027557313707070068 // 0x3EC71DE3, 0x57B1FE7D
const S5 = -2.5050760253406863e-8 // 0xBE5AE5E6, 0x8A2B9CEB
const S6 = 1.5896909952115501e-10 // 0x3DE5D93A, 0x5ACFD57C

/** sin(x + y) on [-pi/4, pi/4], y the tail of x; iy is 0 when y is known to be zero. */
export const kernelSin = (x: number, y: number, iy: number): number => {
  const ix = highWord(x) & 0x7fffffff
  if (ix < 0x3e400000) {
    // |x| < 2**-27; the C cast exists to raise inexact.
    if ((x | 0) === 0) return x
  }
  const z = x * x
  const v = z * x
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))
  if (iy === 0) return x + v * (S1 + z * r)
  return x - (z * (half * y - v * r) - y - v * S1)
}
