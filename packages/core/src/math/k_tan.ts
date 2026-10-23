/* @(#)k_tan.c 1.5 04/04/22 SMI */
/*
 * ====================================================
 * Copyright 2004 Sun Microsystems, Inc.  All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

// Transliterated from FDLIBM 5.3 k_tan.c (__kernel_tan, the 2004 revision). The algorithm
// notes are in the C file. The C table xxx[] becomes T0 to T12 plus one, pio4 and pio4lo.

import { abs } from './exact.ts'
import { highWord, lowWord, withLowWord } from './words.ts'

const T0 = 0.33333333333333409 // 0x3FD55555, 0x55555563
const T1 = 0.13333333333320124 // 0x3FC11111, 0x1110FE7A
const T2 = 0.053968253976226052 // 0x3FABA1BA, 0x1BB341FE
const T3 = 0.021869488294859542 // 0x3F9664F4, 0x8406D637
const T4 = 0.0088632398235993001 // 0x3F8226E3, 0xE96E8493
const T5 = 0.0035920791075913124 // 0x3F6D6D22, 0xC9560328
const T6 = 0.0014562094543252903 // 0x3F57DBC8, 0xFEE08315
const T7 = 0.0005880412408202641 // 0x3F4344D8, 0xF2F26501
const T8 = 0.00024646313481846991 // 0x3F3026F7, 0x1A8D1068
const T9 = 0.000078179444293955709 // 0x3F147E88, 0xA03792A6
const T10 = 0.000071407249138260819 // 0x3F12B80F, 0x32F0A7E9
const T11 = -0.000018558637485527546 // 0xBEF375CB, 0xDB605373
const T12 = 0.000025907305186363371 // 0x3EFB2A70, 0x74BF7AD4
const one = 1 // 0x3FF00000, 0x00000000
const pio4 = 0.78539816339744828 // 0x3FE921FB, 0x54442D18
const pio4lo = 3.061616997868383e-17 // 0x3C81A626, 0x33145C07

/** tan(x + y) when iy is 1, -1/tan(x + y) when iy is -1, on [-pi/4, pi/4], y the tail of x. */
export const kernelTan = (xIn: number, yIn: number, iy: number): number => {
  let x = xIn
  let y = yIn
  const hx = highWord(x)
  const ix = hx & 0x7fffffff
  if (ix < 0x3e300000) {
    // |x| < 2**-28; the C cast exists to raise inexact.
    if ((x | 0) === 0) {
      if ((ix | lowWord(x) | (iy + 1)) === 0) return one / abs(x)
      if (iy === 1) return x
      // -1 / (x + y), computed carefully.
      const w = x + y
      const z = withLowWord(w, 0)
      const v = y - (z - x)
      const a = -one / w
      const t = withLowWord(a, 0)
      const s = one + t * z
      return t + a * (s + t * v)
    }
  }
  if (ix >= 0x3fe59428) {
    // |x| >= 0.6744: tan(x) = tan(pi/4 - y) with the reflected argument.
    if (hx < 0) {
      x = -x
      y = -y
    }
    const z = pio4 - x
    const w = pio4lo - y
    x = z + w
    y = 0.0
  }
  const z = x * x
  let w = z * z
  // x^5 (T1 + x^2 T2 + ...) split into its odd and even halves in w = x^4.
  let r = T1 + w * (T3 + w * (T5 + w * (T7 + w * (T9 + w * T11))))
  let v = z * (T2 + w * (T4 + w * (T6 + w * (T8 + w * (T10 + w * T12)))))
  const s = z * x
  r = y + z * (s * (r + v) + y)
  r += T0 * s
  w = x + r
  if (ix >= 0x3fe59428) {
    v = iy
    return (1 - ((hx >> 30) & 2)) * (v - 2.0 * (x - ((w * w) / (w + v) - r)))
  }
  if (iy === 1) return w
  // -1.0 / (x + r), computed accurately rather than to 2 ulp.
  const zw = withLowWord(w, 0)
  const vw = r - (zw - x)
  const a = -1.0 / w
  const t = withLowWord(a, 0)
  const sw = 1.0 + t * zw
  return t + a * (sw + t * vw)
}
