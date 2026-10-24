/* @(#)e_exp.c 1.6 04/04/22 */
/*
 * ====================================================
 * Copyright (C) 2004 by Sun Microsystems, Inc. All rights reserved.
 *
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

// Transliterated from FDLIBM 5.3 e_exp.c (__ieee754_exp). The algorithm notes are in the C file.

import { highWord, lowWord, withHighWord } from './words.ts'

const one = 1.0
const huge = 1.0e300
const twom1000 = 9.3326361850321888e-302 // 0x01700000, 0x00000000
const o_threshold = 709.78271289338397 // 0x40862E42, 0xFEFA39EF
const u_threshold = -745.13321910194111 // 0xc0874910, 0xD52D3051
const ln2HI = 0.69314718036912382 // 0x3fe62e42, 0xfee00000
const ln2LO = 1.9082149292705877e-10 // 0x3dea39ef, 0x35793c76
const invln2 = 1.4426950408889634 // 0x3ff71547, 0x652b82fe
const P1 = 0.16666666666666602 // 0x3FC55555, 0x5555553E
const P2 = -0.0027777777777015593 // 0xBF66C16C, 0x16BEBD93
const P3 = 0.000066137563214379344 // 0x3F11566A, 0xAF25DE2C
const P4 = -0.0000016533902205465252 // 0xBEBBBD41, 0xC5D26BF1
const P5 = 4.1381367970572385e-8 // 0x3E663769, 0x72BEA4D0

/** e^x; +Infinity past about 709.78, +0 below about -745.13. */
export const exp = (xIn: number): number => {
  let x = xIn
  let hx = highWord(x)
  const xsb = (hx >>> 31) & 1 // sign bit of x
  hx &= 0x7fffffff // high word of |x|

  // filter out non-finite argument
  if (hx >= 0x40862e42) {
    // |x| >= 709.78...
    if (hx >= 0x7ff00000) {
      if (((hx & 0xfffff) | lowWord(x)) !== 0) return x + x // NaN
      return xsb === 0 ? x : 0.0 // exp(+-inf) = {inf, 0}
    }
    if (x > o_threshold) return huge * huge // overflow
    if (x < u_threshold) return twom1000 * twom1000 // underflow
  }

  // argument reduction
  let k = 0
  let hi = 0
  let lo = 0
  if (hx > 0x3fd62e42) {
    // |x| > 0.5 ln2
    if (hx < 0x3ff0a2b2) {
      // and |x| < 1.5 ln2
      hi = xsb === 0 ? x - ln2HI : x + ln2HI
      lo = xsb === 0 ? ln2LO : -ln2LO
      k = 1 - xsb - xsb
    } else {
      // C's (int) truncates toward zero; |invln2*x| < 1077 so | 0 does the same.
      k = (invln2 * x + (xsb === 0 ? 0.5 : -0.5)) | 0
      const t = k
      hi = x - t * ln2HI // t*ln2HI is exact here
      lo = t * ln2LO
    }
    x = hi - lo
  } else if (hx < 0x3e300000) {
    // |x| < 2**-28; the test is always true and exists to raise inexact
    if (huge + x > one) return one + x
  }

  // x is now in primary range
  const t = x * x
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))))
  if (k === 0) return one - ((x * c) / (c - 2.0) - x)
  const y = one - (lo - (x * c) / (2.0 - c) - hi)
  if (k >= -1021) return withHighWord(y, (highWord(y) + (k << 20)) | 0) // add k to y's exponent
  return withHighWord(y, (highWord(y) + ((k + 1000) << 20)) | 0) * twom1000
}
