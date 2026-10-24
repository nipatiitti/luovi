/* @(#)s_sin.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 s_sin.c.

import { rem_pio2 } from './e_rem_pio2.ts'
import { kernelCos } from './k_cos.ts'
import { kernelSin } from './k_sin.ts'
import { highWord } from './words.ts'

const y = new Float64Array(2)

/** sin(x), within 1 ulp; NaN for infinite or NaN x. */
export const sin = (x: number): number => {
  const ix = highWord(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) return kernelSin(x, 0.0, 0) // |x| ~< pi/4
  if (ix >= 0x7ff00000) return x - x // sin(Inf or NaN) is NaN
  const n = rem_pio2(x, y, 0)
  const y0 = y[0] ?? 0
  const y1 = y[1] ?? 0
  switch (n & 3) {
    case 0:
      return kernelSin(y0, y1, 1)
    case 1:
      return kernelCos(y0, y1)
    case 2:
      return -kernelSin(y0, y1, 1)
    default:
      return -kernelCos(y0, y1)
  }
}
