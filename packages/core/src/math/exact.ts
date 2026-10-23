// The Math members whose results the specification fixes exactly (correctly rounded or exact
// integer operations), so every engine agrees. This is the one file in core that names Math;
// everything else in the simulation imports these from @luovi/core/math.

export const sqrt = Math.sqrt
export const abs = Math.abs
export const floor = Math.floor
export const ceil = Math.ceil
export const round = Math.round
export const trunc = Math.trunc
export const sign = Math.sign
export const min = Math.min
export const max = Math.max
export const fround = Math.fround
export const imul = Math.imul
export const clz32 = Math.clz32
