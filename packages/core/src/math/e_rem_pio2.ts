/* @(#)e_rem_pio2.c 1.4 95/01/18 */
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 *
 */

// Transliterated from FDLIBM 5.3 e_rem_pio2.c (__ieee754_rem_pio2).

import { abs } from './exact.ts'
import { kernelRemPio2 } from './k_rem_pio2.ts'
import { fromWords, highWord, lowWord } from './words.ts'

// 2/pi in 24-bit chunks, 396 hex digits (476 decimal).
// prettier-ignore
const twoOverPi = Int32Array.of(
  0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62,
  0x95993C, 0x439041, 0xFE5163, 0xABDEBB, 0xC561B7, 0x246E3A,
  0x424DD2, 0xE00649, 0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129,
  0xA73EE8, 0x8235F5, 0x2EBB44, 0x84E99C, 0x7026B4, 0x5F7E41,
  0x3991D6, 0x398353, 0x39F49C, 0x845F8B, 0xBDF928, 0x3B1FF8,
  0x97FFDE, 0x05980F, 0xEF2F11, 0x8B5A0A, 0x6D1F6D, 0x367ECF,
  0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5,
  0xF17B3D, 0x0739F7, 0x8A5292, 0xEA6BFB, 0x5FB11F, 0x8D5D08,
  0x560330, 0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3,
  0x91615E, 0xE61B08, 0x659985, 0x5F14A0, 0x68408D, 0xFFD880,
  0x4D7327, 0x310606, 0x1556CA, 0x73A8C9, 0x60E27B, 0xC08C6B,
)

// High words of n * pi/2 for n = 1 to 32, where the medium path's first subtraction may cancel.
// prettier-ignore
const npio2Hw = Int32Array.of(
  0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
  0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
  0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
  0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
  0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
  0x404858EB, 0x404921FB,
)

// invpio2: 53 bits of 2/pi; pio2_1: the first 33 bits of pi/2, pio2_1t: pi/2 - pio2_1;
// pio2_2: the second 33 bits, pio2_2t: pi/2 - (pio2_1 + pio2_2); pio2_3: the third 33 bits,
// pio2_3t: pi/2 - (pio2_1 + pio2_2 + pio2_3).
const zero = 0 // 0x00000000, 0x00000000
const half = 0.5 // 0x3FE00000, 0x00000000
const two24 = 16777216 // 0x41700000, 0x00000000
const invpio2 = 0.63661977236758138 // 0x3FE45F30, 0x6DC9C883
const pio2_1 = 1.5707963267341256 // 0x3FF921FB, 0x54400000
const pio2_1t = 6.0771005065061922e-11 // 0x3DD0B461, 0x1A626331
const pio2_2 = 6.077100506303966e-11 // 0x3DD0B461, 0x1A600000
const pio2_2t = 2.0222662487959506e-21 // 0x3BA3198A, 0x2E037073
const pio2_3 = 2.0222662487111665e-21 // 0x3BA3198A, 0x2E000000
const pio2_3t = 8.4784276603688996e-32 // 0x397B839A, 0x252049C1

const tx = new Float64Array(3)

/**
 * __ieee754_rem_pio2: x = n * (pi/2) + (y0 + y1) with |y0 + y1| <= pi/4. Writes y0 to
 * out[offset] and y1 to out[offset + 1] and returns n as the C function does: the full quadrant
 * count up to 2^19 * pi/2, the count mod 8 beyond it, negated for negative x.
 */
export const rem_pio2 = (x: number, out: Float64Array, offset: number): number => {
  const hx = highWord(x)
  const ix = hx & 0x7fffffff
  if (ix <= 0x3fe921fb) {
    // |x| ~<= pi/4, no need for reduction
    out[offset] = x
    out[offset + 1] = 0
    return 0
  }
  if (ix < 0x4002d97c) {
    // |x| < 3pi/4, special case with n = +-1
    if (hx > 0) {
      let z = x - pio2_1
      if (ix !== 0x3ff921fb) {
        // 33 + 53 bit pi is good enough
        const y0 = z - pio2_1t
        out[offset] = y0
        out[offset + 1] = z - y0 - pio2_1t
      } else {
        // near pi/2, use 33 + 33 + 53 bit pi
        z -= pio2_2
        const y0 = z - pio2_2t
        out[offset] = y0
        out[offset + 1] = z - y0 - pio2_2t
      }
      return 1
    }
    // negative x
    let z = x + pio2_1
    if (ix !== 0x3ff921fb) {
      const y0 = z + pio2_1t
      out[offset] = y0
      out[offset + 1] = z - y0 + pio2_1t
    } else {
      z += pio2_2
      const y0 = z + pio2_2t
      out[offset] = y0
      out[offset + 1] = z - y0 + pio2_2t
    }
    return -1
  }
  if (ix <= 0x413921fb) {
    // |x| ~<= 2^19 * (pi/2), medium size
    let t = abs(x)
    const n = (t * invpio2 + half) | 0
    const fn = n
    let r = t - fn * pio2_1
    let w = fn * pio2_1t // 1st round good to 85 bits
    let y0: number
    if (n < 32 && ix !== npio2Hw[n - 1]) {
      y0 = r - w // quick check no cancellation
    } else {
      const j = ix >> 20
      y0 = r - w
      let i = j - ((highWord(y0) >> 20) & 0x7ff)
      if (i > 16) {
        // 2nd iteration needed, good to 118 bits
        t = r
        w = fn * pio2_2
        r = t - w
        w = fn * pio2_2t - (t - r - w)
        y0 = r - w
        i = j - ((highWord(y0) >> 20) & 0x7ff)
        if (i > 49) {
          // 3rd iteration needed, 151 bits, covers all possible cases
          t = r
          w = fn * pio2_3
          r = t - w
          w = fn * pio2_3t - (t - r - w)
          y0 = r - w
        }
      }
    }
    const y1 = r - y0 - w
    if (hx < 0) {
      out[offset] = -y0
      out[offset + 1] = -y1
      return -n
    }
    out[offset] = y0
    out[offset + 1] = y1
    return n
  }
  // all other (large) arguments
  if (ix >= 0x7ff00000) {
    // x is inf or NaN
    const nan = x - x
    out[offset] = nan
    out[offset + 1] = nan
    return 0
  }
  // z = scalbn(|x|, ilogb(x) - 23)
  const e0 = (ix >> 20) - 1046
  let z = fromWords(ix - (e0 << 20), lowWord(x))
  for (let i = 0; i < 2; i++) {
    const chunk = z | 0
    tx[i] = chunk
    z = (z - chunk) * two24
  }
  tx[2] = z
  let nx = 3
  while (tx[nx - 1] === zero) nx-- // skip zero terms
  const n = kernelRemPio2(tx, out, offset, e0, nx, 2, twoOverPi)
  if (hx < 0) {
    out[offset] = -(out[offset] ?? 0)
    out[offset + 1] = -(out[offset + 1] ?? 0)
    // | 0 because C negates an int: the Payne-Hanek count is 0 for a multiple of 8, never -0
    return -n | 0
  }
  return n
}
