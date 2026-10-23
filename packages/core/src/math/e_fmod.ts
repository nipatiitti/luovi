/* @(#)e_fmod.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 e_fmod.c (__ieee754_fmod). The C keeps the low words lx, ly and
// lz unsigned; here they are held as uint32 values (>>> 0 after every operation) so the unsigned
// compares and shifts transliterate unchanged, and the high words stay int32.

import { fromWords, highWord, lowWord } from './words.ts'

const one = 1.0

/** x - n*y with n = trunc(x / y), computed exactly; the sign of x. Internal, for remainder. */
export const fmod = (x: number, y: number): number => {
  let hx = highWord(x) // high word of x
  let lx = lowWord(x) >>> 0 // low word of x
  let hy = highWord(y) // high word of y
  let ly = lowWord(y) >>> 0 // low word of y
  const sx = hx & 0x80000000 // sign of x
  const signedZero = sx === 0 ? 0.0 : -0.0 // Zero[(unsigned)sx>>31]
  hx ^= sx // |x|
  hy &= 0x7fffffff // |y|

  // purge off exception values: y=0, or x not finite, or y is NaN
  if ((hy | ly) === 0 || hx >= 0x7ff00000 || (hy | ((ly | -ly) >>> 31)) > 0x7ff00000) return (x * y) / (x * y)
  if (hx <= hy) {
    if (hx < hy || lx < ly) return x // |x|<|y| return x
    if (lx === ly) return signedZero // |x|=|y| return x*0
  }

  // determine ix = ilogb(x); the C's i is a signed int, so the scan stops when the top bit is set
  let ix: number
  if (hx < 0x00100000) {
    // subnormal x
    ix = hx === 0 ? -1043 : -1022
    for (let i = hx === 0 ? lx | 0 : hx << 11; i > 0; i <<= 1) ix -= 1
  } else {
    ix = (hx >> 20) - 1023
  }

  // determine iy = ilogb(y)
  let iy: number
  if (hy < 0x00100000) {
    // subnormal y
    iy = hy === 0 ? -1043 : -1022
    for (let i = hy === 0 ? ly | 0 : hy << 11; i > 0; i <<= 1) iy -= 1
  } else {
    iy = (hy >> 20) - 1023
  }

  // set up {hx,lx}, {hy,ly} and align y to x
  if (ix >= -1022) {
    hx = 0x00100000 | (0x000fffff & hx)
  } else {
    // subnormal x, shift x to normal
    const n = -1022 - ix
    if (n <= 31) {
      hx = (hx << n) | (lx >>> (32 - n))
      lx = (lx << n) >>> 0
    } else {
      hx = lx << (n - 32)
      lx = 0
    }
  }
  if (iy >= -1022) {
    hy = 0x00100000 | (0x000fffff & hy)
  } else {
    // subnormal y, shift y to normal
    const n = -1022 - iy
    if (n <= 31) {
      hy = (hy << n) | (ly >>> (32 - n))
      ly = (ly << n) >>> 0
    } else {
      hy = ly << (n - 32)
      ly = 0
    }
  }

  // fix point fmod
  for (let n = ix - iy; n > 0; n -= 1) {
    let hz = (hx - hy) | 0
    const lz = (lx - ly) >>> 0
    if (lx < ly) hz -= 1
    if (hz < 0) {
      hx = (hx + hx + (lx >>> 31)) | 0
      lx = (lx + lx) >>> 0
    } else {
      if ((hz | lz) === 0) return signedZero // return sign(x)*0
      hx = (hz + hz + (lz >>> 31)) | 0
      lx = (lz + lz) >>> 0
    }
  }
  let hz = (hx - hy) | 0
  const lz = (lx - ly) >>> 0
  if (lx < ly) hz -= 1
  if (hz >= 0) {
    hx = hz
    lx = lz
  }

  // convert back to floating value and restore the sign
  if ((hx | lx) === 0) return signedZero // return sign(x)*0
  while (hx < 0x00100000) {
    // normalize x
    hx = (hx + hx + (lx >>> 31)) | 0
    lx = (lx + lx) >>> 0
    iy -= 1
  }
  if (iy >= -1022) {
    // normalize output
    hx = (hx - 0x00100000) | ((iy + 1023) << 20)
    return fromWords(hx | sx, lx)
  }
  // subnormal output
  const n = -1022 - iy
  if (n <= 20) {
    lx = ((lx >>> n) | (hx << (32 - n))) >>> 0
    hx >>= n
  } else if (n <= 31) {
    lx = ((hx << (32 - n)) | (lx >>> n)) >>> 0
    hx = sx
  } else {
    lx = (hx >> (n - 32)) >>> 0
    hx = sx
  }
  return fromWords(hx | sx, lx) * one // create necessary signal
}
