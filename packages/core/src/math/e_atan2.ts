/* @(#)e_atan2.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_atan2.c (__ieee754_atan2). The special cases are listed in
// the C file.

import { abs } from './exact.ts'
import { atan } from './s_atan.ts'
import { highWord, lowWord, withHighWord } from './words.ts'

const tiny = 1.0e-300
const zero = 0.0
const pi_o_4 = 0.78539816339744828 // 0x3FE921FB, 0x54442D18
const pi_o_2 = 1.5707963267948966 // 0x3FF921FB, 0x54442D18
const pi = 3.1415926535897931 // 0x400921FB, 0x54442D18
const pi_lo = 1.2246467991473532e-16 // 0x3CA1A626, 0x33145C07

/** The angle of the point (x, y) from the positive x axis, in [-pi, pi]; Math.atan2's order. */
export const atan2 = (y: number, x: number): number => {
  const hx = highWord(x)
  const ix = hx & 0x7fffffff
  const lx = lowWord(x)
  const hy = highWord(y)
  const iy = hy & 0x7fffffff
  const ly = lowWord(y)
  // (l | -l) >>> 31 is 1 when the low word is non-zero: the unsigned shift of the C.
  if ((ix | ((lx | -lx) >>> 31)) > 0x7ff00000 || (iy | ((ly | -ly) >>> 31)) > 0x7ff00000) {
    return x + y // x or y is NaN
  }
  if (((hx - 0x3ff00000) | lx) === 0) return atan(y) // x = 1.0
  const m = ((hy >> 31) & 1) | ((hx >> 30) & 2) // 2*sign(x) + sign(y)

  // when y = 0
  if ((iy | ly) === 0) {
    switch (m) {
      case 0:
      case 1:
        return y // atan(+-0, +anything) = +-0
      case 2:
        return pi + tiny // atan(+0, -anything) = pi
      case 3:
        return -pi - tiny // atan(-0, -anything) = -pi
    }
  }
  // when x = 0
  if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny

  // when x is INF
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0:
          return pi_o_4 + tiny // atan(+INF, +INF)
        case 1:
          return -pi_o_4 - tiny // atan(-INF, +INF)
        case 2:
          return 3.0 * pi_o_4 + tiny // atan(+INF, -INF)
        case 3:
          return -3.0 * pi_o_4 - tiny // atan(-INF, -INF)
      }
    } else {
      switch (m) {
        case 0:
          return zero // atan(+..., +INF)
        case 1:
          return -zero // atan(-..., +INF)
        case 2:
          return pi + tiny // atan(+..., -INF)
        case 3:
          return -pi - tiny // atan(-..., -INF)
      }
    }
  }
  // when y is INF
  if (iy === 0x7ff00000) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny

  // compute y/x
  const k = (iy - ix) >> 20
  let z: number
  if (k > 60)
    z = pi_o_2 + 0.5 * pi_lo // |y/x| > 2**60
  else if (hx < 0 && k < -60)
    z = 0.0 // |y|/x < -2**60
  else z = atan(abs(y / x)) // safe to do y/x
  switch (m) {
    case 0:
      return z // atan(+, +)
    case 1:
      return withHighWord(z, highWord(z) ^ 0x80000000) // atan(-, +)
    case 2:
      return pi - (z - pi_lo) // atan(+, -)
    default:
      return z - pi_lo - pi // atan(-, -)
  }
}
