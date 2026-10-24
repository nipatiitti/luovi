/* @(#)e_pow.c 1.5 04/04/22 SMI */
/*
 * ====================================================
 * Copyright (C) 2004 by Sun Microsystems, Inc. All rights reserved.
 *
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

// Transliterated from FDLIBM 5.3 e_pow.c (__ieee754_pow). The algorithm notes and the special
// cases are in the C file. FDLIBM's i0 and i1 endianness words are dead code there and are left
// out. The low words lx and ly are unsigned in the C, so they are kept as uint32 here.

import { abs, sqrt } from './exact.ts'
import { scalbn } from './s_scalbn.ts'
import { fromWords, highWord, lowWord, withHighWord, withLowWord } from './words.ts'

const dp_h1 = 0.58496248722076416 // 0x3FE2B803, 0x40000000
const dp_l1 = 1.350039202129749e-8 // 0x3E4CFDEB, 0x43CFD006
const zero = 0.0
const one = 1.0
const two = 2.0
const two53 = 9007199254740992 // 0x43400000, 0x00000000
const huge = 1.0e300
const tiny = 1.0e-300
// poly coefs for (3/2)*(log(x)-2s-2/3*s**3
const L1 = 0.59999999999999465 // 0x3FE33333, 0x33333303
const L2 = 0.42857142857855018 // 0x3FDB6DB6, 0xDB6FABFF
const L3 = 0.33333332981837743 // 0x3FD55555, 0x518F264D
const L4 = 0.27272812380853401 // 0x3FD17460, 0xA91D4101
const L5 = 0.23066074577556175 // 0x3FCD864A, 0x93C9DB65
const L6 = 0.20697501780033842 // 0x3FCA7E28, 0x4A454EEF
const P1 = 0.16666666666666602 // 0x3FC55555, 0x5555553E
const P2 = -0.0027777777777015593 // 0xBF66C16C, 0x16BEBD93
const P3 = 0.000066137563214379344 // 0x3F11566A, 0xAF25DE2C
const P4 = -0.0000016533902205465252 // 0xBEBBBD41, 0xC5D26BF1
const P5 = 4.1381367970572385e-8 // 0x3E663769, 0x72BEA4D0
const lg2 = 0.69314718055994529 // 0x3FE62E42, 0xFEFA39EF
const lg2_h = 0.69314718246459961 // 0x3FE62E43, 0x00000000
const lg2_l = -1.904654299957768e-9 // 0xBE205C61, 0x0CA86C39
// -(1024-log2(ovfl+.5ulp)). The C writes 8.0085662595372944372e-0017 without hex words; this
// literal names the same double, whose words are 0x3C971547, 0x652B82FE.
const ovt = 8.0085662595372941e-17
const cp = 0.96179669392597555 // 0x3FEEC709, 0xDC3A03FD =2/(3ln2)
const cp_h = 0.96179670095443726 // 0x3FEEC709, 0xE0000000 =(float)cp
const cp_l = -7.0284616509527583e-9 // 0xBE3E2FE0, 0x145B01F5 =tail of cp_h
const ivln2 = 1.4426950408889634 // 0x3FF71547, 0x652B82FE =1/ln2
const ivln2_h = 1.4426950216293335 // 0x3FF71547, 0x60000000 =24b 1/ln2
const ivln2_l = 1.9259629911266175e-8 // 0x3E54AE0B, 0xF85DDF44 =1/ln2 tail
// The C writes 0.3333333333333333333333, which names this double.
const third = 0.33333333333333331 // 0x3FD55555, 0x55555555

/**
 * x^y for a non-integer exponent y. A formula with an integer exponent uses powInt instead and
 * never mixes the two (ADR 0002). Special cases are FDLIBM's, which Math.pow shares: pow(1, NaN)
 * and pow(-1, +-Infinity) are NaN, where C99 says 1.
 */
export const pow = (x: number, y: number): number => {
  const hx = highWord(x)
  const lx = lowWord(x) >>> 0
  const hy = highWord(y)
  const ly = lowWord(y) >>> 0
  let ix = hx & 0x7fffffff
  const iy = hy & 0x7fffffff

  // y == zero: x**0 = 1
  if ((iy | ly) === 0) return one

  // +-NaN return x+y
  if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) {
    return x + y
  }

  // determine if y is an odd int when x < 0
  // yisint = 0 ... y is not an integer
  // yisint = 1 ... y is an odd int
  // yisint = 2 ... y is an even int
  let yisint = 0
  if (hx < 0) {
    if (iy >= 0x43400000) {
      yisint = 2 // even integer y
    } else if (iy >= 0x3ff00000) {
      const k = (iy >> 20) - 0x3ff // exponent
      if (k > 20) {
        // unsigned in the C: the shift back wraps at 32 bits before the compare
        const j = ly >>> (52 - k)
        if ((j << (52 - k)) >>> 0 === ly) yisint = 2 - (j & 1)
      } else if (ly === 0) {
        const j = iy >> (20 - k)
        if (j << (20 - k) === iy) yisint = 2 - (j & 1)
      }
    }
  }

  // special value of y
  if (ly === 0) {
    if (iy === 0x7ff00000) {
      // y is +-inf
      if (((ix - 0x3ff00000) | lx) === 0) return y - y // inf**+-1 is NaN
      if (ix >= 0x3ff00000) return hy >= 0 ? y : zero // (|x|>1)**+-inf = inf,0
      return hy < 0 ? -y : zero // (|x|<1)**-,+inf = inf,0
    }
    if (iy === 0x3ff00000) {
      // y is +-1
      return hy < 0 ? one / x : x
    }
    if (hy === 0x40000000) return x * x // y is 2
    if (hy === 0x3fe00000) {
      // y is 0.5
      if (hx >= 0) return sqrt(x) // x >= +0
    }
  }

  let ax = abs(x)
  // special value of x
  if (lx === 0) {
    if (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000) {
      let z = ax // x is +-0,+-inf,+-1
      if (hy < 0) z = one / z // z = (1/|x|)
      if (hx < 0) {
        if (((ix - 0x3ff00000) | yisint) === 0) {
          z = (z - z) / (z - z) // (-1)**non-int is NaN
        } else if (yisint === 1) {
          z = -z // (x<0)**odd = -(|x|**odd)
        }
      }
      return z
    }
  }

  let n = (hx >> 31) + 1

  // (x<0)**(non-int) is NaN
  if ((n | yisint) === 0) return (x - x) / (x - x)

  let s = one // s (sign of result -ve**odd) = -1 else = 1
  if ((n | (yisint - 1)) === 0) s = -one // (-ve)**(odd int)

  let t1: number
  let t2: number
  if (iy > 0x41e00000) {
    // |y| is huge: |y| > 2**31
    if (iy > 0x43f00000) {
      // |y| > 2**64, must o/uflow
      if (ix <= 0x3fefffff) return hy < 0 ? huge * huge : tiny * tiny
      if (ix >= 0x3ff00000) return hy > 0 ? huge * huge : tiny * tiny
    }
    // over/underflow if x is not close to one
    if (ix < 0x3fefffff) return hy < 0 ? s * huge * huge : s * tiny * tiny
    if (ix > 0x3ff00000) return hy > 0 ? s * huge * huge : s * tiny * tiny
    // now |1-x| is tiny <= 2**-20, suffice to compute log(x) by x-x^2/2+x^3/3-x^4/4
    const t = ax - one // t has 20 trailing zeros
    const w = t * t * (0.5 - t * (third - t * 0.25))
    const u = ivln2_h * t // ivln2_h has 21 sig. bits
    const v = t * ivln2_l - w * ivln2
    t1 = withLowWord(u + v, 0)
    t2 = v - (t1 - u)
  } else {
    n = 0
    // take care subnormal number
    if (ix < 0x00100000) {
      ax *= two53
      n -= 53
      ix = highWord(ax)
    }
    n += (ix >> 20) - 0x3ff
    const j = ix & 0x000fffff
    // determine interval
    ix = j | 0x3ff00000 // normalize ix
    let k: number
    if (j <= 0x3988e) {
      k = 0 // |x|<sqrt(3/2)
    } else if (j < 0xbb67a) {
      k = 1 // |x|<sqrt(3)
    } else {
      k = 0
      n += 1
      ix -= 0x00100000
    }
    ax = withHighWord(ax, ix)
    const bp = k === 0 ? 1.0 : 1.5
    const dp_h = k === 0 ? 0.0 : dp_h1
    const dp_l = k === 0 ? 0.0 : dp_l1

    // compute ss = s_h+s_l = (x-1)/(x+1) or (x-1.5)/(x+1.5)
    let u = ax - bp
    let v = one / (ax + bp)
    const ss = u * v
    const s_h = withLowWord(ss, 0)
    // t_h=ax+bp[k] High
    let t_h = fromWords((((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18)) | 0, 0)
    let t_l = ax - (t_h - bp)
    const s_l = v * (u - s_h * t_h - s_h * t_l)
    // compute log(ax)
    let s2 = ss * ss
    let r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))))
    r += s_l * (s_h + ss)
    s2 = s_h * s_h
    t_h = withLowWord(3.0 + s2 + r, 0)
    t_l = r - (t_h - 3.0 - s2)
    // u+v = ss*(1+...)
    u = s_h * t_h
    v = s_l * t_h + t_l * ss
    // 2/(3log2)*(ss+...)
    const p_h = withLowWord(u + v, 0)
    const p_l = v - (p_h - u)
    const z_h = cp_h * p_h // cp_h+cp_l = 2/(3*log2)
    const z_l = cp_l * p_h + p_l * cp + dp_l
    // log2(ax) = (ss+..)*2/(3*log2) = n + dp_h + z_h + z_l
    const t = n
    t1 = withLowWord(z_h + z_l + dp_h + t, 0)
    t2 = z_l - (t1 - t - dp_h - z_h)
  }

  // split up y into y1+y2 and compute (y1+y2)*(t1+t2)
  const y1 = withLowWord(y, 0)
  const p_l = (y - y1) * t1 + y * t2
  let p_h = y1 * t1
  let z = p_l + p_h
  let j = highWord(z)
  let i = lowWord(z)
  if (j >= 0x40900000) {
    // z >= 1024
    if (((j - 0x40900000) | i) !== 0) return s * huge * huge // z > 1024: overflow
    if (p_l + ovt > z - p_h) return s * huge * huge // overflow
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    // z <= -1075; the C subtracts in unsigned arithmetic, which | keeps modulo 2^32
    if (((j - 0xc090cc00) | i) !== 0) return s * tiny * tiny // z < -1075: underflow
    if (p_l <= z - p_h) return s * tiny * tiny // underflow
  }

  // compute 2**(p_h+p_l)
  i = j & 0x7fffffff
  let k = (i >> 20) - 0x3ff
  n = 0
  if (i > 0x3fe00000) {
    // |z| > 0.5, set n = [z+0.5]
    n = (j + (0x00100000 >> (k + 1))) | 0
    k = ((n & 0x7fffffff) >> 20) - 0x3ff // new k for n
    const t = fromWords(n & ~(0x000fffff >> k), 0)
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k)
    if (j < 0) n = -n
    p_h -= t
  }
  let t = withLowWord(p_l + p_h, 0)
  const u = t * lg2_h
  const v = (p_l - (t - p_h)) * lg2 + t * lg2_l
  z = u + v
  const w = v - (z - u)
  t = z * z
  t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))))
  const r = (z * t1) / (t1 - two) - (w + z * w)
  z = one - (r - z)
  j = highWord(z)
  j = (j + (n << 20)) | 0
  if (j >> 20 <= 0)
    z = scalbn(z, n) // subnormal output
  else z = withHighWord(z, (highWord(z) + (n << 20)) | 0)
  return s * z
}
