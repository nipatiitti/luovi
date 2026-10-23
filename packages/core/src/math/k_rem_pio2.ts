/* @(#)k_rem_pio2.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 k_rem_pio2.c (__kernel_rem_pio2, the Payne-Hanek reduction for
// huge arguments). The method and the meaning of every parameter are documented in the C file.
// The C stack arrays become module scratch so a call allocates nothing; every element is
// written before it is read, as in the C.

import { floor } from './exact.ts'
import { scalbn } from './s_scalbn.ts'

const initJk = Int32Array.of(2, 3, 4, 6)

const PIo2 = Float64Array.of(
  1.5707962512969971, // 0x3FF921FB, 0x40000000
  7.5497894158615964e-8, // 0x3E74442D, 0x00000000
  5.3903025299577648e-15, // 0x3CF84698, 0x80000000
  3.2820034158079129e-22, // 0x3B78CC51, 0x60000000
  1.2706557530806761e-29, // 0x39F01B83, 0x80000000
  1.2293330898111133e-36, // 0x387A2520, 0x40000000
  2.7337005381646456e-44, // 0x36E38222, 0x80000000
  2.1674168387780482e-51, // 0x3569F31D, 0x00000000
)

const zero = 0.0
const one = 1.0
const two24 = 16777216 // 0x41700000, 0x00000000
const twon24 = 5.9604644775390625e-8 // 0x3E700000, 0x00000000

const iq = new Int32Array(20)
const f = new Float64Array(20)
const fq = new Float64Array(20)
const q = new Float64Array(20)

/**
 * The last three bits of N, and y = x - N*pi/2 written to y[yOffset...] as prec + 1 doubles for
 * prec 1 to 3 (one for prec 0). x holds nx 24-bit pieces of the argument scaled by 2^-e0.
 */
export const kernelRemPio2 = (
  x: Float64Array,
  y: Float64Array,
  yOffset: number,
  e0: number,
  nx: number,
  prec: number,
  ipio2: Int32Array,
): number => {
  let i: number
  let j: number
  let k: number
  let fw: number
  let z: number

  const jk = initJk[prec] ?? 0
  const jp = jk

  // jx, jv and q0; note that 3 > q0
  const jx = nx - 1
  let jv = ((e0 - 3) / 24) | 0
  if (jv < 0) jv = 0
  let q0 = e0 - 24 * (jv + 1)

  // f[0] to f[jx + jk], where f[jx + jk] = ipio2[jv + jk]
  j = jv - jx
  const m = jx + jk
  for (i = 0; i <= m; i++, j++) f[i] = j < 0 ? zero : (ipio2[j] ?? 0)

  // q[0] to q[jk]
  for (i = 0; i <= jk; i++) {
    for (j = 0, fw = 0.0; j <= jx; j++) fw += (x[j] ?? 0) * (f[jx + i - j] ?? 0)
    q[i] = fw
  }

  let jz = jk
  let n: number
  let ih: number
  for (;;) {
    // distill q[] into iq[] reversingly
    for (i = 0, j = jz, z = q[jz] ?? 0; j > 0; i++, j--) {
      fw = (twon24 * z) | 0
      iq[i] = (z - two24 * fw) | 0
      z = (q[j - 1] ?? 0) + fw
    }

    // n
    z = scalbn(z, q0) // actual value of z
    z -= 8.0 * floor(z * 0.125) // trim off integer >= 8
    n = z | 0
    z -= n
    ih = 0
    if (q0 > 0) {
      // need iq[jz - 1] to determine n
      i = (iq[jz - 1] ?? 0) >> (24 - q0)
      n += i
      iq[jz - 1] = (iq[jz - 1] ?? 0) - (i << (24 - q0))
      ih = (iq[jz - 1] ?? 0) >> (23 - q0)
    } else if (q0 === 0) ih = (iq[jz - 1] ?? 0) >> 23
    else if (z >= 0.5) ih = 2

    if (ih > 0) {
      // q > 0.5
      n += 1
      let carry = 0
      for (i = 0; i < jz; i++) {
        // 1 - q
        j = iq[i] ?? 0
        if (carry === 0) {
          if (j !== 0) {
            carry = 1
            iq[i] = 0x1000000 - j
          }
        } else iq[i] = 0xffffff - j
      }
      if (q0 > 0) {
        // rare case: chance is 1 in 12
        switch (q0) {
          case 1:
            iq[jz - 1] = (iq[jz - 1] ?? 0) & 0x7fffff
            break
          case 2:
            iq[jz - 1] = (iq[jz - 1] ?? 0) & 0x3fffff
            break
        }
      }
      if (ih === 2) {
        z = one - z
        if (carry !== 0) z -= scalbn(one, q0)
      }
    }

    // recomputation is needed when every chunk below the integer part is zero
    if (z === zero) {
      j = 0
      for (i = jz - 1; i >= jk; i--) j |= iq[i] ?? 0
      if (j === 0) {
        for (k = 1; iq[jk - k] === 0; k++); // k = number of terms needed

        for (i = jz + 1; i <= jz + k; i++) {
          // add q[jz + 1] to q[jz + k]
          f[jx + i] = ipio2[jv + i] ?? 0
          for (j = 0, fw = 0.0; j <= jx; j++) fw += (x[j] ?? 0) * (f[jx + i - j] ?? 0)
          q[i] = fw
        }
        jz += k
        continue
      }
    }
    break
  }

  // chop off zero terms
  if (z === 0.0) {
    jz -= 1
    q0 -= 24
    while (iq[jz] === 0) {
      jz--
      q0 -= 24
    }
  } else {
    // break z into 24-bit if necessary
    z = scalbn(z, -q0)
    if (z >= two24) {
      fw = (twon24 * z) | 0
      iq[jz] = (z - two24 * fw) | 0
      jz += 1
      q0 += 24
      iq[jz] = fw
    } else iq[jz] = z | 0
  }

  // convert integer "bit" chunk to floating-point value
  fw = scalbn(one, q0)
  for (i = jz; i >= 0; i--) {
    q[i] = fw * (iq[i] ?? 0)
    fw *= twon24
  }

  // PIo2[0, ..., jp] * q[jz, ..., 0]
  for (i = jz; i >= 0; i--) {
    for (fw = 0.0, k = 0; k <= jp && k <= jz - i; k++) fw += (PIo2[k] ?? 0) * (q[i + k] ?? 0)
    fq[jz - i] = fw
  }

  // compress fq[] into y[]
  switch (prec) {
    case 0:
      fw = 0.0
      for (i = jz; i >= 0; i--) fw += fq[i] ?? 0
      y[yOffset] = ih === 0 ? fw : -fw
      break
    case 1:
    case 2:
      fw = 0.0
      for (i = jz; i >= 0; i--) fw += fq[i] ?? 0
      y[yOffset] = ih === 0 ? fw : -fw
      fw = (fq[0] ?? 0) - fw
      for (i = 1; i <= jz; i++) fw += fq[i] ?? 0
      y[yOffset + 1] = ih === 0 ? fw : -fw
      break
    case 3:
      // painful
      for (i = jz; i > 0; i--) {
        fw = (fq[i - 1] ?? 0) + (fq[i] ?? 0)
        fq[i] = (fq[i] ?? 0) + ((fq[i - 1] ?? 0) - fw)
        fq[i - 1] = fw
      }
      for (i = jz; i > 1; i--) {
        fw = (fq[i - 1] ?? 0) + (fq[i] ?? 0)
        fq[i] = (fq[i] ?? 0) + ((fq[i - 1] ?? 0) - fw)
        fq[i - 1] = fw
      }
      for (fw = 0.0, i = jz; i >= 2; i--) fw += fq[i] ?? 0
      if (ih === 0) {
        y[yOffset] = fq[0] ?? 0
        y[yOffset + 1] = fq[1] ?? 0
        y[yOffset + 2] = fw
      } else {
        y[yOffset] = -(fq[0] ?? 0)
        y[yOffset + 1] = -(fq[1] ?? 0)
        y[yOffset + 2] = -fw
      }
  }
  return n & 7
}
