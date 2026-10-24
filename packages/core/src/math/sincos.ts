/* Not an FDLIBM file: sin and cos of one argument composed from s_sin.c and s_cos.c. */
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

import { rem_pio2 } from './e_rem_pio2.ts'
import { kernelCos } from './k_cos.ts'
import { kernelSin } from './k_sin.ts'
import { highWord } from './words.ts'

const y = new Float64Array(2)

/**
 * Writes sin(x) to out[offset] and cos(x) to out[offset + 1] from one argument reduction. Each
 * is bit-identical to sin and cos because both take the same branches on the same reduced pair.
 */
export const sincos = (x: number, out: Float64Array, offset: number): void => {
  const ix = highWord(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) {
    // |x| ~< pi/4
    out[offset] = kernelSin(x, 0.0, 0)
    out[offset + 1] = kernelCos(x, 0.0)
    return
  }
  if (ix >= 0x7ff00000) {
    // Inf or NaN
    const nan = x - x
    out[offset] = nan
    out[offset + 1] = nan
    return
  }
  const n = rem_pio2(x, y, 0)
  const y0 = y[0] ?? 0
  const y1 = y[1] ?? 0
  const s = kernelSin(y0, y1, 1)
  const c = kernelCos(y0, y1)
  switch (n & 3) {
    case 0:
      out[offset] = s
      out[offset + 1] = c
      return
    case 1:
      out[offset] = c
      out[offset + 1] = -s
      return
    case 2:
      out[offset] = -s
      out[offset + 1] = -c
      return
    default:
      out[offset] = -c
      out[offset + 1] = s
  }
}
