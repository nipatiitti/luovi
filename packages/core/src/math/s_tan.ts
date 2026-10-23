/* @(#)s_tan.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 s_tan.c.

import { rem_pio2 } from './e_rem_pio2.ts'
import { kernelTan } from './k_tan.ts'
import { highWord } from './words.ts'

const y = new Float64Array(2)

/** tan(x), within 1 ulp; NaN for infinite or NaN x. */
export const tan = (x: number): number => {
  const ix = highWord(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) return kernelTan(x, 0.0, 1) // |x| ~< pi/4
  if (ix >= 0x7ff00000) return x - x // tan(Inf or NaN) is NaN
  const n = rem_pio2(x, y, 0)
  // 1 for even n, -1 for odd
  return kernelTan(y[0] ?? 0, y[1] ?? 0, 1 - ((n & 1) << 1))
}
