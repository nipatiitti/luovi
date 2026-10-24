// FDLIBM reads and writes the two 32-bit halves of a double in place (__HI, __LO). JavaScript
// has no such aliasing on a local, so every half-word access goes through this one shared view
// pair. Int32Array rather than Uint32Array because FDLIBM's words are signed ints and its sign
// tests (hx < 0) transliterate unchanged.

const f64 = new Float64Array(1)
const i32 = new Int32Array(f64.buffer)

// The word order of a double in memory is the host's; every target engine is little-endian, but
// the probe keeps a big-endian host correct rather than silently wrong.
f64[0] = 1
const HI = i32[1] === 0x3ff00000 ? 1 : 0
const LO = 1 - HI

/** FDLIBM's __HI(x): the sign, exponent and top 20 mantissa bits as a signed int32. */
export const highWord = (x: number): number => {
  f64[0] = x
  return i32[HI] ?? 0
}

/** FDLIBM's __LO(x) as stored, a signed int32; FDLIBM's unsigned uses take it `>>> 0`. */
export const lowWord = (x: number): number => {
  f64[0] = x
  return i32[LO] ?? 0
}

/** The double whose words are hi and lo (INSERT_WORDS). */
export const fromWords = (hi: number, lo: number): number => {
  i32[HI] = hi
  i32[LO] = lo
  return f64[0] ?? 0
}

/** x with its high word replaced (`__HI(x) = hi`). */
export const withHighWord = (x: number, hi: number): number => {
  f64[0] = x
  i32[HI] = hi
  // TypeScript narrows f64[0] to x here; the read still sees the word just written.
  return f64[0]
}

/** x with its low word replaced (`__LO(x) = lo`). */
export const withLowWord = (x: number, lo: number): number => {
  f64[0] = x
  i32[LO] = lo
  // TypeScript narrows f64[0] to x here; the read still sees the word just written.
  return f64[0]
}
