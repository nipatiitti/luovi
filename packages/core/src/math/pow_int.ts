// Not FDLIBM: FDLIBM has no integer power. Written for luovi (ADR 0002), so it carries no Sun
// notice.

import { clz32 } from './exact.ts'

/**
 * x^n for an int32 n by left-to-right binary exponentiation: start at 1 and, for each bit of |n|
 * from the most significant, square, then multiply by x when the bit is set. The order is fixed
 * so every engine performs the same roundings; it is not pow, and a formula with an integer
 * exponent uses this and never pow (ADR 0002). A negative n returns 1 / powInt(x, -n), one
 * final rounding of the positive power, which overflows to give 0 (or underflows to give
 * Infinity) before the true result leaves the double range. powInt(x, 0) is 1 for every x,
 * NaN included; zero and infinite bases follow C99 pow for integer exponents.
 */
export const powInt = (x: number, n: number): number => {
  // |n| as a plain number, so n = -2^31 needs no special case; the bit reads use it as a uint32.
  const m = n < 0 ? -n : n
  let r = 1
  for (let bit = 31 - clz32(m); bit >= 0; bit -= 1) {
    r *= r
    if (((m >>> bit) & 1) === 1) r *= x
  }
  return n < 0 ? 1 / r : r
}
