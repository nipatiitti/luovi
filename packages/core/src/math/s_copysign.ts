/* @(#)s_copysign.c 1.3 95/01/18 */
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

// Transliterated from FDLIBM 5.3 s_copysign.c.

import { highWord, withHighWord } from './words.ts'

/** x with the sign bit of y. */
export const copysign = (x: number, y: number): number =>
  withHighWord(x, (highWord(x) & 0x7fffffff) | (highWord(y) & 0x80000000))
