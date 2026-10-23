/* @(#)k_cos.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 k_cos.c (__kernel_cos). The algorithm notes are in the C file.

import { fromWords, highWord } from './words.ts'

const one = 1 // 0x3FF00000, 0x00000000
const C1 = 0.041666666666666602 // 0x3FA55555, 0x5555554C
const C2 = -0.001388888888887411 // 0xBF56C16C, 0x16C15177
const C3 = 0.000024801587289476729 // 0x3EFA01A0, 0x19CB1590
const C4 = -2.7557314351390663e-7 // 0xBE927E4F, 0x809C52AD
const C5 = 2.0875723212981748e-9 // 0x3E21EE9E, 0xBDB4B1C4
const C6 = -1.1359647557788195e-11 // 0xBDA8FAE9, 0xBE8838D4

/** cos(x + y) on [-pi/4, pi/4], y the tail of x. */
export const kernelCos = (x: number, y: number): number => {
  const ix = highWord(x) & 0x7fffffff
  if (ix < 0x3e400000) {
    // |x| < 2**-27; the C cast exists to raise inexact.
    if ((x | 0) === 0) return one
  }
  const z = x * x
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))))
  if (ix < 0x3fd33333) {
    // |x| < 0.3
    return one - (0.5 * z - (z * r - x * y))
  }
  // qx is |x|/4 with the low word cleared, or 0.28125 above 0.78125, so that 1 - qx and
  // x*x/2 - qx are exact.
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0)
  const hz = 0.5 * z - qx
  const a = one - qx
  return a - (hz - (z * r - x * y))
}
