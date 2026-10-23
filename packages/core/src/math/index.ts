// @luovi/core/math: deterministic f64 math for the simulation (ADR 0002). The transcendentals are
// FDLIBM 5.3 transliterated bit for bit; the rest are the Math members every engine computes
// exactly. Math's names and argument order, so porting a formula is a search and replace.

export { sin } from './s_sin.ts'
export { cos } from './s_cos.ts'
export { sincos } from './sincos.ts'
export { tan } from './s_tan.ts'
export { asin } from './e_asin.ts'
export { acos } from './e_acos.ts'
export { atan } from './s_atan.ts'
export { atan2 } from './e_atan2.ts'
export { rem_pio2 } from './e_rem_pio2.ts'
export { scalbn } from './s_scalbn.ts'

export { abs, ceil, clz32, floor, fround, imul, max, min, round, sign, sqrt, trunc } from './exact.ts'
export { HALF_PI, PI, TWO_PI } from './constants.ts'
