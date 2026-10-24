import { imul } from './math/index.ts'
import { highWord, lowWord } from './math/words.ts'

// FNV-1a 32 (Fowler, Noll, Vo): the state hash of ADR 0002 and #7, and the name hash of the RNG's forks.
export const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** One FNV-1a 32 step over a 32-bit word, signed or unsigned; the result is a signed int32. */
const fnvStep = (hash: number, word: number): number => imul(hash ^ word, FNV_PRIME)

/** FNV-1a 32 over the character codes of an ASCII string, one byte each; unsigned. */
export const fnv1a32 = (text: string): number => {
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < text.length; i++) hash = fnvStep(hash, text.charCodeAt(i))
  return hash >>> 0
}

// Engines and typed arrays choose NaN payloads freely, so every NaN hashes as this one quiet pattern.
const CANONICAL_NAN_HIGH = 0x7ff80000
const CANONICAL_NAN_LOW = 0x00000000

/**
 * FNV-1a 32 over the buffer's 32-bit words: for each double in index order its low word, then its high word, read
 * through core's endianness-probed word access so the hash does not depend on the host's byte order. Every NaN is hashed
 * as the canonical quiet NaN; the buffer is not modified. Returns an unsigned 32-bit integer. Passing a previous result
 * as basis continues the hash, so hashState(b, hashState(a)) is the hash of a followed by b, which lets a benchmark digest
 * many query outputs without concatenating them. Reads by index, so a subarray view hashes its own elements.
 */
export const hashState = (buffer: Float64Array, basis: number = FNV_OFFSET_BASIS): number => {
  let hash = basis
  for (const x of buffer) {
    const nan = Number.isNaN(x)
    hash = fnvStep(hash, nan ? CANONICAL_NAN_LOW : lowWord(x))
    hash = fnvStep(hash, nan ? CANONICAL_NAN_HIGH : highWord(x))
  }
  return hash >>> 0
}
