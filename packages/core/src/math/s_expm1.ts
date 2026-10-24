/* @(#)s_expm1.c 1.5 04/04/22 */
/*
 * ====================================================
 * Copyright (C) 2004 by Sun Microsystems, Inc. All rights reserved.
 *
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

// Transliterated from FDLIBM 5.3 s_expm1.c. The algorithm notes are in the C file.

import { highWord, lowWord, withHighWord } from './words.ts'

const one = 1.0
const huge = 1.0e300
const tiny = 1.0e-300
const o_threshold = 709.78271289338397 // 0x40862E42, 0xFEFA39EF
const ln2_hi = 0.69314718036912382 // 0x3fe62e42, 0xfee00000
const ln2_lo = 1.9082149292705877e-10 // 0x3dea39ef, 0x35793c76
const invln2 = 1.4426950408889634 // 0x3ff71547, 0x652b82fe
// scaled coefficients related to expm1
const Q1 = -0.033333333333333132 // 0xBFA11111, 0x111110F4
const Q2 = 0.0015873015872548146 // 0x3F5A01A0, 0x19FE5585
const Q3 = -0.000079365075786748794 // 0xBF14CE19, 0x9EAADBB7
const Q4 = 0.0000040082178273293624 // 0x3ED0CFCA, 0x86E65239
const Q5 = -2.0109921818362437e-7 // 0xBE8AFDB7, 0x6E09C32D

/** e^x - 1, accurate near zero where exp(x) - 1 cancels; -1 for very negative x. */
export const expm1 = (xIn: number): number => {
  let x = xIn
  let hx = highWord(x)
  const xsb = hx & 0x80000000 // sign bit of x
  hx &= 0x7fffffff // high word of |x|

  // filter out huge and non-finite argument
  if (hx >= 0x4043687a) {
    // |x| >= 56*ln2
    if (hx >= 0x40862e42) {
      // |x| >= 709.78...
      if (hx >= 0x7ff00000) {
        if (((hx & 0xfffff) | lowWord(x)) !== 0) return x + x // NaN
        return xsb === 0 ? x : -1.0 // exp(+-inf) = {inf, -1}
      }
      if (x > o_threshold) return huge * huge // overflow
    }
    if (xsb !== 0) {
      // x < -56*ln2, return -1.0 with inexact
      if (x + tiny < 0.0) return tiny - one
    }
  }

  // argument reduction
  let k = 0
  let c = 0
  if (hx > 0x3fd62e42) {
    // |x| > 0.5 ln2
    let hi: number
    let lo: number
    if (hx < 0x3ff0a2b2) {
      // and |x| < 1.5 ln2
      if (xsb === 0) {
        hi = x - ln2_hi
        lo = ln2_lo
        k = 1
      } else {
        hi = x + ln2_hi
        lo = -ln2_lo
        k = -1
      }
    } else {
      // C's implicit double-to-int conversion truncates toward zero, as | 0 does in range.
      k = (invln2 * x + (xsb === 0 ? 0.5 : -0.5)) | 0
      const t = k
      hi = x - t * ln2_hi // t*ln2_hi is exact here
      lo = t * ln2_lo
    }
    x = hi - lo
    c = hi - x - lo
  } else if (hx < 0x3c900000) {
    // |x| < 2**-54, return x with inexact flags when x != 0
    const t = huge + x
    return x - (t - (huge + x))
  }

  // x is now in primary range
  const hfx = 0.5 * x
  const hxs = x * hfx
  const r1 = one + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))))
  let t = 3.0 - r1 * hfx
  let e = hxs * ((r1 - t) / (6.0 - x * t))
  if (k === 0) return x - (x * e - hxs) // c is 0
  e = x * (e - c) - c
  e -= hxs
  if (k === -1) return 0.5 * (x - e) - 0.5
  if (k === 1) {
    if (x < -0.25) return -2.0 * (e - (x + 0.5))
    return one + 2.0 * (x - e)
  }
  if (k <= -2 || k > 56) {
    // suffice to return exp(x)-1
    const y = one - (e - x)
    return withHighWord(y, (highWord(y) + (k << 20)) | 0) - one // add k to y's exponent
  }
  let y: number
  if (k < 20) {
    t = withHighWord(one, 0x3ff00000 - (0x200000 >> k)) // t = 1-2^-k
    y = t - (e - x)
  } else {
    t = withHighWord(one, (0x3ff - k) << 20) // 2^-k
    y = x - (e + t)
    y += one
  }
  return withHighWord(y, (highWord(y) + (k << 20)) | 0) // add k to y's exponent
}
